package providers

import (
	"context"
	"database/sql"
	"os"
	"testing"

	"pentagi/pkg/database"
	"pentagi/pkg/providers/pconfig"
	"pentagi/pkg/providers/provider"

	_ "github.com/lib/pq"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// These tests exercise the shared provider rules against a real PostgreSQL with
// all migrations applied. Each test runs in a transaction that is rolled back,
// starting from an empty providers table. They are skipped unless
// PENTAGI_TEST_DATABASE_URL points at such a (disposable) DB.
func newSharedProvidersTest(t *testing.T) (*providerController, *sql.Tx) {
	t.Helper()

	dsn := os.Getenv("PENTAGI_TEST_DATABASE_URL")
	if dsn == "" {
		t.Skip("PENTAGI_TEST_DATABASE_URL not set")
	}

	db, err := sql.Open("postgres", dsn)
	require.NoError(t, err)
	t.Cleanup(func() { db.Close() })

	tx, err := db.Begin()
	require.NoError(t, err)
	t.Cleanup(func() { tx.Rollback() })

	_, err = tx.Exec(`DELETE FROM providers`)
	require.NoError(t, err)

	pc := &providerController{
		db: database.New(tx),
		defaultConfigs: provider.ProvidersConfig{
			provider.ProviderOpenAI: &pconfig.ProviderConfig{},
		},
		Providers: provider.Providers{},
	}

	return pc, tx
}

func createSharedTestAdmin(t *testing.T, tx *sql.Tx, name string) int64 {
	t.Helper()

	var id int64
	err := tx.QueryRow(
		`INSERT INTO users (mail, name, status, role_id) VALUES ($1 || '-' || md5(random()::text) || '@test.local', $1, 'active', 1) RETURNING id`,
		name,
	).Scan(&id)
	require.NoError(t, err)

	return id
}

func createSharedTestProvider(t *testing.T, pc *providerController, adminID int64, name string) database.Provider {
	t.Helper()

	prv, err := pc.CreateProvider(context.Background(), adminID, provider.ProviderName(name), provider.ProviderOpenAI, nil)
	require.NoError(t, err)

	return prv
}

func TestSharedProviders_NamesAreUniqueAcrossAdmins(t *testing.T) {
	ctx := context.Background()
	pc, tx := newSharedProvidersTest(t)
	alice := createSharedTestAdmin(t, tx, "alice")
	bob := createSharedTestAdmin(t, tx, "bob")

	first := createSharedTestProvider(t, pc, alice, "team-openai")
	other := createSharedTestProvider(t, pc, alice, "team-other")

	_, err := pc.CreateProvider(ctx, bob, "team-openai", provider.ProviderOpenAI, nil)
	assert.ErrorContains(t, err, "already in use")

	_, err = pc.UpdateProvider(ctx, other.ID, "team-openai", nil)
	assert.ErrorContains(t, err, "already in use")

	// Keeping its own name, or taking a deleted provider's name, is fine.
	_, err = pc.UpdateProvider(ctx, first.ID, "team-openai", nil)
	assert.NoError(t, err)

	_, err = pc.DeleteProvider(ctx, first.ID)
	require.NoError(t, err)
	_, err = pc.UpdateProvider(ctx, other.ID, "team-openai", nil)
	assert.NoError(t, err)
}

func TestSharedProviders_EveryoneSeesEveryAdminsProviders(t *testing.T) {
	ctx := context.Background()
	pc, tx := newSharedProvidersTest(t)
	alice := createSharedTestAdmin(t, tx, "alice")
	bob := createSharedTestAdmin(t, tx, "bob")

	createSharedTestProvider(t, pc, alice, "alices")
	createSharedTestProvider(t, pc, bob, "bobs")

	rows, err := pc.db.GetProviders(ctx)
	require.NoError(t, err)

	names := make([]string, 0, len(rows))
	for _, row := range rows {
		names = append(names, row.Name)
	}
	assert.Equal(t, []string{"alices", "bobs"}, names)

	// Another admin can edit and delete it.
	prv, err := pc.db.GetProviderByName(ctx, "alices")
	require.NoError(t, err)
	_, err = pc.UpdateProvider(ctx, prv.ID, "renamed-by-bob", nil)
	assert.NoError(t, err)
	_, err = pc.DeleteProvider(ctx, prv.ID)
	assert.NoError(t, err)
}

func TestSharedProviders_SingleDefaultForEveryone(t *testing.T) {
	ctx := context.Background()
	pc, tx := newSharedProvidersTest(t)
	alice := createSharedTestAdmin(t, tx, "alice")
	bob := createSharedTestAdmin(t, tx, "bob")

	a := createSharedTestProvider(t, pc, alice, "a")
	b := createSharedTestProvider(t, pc, bob, "b")

	// No default set: the oldest provider is used.
	name, err := pc.GetDefaultProviderName(ctx)
	require.NoError(t, err)
	assert.Equal(t, "a", name)

	_, err = pc.SetDefaultProvider(ctx, b.ID)
	require.NoError(t, err)
	_, err = pc.SetDefaultProvider(ctx, a.ID)
	require.NoError(t, err)

	var defaults int
	require.NoError(t, tx.QueryRow(`SELECT count(*) FROM providers WHERE is_default AND deleted_at IS NULL`).Scan(&defaults))
	assert.Equal(t, 1, defaults)

	name, err = pc.GetDefaultProviderName(ctx)
	require.NoError(t, err)
	assert.Equal(t, "a", name)

	// An unknown id leaves the current default in place.
	_, err = pc.SetDefaultProvider(ctx, b.ID+1000)
	assert.ErrorContains(t, err, "not found")
	name, err = pc.GetDefaultProviderName(ctx)
	require.NoError(t, err)
	assert.Equal(t, "a", name)

	// Deleting the default falls back to the oldest remaining provider.
	_, err = pc.DeleteProvider(ctx, a.ID)
	require.NoError(t, err)
	name, err = pc.GetDefaultProviderName(ctx)
	require.NoError(t, err)
	assert.Equal(t, "b", name)
}

func TestSharedProviders_OnlyAdminsChooseTheProvider(t *testing.T) {
	ctx := context.Background()
	pc, tx := newSharedProvidersTest(t)
	alice := createSharedTestAdmin(t, tx, "alice")

	createSharedTestProvider(t, pc, alice, "cheap")
	deep := createSharedTestProvider(t, pc, alice, "deep")
	_, err := pc.SetDefaultProvider(ctx, deep.ID)
	require.NoError(t, err)

	tests := []struct {
		name      string
		requested string
		canChoose bool
		want      provider.ProviderName
	}{
		{"admin picks", "cheap", true, "cheap"},
		{"admin without a pick", "", true, "deep"},
		{"user pick is ignored", "cheap", false, "deep"},
		{"user without a pick", "", false, "deep"},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got, err := pc.ResolveProviderName(ctx, tc.requested, tc.canChoose)
			require.NoError(t, err)
			assert.Equal(t, tc.want, got)
		})
	}
}
