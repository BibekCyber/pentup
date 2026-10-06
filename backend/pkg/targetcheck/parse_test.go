package targetcheck

import "testing"

func TestParseAccepts(t *testing.T) {
	tests := []struct {
		name string
		in   string
		kind Kind
		host string
		port int
	}{
		{"bare domain", "acme.com", KindHost, "acme.com", 0},
		{"subdomain", "api.staging.acme.co.uk", KindHost, "api.staging.acme.co.uk", 0},
		{"uppercase is normalized", "ACME.com", KindHost, "acme.com", 0},
		{"trailing dot is dropped", "acme.com.", KindHost, "acme.com", 0},
		{"underscore label", "_dmarc.acme.com", KindHost, "_dmarc.acme.com", 0},
		{"hyphenated label", "acme-assets.s3.amazonaws.com", KindHost, "acme-assets.s3.amazonaws.com", 0},
		{"wildcard", "*.acme.com", KindHost, "acme.com", 0},
		{"idn becomes punycode", "münchen.de", KindHost, "xn--mnchen-3ya.de", 0},
		{"host with port", "acme.com:8443", KindHost, "acme.com", 8443},
		{"https url", "https://app.acme.com", KindURL, "app.acme.com", 443},
		{"http url", "http://app.acme.com", KindURL, "app.acme.com", 80},
		{"url with port", "https://app.acme.com:8443/x", KindURL, "app.acme.com", 8443},
		{"api url with path", "https://api.acme.com/v2/users", KindURL, "api.acme.com", 443},
		{"url with query", "https://api.acme.com/s?q=1", KindURL, "api.acme.com", 443},
		{"scheme case is ignored", "HTTPS://acme.com", KindURL, "acme.com", 443},
		{"ipv4", "203.0.113.9", KindIP, "203.0.113.9", 0},
		{"ipv4 with port", "203.0.113.9:8080", KindIP, "203.0.113.9", 8080},
		{"ipv6", "2606:4700::1111", KindIP, "2606:4700::1111", 0},
		{"ipv6 with port", "[2606:4700::1111]:443", KindIP, "2606:4700::1111", 443},
		{"ipv6 url", "https://[2606:4700::1111]/", KindURL, "2606:4700::1111", 443},
		{"s3 bucket", "acme-assets.s3.amazonaws.com", KindHost, "acme-assets.s3.amazonaws.com", 0},
		{"gcs bucket", "acme-assets.storage.googleapis.com", KindHost, "acme-assets.storage.googleapis.com", 0},
		{"azure blob", "acmedata.blob.core.windows.net", KindHost, "acmedata.blob.core.windows.net", 0},
		{"long tld", "acme.technology", KindHost, "acme.technology", 0},
		{"punycode tld", "acme.xn--p1ai", KindHost, "acme.xn--p1ai", 0},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := Parse(tt.in)
			if err != nil {
				t.Fatalf("Parse(%q) rejected a valid target: %v", tt.in, err)
			}
			if got.Kind != tt.kind {
				t.Errorf("Kind = %q, want %q", got.Kind, tt.kind)
			}
			if got.Host != tt.host {
				t.Errorf("Host = %q, want %q", got.Host, tt.host)
			}
			if got.Port != tt.port {
				t.Errorf("Port = %d, want %d", got.Port, tt.port)
			}
		})
	}
}

func TestParseCloudAccounts(t *testing.T) {
	tests := []struct {
		in       string
		provider string
		id       string
	}{
		{"123456789012", "aws", "123456789012"},
		{"1234-5678-9012", "aws", "123456789012"},
		{"6f4a1b2c-3d4e-5f60-7182-93a4b5c6d7e8", "azure", "6f4a1b2c-3d4e-5f60-7182-93a4b5c6d7e8"},
		{"/subscriptions/6F4A1B2C-3D4E-5F60-7182-93A4B5C6D7E8", "azure", "6f4a1b2c-3d4e-5f60-7182-93a4b5c6d7e8"},
		{"projects/acme-prod-1234", "gcp", "acme-prod-1234"},
	}

	for _, tt := range tests {
		t.Run(tt.in, func(t *testing.T) {
			got, err := Parse(tt.in)
			if err != nil {
				t.Fatalf("Parse(%q) = %v", tt.in, err)
			}
			if got.Kind != KindCloudAccount {
				t.Fatalf("Kind = %q, want %q", got.Kind, KindCloudAccount)
			}
			if got.CloudProvider != tt.provider || got.CloudAccountID != tt.id {
				t.Errorf("got %s/%s, want %s/%s", got.CloudProvider, got.CloudAccountID, tt.provider, tt.id)
			}
		})
	}
}

func TestParseRejects(t *testing.T) {
	tests := []struct {
		name string
		in   string
	}{
		{"empty", ""},
		{"blank", "   "},
		{"single word", "sjhfga"},
		{"word with spaces", "my target"},
		{"double dot", "acme..com"},
		{"leading dot", ".acme.com"},
		{"numeric tld", "acme.123"},
		{"malformed ipv4", "10.0.0.256"},
		{"short ipv4", "127.1"},
		{"ip range", "10.0.0.0/8"},
		{"ipv6 range", "2606:4700::/32"},
		{"ftp scheme", "ftp://acme.com"},
		{"file scheme", "file:///etc/passwd"},
		{"gopher scheme", "gopher://acme.com"},
		{"javascript scheme", "javascript:alert(1)"},
		{"credentials in url", "https://admin:pw@acme.com"},
		{"credentials bare", "admin:pw@acme.com"},
		{"malformed scheme", "https:acme.com"},
		{"port out of range", "acme.com:70000"},
		{"zero port", "acme.com:0"},
		{"empty port", "acme.com:"},
		{"bad port", "acme.com:abc"},
		{"label too long", "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.com"},
		{"wildcard with path", "*.acme.com/admin"},
		{"wildcard url", "https://*.acme.com"},
		{"ipv6 zone", "fe80::1%eth0"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := Parse(tt.in)
			if err == nil {
				t.Fatalf("Parse(%q) accepted invalid input as %+v", tt.in, got)
			}
			if got.Kind != KindInvalid {
				t.Errorf("Kind = %q, want %q", got.Kind, KindInvalid)
			}
		})
	}
}

func TestParseKeepsPathAndQuery(t *testing.T) {
	got, err := Parse("https://api.acme.com/v2/users?page=2")
	if err != nil {
		t.Fatalf("Parse: %v", err)
	}
	if want := "/v2/users?page=2"; got.Path != want {
		t.Errorf("Path = %q, want %q", got.Path, want)
	}
}

func TestParseWildcard(t *testing.T) {
	got, err := Parse("*.acme.com")
	if err != nil {
		t.Fatalf("Parse: %v", err)
	}
	if !got.Wildcard {
		t.Error("Wildcard = false, want true")
	}
}
