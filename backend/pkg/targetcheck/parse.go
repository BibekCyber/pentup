// Package targetcheck validates a scan target string: its format (domain, URL,
// IP, cloud endpoint or cloud account ID) and, for IP literals, the address
// Policy that keeps scans off loopback, private networks and cloud metadata
// endpoints. The scan wizard uses the verdict as a gate; createScan repeats it
// server-side. The format rules are mirrored for instant feedback in
// frontend/src/lib/target-validation.ts.
package targetcheck

import (
	"fmt"
	"net/netip"
	"net/url"
	"regexp"
	"strconv"
	"strings"
	"unicode/utf8"

	"golang.org/x/net/idna"
)

// Kind is the shape of a target string.
type Kind string

const (
	KindURL          Kind = "url"
	KindHost         Kind = "host"
	KindIP           Kind = "ip"
	KindCloudAccount Kind = "cloud_account"
	KindInvalid      Kind = "invalid"
)

// Target is a parsed, normalized scan target.
type Target struct {
	Input  string // trimmed original
	Kind   Kind
	Scheme string // "http"/"https" for URLs, "" otherwise
	// Host is the lowercase ASCII hostname (wildcard prefix removed), or the
	// IP literal when Addr is set.
	Host string
	Addr netip.Addr
	// Port is the explicit port, or the scheme default for URLs. Zero means
	// the user named no particular service.
	Port     int
	Path     string // request path (+query) for the HTTP probe
	Wildcard bool   // "*.acme.com"

	CloudProvider  string // aws|azure|gcp, for account identifiers only
	CloudAccountID string
}

// RequiresService reports whether the user named a specific service (a URL or
// an explicit port), which must then accept a connection.
func (t Target) RequiresService() bool {
	return t.Port != 0
}

// ParseError is a user-facing reason a target string was rejected.
type ParseError struct{ msg string }

func (e *ParseError) Error() string { return e.msg }

func invalid(format string, args ...any) error {
	return &ParseError{msg: fmt.Sprintf(format, args...)}
}

// BlockedError rejects a target for where it points rather than how it is
// written, so the caller can report it as a blocked destination instead of
// telling the user to fix their spelling.
type BlockedError struct{ msg string }

func (e *BlockedError) Error() string { return e.msg }

func blocked(format string, args ...any) error {
	return &BlockedError{msg: fmt.Sprintf(format, args...)}
}

// localSuffixes are names that always denote the machine itself or a private
// network: loopback (RFC 6761), mDNS, and the internal zones clouds hand out.
var localSuffixes = []string{".localhost", ".local", ".internal", ".localdomain", ".home.arpa"}

// isLocalName reports whether a hostname can only ever mean "not a public
// target", so the reason given is the destination and not the format.
func isLocalName(host string) bool {
	if host == "localhost" {
		return true
	}
	for _, suffix := range localSuffixes {
		if strings.HasSuffix(host, suffix) {
			return true
		}
	}
	return false
}

const maxTargetLen = 2048

var (
	// AWS account IDs: 12 digits, optionally grouped as the console shows them.
	awsAccountRe = regexp.MustCompile(`^(\d{12}|\d{4}-\d{4}-\d{4})$`)
	// Azure subscription (or tenant) GUID, bare or as a resource ID.
	azureAccountRe = regexp.MustCompile(`(?i)^(?:/subscriptions/)?([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/?$`)
	// GCP project in resource-name form. A bare project ID is indistinguishable
	// from a typo like "sjhfga", so the "projects/" prefix is required.
	gcpProjectRe = regexp.MustCompile(`^projects/([a-z][a-z0-9-]{4,28}[a-z0-9])/?$`)

	// DNS labels: letters, digits, hyphens; underscores appear in real
	// records (e.g. _dmarc) so they are tolerated.
	labelRe = regexp.MustCompile(`^[a-z0-9_]([a-z0-9_-]*[a-z0-9_])?$`)
	// Top-level domains are alphabetic, or punycode for IDN TLDs.
	tldRe = regexp.MustCompile(`^([a-z][a-z0-9-]*[a-z0-9]|xn--[a-z0-9-]+)$`)
)

// Parse classifies and normalizes a raw target string. It performs no network
// access; a nil error means the string is well formed, not that it exists.
func Parse(raw string) (Target, error) {
	s := strings.TrimSpace(raw)
	t := Target{Input: s, Kind: KindInvalid}

	switch {
	case s == "":
		return t, invalid("Enter a target.")
	case len(s) > maxTargetLen:
		return t, invalid("The target is too long.")
	case !utf8.ValidString(s):
		return t, invalid("The target contains invalid characters.")
	case strings.ContainsAny(s, " \t\r\n"):
		return t, invalid("Enter a single domain, URL or IP without spaces.")
	}

	if acct, ok := parseCloudAccount(s); ok {
		return acct, nil
	}

	if _, err := netip.ParsePrefix(s); err == nil {
		return t, invalid("IP ranges aren't supported. Enter a single IP, domain or URL.")
	}

	if addr, err := netip.ParseAddr(s); err == nil {
		return ipTarget(t, addr, 0)
	}
	if ap, err := netip.ParseAddrPort(s); err == nil {
		if ap.Port() == 0 {
			return t, invalid("Port must be between 1 and 65535.")
		}
		return ipTarget(t, ap.Addr(), int(ap.Port()))
	}

	lower := strings.ToLower(s)
	if i := strings.Index(lower, "://"); i >= 0 {
		scheme := lower[:i]
		if scheme != "http" && scheme != "https" {
			return t, invalid("Only http:// and https:// URLs are supported.")
		}
		u, err := url.Parse(s)
		if err != nil {
			return t, invalid("That URL isn't valid.")
		}
		return orInvalid(fromURL(t, u, scheme))
	}
	if strings.HasPrefix(lower, "http:") || strings.HasPrefix(lower, "https:") {
		return t, invalid("That URL is malformed. Did you mean https://…?")
	}

	// Schemeless: host[:port][/path]
	u, err := url.Parse("//" + s)
	if err != nil {
		return t, invalid("That isn't a valid domain, URL or IP address.")
	}
	return orInvalid(fromURL(t, u, ""))
}

// orInvalid discards a partly-filled target when parsing failed, so a rejected
// input is never reported with a Kind that suggests it was understood.
func orInvalid(t Target, err error) (Target, error) {
	if err != nil {
		return Target{Input: t.Input, Kind: KindInvalid}, err
	}
	return t, nil
}

func parseCloudAccount(s string) (Target, bool) {
	t := Target{Input: s, Kind: KindCloudAccount}
	switch {
	case awsAccountRe.MatchString(s):
		t.CloudProvider = "aws"
		t.CloudAccountID = strings.ReplaceAll(s, "-", "")
	case azureAccountRe.MatchString(s):
		t.CloudProvider = "azure"
		t.CloudAccountID = strings.ToLower(azureAccountRe.FindStringSubmatch(s)[1])
	case gcpProjectRe.MatchString(s):
		t.CloudProvider = "gcp"
		t.CloudAccountID = gcpProjectRe.FindStringSubmatch(s)[1]
	default:
		return Target{}, false
	}
	return t, true
}

func ipTarget(t Target, addr netip.Addr, port int) (Target, error) {
	if addr.Zone() != "" {
		return t, invalid("IPv6 zone identifiers (%%…) aren't supported.")
	}
	t.Kind = KindIP
	t.Addr = addr
	t.Host = addr.String()
	t.Port = port
	t.Path = "/"
	return t, nil
}

func fromURL(t Target, u *url.URL, scheme string) (Target, error) {
	if u.User != nil {
		return t, invalid("Remove the username/password from the target. Add credentials in the Credentials step.")
	}
	if u.Opaque != "" {
		return t, invalid("That isn't a valid domain, URL or IP address.")
	}

	hostname := u.Hostname()
	if hostname == "" {
		return t, invalid("The target is missing a host, e.g. acme.com or https://app.acme.com.")
	}

	port := 0
	if p := u.Port(); p != "" {
		n, err := strconv.Atoi(p)
		if err != nil || n < 1 || n > 65535 {
			return t, invalid("Port must be between 1 and 65535.")
		}
		port = n
	} else if strings.HasSuffix(u.Host, ":") {
		return t, invalid("The port after ':' is empty.")
	}

	path := u.EscapedPath()
	if path == "" {
		path = "/"
	}
	if u.RawQuery != "" {
		path += "?" + u.RawQuery
	}

	t.Scheme = scheme
	t.Path = path
	t.Port = port
	if scheme != "" {
		t.Kind = KindURL
		if t.Port == 0 {
			t.Port = defaultPort(scheme)
		}
	}

	if addr, err := netip.ParseAddr(hostname); err == nil {
		if addr.Zone() != "" {
			return t, invalid("IPv6 zone identifiers (%%…) aren't supported.")
		}
		t.Addr = addr
		t.Host = addr.String()
		if scheme == "" {
			t.Kind = KindIP
		}
		return t, nil
	}

	if strings.HasPrefix(hostname, "*.") {
		if scheme != "" || port != 0 || path != "/" {
			return t, invalid("A wildcard target can't include http(s)://, a port or a path. Enter it as *.acme.com.")
		}
		t.Wildcard = true
		hostname = hostname[2:]
	}

	host, err := normalizeHostname(hostname)
	if err != nil {
		return t, err
	}
	t.Host = host
	if scheme == "" {
		t.Kind = KindHost
	}
	return t, nil
}

func defaultPort(scheme string) int {
	if scheme == "http" {
		return 80
	}
	return 443
}

// normalizeHostname lowercases, converts IDNs to punycode and enforces a fully
// qualified domain name with a real top-level domain.
func normalizeHostname(h string) (string, error) {
	h = strings.TrimSuffix(h, ".")
	for _, r := range h {
		if r > utf8.RuneSelf {
			ascii, err := idna.Lookup.ToASCII(h)
			if err != nil {
				return "", invalid("That domain name isn't valid.")
			}
			h = ascii
			break
		}
	}
	h = strings.ToLower(h)

	// Checked before the shape rules, so "localhost" is told it points at this
	// server rather than being advised to enter "localhost.com".
	if isLocalName(h) {
		return "", blocked("%s is a local or internal name, not a public target. This platform only tests targets reachable over the public internet.", h)
	}

	if len(h) > 253 {
		return "", invalid("That domain name is too long.")
	}

	labels := strings.Split(h, ".")
	if len(labels) < 2 {
		return "", invalid("Enter a full domain such as %s.com, a URL or an IP address. A single word isn't a reachable host.", h)
	}
	for _, label := range labels {
		switch {
		case label == "":
			return "", invalid("That domain has an empty part (two dots in a row?).")
		case len(label) > 63:
			return "", invalid("Each part of a domain must be 63 characters or fewer.")
		case !labelRe.MatchString(label):
			return "", invalid("That domain contains characters that aren't allowed.")
		}
	}

	tld := labels[len(labels)-1]
	if isDigits(tld) {
		// Catches malformed IPs ("10.0.0.256", "127.1") before they reach DNS.
		return "", invalid("That isn't a valid IP address or domain.")
	}
	if !tldRe.MatchString(tld) {
		return "", invalid("That domain doesn't end in a valid top-level domain (like .com).")
	}
	return h, nil
}

func isDigits(s string) bool {
	if s == "" {
		return false
	}
	for _, r := range s {
		if r < '0' || r > '9' {
			return false
		}
	}
	return true
}
