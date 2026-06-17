package controller

import (
	"context"
	"testing"

	"pentagi/pkg/config"
	"pentagi/pkg/database"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// mockDomainQuerier embeds database.Querier so it satisfies the interface while
// only the methods exercised by the tests are overridden.
type mockDomainQuerier struct {
	database.Querier
	activeDomains int64
}

func (m *mockDomainQuerier) CountActiveDomainsForUser(ctx context.Context, userID int64) (int64, error) {
	return m.activeDomains, nil
}

func newTestDomainController(db database.Querier) *domainController {
	dc := NewDomainController(db, &config.Config{
		MaxConcurrentDomainsPerUser: 3,
		MaxFlowsPerDomain:           5,
	}, nil, nil, nil)
	return dc.(*domainController)
}

func TestCountActiveDomainsForUser(t *testing.T) {
	dc := newTestDomainController(&mockDomainQuerier{activeDomains: 7})

	count, err := dc.CountActiveDomainsForUser(context.Background(), 42)
	require.NoError(t, err)
	assert.Equal(t, int64(7), count)
}

func TestRegisterUnregisterDomain(t *testing.T) {
	dc := newTestDomainController(&mockDomainQuerier{})

	dc.RegisterDomain(1)
	dc.RegisterDomain(2)

	dc.mx.Lock()
	assert.Len(t, dc.active, 2)
	_, hasOne := dc.active[1]
	_, hasTwo := dc.active[2]
	dc.mx.Unlock()
	assert.True(t, hasOne)
	assert.True(t, hasTwo)

	dc.UnregisterDomain(1)

	dc.mx.Lock()
	assert.Len(t, dc.active, 1)
	_, stillHasOne := dc.active[1]
	_, stillHasTwo := dc.active[2]
	dc.mx.Unlock()
	assert.False(t, stillHasOne)
	assert.True(t, stillHasTwo)
}

func TestQuotaErrorMessages(t *testing.T) {
	flowsErr := &QuotaError{Quota: QuotaFlows, Current: 10, Max: 10}
	assert.Contains(t, flowsErr.Error(), "10 active flows")

	domainsErr := &QuotaError{Quota: QuotaDomains, Current: 3, Max: 3}
	assert.Contains(t, domainsErr.Error(), "3 active domain scans")
}
