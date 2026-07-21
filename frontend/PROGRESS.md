# EMBER Reskin — Progress

Companion to `IMPLEMENTATION-PLAN.md`. The self-loop reads this each iteration, does the first unchecked phase, then
ticks it. One phase per run. Gate = `build` + `lint` + `prettier` + dev-screenshot (both themes) + the phase's named
system-function check + a className/JSX-only `git diff`.

- [x] **P1 — Design-system tokens + base components** — `index.css` (@theme + `:root` + `.dark` + radius/mono),
      `theme-provider.tsx` + `app.tsx` default-flip to dark, `ui/{button,card,tabs,input,table}.tsx` (badge generic;
      sidebar token-driven → P2). _Gate: build green, lint = baseline (0 new), prettier clean, dark login screenshot._
- [ ] **P2 — App shell** — `main-sidebar.tsx`, `ui/sidebar.tsx` (SidebarRail), NEW `layouts/command-bar.tsx`,
      `settings-layout.tsx` (Option A). _Sanity: nav routes, favorite star, ⌘/Ctrl+B, mobile drawer, profile menu._
- [ ] **P3 — Shared signal components** — `lib/severity-palette.ts` (values only, keep `pdf.*`), `severity-badge.tsx`,
      `flow-status-icon.tsx`, `domain-status-badge.tsx`, `target-type-chip.tsx`+`target-type-colors.ts`,
      `flow-task-status-icon.tsx`, NEW `shared/agent-monogram.tsx`, NEW `shared/status-pill.tsx`.
      _Sanity: running spins, waiting pulses, severity sort unchanged, PDF still exports._
- [ ] **P4 — Scans (Domains)** — `domains.tsx`, `domain.tsx`, `new-engagement.tsx`. VERBATIM: `scan-initializing.tsx`,
      `use-scan-stage.ts`, `domains-provider.tsx`, `domain-provider.tsx`, `domains-layout.tsx`.
      _Sanity: create scan → navigate → boot animation plays; no new query for the KPI strip._
- [ ] **P5 — Flows list + Cockpit** — `flow.tsx`, `flows.tsx` (table only), `flow-central-tabs.tsx`, `flow-tabs.tsx`,
      `messages/{flow-message,flow-message-type-icon,flow-automation-messages,flow-assistant-messages}.tsx`,
      `flow-form.tsx`, `flow-tasks-dropdown.tsx`. VERBATIM: `flow-provider.tsx`.
      _Sanity: send message + status gating, tab-switch xterm survival, boot overlay, report dropdown._
- [ ] **P6 — Terminal + Tasks (chrome only)** — `terminal/{flow-terminal,flow-split-terminal,flow-command-panes}.tsx`,
      `shared/terminal/{terminal-output-card,terminal-frame,terminal-config}.tsx`,
      `tasks/{flow-tasks,flow-task,flow-subtask,flow-task-status-icon}.tsx`. VERBATIM: `terminal.tsx`,
      `use-xterm.ts`, `use-terminal-search.ts`, `flow-command-list.tsx`, `terminal-highlight.tsx`.
      _Sanity: step tabs + Raw xterm alive, terminal search, "Show commands". Drop `flow-task.tsx:167` border-red._
- [ ] **P7 — Dashboard + Report + Templates** — dashboard {`dashboard,dashboard-analytics,dashboard-overview`}.tsx +
      `flows/dashboard/{flow-dashboard,flow-dashboard-overview}.tsx`; report view + children + `finding-card.tsx` +
      `lib/report-pdf/*`; templates {`templates,template`}.tsx. VERBATIM: `build-report-model.ts`, `report-model.ts`,
      `report-pdf.tsx`, `format-utils.ts`. _Sanity: period refetch, PDF export, template create-vs-update, derived risk grade._
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
