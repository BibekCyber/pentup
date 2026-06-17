package tools

import (
	"context"
	"crypto/tls"
	"fmt"
	"net"
	"net/http"
	"net/url"
	"strings"
	"time"
)

const (
	reconTimeout     = 10 * time.Second
	reconDialTimeout = 4 * time.Second
)

// RunRecon performs lightweight, passive reconnaissance against a domain: an
// HTTP probe, DNS record lookups, and TLS certificate SAN inspection. It is
// deliberately non-intrusive — no port scanning, no enumeration — and
// identifies itself with the supplied User-Agent. The returned map is suitable
// for serialising to JSON and feeding to the domain classifier. Individual
// probes record their own errors instead of failing the whole run; RunRecon
// only errors when the domain itself is unusable.
func RunRecon(ctx context.Context, domain, userAgent string) (map[string]interface{}, error) {
	host := normalizeReconHost(domain)
	if host == "" {
		return nil, fmt.Errorf("invalid domain: %q", domain)
	}

	ctx, cancel := context.WithTimeout(ctx, reconTimeout)
	defer cancel()

	return map[string]interface{}{
		"domain": host,
		"dns":    reconDNS(ctx, host),
		"tls":    reconTLS(ctx, host),
		"http":   reconHTTP(ctx, host, userAgent),
	}, nil
}

// normalizeReconHost reduces a user-supplied value (which may include a scheme,
// path or port) to a bare hostname.
func normalizeReconHost(domain string) string {
	host := strings.TrimSpace(domain)
	if host == "" {
		return ""
	}

	if !strings.Contains(host, "://") {
		host = "//" + host
	}
	parsed, err := url.Parse(host)
	if err != nil {
		return ""
	}

	hostname := parsed.Hostname()
	if hostname == "" {
		hostname = strings.SplitN(strings.TrimPrefix(domain, "//"), "/", 2)[0]
	}

	return strings.ToLower(strings.TrimSpace(hostname))
}

func reconDNS(ctx context.Context, host string) map[string]interface{} {
	var resolver net.Resolver
	dns := map[string]interface{}{}

	if ips, err := resolver.LookupIPAddr(ctx, host); err == nil {
		var a, aaaa []string
		for _, ip := range ips {
			if ip.IP.To4() != nil {
				a = append(a, ip.IP.String())
			} else {
				aaaa = append(aaaa, ip.IP.String())
			}
		}
		dns["a"] = a
		dns["aaaa"] = aaaa
	}

	if cname, err := resolver.LookupCNAME(ctx, host); err == nil {
		dns["cname"] = strings.TrimSuffix(cname, ".")
	}

	if mx, err := resolver.LookupMX(ctx, host); err == nil {
		hosts := make([]string, 0, len(mx))
		for _, record := range mx {
			hosts = append(hosts, strings.TrimSuffix(record.Host, "."))
		}
		dns["mx"] = hosts
	}

	if txt, err := resolver.LookupTXT(ctx, host); err == nil {
		dns["txt"] = txt
	}

	return dns
}

func reconTLS(ctx context.Context, host string) map[string]interface{} {
	dialer := &tls.Dialer{
		NetDialer: &net.Dialer{Timeout: reconDialTimeout},
		// Passive inspection only: we read the certificate, we do not
		// authenticate against it, so an invalid chain must not abort recon.
		Config: &tls.Config{InsecureSkipVerify: true, ServerName: host},
	}

	conn, err := dialer.DialContext(ctx, "tcp", net.JoinHostPort(host, "443"))
	if err != nil {
		return map[string]interface{}{"reachable": false}
	}
	defer conn.Close()

	tlsConn, ok := conn.(*tls.Conn)
	if !ok {
		return map[string]interface{}{"reachable": false}
	}

	state := tlsConn.ConnectionState()
	if len(state.PeerCertificates) == 0 {
		return map[string]interface{}{"reachable": true}
	}

	cert := state.PeerCertificates[0]
	return map[string]interface{}{
		"reachable": true,
		"subject":   cert.Subject.CommonName,
		"issuer":    cert.Issuer.CommonName,
		"sans":      cert.DNSNames,
	}
}

func reconHTTP(ctx context.Context, host, userAgent string) map[string]interface{} {
	client := &http.Client{
		Timeout: reconTimeout,
		Transport: &http.Transport{
			TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
		},
	}

	for _, scheme := range []string{"https", "http"} {
		target := fmt.Sprintf("%s://%s/", scheme, host)
		req, err := http.NewRequestWithContext(ctx, http.MethodGet, target, nil)
		if err != nil {
			continue
		}
		req.Header.Set("User-Agent", userAgent)

		resp, err := client.Do(req)
		if err != nil {
			continue
		}
		resp.Body.Close()

		return map[string]interface{}{
			"reachable":    true,
			"scheme":       scheme,
			"url":          target,
			"status_code":  resp.StatusCode,
			"server":       resp.Header.Get("Server"),
			"x_powered_by": resp.Header.Get("X-Powered-By"),
			"content_type": resp.Header.Get("Content-Type"),
		}
	}

	return map[string]interface{}{"reachable": false}
}
