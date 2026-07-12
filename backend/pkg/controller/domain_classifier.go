package controller

import (
	"bytes"
	"context"
	_ "embed"
	"encoding/json"
	"fmt"
	"strings"
	"text/template"

	"pentagi/pkg/config"
	"pentagi/pkg/providers"
	"pentagi/pkg/providers/pconfig"
	"pentagi/pkg/providers/provider"
	"pentagi/pkg/tools"

	"github.com/sirupsen/logrus"
)

//go:embed domain_classifier.tmpl
var domainClassifierPrompt string

// defaultTargetType is the safe fallback whenever auto-detection is
// inconclusive. It must be a member of the TARGET_TYPE enum.
const defaultTargetType = "general"

// validTargetTypes mirrors the TARGET_TYPE enum; the classifier falls back to
// defaultTargetType when the model returns anything outside this set.
var validTargetTypes = map[string]struct{}{
	"web_app":        {},
	"api":            {},
	"aws":            {},
	"azure":          {},
	"gcp":            {},
	"cloud":          {},
	"network":        {},
	"mobile_backend": {},
	"general":        {},
}

type classification struct {
	TargetType string  `json:"target_type"`
	Confidence float64 `json:"confidence"`
	Rationale  string  `json:"rationale"`
}

// domainClassifier runs passive recon and a single cheap LLM call to detect a
// domain's target type. It is intentionally infallible from the caller's point
// of view: every failure path returns the safe default so domain creation is
// never blocked by classification.
type domainClassifier struct {
	cfg      *config.Config
	provs    providers.ProviderController
	template *template.Template
}

func newDomainClassifier(cfg *config.Config, provs providers.ProviderController) *domainClassifier {
	return &domainClassifier{
		cfg:      cfg,
		provs:    provs,
		template: template.Must(template.New("domain_classifier").Parse(domainClassifierPrompt)),
	}
}

// Classify returns the detected target type and the detection metadata JSON to
// persist on the domain. It always returns a valid target type. The configured
// classifier provider is preferred; if it is unavailable (e.g. its API key is
// not set), it falls back to the caller's provider so auto-detection never
// silently degrades to "general" merely because of a misconfigured env var.
func (c *domainClassifier) Classify(
	ctx context.Context,
	userID int64,
	domain string,
	fallback provider.ProviderName,
) (string, json.RawMessage) {
	logger := logrus.WithContext(ctx).WithField("domain", domain)

	recon, err := tools.RunRecon(ctx, domain, c.cfg.DomainReconUserAgent)
	if err != nil {
		logger.WithError(err).Warn("domain recon failed; defaulting target type to general")
		return defaultTargetType, classificationMetadata("", defaultTargetType, 0, "recon failed", recon)
	}

	reconJSON, err := json.MarshalIndent(recon, "", "  ")
	if err != nil {
		logger.WithError(err).Warn("failed to serialise recon; defaulting target type to general")
		return defaultTargetType, classificationMetadata("", defaultTargetType, 0, "recon serialisation failed", recon)
	}

	prv, prvname, err := c.resolveProvider(ctx, userID, fallback)
	if err != nil {
		logger.WithError(err).Warn("no classifier provider available; defaulting target type to general")
		return defaultTargetType, classificationMetadata("", defaultTargetType, 0, "classifier provider unavailable", recon)
	}
	logger = logger.WithField("classifier_provider", string(prvname))

	var prompt bytes.Buffer
	if err := c.template.Execute(&prompt, map[string]any{
		"Domain":    domain,
		"ReconJSON": string(reconJSON),
	}); err != nil {
		logger.WithError(err).Warn("failed to render classifier prompt; defaulting target type to general")
		return defaultTargetType, classificationMetadata(string(prvname), defaultTargetType, 0, "prompt render failed", recon)
	}

	answer, err := prv.Call(ctx, pconfig.OptionsTypeSimpleJSON, prompt.String())
	if err != nil {
		logger.WithError(err).Warn("classifier call failed; defaulting target type to general")
		return defaultTargetType, classificationMetadata(string(prvname), defaultTargetType, 0, "classifier call failed", recon)
	}

	var parsed classification
	if err := json.Unmarshal([]byte(extractJSONObject(answer)), &parsed); err != nil {
		logger.WithError(err).WithField("answer", answer).Warn("classifier returned invalid JSON; defaulting target type to general")
		return defaultTargetType, classificationMetadata(string(prvname), defaultTargetType, 0, "invalid classifier JSON", recon)
	}

	if _, ok := validTargetTypes[parsed.TargetType]; !ok {
		logger.WithField("target_type", parsed.TargetType).Warn("classifier returned unknown target type; defaulting to general")
		return defaultTargetType, classificationMetadata(string(prvname), defaultTargetType, parsed.Confidence, "unknown target type: "+parsed.TargetType, recon)
	}

	return parsed.TargetType, classificationMetadata(string(prvname), parsed.TargetType, parsed.Confidence, parsed.Rationale, recon)
}

// resolveProvider prefers the configured (fixed, cheap) classifier provider and
// falls back to the supplied provider when the configured one is unavailable.
func (c *domainClassifier) resolveProvider(
	ctx context.Context,
	userID int64,
	fallback provider.ProviderName,
) (provider.Provider, provider.ProviderName, error) {
	primary := provider.ProviderName(c.cfg.DomainClassifierProvider)

	if primary != "" {
		prv, err := c.provs.GetProvider(ctx, primary, userID)
		if err == nil {
			return prv, primary, nil
		}
		logrus.WithContext(ctx).WithError(err).
			Warnf("classifier provider %q unavailable; falling back to %q", primary, fallback)
	}

	if fallback != "" && fallback != primary {
		prv, err := c.provs.GetProvider(ctx, fallback, userID)
		if err == nil {
			return prv, fallback, nil
		}
		return nil, "", err
	}

	return nil, "", fmt.Errorf("classifier provider %q unavailable and no fallback configured", primary)
}

func classificationMetadata(usedProvider, targetType string, confidence float64, rationale string, recon map[string]interface{}) json.RawMessage {
	blob, err := json.Marshal(map[string]any{
		"confidence":  confidence,
		"provider":    usedProvider,
		"rationale":   rationale,
		"recon":       recon,
		"target_type": targetType,
	})
	if err != nil {
		return json.RawMessage("{}")
	}
	return blob
}

// extractJSONObject trims any stray prose around a JSON object so a lenient
// provider response still parses.
func extractJSONObject(s string) string {
	start := strings.Index(s, "{")
	end := strings.LastIndex(s, "}")
	if start == -1 || end == -1 || end < start {
		return s
	}
	return s[start : end+1]
}
