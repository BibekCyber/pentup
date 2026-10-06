package tools

import (
	"archive/tar"
	"bufio"
	"bytes"
	"context"
	"fmt"
	"io"
	"net"
	"regexp"
	"testing"
	"time"

	"pentagi/pkg/database"
	"pentagi/pkg/docker"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/api/types/container"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/vxcontrol/cloud/anonymizer"
	"github.com/vxcontrol/cloud/anonymizer/patterns"
)

// contextTestTermLogProvider implements TermLogProvider for context tests.
type contextTestTermLogProvider struct{}

func (m *contextTestTermLogProvider) PutMsg(_ context.Context, _ database.TermlogType, _ string,
	_ int64, _, _ *int64) (int64, error) {
	return 1, nil
}

var _ TermLogProvider = (*contextTestTermLogProvider)(nil)

// contextAwareMockDockerClient tracks whether the context was canceled
// when getExecResult runs, proving context.WithoutCancel works.
type contextAwareMockDockerClient struct {
	isRunning      bool
	execCreateResp container.ExecCreateResponse
	attachOutput   []byte
	attachDelay    time.Duration
	inspectResp    container.ExecInspect

	// copyStream / copyStat, when set, are returned by CopyFromContainer so
	// ReadFile tests can drive a real tar stream through the tool.
	copyStream io.ReadCloser
	copyStat   container.PathStat

	// copiedTar, when set, captures whatever WriteFile sends to CopyToContainer
	// so edit_file/write tests can inspect the bytes actually written.
	copiedTar *bytes.Buffer

	// Set by ContainerExecAttach to track if ctx was canceled during attach
	ctxWasCanceled bool
}

func (m *contextAwareMockDockerClient) RunContainer(_ context.Context, _ string, _ database.ContainerType,
	_ int64, _ *container.Config, _ *container.HostConfig) (database.Container, error) {
	return database.Container{}, nil
}
func (m *contextAwareMockDockerClient) StopContainer(_ context.Context, _ string, _ int64) error {
	return nil
}
func (m *contextAwareMockDockerClient) RemoveContainer(_ context.Context, _ string, _ int64) error {
	return nil
}
func (m *contextAwareMockDockerClient) IsContainerRunning(_ context.Context, _ string) (bool, error) {
	return m.isRunning, nil
}
func (m *contextAwareMockDockerClient) ContainerExecCreate(_ context.Context, _ string, _ container.ExecOptions) (container.ExecCreateResponse, error) {
	return m.execCreateResp, nil
}
func (m *contextAwareMockDockerClient) ContainerExecAttach(ctx context.Context, _ string, _ container.ExecAttachOptions) (types.HijackedResponse, error) {
	// Wait for the configured delay, simulating a long-running command
	if m.attachDelay > 0 {
		select {
		case <-time.After(m.attachDelay):
			// Command completed normally
		case <-ctx.Done():
			// Context was canceled -- this is the bug behavior (without WithoutCancel)
			m.ctxWasCanceled = true
			return types.HijackedResponse{}, ctx.Err()
		}
	}

	// Check if context was already canceled by the time we get here
	select {
	case <-ctx.Done():
		m.ctxWasCanceled = true
		return types.HijackedResponse{}, ctx.Err()
	default:
	}

	pr, pw := net.Pipe()
	go func() {
		pw.Write(m.attachOutput)
		pw.Close()
	}()

	return types.HijackedResponse{
		Conn:   pr,
		Reader: bufio.NewReader(pr),
	}, nil
}
func (m *contextAwareMockDockerClient) ContainerExecInspect(_ context.Context, _ string) (container.ExecInspect, error) {
	return m.inspectResp, nil
}
func (m *contextAwareMockDockerClient) CopyToContainer(_ context.Context, _ string, _ string, content io.Reader, _ container.CopyToContainerOptions) error {
	if m.copiedTar != nil && content != nil {
		_, _ = io.Copy(m.copiedTar, content)
	}
	return nil
}
func (m *contextAwareMockDockerClient) CopyFromContainer(_ context.Context, _ string, _ string) (io.ReadCloser, container.PathStat, error) {
	if m.copyStream != nil {
		return m.copyStream, m.copyStat, nil
	}
	return io.NopCloser(nil), container.PathStat{}, nil
}
func (m *contextAwareMockDockerClient) Cleanup(_ context.Context) error { return nil }
func (m *contextAwareMockDockerClient) GetDefaultImage() string         { return "test-image" }

var _ docker.DockerClient = (*contextAwareMockDockerClient)(nil)

func TestExecCommandDetachSurvivesParentCancel(t *testing.T) {
	// This test validates the fix for Issue #176:
	// Detached commands must NOT be killed when the parent context is canceled.
	//
	// Before the fix: detached goroutine used parent ctx directly, so when the
	// parent was canceled (e.g., agent delegation timeout), ctx.Done() fired
	// in getExecResult and killed the background command.
	//
	// After the fix: context.WithoutCancel(ctx) creates an isolated context
	// that preserves values but ignores parent cancellation.

	mock := &contextAwareMockDockerClient{
		isRunning:      true,
		execCreateResp: container.ExecCreateResponse{ID: "exec-cancel-test"},
		attachOutput:   []byte("background result"),
		attachDelay:    2 * time.Second, // simulates a long-running command
		inspectResp:    container.ExecInspect{ExitCode: 0},
	}

	term := &terminal{
		flowID:       1,
		containerID:  1,
		containerLID: "test-container",
		dockerClient: mock,
		tlp:          &contextTestTermLogProvider{},
	}

	// Create a cancellable parent context
	parentCtx, cancel := context.WithCancel(t.Context())

	// Start ExecCommand with detach=true (returns quickly due to quick check timeout)
	output, err := term.ExecCommand(parentCtx, "/work", "long-running-scan", true, 5*time.Minute)
	assert.NoError(t, err)
	assert.Contains(t, output, "Command started in background")

	// Cancel the parent context -- simulating agent delegation timeout
	cancel()

	// Wait enough time for the detached goroutine to complete its work.
	// If context.WithoutCancel is working correctly, the goroutine should
	// NOT see ctx.Done() and should complete normally after attachDelay.
	// If the fix regresses, ctxWasCanceled will be true.
	time.Sleep(3 * time.Second)

	assert.False(t, mock.ctxWasCanceled,
		"detached goroutine should NOT see parent context cancellation (context.WithoutCancel must be used)")
}

func TestExecCommandNonDetachRespectsParentCancel(t *testing.T) {
	// Counterpart: non-detached commands SHOULD respect parent cancellation.
	// This ensures we didn't accidentally apply WithoutCancel to the non-detach path.

	mock := &contextAwareMockDockerClient{
		isRunning:      true,
		execCreateResp: container.ExecCreateResponse{ID: "exec-nondetach-cancel"},
		attachOutput:   []byte("should not complete"),
		attachDelay:    5 * time.Second, // longer than cancel delay
		inspectResp:    container.ExecInspect{ExitCode: 0},
	}

	term := &terminal{
		flowID:       1,
		containerID:  1,
		containerLID: "test-container",
		dockerClient: mock,
		tlp:          &contextTestTermLogProvider{},
	}

	parentCtx, cancel := context.WithCancel(t.Context())

	// Cancel after 200ms -- non-detached command should see this
	go func() {
		time.Sleep(200 * time.Millisecond)
		cancel()
	}()

	_, err := term.ExecCommand(parentCtx, "/work", "long-command", false, 5*time.Minute)

	// Non-detached command should fail with context error
	assert.Error(t, err)
	assert.True(t, mock.ctxWasCanceled,
		"non-detached command SHOULD see parent context cancellation")
}

func TestPrimaryTerminalName(t *testing.T) {
	t.Parallel()

	tests := []struct {
		flowID int64
		want   string
	}{
		{1, "pentagi-terminal-1"},
		{0, "pentagi-terminal-0"},
		{12345, "pentagi-terminal-12345"},
	}

	for _, tt := range tests {
		t.Run(fmt.Sprintf("flowID=%d", tt.flowID), func(t *testing.T) {
			t.Parallel()

			if got := PrimaryTerminalName(tt.flowID); got != tt.want {
				t.Errorf("PrimaryTerminalName(%d) = %q, want %q", tt.flowID, got, tt.want)
			}
		})
	}
}

// chunkedReader yields at most chunk bytes per Read, imitating how Docker's
// CopyFromContainer HTTP body dribbles a large tar entry across several reads.
type chunkedReader struct {
	data  []byte
	chunk int
	off   int
}

func (c *chunkedReader) Read(p []byte) (int, error) {
	if c.off >= len(c.data) {
		return 0, io.EOF
	}
	n := c.chunk
	if n > len(p) {
		n = len(p)
	}
	if c.off+n > len(c.data) {
		n = len(c.data) - c.off
	}
	copy(p, c.data[c.off:c.off+n])
	c.off += n
	return n, nil
}

// TestReadFileReturnsWholeFileAcrossChunks guards the fix for the silent 32 KB
// truncation: a file larger than one stream chunk must come back in full. The
// pre-fix single tarReader.Read kept only the first chunk and zero-filled the
// rest (later stripped), so a 48 KB file arrived as 32 KB cut mid-line.
func TestReadFileReturnsWholeFileAcrossChunks(t *testing.T) {
	const size = 48 * 1024 // > 32 KB, the old truncation point
	want := bytes.Repeat([]byte("abcdefgh"), size/8)

	var tarBuf bytes.Buffer
	tw := tar.NewWriter(&tarBuf)
	require.NoError(t, tw.WriteHeader(&tar.Header{
		Name: "attack_surface.md",
		Size: int64(len(want)),
		Mode: 0o600,
	}))
	_, err := tw.Write(want)
	require.NoError(t, err)
	require.NoError(t, tw.Close())

	mock := &contextAwareMockDockerClient{
		isRunning:  true,
		copyStream: io.NopCloser(&chunkedReader{data: tarBuf.Bytes(), chunk: 4096}),
		copyStat:   container.PathStat{Size: int64(len(want)), Mode: 0o600},
	}

	term := NewTerminalTool(1, nil, nil, 1, "lid", mock, &contextTestTermLogProvider{}, nil).(*terminal)

	got, err := term.ReadFile(context.Background(), 1, "/tmp/cyberfortify_recon/attack_surface.md")
	require.NoError(t, err)
	assert.Equal(t, len(want), len(got), "whole file must be returned, not just the first chunk")
	assert.Equal(t, string(want), got)
}

// secretsOnlyReplacer builds the replacer the terminal tool now uses: it masks
// only the given secret values, not the generic PII/URL/domain rules.
func secretsOnlyReplacer(t *testing.T, secrets ...string) anonymizer.Replacer {
	t.Helper()
	var ps []patterns.Pattern
	for _, s := range secrets {
		ps = append(ps, patterns.Pattern{
			Name:  "Scan Credential",
			Regex: "(?P<replace>" + regexp.QuoteMeta(s) + ")",
		})
	}
	sp := &patterns.Patterns{Patterns: ps}
	r, err := anonymizer.NewReplacer(sp.Regexes(), sp.Names())
	require.NoError(t, err)
	return r
}

// TestTerminalRedactMasksSecretsNotScanOutput guards the masking fix: the
// terminal's agent-facing redaction must hide real secret values but leave
// ordinary scan output (domains, URLs, IPs, file bytes) intact. The old
// terminal ran every generic anonymizer rule, and one URL rule matched across
// line breaks and collapsed a 48 KB file to ~2 KB, which made agents re-read it.
func TestTerminalRedactMasksSecretsNotScanOutput(t *testing.T) {
	secret := "S3cr3t-Api-Key-ABCDEF123456"
	term := NewTerminalTool(1, nil, nil, 1, "lid",
		&contextAwareMockDockerClient{}, &contextTestTermLogProvider{},
		secretsOnlyReplacer(t, secret),
	).(*terminal)

	// A realistic chunk of scan output: the target domain repeated, URLs, an IP,
	// and the secret embedded once.
	var sb bytes.Buffer
	for i := 0; i < 500; i++ {
		fmt.Fprintf(&sb, "- https://cyberfortify.co/blog/post-%d\n", i)
	}
	fmt.Fprintf(&sb, "auth token %s against 203.0.113.5\n", secret)
	in := sb.String()

	out := term.redact(in)

	assert.NotContains(t, out, secret, "the secret value must be masked")
	assert.Contains(t, out, "https://cyberfortify.co/blog/post-1", "URLs must survive")
	assert.Contains(t, out, "203.0.113.5", "IPs must survive")
	// The output must not be collapsed: only the secret (28 bytes) is removed.
	assert.GreaterOrEqual(t, len(out), len(in)-len(secret)-len("§*Scan Credential*§"),
		"scan output must not be gutted by generic rules")
}

// tarOf builds a single-entry tar archive (what CopyFromContainer returns).
func tarOf(t *testing.T, name, content string) []byte {
	t.Helper()
	var buf bytes.Buffer
	tw := tar.NewWriter(&buf)
	require.NoError(t, tw.WriteHeader(&tar.Header{Name: name, Size: int64(len(content)), Mode: 0o600}))
	_, err := tw.Write([]byte(content))
	require.NoError(t, err)
	require.NoError(t, tw.Close())
	return buf.Bytes()
}

// fileFromTar returns the first regular file's content from a tar archive.
func fileFromTar(t *testing.T, raw []byte) string {
	t.Helper()
	tr := tar.NewReader(bytes.NewReader(raw))
	for {
		h, err := tr.Next()
		if err == io.EOF {
			break
		}
		require.NoError(t, err)
		if h.FileInfo().IsDir() {
			continue
		}
		var b bytes.Buffer
		_, err = io.Copy(&b, tr)
		require.NoError(t, err)
		return b.String()
	}
	return ""
}

// TestEditFileAppliesDiffThroughHandle proves the edit_file action is wired end
// to end: Handle routes it to EditFile, which reads the file, applies the diff,
// and writes the merged result back -- so an agent can change part of a large
// file without resending the whole thing.
func TestEditFileAppliesDiffThroughHandle(t *testing.T) {
	orig := "line1\nline2\nline3\n"
	diff := "@@ -1,3 +1,3 @@\n line1\n-line2\n+LINE2\n line3\n"

	captured := &bytes.Buffer{}
	mock := &contextAwareMockDockerClient{
		isRunning:  true,
		copyStream: io.NopCloser(bytes.NewReader(tarOf(t, "f.txt", orig))),
		copyStat:   container.PathStat{Size: int64(len(orig)), Mode: 0o600},
		copiedTar:  captured,
	}
	term := NewTerminalTool(1, nil, nil, 1, "lid", mock, &contextTestTermLogProvider{}, nil)

	args := []byte(`{"action":"edit_file","path":"/tmp/f.txt","diff":` + fmt.Sprintf("%q", diff) + `,"message":"edit"}`)
	res, err := term.Handle(context.Background(), FileToolName, args)
	require.NoError(t, err)
	assert.Contains(t, res, "applied")

	want, _, derr := ApplyUnifiedDiff(orig, diff)
	require.NoError(t, derr)
	assert.Equal(t, want, fileFromTar(t, captured.Bytes()), "the merged content must be written back")
	assert.Contains(t, want, "LINE2", "diff must have been applied")
}
