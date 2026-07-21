# EMBER Reskin — Progress

Companion to `IMPLEMENTATION-PLAN.md`. The self-loop reads this each iteration, does the first unchecked phase, then
ticks it. One phase per run. Gate = `build` + `lint` + `prettier` + dev-screenshot (both themes) + the phase's named
system-function check + a className/JSX-only `git diff`.

- [x] **P1 — Design-system tokens + base components** — `index.css` (@theme + `:root` + `.dark` + radius/mono),
      `theme-provider.tsx` + `app.tsx` default-flip to dark, `ui/{button,card,tabs,input,table}.tsx` (badge generic;
      sidebar token-driven → P2). _Gate: build green, lint = baseline (0 new), prettier clean, dark login screenshot._
- [x] **P2 — App shell** — `main-sidebar.tsx` (EMBER rail + profile-pop), `ui/sidebar.tsx` (SidebarRail→collapse
      circle, icon-rail 4.25rem), NEW `layouts/command-bar.tsx`, `settings-layout.tsx` (Option A). Rail theme-aware.
      _Gate: build ✓, lint = baseline (0 new), diff style-only (sole logic line: additive `state` destructure)._
- [x] **P3 — Shared signal components** — `severity-palette.ts` (web→--sev-* tokens + pdf hex→EMBER; weight/keys/
      pdf-structure preserved), `severity-badge.tsx`, `flow-status-icon.tsx`, `domain-status-badge.tsx` (+pulse),
      `target-type-chip.tsx`+`target-type-colors.ts` (→muted chip), `flow-task-status-icon.tsx`, `index.css`
      (+@keyframes pulse), NEW `agent-monogram.tsx` + `status-pill.tsx`. _Gate: build ✓, lint baseline (0 new),
      diff value-only (weight/pdf-keys unchanged). Deferred: per-type target glyph (needs a meta field)._
- [x] **P4 — Scans (Domains)** — `domains.tsx` (CommandBar + derived KPI strip + dossier cards), `domain.tsx`
      (header dossier + child FlowCards), `new-engagement.tsx` (wrappers only: stepper/choice/seg/review/CommandBar).
      _Gate: build ✓, lint baseline (0 new); R2 create-scan contract (buildCredential/onSubmit/createScan/navigate)
      + ScanInitializing = ZERO diff (byte-identical). Deferred: optional wizard summary aside (kept single-col for R2)._
- [x] **P5 — Flows list + Cockpit** — `flow.tsx` (CommandBar + pane-head + resizable split kept), `flows.tsx`
      (DataTable reskin in place), `flow-central-tabs`/`flow-tabs` (underline + icons, forceMount kept), messages
      (EMBER .msg bubbles + both disclosures), `flow-form.tsx` (dock frame + chips), `flow-tasks-dropdown.tsx`.
      _Gate: build ✓, lint baseline (0 new); R1 flow-provider EMPTY diff; R6 gating + R7 forceMount = 0 altered lines._
      _Deferred: Flows dossier grid (per-flow severity not in list query)._
- [x] **P6 — Terminal + Tasks (chrome only)** — `terminal-config.ts` (surface #0B0D10 / cursor #F57214),
      `terminal-frame.tsx` (mono dots), `terminal-output-card.tsx` (SHELL overline chip), `flow-terminal.tsx` +
      `flow-tasks.tsx` (search → bg-well + font-mono), `flow-task.tsx` (EMBER card + 5px progress, border-red dropped),
      `flow-subtask.tsx` (ring-card + border-strong rule), `index.css` (.terminal-scope bg nudge). command-panes /
      split-terminal / status-icon / dropdown already EMBER → untouched. _Gate: build ✓, lint baseline (0 new);
      R8 terminal-highlight + xterm/tokenizer + budget engine (1500/200/100/300) = EMPTY diff. border-red removed._
- [x] **P7 — Dashboard + Report + Templates** — dashboard (kpi tiles + mono source-query chips; flow-dashboard.tsx
      untouched), report web-view masthead (Target-led, derived risk grade via POSTURE_GRADE map, SeverityBar mix +
      sev-pills, evidence panels) + PDF StyleSheet/hex reskin (teal/blue→ember, cool→warm graphite), NEW
      `shared/severity-bar.tsx`, templates→EMBER card gallery + editor + target-type-picker. VERBATIM confirmed empty
      diff: `build-report-model.ts`, `report-model.ts`, `report-pdf.tsx`, `report-document.tsx`, `format-utils.ts`,
      `severity-palette.ts`, all `*.test`. _Gate: build ✓, lint baseline (0 new), **27/27 report+pdf tests green**._
      _Built via workflow (3 parallel modules → gate → 4 adversarial verifiers); Report/Dashboard/Templates lenses
      clean. Deferred: gallery drops DataTable title-search+sort (plan-sanctioned, restore in P10); dashboard
      cost-share mini-bars omitted (optional)._
- [ ] **P8 — Settings + Login + Auth** — settings {`settings-providers,settings-provider,settings-prompts,
      settings-prompt,settings-api-tokens,settings-users`}.tsx; `login.tsx`, `login-form.tsx`,
      `password-change-form.tsx`; shared `ui/data-table.tsx`. VERBATIM: `user-provider.tsx`, `passwordChangeSchema`.
      _Sanity: API-token inline edit + one-time secret, provider Test, login redirect, users self-guard._
- [ ] **P9 — Terminal lazy-highlight** — `shared/terminal/terminal-highlight.tsx` (`TermOutput` only).
      _Sanity: no plain-text flash, find-in-page + copy see full text, flow load stall gone._
- [ ] **P10 — Responsiveness + regression pass** — no new files; full sweep both themes + all system functions +
      `build`/`lint`/`prettier`/`test`. _Sanity: no horizontal body scroll; grids collapse; logic diff is style-only._

## Deferred / decisions to surface (flag, don't guess)
- Always-dark vs theme-aware rail — plan defaults to **theme-aware** (one-line flip to always-dark).
- Password-policy mismatch (legacy 8/16 schema vs 12-char mandate) — preserve schema; reconcile only on approval (R11).
- Flows **dossier-card Grid** + grid/list toggle — needs per-flow severity/findings not in the list query (data task).
- CommandBar Approach B (layout-persistent bar) + Settings Option B (in-page tab strip) — routing restructures; deferred.

## Log
- P1 — EMBER tokens (warm-graphite dark default + off-white light + sev/st/ag ramps + radius 8px + JetBrains mono),
  theme default→dark, tabs→underline, card/button/input/table restyle. Build ✓, lint = baseline 75 (0 new),
  prettier ✓. Commit scoped to 8 files (prettier tree-wide noise reverted). Screenshot: real dark login = EMBER.
