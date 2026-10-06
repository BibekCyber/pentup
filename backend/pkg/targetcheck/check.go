package targetcheck

import (
	"context"
	"crypto/tls"
	"crypto/x509"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/netip"
	"net/url"
	"strconv"
	"strings"
	"sync"
	"syscall"
	"time"
)

// Resolver is the subset of *net.Resolver the Checker uses.
type Resolver interface {
	LookupNetIP(ctx context.Context, network, host string) ([]netip.Addr, error)
	LookupMX(ctx context.Context, name string) ([]*net.MX, error)
	LookupNS(ctx context.Context, name string) ([]*net.NS, error)
	LookupTXT(ctx context.Context, name string) ([]string, error)
}

// Options configures a Checker. The zero value of each field selects a
// production default.
type Options struct {
	Policy   Policy
	Resolver Resolver       // nil: pure-Go resolver, which never parses "127.1" as an address
	RootCAs  *x509.CertPool // nil: system roots
	// UserAgent identifies the probe to the target's owner. Empty uses
	// defaultUserAgent.
	UserAgent string
}

// Checker validates a target and probes whether it answers, in bounded stages.
// Every connection is checked against the address Policy twice: once on the
// resolved address, and once at socket level, which closes the DNS-rebinding
// window between the two.
type Checker struct {
	validator *Validator
	policy    Policy
	resolver  Resolver
	roots     *x509.CertPool
	userAgent string

	dnsTimeout   time.Duration
	dialTimeout  time.Duration
	httpTimeout  time.Duration
	totalTimeout time.Duration
}

// NewChecker returns a Checker enforcing opts.Policy on every connection.
func NewChecker(opts Options) *Checker {
	resolver := opts.Resolver
	if resolver == nil {
		resolver = &net.Resolver{PreferGo: true}
	}
	ua := opts.UserAgent
	if ua == "" {
		ua = defaultUserAgent
	}
	return &Checker{
		validator:    NewValidator(opts.Policy),
		policy:       opts.Policy,
		resolver:     resolver,
		roots:        opts.RootCAs,
		userAgent:    ua,
		dnsTimeout:   4 * time.Second,
		dialTimeout:  4 * time.Second,
		httpTimeout:  6 * time.Second,
		totalTimeout: 15 * time.Second,
	}
}

var errBlocked = errors.New("destination blocked by policy")

const (
	defaultUserAgent = "PentAGI/1.0 (+https://pentagi.com)"
	maxBodyBytes     = 8 << 10
	maxRedirects     = 5
	// Only the first few addresses are tried, so a name with many records
	// cannot turn one check into a long series of connections.
	maxAddrs = 2
)

// tlsPorts are the ports probed with a TLS handshake before HTTP.
var tlsPorts = map[int]bool{443: true, 4443: true, 8443: true, 9443: true, 10443: true}

// httpPorts are the schemeless ports worth an HTTP request; others (SSH,
// databases) are judged on the TCP connection alone.
var httpPorts = map[int]bool{80: true, 443: true, 591: true, 3000: true, 4443: true, 5000: true,
	8000: true, 8008: true, 8080: true, 8081: true, 8443: true, 8888: true, 9000: true, 9443: true, 10443: true}

// Check validates raw and, when it is an address, probes it. It never returns
// an error: a rejection is a Result with OK == false and a user-facing Message.
//
// Only four outcomes reject: a malformed target, one pointing somewhere
// off-limits, a name that does not resolve, and an object store that reports
// the bucket does not exist. A target that exists but stays quiet still passes
// with a warning — firewalls and WAFs drop probes routinely, and getting past
// them is the engagement.
func (c *Checker) Check(ctx context.Context, raw string) Result {
	res, t := c.validator.validate(raw)
	if !res.OK || t.Kind == KindCloudAccount {
		return res
	}

	ctx, cancel := context.WithTimeout(ctx, c.totalTimeout)
	defer cancel()

	p := &probe{c: c, t: t, res: &res}
	if !t.Addr.IsValid() {
		p.svc, p.isCloud = recognizeCloud(t.Host)
	}
	p.run(ctx)
	return res
}

type probe struct {
	c       *Checker
	t       Target
	res     *Result
	svc     cloudService
	isCloud bool
}

func (p *probe) step(name string, status StepStatus, detail string) {
	p.res.step(name, status, detail)
}

func (p *probe) finish(ok bool, outcome Outcome, format string, args ...any) {
	p.res.OK = ok
	p.res.Outcome = outcome
	p.res.Message = fmt.Sprintf(format, args...)
}

// subject is how the target is named back to the user.
func (p *probe) subject() string {
	host := p.t.Host
	if strings.Contains(host, ":") {
		host = "[" + host + "]"
	}
	if p.t.Port != 0 && p.t.Kind != KindURL {
		host += ":" + strconv.Itoa(p.t.Port)
	}
	if p.isCloud {
		return p.svc.label + " " + host
	}
	return host
}

func (p *probe) run(ctx context.Context) {
	addrs, cont := p.resolve(ctx)
	if !cont {
		return
	}

	port := p.t.Port
	if port == 0 {
		port = 443
	}

	conn, addr, state := p.connect(ctx, addrs, port)
	if conn != nil {
		conn.Close()
	}

	// A bare domain that refuses 443 may still serve plain HTTP.
	if state != tcpOpen && p.t.Port == 0 {
		if altConn, altAddr, alt := p.connect(ctx, addrs, 80); alt == tcpOpen {
			altConn.Close()
			port, state, addr = 80, alt, altAddr
		}
	}

	if state != tcpOpen {
		p.finish(true, OutcomeNoResponse,
			"%s resolves, but nothing answered on port %d. The target may be firewalled, filtered or offline — you can continue, and the scan will probe it properly.",
			p.subject(), port)
		return
	}

	// Every later stage uses the address that actually answered. A dual-stack
	// target on a host without working IPv6 egress resolves AAAA first and
	// fails on it, so probing addrs[0] would point TLS and HTTP at a dead
	// address and skip the body read the bucket check depends on.
	p.step("tcp", StepOK, fmt.Sprintf("Connected to %s on port %d", addr, port))

	secure := p.t.Scheme == "https" || (p.t.Scheme == "" && tlsPorts[port])
	if secure {
		p.tlsStage(ctx, addr, port)
	} else {
		p.step("tls", StepSkip, "Plain HTTP port, so no TLS handshake")
	}

	if p.t.Kind == KindURL || httpPorts[port] {
		p.httpStage(ctx, addr, port, secure)
		return
	}

	p.step("http", StepSkip, "Not a web port, so the open TCP port is the signal")
	p.finish(true, OutcomeReachable, "%s is reachable — port %d accepted a connection.", p.subject(), port)
}

// resolve returns the addresses to probe. cont == false means the check is
// already decided.
func (p *probe) resolve(ctx context.Context) ([]netip.Addr, bool) {
	if p.t.Addr.IsValid() {
		p.step("dns", StepSkip, "Literal IP address, so no lookup is needed")
		return []netip.Addr{p.t.Addr.Unmap()}, true
	}

	dctx, cancel := context.WithTimeout(ctx, p.c.dnsTimeout)
	found, err := p.c.resolver.LookupNetIP(dctx, "ip", p.t.Host)
	cancel()

	if err != nil && !isNotFound(err) {
		detail := dnsErrText(err)
		p.step("dns", StepWarn, "Lookup failed: "+detail)
		p.finish(true, OutcomeDNSError,
			"The DNS lookup for %s could not be completed (%s), so availability is unknown. You can continue.",
			p.t.Host, detail)
		return nil, false
	}

	var allowed []netip.Addr
	var blockedReason string
	for _, a := range found {
		a = a.Unmap()
		if ok, reason := p.c.policy.Allowed(a); ok {
			allowed = append(allowed, a)
		} else if blockedReason == "" {
			blockedReason = reason
		}
	}

	if len(allowed) > 0 {
		if len(allowed) > maxAddrs {
			allowed = allowed[:maxAddrs]
		}
		p.step("dns", StepOK, fmt.Sprintf("%s resolves to %s", p.t.Host, joinAddrs(allowed)))
		return allowed, true
	}

	if blockedReason != "" {
		p.step("dns", StepFail, "Resolves to "+blockedReason)
		p.finish(false, OutcomeBlocked,
			"%s resolves to %s. This platform only tests targets reachable over the public internet.",
			p.t.Host, blockedReason)
		return nil, false
	}

	// No address records. The name may still exist — a domain used only for
	// mail, or one whose services live on subdomains — so check other record
	// types before calling it a typo.
	if kind, ok := p.otherRecords(ctx); ok {
		p.step("dns", StepWarn, "No A/AAAA record, but "+kind+" exists")
		p.finish(true, OutcomeDNSOnly,
			"%s exists in DNS (%s) but has no address record, so there is no host to connect to. "+
				"That is normal for a domain whose services run on subdomains — you can continue.",
			p.t.Host, kind)
		return nil, false
	}

	p.step("dns", StepFail, "No DNS records found")
	p.finish(false, OutcomeDNSNotFound,
		"%s does not resolve — no DNS records exist for it. Check the spelling, or enter the exact host or URL you mean to test.",
		p.t.Host)
	return nil, false
}

// otherRecords reports whether the name exists with some non-address record.
func (p *probe) otherRecords(ctx context.Context) (string, bool) {
	ctx, cancel := context.WithTimeout(ctx, p.c.dnsTimeout)
	defer cancel()

	type found struct {
		kind string
		ok   bool
	}
	results := make([]found, 3)
	var wg sync.WaitGroup
	wg.Add(3)

	go func() {
		defer wg.Done()
		mx, err := p.c.resolver.LookupMX(ctx, p.t.Host)
		results[0] = found{"a mail record", err == nil && len(mx) > 0}
	}()
	go func() {
		defer wg.Done()
		ns, err := p.c.resolver.LookupNS(ctx, p.t.Host)
		results[1] = found{"a name-server record", err == nil && len(ns) > 0}
	}()
	go func() {
		defer wg.Done()
		txt, err := p.c.resolver.LookupTXT(ctx, p.t.Host)
		results[2] = found{"a TXT record", err == nil && len(txt) > 0}
	}()
	wg.Wait()

	for _, r := range results {
		if r.ok {
			return r.kind, true
		}
	}
	return "", false
}

type tcpState int

const (
	tcpNoResponse tcpState = iota
	tcpRefused
	tcpOpen
)

// connect dials the addresses in turn and returns the open connection together
// with the address it reached, which the caller must use for every later stage.
func (p *probe) connect(ctx context.Context, addrs []netip.Addr, port int) (net.Conn, netip.Addr, tcpState) {
	state := tcpNoResponse
	for _, addr := range addrs {
		conn, err := p.c.dial(ctx, addr, port)
		if err == nil {
			return conn, addr, tcpOpen
		}
		if errors.Is(err, syscall.ECONNREFUSED) || errors.Is(err, syscall.ECONNRESET) {
			state = tcpRefused
		}
		if ctx.Err() != nil {
			break
		}
	}
	return nil, netip.Addr{}, state
}

// tlsStage records whether TLS completes and whether the certificate matches
// the hostname. A certificate problem is a finding, never a rejection.
func (p *probe) tlsStage(ctx context.Context, addr netip.Addr, port int) {
	conn, err := p.c.dial(ctx, addr, port)
	if err != nil {
		p.step("tls", StepWarn, "Could not reopen the connection for a TLS handshake")
		return
	}
	defer conn.Close()

	hctx, cancel := context.WithTimeout(ctx, p.c.dialTimeout)
	defer cancel()

	tc := tls.Client(conn, &tls.Config{ServerName: p.t.Host, RootCAs: p.c.roots})
	if err := tc.HandshakeContext(hctx); err == nil {
		p.step("tls", StepOK, "Valid certificate for "+p.t.Host)
		return
	} else if !isCertError(err) {
		p.step("tls", StepWarn, "No TLS on this port: "+shortErr(err))
		return
	}

	// Retry without verification to separate "TLS works, certificate is
	// wrong" from "this port does not speak TLS".
	conn2, err := p.c.dial(ctx, addr, port)
	if err != nil {
		p.step("tls", StepWarn, "Certificate could not be verified")
		return
	}
	defer conn2.Close()

	tc2 := tls.Client(conn2, &tls.Config{ServerName: p.t.Host, InsecureSkipVerify: true}) //nolint:gosec // diagnostic only; nothing is sent over this connection
	if err := tc2.HandshakeContext(hctx); err != nil {
		p.step("tls", StepWarn, "No TLS on this port: "+shortErr(err))
		return
	}
	detail := "TLS works but the certificate is not valid for " + p.t.Host
	if names := tc2.ConnectionState().PeerCertificates; len(names) > 0 {
		if cn := certNames(names[0]); cn != "" {
			detail += " (it is for " + cn + ")"
		}
	}
	p.step("tls", StepWarn, detail)
}

func (p *probe) httpStage(ctx context.Context, addr netip.Addr, port int, secure bool) {
	scheme := "http"
	if secure {
		scheme = "https"
	}
	if p.t.Scheme != "" {
		scheme = p.t.Scheme
	}

	host := p.t.Host
	if strings.Contains(host, ":") {
		host = "[" + host + "]"
	}
	target := scheme + "://" + host
	if (scheme == "https" && port != 443) || (scheme == "http" && port != 80) {
		target += ":" + strconv.Itoa(port)
	}
	target += p.t.Path

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, target, nil)
	if err != nil {
		p.step("http", StepWarn, "Could not build the request")
		p.finish(true, OutcomeReachable, "%s is reachable — port %d accepted a connection.", p.subject(), port)
		return
	}
	req.Header.Set("User-Agent", p.c.userAgent)
	req.Header.Set("Accept", "*/*")

	client := p.c.httpClient(hostPort(p.t.Host, port), addr)
	resp, err := client.Do(req)
	if err != nil {
		if errors.Is(err, errBlocked) {
			p.step("http", StepFail, "A redirect pointed at a blocked address")
			p.finish(false, OutcomeBlocked,
				"%s redirects to an internal address, which this platform will not follow.", p.subject())
			return
		}
		p.step("http", StepWarn, "No HTTP response: "+shortErr(err))
		p.finish(true, OutcomeReachable,
			"%s accepts connections on port %d but did not complete an HTTP response. You can continue.",
			p.subject(), port)
		return
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(io.LimitReader(resp.Body, maxBodyBytes))
	p.res.HTTPStatus = resp.StatusCode

	// An object store answers for every bucket name, so only the body
	// distinguishes a real bucket from a typo.
	if p.isCloud && p.svc.storage && isNoSuchBucket(body) {
		p.step("http", StepFail, fmt.Sprintf("HTTP %d — NoSuchBucket", resp.StatusCode))
		p.finish(false, OutcomeCloudNotFound,
			"%s does not exist — %s reports no such bucket. Check the bucket name.",
			p.subject(), p.svc.provider)
		return
	}

	p.step("http", httpStepStatus(resp.StatusCode), httpDetail(resp))
	p.finish(true, OutcomeResponding, "%s is live — it answered with HTTP %d.", p.subject(), resp.StatusCode)
}

// dial opens a TCP connection to a policy-approved address.
func (c *Checker) dial(ctx context.Context, addr netip.Addr, port int) (net.Conn, error) {
	if ok, _ := c.policy.Allowed(addr); !ok {
		return nil, errBlocked
	}
	d := net.Dialer{Timeout: c.dialTimeout, Control: c.control}
	return d.DialContext(ctx, "tcp", netip.AddrPortFrom(addr, uint16(port)).String())
}

// control is the last gate before the socket connects: it sees the address the
// kernel will actually use, so a name that changed its answer mid-check is
// still caught.
func (c *Checker) control(network, address string, _ syscall.RawConn) error {
	ap, err := netip.ParseAddrPort(address)
	if err != nil {
		return err
	}
	if ok, _ := c.policy.Allowed(ap.Addr()); !ok {
		return errBlocked
	}
	return nil
}

// httpClient returns a client that reuses the address already resolved and
// approved for pinnedHost, and independently resolves and re-approves any
// other host a redirect leads to.
func (c *Checker) httpClient(pinnedHost string, pinned netip.Addr) *http.Client {
	transport := &http.Transport{
		Proxy: nil, // never route a target probe through an egress proxy
		DialContext: func(ctx context.Context, network, address string) (net.Conn, error) {
			if address == pinnedHost {
				return c.dial(ctx, pinned, portOf(address))
			}
			return c.dialHost(ctx, address)
		},
		TLSClientConfig:       &tls.Config{RootCAs: c.roots},
		DisableKeepAlives:     true,
		MaxIdleConns:          1,
		TLSHandshakeTimeout:   c.dialTimeout,
		ResponseHeaderTimeout: c.httpTimeout,
	}
	return &http.Client{
		Transport: transport,
		Timeout:   c.httpTimeout,
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			if len(via) >= maxRedirects {
				return http.ErrUseLastResponse
			}
			if req.URL.Scheme != "http" && req.URL.Scheme != "https" {
				return errBlocked
			}
			return nil
		},
	}
}

// dialHost resolves a redirect target and applies the policy before dialing.
func (c *Checker) dialHost(ctx context.Context, address string) (net.Conn, error) {
	host, portStr, err := net.SplitHostPort(address)
	if err != nil {
		return nil, err
	}
	port, err := strconv.Atoi(portStr)
	if err != nil {
		return nil, err
	}

	if addr, err := netip.ParseAddr(host); err == nil {
		return c.dial(ctx, addr.Unmap(), port)
	}

	rctx, cancel := context.WithTimeout(ctx, c.dnsTimeout)
	addrs, err := c.resolver.LookupNetIP(rctx, "ip", host)
	cancel()
	if err != nil {
		return nil, err
	}
	for _, a := range addrs {
		a = a.Unmap()
		if ok, _ := c.policy.Allowed(a); ok {
			return c.dial(ctx, a, port)
		}
	}
	return nil, errBlocked
}

func hostPort(host string, port int) string {
	return net.JoinHostPort(host, strconv.Itoa(port))
}

func portOf(address string) int {
	_, p, err := net.SplitHostPort(address)
	if err != nil {
		return 0
	}
	n, _ := strconv.Atoi(p)
	return n
}

func joinAddrs(addrs []netip.Addr) string {
	parts := make([]string, 0, len(addrs))
	for _, a := range addrs {
		parts = append(parts, a.String())
	}
	return strings.Join(parts, ", ")
}

func httpStepStatus(code int) StepStatus {
	if code >= 500 {
		return StepWarn
	}
	return StepOK
}

func httpDetail(resp *http.Response) string {
	detail := fmt.Sprintf("HTTP %d", resp.StatusCode)
	switch {
	case resp.StatusCode == http.StatusUnauthorized || resp.StatusCode == http.StatusForbidden:
		detail += " — the endpoint exists and is restricted"
	case resp.StatusCode == http.StatusNotFound:
		detail += " — the host answers, but not at this path"
	case resp.StatusCode >= 500:
		detail += " — the host answers but reports a server error"
	}
	if server := resp.Header.Get("Server"); server != "" {
		detail += " · " + truncate(server, 40)
	}
	if loc, err := resp.Location(); err == nil && loc != nil {
		detail += " · redirected to " + truncate(redactURL(loc), 60)
	}
	return detail
}

func redactURL(u *url.URL) string {
	c := *u
	c.User = nil
	c.RawQuery = ""
	c.Fragment = ""
	return c.String()
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n-1] + "…"
}

func certNames(cert *x509.Certificate) string {
	names := cert.DNSNames
	if len(names) == 0 {
		return cert.Subject.CommonName
	}
	if len(names) > 2 {
		return strings.Join(names[:2], ", ") + fmt.Sprintf(" and %d more", len(names)-2)
	}
	return strings.Join(names, ", ")
}

func isCertError(err error) bool {
	var unknown x509.UnknownAuthorityError
	var invalid x509.CertificateInvalidError
	var hostname x509.HostnameError
	var verify *tls.CertificateVerificationError
	return errors.As(err, &unknown) || errors.As(err, &invalid) ||
		errors.As(err, &hostname) || errors.As(err, &verify)
}

func isNotFound(err error) bool {
	var dnsErr *net.DNSError
	return errors.As(err, &dnsErr) && dnsErr.IsNotFound
}

func dnsErrText(err error) string {
	var dnsErr *net.DNSError
	if errors.As(err, &dnsErr) {
		switch {
		case dnsErr.IsTimeout:
			return "the lookup timed out"
		case dnsErr.IsTemporary:
			return "a temporary DNS failure"
		}
	}
	if errors.Is(err, context.DeadlineExceeded) {
		return "the lookup timed out"
	}
	return "a DNS error"
}

// shortErr strips the host/address noise Go wraps around network errors, which
// would otherwise repeat the target back inside the message.
func shortErr(err error) string {
	var opErr *net.OpError
	if errors.As(err, &opErr) && opErr.Err != nil {
		err = opErr.Err
	}
	var urlErr *url.Error
	if errors.As(err, &urlErr) && urlErr.Err != nil {
		err = urlErr.Err
	}
	msg := err.Error()
	if i := strings.LastIndex(msg, ": "); i > 0 && len(msg)-i < 60 {
		msg = msg[i+2:]
	}
	return truncate(msg, 80)
}
