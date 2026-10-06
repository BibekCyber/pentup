package targetcheck

import (
	"errors"
	"fmt"
	"strings"
)

// Outcome is the machine-readable verdict of a validation.
type Outcome string

const (
	// Rejected (Result.OK == false). Only these four block the wizard: a
	// target that is malformed, off-limits, or provably does not exist.
	OutcomeInvalidInput  Outcome = "invalid_input"
	OutcomeBlocked       Outcome = "blocked_destination"
	OutcomeDNSNotFound   Outcome = "dns_not_found"
	OutcomeCloudNotFound Outcome = "cloud_resource_not_found"

	// Accepted (Result.OK == true). Anything that exists but is quiet,
	// filtered or restricted still passes: probes are routinely blocked, and
	// probing is the engagement.
	OutcomeValid      Outcome = "valid"
	OutcomeResponding Outcome = "responding"
	OutcomeReachable  Outcome = "reachable"
	OutcomeDNSOnly    Outcome = "dns_only"
	OutcomeNoResponse Outcome = "no_response"
	OutcomeDNSError   Outcome = "dns_error"

	OutcomeAccountIdentifier Outcome = "account_identifier"
)

// StepStatus is how one observation turned out.
type StepStatus string

const (
	StepOK   StepStatus = "ok"
	StepWarn StepStatus = "warn"
	StepFail StepStatus = "fail"
	StepSkip StepStatus = "skip"
)

// Step is one observation (input, dns, tcp, tls, http), reported separately so
// a TLS mismatch or a 403 stays visible instead of collapsing into "down".
type Step struct {
	Name   string
	Status StepStatus
	Detail string
}

// Result is the verdict for one target string.
type Result struct {
	Input   string
	OK      bool
	Kind    Kind
	Outcome Outcome
	Message string
	Host    string
	Port    int
	// CloudProvider is aws|azure|gcp|digitalocean for account identifiers
	// and recognized cloud endpoints.
	CloudProvider  string
	CloudAccountID string
	Service        string // e.g. "AWS S3 bucket"
	HTTPStatus     int
	Steps          []Step
}

func (r *Result) step(name string, status StepStatus, detail string) {
	r.Steps = append(r.Steps, Step{Name: name, Status: status, Detail: detail})
}

// Validator checks a target's format and applies the address Policy to IP
// literals. It performs no network access.
type Validator struct {
	policy Policy
}

// NewValidator returns a Validator enforcing policy.
func NewValidator(policy Policy) *Validator {
	return &Validator{policy: policy}
}

// Validate never returns an error: a rejected target is a Result with
// OK == false and a user-facing Message.
func (v *Validator) Validate(raw string) Result {
	res, _ := v.validate(raw)
	return res
}

// validate returns the parsed target alongside the result. The target is only
// meaningful when res.OK is true; the Checker uses it to run the probe.
func (v *Validator) validate(raw string) (Result, Target) {
	t, err := Parse(raw)
	res := Result{Input: t.Input, Kind: t.Kind}
	if err != nil {
		// A name that can only mean the local machine is refused for where it
		// points, not for how it is spelled.
		var blockedErr *BlockedError
		if errors.As(err, &blockedErr) {
			res.Outcome = OutcomeBlocked
		} else {
			res.Outcome = OutcomeInvalidInput
		}
		res.Message = err.Error()
		res.step("input", StepFail, err.Error())
		return res, t
	}
	res.Host, res.Port = t.Host, t.Port

	if t.Kind == KindCloudAccount {
		res.OK = true
		res.Outcome = OutcomeAccountIdentifier
		res.CloudProvider = t.CloudProvider
		res.CloudAccountID = t.CloudAccountID
		res.Message = accountLabel(t) + ". Account IDs are not network addresses, so there is nothing to probe. " +
			"They are valid for Internal (credentialed) cloud scans, which reach the account through its credentials."
		res.step("input", StepOK, accountLabel(t))
		return res, t
	}

	if t.Addr.IsValid() {
		if ok, reason := v.policy.Allowed(t.Addr); !ok {
			res.Outcome = OutcomeBlocked
			res.Message = fmt.Sprintf("%s is %s. This platform only tests targets reachable over the public internet.", t.Host, reason)
			res.step("input", StepFail, "Blocked: "+reason)
			return res, t
		}
	} else if svc, ok := recognizeCloud(t.Host); ok {
		res.Service, res.CloudProvider = svc.label, svc.provider
	}

	res.OK = true
	res.Outcome = OutcomeValid
	res.Message = describe(t, res.Service)
	res.step("input", StepOK, describe(t, res.Service))
	return res, t
}

func accountLabel(t Target) string {
	switch t.CloudProvider {
	case "aws":
		return "AWS account ID " + t.CloudAccountID
	case "azure":
		return "Azure subscription " + t.CloudAccountID
	default:
		return "GCP project " + t.CloudAccountID
	}
}

func describe(t Target, service string) string {
	var what string
	switch {
	case service != "":
		what = service + " endpoint"
	case t.Wildcard:
		what = "wildcard scope for " + t.Host
	case t.Kind == KindURL:
		what = strings.ToUpper(t.Scheme) + " URL"
	case t.Kind == KindIP && t.Addr.Is6() && !t.Addr.Is4In6():
		what = "IPv6 address"
	case t.Kind == KindIP:
		what = "IP address"
	default:
		what = "domain"
	}
	if t.Port != 0 && t.Kind != KindURL {
		what += fmt.Sprintf(" on port %d", t.Port)
	}
	return "Valid " + what + "."
}
