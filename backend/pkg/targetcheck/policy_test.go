package targetcheck

import (
	"net/netip"
	"strings"
	"testing"
)

func TestPolicyBlocks(t *testing.T) {
	p := Policy{}
	blocked := []string{
		"127.0.0.1", "127.1.2.3", "::1",
		"0.0.0.0", "::",
		"169.254.169.254", // AWS/GCP/Azure/DO/Oracle metadata
		"169.254.170.2",   // ECS task metadata
		"fd00:ec2::254",   // AWS IMDS over IPv6
		"168.63.129.16",   // Azure WireServer
		"100.100.100.200", // Alibaba metadata
		"fe80::1",
		"10.0.0.5", "172.17.0.2", "172.31.255.1", "192.168.1.1", "100.64.0.1",
		"fc00::1", "fd12:3456::1",
		"224.0.0.1", "255.255.255.255", "240.0.0.1",
		"192.0.2.1", "198.51.100.1", "203.0.113.1", "198.18.0.1",
		"::ffff:127.0.0.1",       // IPv4-mapped loopback
		"::ffff:169.254.169.254", // IPv4-mapped metadata
		"2002:7f00:1::",          // 6to4 wrapping 127.0.0.1
		"64:ff9b::7f00:1",        // NAT64 wrapping 127.0.0.1
		"2001:db8::1",
	}

	for _, s := range blocked {
		t.Run(s, func(t *testing.T) {
			addr := netip.MustParseAddr(s)
			if ok, _ := p.Allowed(addr); ok {
				t.Errorf("Allowed(%s) = true, want false", s)
			}
		})
	}
}

func TestPolicyAllowsPublic(t *testing.T) {
	p := Policy{}
	allowed := []string{
		"1.1.1.1", "8.8.8.8", "52.216.59.226", "13.107.42.14",
		"2606:4700:4700::1111", "2001:4860:4860::8888",
	}

	for _, s := range allowed {
		t.Run(s, func(t *testing.T) {
			addr := netip.MustParseAddr(s)
			if ok, reason := p.Allowed(addr); !ok {
				t.Errorf("Allowed(%s) = false (%s), want true", s, reason)
			}
		})
	}
}

func TestPolicyAllowPrivate(t *testing.T) {
	p := Policy{AllowPrivate: true}

	if ok, _ := p.Allowed(netip.MustParseAddr("10.0.0.5")); !ok {
		t.Error("AllowPrivate should permit 10.0.0.5")
	}
	// Loopback and metadata stay blocked even then.
	for _, s := range []string{"127.0.0.1", "169.254.169.254", "::1"} {
		if ok, _ := p.Allowed(netip.MustParseAddr(s)); ok {
			t.Errorf("AllowPrivate must not permit %s", s)
		}
	}
}

func TestPolicyDenyList(t *testing.T) {
	p := Policy{Deny: []netip.Prefix{netip.MustParsePrefix("203.0.114.0/24")}}
	if ok, _ := p.Allowed(netip.MustParseAddr("203.0.114.7")); ok {
		t.Error("the operator denylist should block 203.0.114.7")
	}
}

func TestValidatorBlocksInternalLiterals(t *testing.T) {
	v := NewValidator(Policy{})
	for _, s := range []string{"127.0.0.1", "169.254.169.254", "10.0.0.1", "http://192.168.0.1/admin", "[::1]:8080"} {
		t.Run(s, func(t *testing.T) {
			res := v.Validate(s)
			if res.OK {
				t.Errorf("Validate(%q) accepted an internal target", s)
			}
			if res.Outcome != OutcomeBlocked {
				t.Errorf("Outcome = %q, want %q", res.Outcome, OutcomeBlocked)
			}
		})
	}
}

func TestValidatorAcceptsCloudAccount(t *testing.T) {
	res := NewValidator(Policy{}).Validate("123456789012")
	if !res.OK || res.Outcome != OutcomeAccountIdentifier {
		t.Fatalf("got OK=%v outcome=%q, want an accepted account identifier", res.OK, res.Outcome)
	}
	if res.CloudProvider != "aws" {
		t.Errorf("CloudProvider = %q, want aws", res.CloudProvider)
	}
}

func TestValidatorLabelsCloudEndpoints(t *testing.T) {
	tests := map[string]string{
		"acme-assets.s3.amazonaws.com":               "AWS S3 bucket",
		"acme.storage.googleapis.com":                "Google Cloud Storage bucket",
		"acmedata.blob.core.windows.net":             "Azure Storage account",
		"d111111abcdef8.cloudfront.net":              "AWS CloudFront distribution",
		"abc123.execute-api.us-east-1.amazonaws.com": "AWS API Gateway",
	}
	v := NewValidator(Policy{})
	for host, label := range tests {
		t.Run(host, func(t *testing.T) {
			res := v.Validate(host)
			if !res.OK {
				t.Fatalf("Validate(%q) rejected a valid cloud endpoint: %s", host, res.Message)
			}
			if res.Service != label {
				t.Errorf("Service = %q, want %q", res.Service, label)
			}
		})
	}
}

// A name that can only mean this machine is refused for where it points, not
// for how it is spelled: "localhost" must not be told to try "localhost.com".
func TestValidatorRejectsLocalNames(t *testing.T) {
	v := NewValidator(Policy{})
	for _, target := range []string{
		"localhost",
		"http://localhost:8000/scans/new",
		"localhost:8080",
		"api.localhost",
		"printer.local",
		"db.internal",
		"box.localdomain",
		"gateway.home.arpa",
	} {
		t.Run(target, func(t *testing.T) {
			res := v.Validate(target)
			if res.OK {
				t.Fatalf("Validate(%q) accepted a local name", target)
			}
			if res.Outcome != OutcomeBlocked {
				t.Errorf("Outcome = %q, want %q", res.Outcome, OutcomeBlocked)
			}
			if strings.Contains(res.Message, ".com") {
				t.Errorf("message advises a bogus domain: %q", res.Message)
			}
		})
	}
}

// AllowPrivate is for internal networks, but loopback by name stays refused
// just as 127.0.0.1 does.
func TestValidatorRejectsLocalhostEvenWithAllowPrivate(t *testing.T) {
	if res := NewValidator(Policy{AllowPrivate: true}).Validate("localhost"); res.OK {
		t.Error("localhost must stay blocked even with AllowPrivate")
	}
}
