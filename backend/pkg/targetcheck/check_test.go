package targetcheck

import (
	"context"
	"fmt"
	"net"
	"net/http"
	"net/http/httptest"
	"net/netip"
	"net/url"
	"strings"
	"testing"
	"time"
)

// stubResolver answers from a fixed table so the probe tests never touch real
// DNS. A host missing from a table produces NXDOMAIN.
type stubResolver struct {
	addrs map[string][]string
	mx    map[string]bool
	ns    map[string]bool
	txt   map[string]bool
}

func notFound(host string) error {
	return &net.DNSError{Err: "no such host", Name: host, IsNotFound: true}
}

func (s stubResolver) LookupNetIP(_ context.Context, _, host string) ([]netip.Addr, error) {
	raw, ok := s.addrs[host]
	if !ok {
		return nil, notFound(host)
	}
	out := make([]netip.Addr, 0, len(raw))
	for _, a := range raw {
		out = append(out, netip.MustParseAddr(a))
	}
	return out, nil
}

func (s stubResolver) LookupMX(_ context.Context, name string) ([]*net.MX, error) {
	if s.mx[name] {
		return []*net.MX{{Host: "mail." + name}}, nil
	}
	return nil, notFound(name)
}

func (s stubResolver) LookupNS(_ context.Context, name string) ([]*net.NS, error) {
	if s.ns[name] {
		return []*net.NS{{Host: "ns1." + name}}, nil
	}
	return nil, notFound(name)
}

func (s stubResolver) LookupTXT(_ context.Context, name string) ([]string, error) {
	if s.txt[name] {
		return []string{"v=spf1 -all"}, nil
	}
	return nil, notFound(name)
}

// testChecker returns a Checker that resolves through res and may reach the
// loopback test servers.
func testChecker(res Resolver) *Checker {
	c := NewChecker(Options{Policy: Policy{allowLoopback: true}, Resolver: res})
	c.dnsTimeout = 2 * time.Second
	c.dialTimeout = 2 * time.Second
	c.httpTimeout = 3 * time.Second
	c.totalTimeout = 8 * time.Second
	return c
}

// serverURL turns a test server's address into a target string on a stub name.
func serverURL(t *testing.T, srv *httptest.Server, host, path string) string {
	t.Helper()
	u, err := url.Parse(srv.URL)
	if err != nil {
		t.Fatalf("parse server URL: %v", err)
	}
	return fmt.Sprintf("http://%s:%s%s", host, u.Port(), path)
}

func TestCheckResponding(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Server", "nginx")
		w.WriteHeader(http.StatusOK)
	}))
	defer srv.Close()

	c := testChecker(stubResolver{addrs: map[string][]string{"app.acme.test": {"127.0.0.1"}}})
	res := c.Check(context.Background(), serverURL(t, srv, "app.acme.test", "/"))

	if !res.OK {
		t.Fatalf("OK = false (%s), want true", res.Message)
	}
	if res.Outcome != OutcomeResponding {
		t.Errorf("Outcome = %q, want %q", res.Outcome, OutcomeResponding)
	}
	if res.HTTPStatus != http.StatusOK {
		t.Errorf("HTTPStatus = %d, want 200", res.HTTPStatus)
	}
	if !hasStep(res, "dns", StepOK) || !hasStep(res, "tcp", StepOK) || !hasStep(res, "http", StepOK) {
		t.Errorf("expected ok steps for dns, tcp and http; got %+v", res.Steps)
	}
}

// A 401/403 proves the endpoint exists; it must never be read as "down".
func TestCheckRestrictedStillPasses(t *testing.T) {
	for _, code := range []int{http.StatusUnauthorized, http.StatusForbidden, http.StatusNotFound, http.StatusInternalServerError} {
		t.Run(http.StatusText(code), func(t *testing.T) {
			srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
				w.WriteHeader(code)
			}))
			defer srv.Close()

			c := testChecker(stubResolver{addrs: map[string][]string{"api.acme.test": {"127.0.0.1"}}})
			res := c.Check(context.Background(), serverURL(t, srv, "api.acme.test", "/v1/users"))

			if !res.OK {
				t.Fatalf("HTTP %d was rejected: %s", code, res.Message)
			}
			if res.HTTPStatus != code {
				t.Errorf("HTTPStatus = %d, want %d", res.HTTPStatus, code)
			}
		})
	}
}

func TestCheckDNSNotFound(t *testing.T) {
	c := testChecker(stubResolver{})
	res := c.Check(context.Background(), "sjhfga.com")

	if res.OK {
		t.Fatal("a domain with no DNS records should be rejected")
	}
	if res.Outcome != OutcomeDNSNotFound {
		t.Errorf("Outcome = %q, want %q", res.Outcome, OutcomeDNSNotFound)
	}
}

// A root domain with mail but no website is a real, testable target: its
// services live on subdomains. It must not be rejected.
func TestCheckDomainWithoutWebsite(t *testing.T) {
	c := testChecker(stubResolver{mx: map[string]bool{"acme.test": true}})
	res := c.Check(context.Background(), "acme.test")

	if !res.OK {
		t.Fatalf("a mail-only domain was rejected: %s", res.Message)
	}
	if res.Outcome != OutcomeDNSOnly {
		t.Errorf("Outcome = %q, want %q", res.Outcome, OutcomeDNSOnly)
	}
}

// Every <name>.s3.amazonaws.com resolves and connects, so only the response
// body reveals that a bucket does not exist.
func TestCheckNoSuchBucket(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusNotFound)
		fmt.Fprint(w, `<?xml version="1.0"?><Error><Code>NoSuchBucket</Code></Error>`)
	}))
	defer srv.Close()

	host := "typo-bucket.s3.amazonaws.com"
	c := testChecker(stubResolver{addrs: map[string][]string{host: {"127.0.0.1"}}})
	res := c.Check(context.Background(), serverURL(t, srv, host, "/"))

	if res.OK {
		t.Fatal("a nonexistent bucket should be rejected")
	}
	if res.Outcome != OutcomeCloudNotFound {
		t.Errorf("Outcome = %q, want %q", res.Outcome, OutcomeCloudNotFound)
	}
	if res.Service != "AWS S3 bucket" {
		t.Errorf("Service = %q, want AWS S3 bucket", res.Service)
	}
}

// A real bucket answers 403 (exists, private) and must pass.
func TestCheckPrivateBucketPasses(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusForbidden)
		fmt.Fprint(w, `<?xml version="1.0"?><Error><Code>AccessDenied</Code></Error>`)
	}))
	defer srv.Close()

	host := "acme-assets.s3.amazonaws.com"
	c := testChecker(stubResolver{addrs: map[string][]string{host: {"127.0.0.1"}}})
	res := c.Check(context.Background(), serverURL(t, srv, host, "/"))

	if !res.OK {
		t.Fatalf("a private bucket was rejected: %s", res.Message)
	}
	if res.HTTPStatus != http.StatusForbidden {
		t.Errorf("HTTPStatus = %d, want 403", res.HTTPStatus)
	}
}

// A name that resolves to a metadata or private address must be refused, and
// the probe must not connect to it.
func TestCheckRejectsInternalResolution(t *testing.T) {
	for name, addr := range map[string]string{
		"metadata": "169.254.169.254",
		"private":  "10.1.2.3",
		"loopback": "::1",
	} {
		t.Run(name, func(t *testing.T) {
			c := NewChecker(Options{
				Resolver: stubResolver{addrs: map[string][]string{"rebind.acme.test": {addr}}},
			})
			res := c.Check(context.Background(), "rebind.acme.test")

			if res.OK {
				t.Fatalf("a name resolving to %s should be rejected", addr)
			}
			if res.Outcome != OutcomeBlocked {
				t.Errorf("Outcome = %q, want %q", res.Outcome, OutcomeBlocked)
			}
		})
	}
}

// A public host that redirects into the metadata service must not be followed.
func TestCheckRejectsRedirectToMetadata(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		http.Redirect(w, nil2req(), "http://169.254.169.254/latest/meta-data/", http.StatusFound)
	}))
	defer srv.Close()

	c := testChecker(stubResolver{addrs: map[string][]string{"evil.acme.test": {"127.0.0.1"}}})
	res := c.Check(context.Background(), serverURL(t, srv, "evil.acme.test", "/"))

	if res.OK {
		t.Fatalf("a redirect to the metadata service should be rejected, got %q: %s", res.Outcome, res.Message)
	}
	if res.Outcome != OutcomeBlocked {
		t.Errorf("Outcome = %q, want %q", res.Outcome, OutcomeBlocked)
	}
}

// Nothing listening is inconclusive, not proof of a wrong target: firewalls
// drop probes, so the user may continue.
func TestCheckNoResponsePasses(t *testing.T) {
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("listen: %v", err)
	}
	port := ln.Addr().(*net.TCPAddr).Port
	ln.Close() // nothing is listening on this port now

	c := testChecker(stubResolver{addrs: map[string][]string{"quiet.acme.test": {"127.0.0.1"}}})
	res := c.Check(context.Background(), fmt.Sprintf("http://quiet.acme.test:%d/", port))

	if !res.OK {
		t.Fatalf("an unreachable but valid target was rejected: %s", res.Message)
	}
	if res.Outcome != OutcomeNoResponse {
		t.Errorf("Outcome = %q, want %q", res.Outcome, OutcomeNoResponse)
	}
}

func TestCheckInvalidInput(t *testing.T) {
	c := testChecker(stubResolver{})
	res := c.Check(context.Background(), "sjhfga")

	if res.OK {
		t.Fatal("a bare word should be rejected")
	}
	if res.Outcome != OutcomeInvalidInput {
		t.Errorf("Outcome = %q, want %q", res.Outcome, OutcomeInvalidInput)
	}
}

func TestCheckCloudAccountSkipsNetwork(t *testing.T) {
	// A nil resolver would panic if the probe tried to look anything up.
	c := NewChecker(Options{Resolver: stubResolver{}})
	res := c.Check(context.Background(), "123456789012")

	if !res.OK || res.Outcome != OutcomeAccountIdentifier {
		t.Fatalf("got OK=%v outcome=%q, want an accepted account identifier", res.OK, res.Outcome)
	}
	if !strings.Contains(res.Message, "credential") {
		t.Errorf("message should explain credentials reach the account, got %q", res.Message)
	}
}

func hasStep(res Result, name string, status StepStatus) bool {
	for _, s := range res.Steps {
		if s.Name == name && s.Status == status {
			return true
		}
	}
	return false
}

// nil2req is a stand-in request for http.Redirect, which only reads the
// method to decide the redirect body.
func nil2req() *http.Request {
	r, _ := http.NewRequest(http.MethodGet, "/", nil)
	return r
}

// When the first resolved address is dead and a later one answers, every
// following stage must probe the address that actually accepted the
// connection. Getting this wrong silently downgrades a live target to
// "reachable" and, for an object store, skips the body read that is the only
// thing distinguishing a real bucket from a typo.
func TestCheckUsesTheAddressThatAnswered(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	defer srv.Close()

	// 127.0.0.2 has nothing listening; 127.0.0.1 is the test server.
	c := testChecker(stubResolver{addrs: map[string][]string{"app.acme.test": {"127.0.0.2", "127.0.0.1"}}})
	res := c.Check(context.Background(), serverURL(t, srv, "app.acme.test", "/"))

	if res.Outcome != OutcomeResponding {
		t.Errorf("Outcome = %q, want %q — the second address answered", res.Outcome, OutcomeResponding)
	}
	if res.HTTPStatus != http.StatusOK {
		t.Errorf("HTTPStatus = %d, want 200 — HTTP probed the wrong address", res.HTTPStatus)
	}
	for _, s := range res.Steps {
		if s.Name == "tcp" && strings.Contains(s.Detail, "127.0.0.2") {
			t.Errorf("tcp step names an address it did not connect to: %q", s.Detail)
		}
	}
}

// The same mistake defeats the bucket check, because NoSuchBucket is only
// visible in the HTTP body.
func TestCheckNoSuchBucketOnSecondAddress(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusNotFound)
		fmt.Fprint(w, `<?xml version="1.0"?><Error><Code>NoSuchBucket</Code></Error>`)
	}))
	defer srv.Close()

	host := "typo-bucket.s3.amazonaws.com"
	c := testChecker(stubResolver{addrs: map[string][]string{host: {"127.0.0.2", "127.0.0.1"}}})
	res := c.Check(context.Background(), serverURL(t, srv, host, "/"))

	if res.OK {
		t.Fatalf("a nonexistent bucket passed the gate: %s", res.Message)
	}
	if res.Outcome != OutcomeCloudNotFound {
		t.Errorf("Outcome = %q, want %q", res.Outcome, OutcomeCloudNotFound)
	}
}
