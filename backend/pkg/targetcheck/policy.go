package targetcheck

import (
	"net/netip"
)

// Policy decides which addresses may be used as scan targets, so a scan cannot
// be pointed at this server's own infrastructure or a cloud metadata service.
type Policy struct {
	// AllowPrivate permits RFC 1918 / ULA / CGNAT ranges, for self-hosted
	// deployments that test internal networks. Loopback, link-local, cloud
	// metadata and reserved ranges stay blocked regardless.
	AllowPrivate bool
	// Deny is an extra operator denylist (e.g. this server's own public IP).
	Deny []netip.Prefix

	// allowLoopback is unexported so only this package's tests can set it;
	// they need to probe a server on 127.0.0.1.
	allowLoopback bool
}

type namedRange struct {
	prefix netip.Prefix
	reason string
}

func ranges(reason string, cidrs ...string) []namedRange {
	out := make([]namedRange, 0, len(cidrs))
	for _, c := range cidrs {
		out = append(out, namedRange{prefix: netip.MustParsePrefix(c), reason: reason})
	}
	return out
}

func concat(groups ...[]namedRange) []namedRange {
	var out []namedRange
	for _, g := range groups {
		out = append(out, g...)
	}
	return out
}

// loopbackRanges are blocked separately so tests can opt out of just this one.
var loopbackRanges = ranges("a loopback address", "127.0.0.0/8", "::1/128")

// alwaysBlocked can never be probed, even with AllowPrivate.
var alwaysBlocked = concat(
	ranges("an unspecified address", "0.0.0.0/8", "::/128"),
	ranges("a cloud metadata / link-local address",
		"169.254.0.0/16",     // link-local incl. 169.254.169.254 (AWS, GCP, Azure, DO, Oracle)
		"fe80::/10",          // IPv6 link-local
		"fd00:ec2::254/128",  // AWS IMDS over IPv6
		"100.100.100.200/32", // Alibaba Cloud metadata (inside CGNAT space)
		"168.63.129.16/32",   // Azure WireServer / platform endpoint
	),
	ranges("a multicast or broadcast address", "224.0.0.0/4", "ff00::/8"),
	ranges("a reserved address",
		"240.0.0.0/4",     // reserved incl. 255.255.255.255
		"192.0.0.0/24",    // IETF protocol assignments
		"192.0.2.0/24",    // TEST-NET-1
		"198.18.0.0/15",   // benchmarking
		"198.51.100.0/24", // TEST-NET-2
		"203.0.113.0/24",  // TEST-NET-3
		"::/96",           // deprecated IPv4-compatible
		"100::/64",        // discard-only
		"2001::/23",       // IETF protocol assignments incl. Teredo (embeds IPv4)
		"2001:db8::/32",   // documentation
		"fec0::/10",       // deprecated site-local
	),
	// Translation prefixes embed an arbitrary IPv4 address, which could be an
	// internal one; there is no legitimate reason to target them directly.
	ranges("an IPv4-translation address", "64:ff9b::/96", "64:ff9b:1::/48", "2002::/16"),
)

// privateRanges are blocked unless AllowPrivate is set.
var privateRanges = ranges("a private network address",
	"10.0.0.0/8",
	"172.16.0.0/12", // includes Docker's default bridge networks
	"192.168.0.0/16",
	"100.64.0.0/10", // carrier-grade NAT
	"fc00::/7",      // IPv6 unique local
)

// Allowed reports whether addr may be connected to; when it may not, reason is
// a short phrase such as "a private network address".
func (p Policy) Allowed(addr netip.Addr) (bool, string) {
	if !addr.IsValid() {
		return false, "an invalid address"
	}
	// ::ffff:a.b.c.d is the IPv4 address a.b.c.d on the wire.
	addr = addr.Unmap().WithZone("")

	if !p.allowLoopback {
		for _, r := range loopbackRanges {
			if r.prefix.Contains(addr) {
				return false, r.reason
			}
		}
	}
	for _, r := range alwaysBlocked {
		if r.prefix.Contains(addr) {
			return false, r.reason
		}
	}
	if !p.AllowPrivate {
		for _, r := range privateRanges {
			if r.prefix.Contains(addr) {
				return false, r.reason
			}
		}
	}
	for _, d := range p.Deny {
		if d.Contains(addr) {
			return false, "an address blocked by this server's policy"
		}
	}
	return true, ""
}
