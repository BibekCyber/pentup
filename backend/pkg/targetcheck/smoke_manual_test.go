package targetcheck

import (
	"context"
	"net"
	"os"
	"testing"
)

// TestSmokeRealTargets probes real hosts, so it is opt-in and never runs in CI.
//
//	TARGETCHECK_SMOKE=1 go test ./pkg/targetcheck -run Smoke -v
//
// Set TARGETCHECK_DNS to a resolver (e.g. 1.1.1.1:53) when the machine's own
// resolver is unreliable; a resolver that times out reports dns_error rather
// than the NXDOMAIN this exercise is meant to show.
func TestSmokeRealTargets(t *testing.T) {
	if os.Getenv("TARGETCHECK_SMOKE") == "" {
		t.Skip("set TARGETCHECK_SMOKE=1 to probe real hosts")
	}

	opts := Options{}
	if server := os.Getenv("TARGETCHECK_DNS"); server != "" {
		opts.Resolver = &net.Resolver{
			PreferGo: true,
			Dial: func(ctx context.Context, network, _ string) (net.Conn, error) {
				return (&net.Dialer{}).DialContext(ctx, network, server)
			},
		}
	}

	c := NewChecker(opts)
	for _, target := range []string{
		"example.com",
		"https://api.github.com/users/octocat",
		"acme-assets.s3.amazonaws.com",
		"zzqx-no-such-bucket-91827364.s3.amazonaws.com",
		"sjhfga.com",
		"sjhfga",
		"1.1.1.1",
		"169.254.169.254",
		"github.com:22",
		"expired.badssl.com",
		"wrong.host.badssl.com",
		"123456789012",
		"*.google.com",
	} {
		res := c.Check(context.Background(), target)
		t.Logf("%-46s OK=%-6v %-26s %s", target, res.OK, res.Outcome, res.Message)
		for _, s := range res.Steps {
			t.Logf("%-46s    %-5s %-4s %s", "", s.Name, s.Status, s.Detail)
		}
	}
}
