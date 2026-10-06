package models

import "pentagi/pkg/targetcheck"

// TargetCheckStep is one observation of a target check.
type TargetCheckStep struct {
	Name   string `json:"name" example:"dns"`
	Status string `json:"status" example:"ok" enums:"ok,warn,fail,skip"`
	Detail string `json:"detail" example:"acme.com resolves to 203.0.113.9"`
}

// TargetCheck is the verdict for a scan target.
type TargetCheck struct {
	Input   string `json:"input" example:"acme.com"`
	OK      bool   `json:"ok" example:"true"`
	Kind    string `json:"kind" example:"host" enums:"url,host,ip,cloud_account,invalid"`
	Outcome string `json:"outcome" example:"responding"`
	Message string `json:"message" example:"acme.com is live — it answered with HTTP 200."`
	Host    string `json:"host" example:"acme.com"`
	Port    int    `json:"port" example:"443"`
	// Service is a recognised cloud endpoint, e.g. "AWS S3 bucket".
	Service string `json:"service,omitempty"`
	// CloudProvider is aws|azure|gcp|digitalocean when the target is one.
	CloudProvider  string            `json:"cloud_provider,omitempty"`
	CloudAccountID string            `json:"cloud_account_id,omitempty"`
	HTTPStatus     int               `json:"http_status,omitempty" example:"200"`
	Steps          []TargetCheckStep `json:"steps"`
}

// NewTargetCheck converts a check result into its API representation.
func NewTargetCheck(res targetcheck.Result) TargetCheck {
	steps := make([]TargetCheckStep, 0, len(res.Steps))
	for _, s := range res.Steps {
		steps = append(steps, TargetCheckStep{
			Name:   s.Name,
			Status: string(s.Status),
			Detail: s.Detail,
		})
	}

	return TargetCheck{
		Input:          res.Input,
		OK:             res.OK,
		Kind:           string(res.Kind),
		Outcome:        string(res.Outcome),
		Message:        res.Message,
		Host:           res.Host,
		Port:           res.Port,
		Service:        res.Service,
		CloudProvider:  res.CloudProvider,
		CloudAccountID: res.CloudAccountID,
		HTTPStatus:     res.HTTPStatus,
		Steps:          steps,
	}
}
