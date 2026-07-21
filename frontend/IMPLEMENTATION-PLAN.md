# EMBER Reskin — Build-Ready Implementation Plan

Reskin the **real PentAGI frontend** (`frontend/src`) to the approved **EMBER "Operator's Console"** design
(`frontend/redesign/` — `ember.css`, `DESIGN.md`, `pages/*.js`, `components.js`, `app.js`) with **ZERO logic
changes**. This plan consolidates 7 module maps into one phased, file-specific build order.

> **Reference prototype lives at** `frontend/redesign/ember.css` (§ tokens/components), `frontend/redesign/pages/*.js`
> (per-screen composition), `frontend/redesign/components.js` (shared primitives), `frontend/redesign/DESIGN.md`
> (rationale + data-truth audit). EMBER classes are **prototype-only** — never ship `ember.css`; express EMBER
> through the app's existing shadcn primitives + Tailwind utilities bound to the tokens landed in P1.

---

## 1. Global constraints (apply to EVERY phase)

1. **Logic is frozen.** Only JSX structure / `className` / inline-`style` / wrapper-element choices change. Every
   Apollo hook + operation, GraphQL subscription/mutation variable shape, `useState`/`useMemo`/`useEffect`/
   `useCallback`/`useRef`, react-hook-form + zod schema, event handler, `navigate()`/`Link` target, permission
   gate, and context/provider wiring stays **byte-for-byte**. No GraphQL `.graphql` doc edits, no
   `graphql:generate`. If a restyle "needs" new data (severity roll-ups, findings counts, per-flow phase/agents,
   "N uses", command-palette, subscription-health pill) → **omit it** (the EMBER prototype fabricates those; the
   real schema does not return them).
2. **cva keys are contracts.** Never rename/drop a `variant`/`size` key on `button`/`badge`/`tabs`/`sidebarMenuButton`
   etc. — call sites and re-exported `*Variants` depend on them. Only the class strings inside change. Preserve
   `forwardRef`, `displayName`, `asChild`/`Slot`, Radix primitives, all `data-*`/`aria-*`, and every export.
3. **Terminal & Tasks content preserved + lazy-highlight only.** The terminal tokenizer/budget engine, xterm
   lifecycle, and Tasks tree are logic — restyle chrome only. The **one** permitted behavioral change is making
   `TermOutput` highlighting lazy (P9), and it must be **output-identical** (deferred colorization, not
   virtualization; full text always in the DOM).
4. **Scan animation kept byte-for-byte.** `features/flows/scan-initializing.tsx`, `hooks/use-scan-stage.ts`, and
   every `@keyframes .scan-*`/`.term-line` block in `index.css` are **PRESERVE VERBATIM**. They already draw from
   theme tokens, so they re-skin automatically when P1 lands. Keep `ScanInitializing` mounted at all existing
   call-sites with the same props.
5. **Responsive, token-first.** Colors/surfaces/radii/fonts come from semantic tokens (`bg-card`,
   `text-muted-foreground`, `border-border`, `rounded-lg`, `font-mono`) — never hardcode hex outside the P1 token
   file and the report/PDF severity palette (react-pdf can't read CSS vars). Every multi-column grid collapses
   (`grid-cols-1 sm: lg:`); every wide table/terminal/diagram scrolls inside its own `overflow-x-auto`; the page
   body never scrolls horizontally. Keep `min-w-0 truncate` on titles, `max-w-*` on message bubbles.
6. **Theme-aware, dark-first.** EMBER default surface = warm graphite (app's `.dark`); light = warm off-white
   (app's `:root`). The light/dark toggle keeps working unchanged. The report screen stays theme-aware — no
   route-level theme forcing.
7. **Verification gate per phase (all must pass before ticking a phase done):**
   - `npm run build` (this runs `npx tsc && vite build` — type-check + prod build)
   - `npm run lint`
   - `npm run prettier:fix` then `npm run prettier`
   - `npm run dev` → screenshot the phase's screen in **both dark and light**
   - Sanity-check the named **system function** for that phase (a real click-path, listed per phase) still works —
     this is how we prove "zero logic change" held.

---

## 2. Build order

Ordered lowest-risk / highest-leverage → highest. **P1 repaints ~90% of the app for free**; later phases are
progressively more file-specific. Coordinate ordering strictly — a page phase started before P1/P3 will show stock
RankLocal orange, not EMBER.

Legend: **PRESERVE** = do not touch (logic). **RESTYLE** = className/JSX only.

---

### P1 — Design-system tokens + base components  *(foundation; highest leverage)*

**Files to touch**
- `src/styles/index.css` — `@theme` additions + `:root` (light) + `.dark` (dark) color blocks + `--radius`/
  `--font-mono` retune + optional `::selection`. (See §3 for the exact block.)
- `src/providers/theme-provider.tsx` — line 29 `defaultTheme = 'light'` → `'dark'`.
- `src/app.tsx` — line 82 `<ThemeProvider defaultTheme="light">` → `defaultTheme="dark"` (**operative** call-site
  prop; overrides the component default).
- `src/components/ui/button.tsx`, `card.tsx`, `badge.tsx`, `tabs.tsx`, `input.tsx`, `table.tsx`, `sidebar.tsx`
  (className-only restyles; cva keys/exports frozen).

**Preserve**
- Every existing `@theme --color-*` mapping (components reference them) — **only add** new mappings.
- All `@keyframes`, `.scan-*`, `.term-line`, `.terminal-scope` (lines ~523–621), `.prose`/`.dark .prose`,
  `@font-face`, `@utility container`, the whole `--shadow-*`/`--tracking-normal`/`--spacing` tail — **unchanged**.
- theme-provider: `themes`, `isThemeValid`, `storageKey`, the `useState` initializer, the add/remove `.light`/`.dark`
  effect, `system` branch, `setTheme`, localStorage read/write. The `.light` class stays a no-op (light lives in
  `:root`). This is a **single intended default-flip**, nothing else.
- Every shadcn component: cva structure + all variant/size **keys**, `forwardRef`, `displayName`, `asChild`/`Slot`,
  Radix primitives, `data-*`/`aria-*`, the `input.tsx` number-spinner branch + `type` handling.

**Restyle approach**
- **index.css** — see §3 for the exact block. Net: EMBER warm-graphite `.dark` (new default), warm off-white
  `:root`, `--radius: 0.5rem` (kills the `rounded-xl` tell), `--font-mono: 'JetBrains Mono', …`, three coordinated
  signal ramps (`--sev-*`, `--st-*`, `--ag-*`) + brand/surface helpers (`--primary-hover`, `--brand-tint`, `--well`,
  `--border-strong`, `--glow-brand`, `--hi`) exposed as utilities via `@theme`. **Value format = the approved EMBER
  hex** (byte-exact to the prototype; Tailwind v4 resolves hex fine and `/opacity` compiles to `color-mix`). oklch
  conversion is optional later polish — not worth the conversion error now. `--chart-1..5` keep their existing
  oklch owned-orange ramp.
- **button** — base `font-medium`→`font-semibold`; `default` → `bg-primary text-primary-foreground shadow-glow-brand
  hover:bg-primary-hover` (or the gradient variant `bg-[linear-gradient(180deg,var(--primary-hover),var(--primary))]`);
  `outline` bg-background→`bg-card`; `destructive` optional translucent EMBER "danger". Keep `secondary`/`ghost`/`link`.
- **card** — root `rounded-xl`→`rounded-lg`, `shadow-sm`→`shadow-xs` + `dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.045)]`;
  keep `p-4` on header/content/footer.
- **tabs** — the signature change: `TabsList` drop `bg-muted … rounded-lg p-1` trough → transparent row with
  `border-b border-border`; `TabsTrigger` drop the pill (`data-[state=active]:bg-background … shadow-sm`) → underline
  via `border-b-2 border-transparent … data-[state=active]:border-primary data-[state=active]:text-foreground`.
- **input** — `bg-transparent`→`bg-well` (or keep `dark:bg-input/30`); focus `ring-1`→`ring-2 ring-ring/50
  focus-visible:border-ring`. Keep spinner branch verbatim.
- **table** — `TableHead` → `h-9 px-3.5 font-mono text-[10.5px] uppercase tracking-[0.1em]`; `TableCell` `p-4`→
  `px-3.5 py-2.5`; `TableRow` hover `hover:bg-primary/5`→`hover:bg-muted/40`.
- **sidebar** — mostly **token-driven** (repaints from the new `--sidebar-*` values, no class edits required).
  Optional: `SIDEBAR_WIDTH_ICON` `3rem`→`4.25rem` (EMBER 68px rail); optional active left-accent bar via a
  `data-[active=true]:before:*` addition to `sidebarMenuButtonVariants` base (additive, keys unchanged).
- **badge** — keep `rounded-full border` + all keys; severity/status colors are injected via `className`
  (P3), not badge variants — base stays generic.

**Apply order within P1:** `@theme` additions → `.dark` block → `:root` block → `app.tsx`/`theme-provider` flip →
`tabs` → `card` → `button` → `table`/`input`/`badge` → `sidebar`.

**Verify** — `npm run build` + `lint` + `prettier`. `npm run dev`: first load with cleared `localStorage.theme`
boots **graphite dark**; toggle to light shows warm off-white; radius is 8px everywhere; all `font-mono` renders
JetBrains. **System function:** the theme toggle in the rail profile menu still switches + persists (localStorage
`theme`); no console errors; existing pages render (no cva key break).

---

### P2 — App shell (Command Rail + Command Bar)

**Files to touch**
- `src/components/layouts/main-sidebar.tsx` (the rail — the big one)
- `src/components/ui/sidebar.tsx` (minor: `SidebarRail` → floating collapse circle; optional width const)
- **NEW** `src/components/layouts/command-bar.tsx` (presentational shared header; absorbs the copy-pasted
  breadcrumb strip)
- `src/components/layouts/settings-layout.tsx` (Option A: restyle the settings sidebar + header; keep dual-sidebar)
- **Unchanged (reviewed, intentionally untouched):** `main-layout.tsx`, `app-layout.tsx`, `flows-layout.tsx`,
  `domains-layout.tsx` (thin provider wrappers).

**Preserve**
- `main-layout.tsx` byte-identical (Approach A): `SidebarProvider`→`MainSidebar`→`SidebarInset`→`Outlet`.
- `main-sidebar.tsx` — **every** hook/handler/route: `useMatch('/dashboard'|'/scans/*'|'/flows/*'|'/templates/*'|
  '/settings/*')`, `useParams` `flowId` memo, `useUser`(`authInfo`/`user`/`logout`), `usePermission('usage.view')`,
  `useTheme`, `useFavorites`(`add/removeFavoriteFlow`,`favoriteFlowIds`), `useSidebarFlows().flows`, the
  `favoriteFlows`/`recentFlows` memos, `FlowMenuItem` `Link to={`/flows/${id}`}` + star `SidebarMenuAction`, every
  primary-nav `to=` target, the profile `DropdownMenu` (theme `Tabs.onValueChange→setTheme`, `user.type==='local'`
  gate on Change Password, `setIsPasswordModalOpen`, `logout()`), the change-password `Dialog`+`PasswordChangeForm`,
  `<SidebarRail/>` mounted.
- `ui/sidebar.tsx` — `SidebarProvider` state machine, cookie (`sidebar:state`), **⌘/Ctrl+B** effect, `useBreakpoint`
  mobile `<Sheet>` path, `SidebarTrigger`/`SidebarRail` `onClick` composition (keep `toggleSidebar`), all exports,
  `sidebarMenuButtonVariants` cva.
- `settings-layout.tsx` — `menuItems` + `usePermission('users.view')` filter, `NavLink to={item.path}`,
  `startsWith` active logic, the `SettingsHeader` title `useMemo` (all nested-route branches), "Back to App"
  `NavLink to="/flows"`, `SidebarProvider`/`SidebarInset`/`SidebarTrigger`/`Outlet`.

**Restyle approach**
- **main-sidebar** → EMBER `.rail` (`ember.css` §3, `app.js` `rail()`): brand lockup (`PENT` + accent segment +
  mono overline), promote the "New Flow" button to an always-visible `.rail-cta` gradient pill (keep its existing
  `Link` target), nav active state → `.nav-item.active` (left accent bar + `--brand-tint` fill + primary icon),
  Recent/Favorite groups → mono `.nav-label` overlines + `.nav-item` density (keep both empty-state conditionals
  and the star `SidebarMenuAction`), footer → `.rail-foot` (avatar tile + name/mono-email) with the profile
  `DropdownMenu` restyled as `.profile-pop` (**keep the shadcn DropdownMenu** — do not hand-roll outside-click).
  Rail is **theme-aware** (EMBER iteration-2) via P1 `--sidebar-*` tokens; one-line flip to always-dark if desired.
  **Do not** add the "Engine" widget (invented; needs data not present) unless derivable from `useSidebarFlows()`.
- **ui/sidebar** → `SidebarRail` becomes the EMBER `.rail-collapse` floating 22px circle (same `toggleSidebar`
  handler + a chevron child). `SidebarInset` unchanged.
- **command-bar.tsx (new, presentational)** → EMBER `.cmdbar` (sticky, `backdrop-blur`, bottom border). Props:
  `title` (ReactNode), `ctx?` (mono context line), `actions?` (ReactNode). Internals **keep**
  `<SidebarTrigger className="-ml-1"/>` (the preserved mobile-drawer/collapse handler). ⌘K/bell are net-new with no
  backend → omit or render static. Pages adopt it in P4–P8 by swapping their `<header>…breadcrumb…</header>` — the
  `SidebarTrigger`, favorite `Star onClick`, `FlowReportDropdown`, `FlowStatusIcon`/`ProviderIcon` travel into the
  `title`/`actions` slots **verbatim**.
- **settings-layout** → Option A: restyle `SettingsSidebar` to rail chrome (tokens) + `SettingsHeader` reuses
  `CommandBar`. (Option B — convert to in-page tab strip — is a routing restructure; **defer**.)

**Verify** — build/lint/prettier. `dev`: rail is graphite with orange active accent; ⌘/Ctrl+B collapses to the 68px
icon rail; the floating collapse circle works; mobile (<768px) opens the `<Sheet>` drawer via `SidebarTrigger`.
**System functions:** click each nav item (routes unchanged), toggle a flow favorite (star), open the profile menu →
switch theme + open Change Password dialog; settings nav still gates Users by `users.view`.

---

### P3 — Shared signal components  *(repaint the signal ramps once; propagates app-wide)*

**Files to touch**
- `src/lib/severity-palette.ts` (values only)
- `src/components/shared/severity-badge.tsx`
- `src/components/icons/flow-status-icon.tsx`
- `src/components/forms/domain-status-badge.tsx`
- `src/components/forms/target-type-chip.tsx` + `src/lib/target-type-colors.ts`
- `src/features/flows/tasks/flow-task-status-icon.tsx`
- **NEW** `src/components/shared/agent-monogram.tsx` (`AgentMonogram` + `AgentStack`)
- **NEW** `src/components/shared/status-pill.tsx` (`StatusPill` — dot+label table-cell form)

**Preserve**
- `severity-palette.ts` — the `Record` **shapes/keys**, `weight` values (5/4/3/2/1 — drive `compareFindings` sort),
  `label`/`cvssRange` strings, `icon` field, `getSeverityStyle`/`getStatusStyle`/`DEFAULT_*`, and **the entire `pdf`
  sub-objects verbatim** (react-pdf needs literal hex — separate print palette). `iconClass.includes('animate-spin')`
  must stay true for Running.
- `severity-badge.tsx` — `SeverityBadge`/`StatusBadge` props, the `spinning` string check, `cn` merging.
- `flow-status-icon.tsx` / `flow-task-status-icon.tsx` — the `StatusType→icon` maps + keys + tooltip wrappers +
  props API. `domain-status-badge.tsx` — `statusConfig` keys/labels + `DomainStatusType` mapping.
- `target-type-*` — `getTargetTypeMeta`/`getTargetTypeLabel`/`ALL_TARGET_TYPES` + `onRemove` affordance.

**Restyle approach** (all **value/className swaps**, no logic):
- `severity-palette.ts` web classes → the `--sev-*` tokens via arbitrary values (`text-[var(--sev-crit)]`,
  `bg-[var(--sev-crit-bg)]`, `border-l-[var(--sev-crit)]`) so light/dark resolve once. Update each `pdf.{solid,text,
  tint,border}` hex to the EMBER ramp so the PDF inherits it. `STATUS_STYLES` → `--st-*` (running=amber). Optionally
  repoint `BRAND` (teal) → ember amber.
- `severity-badge.tsx` → EMBER `.sev-pill` (2.5px square + mono uppercase label) for the report body; `StatusBadge`
  keeps icon+dot, recolored.
- `flow-status-icon.tsx` → `--st-*` ramp (running amber keeps `animate-spin`, finished green, failed
  `--sev-crit`, waiting cyan, created slate).
- `domain-status-badge.tsx` → EMBER `.status` = dot + label on the `--st-*` ramp; add `pulse` to running/waiting/
  classifying (define `@keyframes pulse` in index.css if absent).
- `target-type-chip`/`colors` → either re-tune the pastel map for the graphite surface **or** collapse to the single
  EMBER `.chip` (muted bg + border + leading target glyph). `flow-task-status-icon` → `--st-*` (pick one Running
  color app-wide and keep consistent).
- **AgentMonogram/AgentStack** (new) → EMBER `.agent` tile from `components.js` `AGENT` map (15 agent types →
  color+monogram; camelCase→snake_case via `key.replace(/([A-Z])/g,'_$1').toLowerCase()`). Used by login hero +
  settings-prompts Agent column.
- **StatusPill** (new) → EMBER `.status` dot+label on `--st-*` for settings tables (users/tokens/providers).

**Verify** — build/lint. `dev`: open the **Flows list** and **Scans list** — status/severity render in EMBER hues,
not stock Tailwind, in both themes. Confirm the report PDF still exports (P3 changed `pdf.*` hex only).
**System function:** a Running flow icon still spins; a Waiting scan pulses; severity sort order unchanged (weights
untouched).

---

### P4 — Scans (Domains) module

**Files to touch**
- `src/pages/domains/domains.tsx` (list), `src/pages/domains/domain.tsx` (detail + `FlowCard`),
  `src/pages/domains/new-engagement.tsx` (create-scan wizard).
- **PRESERVE VERBATIM (no edits):** `features/flows/scan-initializing.tsx`, `hooks/use-scan-stage.ts`,
  `providers/domains-provider.tsx`, `providers/domain-provider.tsx`, `layouts/domains-layout.tsx`.
- **Not routed — do NOT touch:** `new-domain.tsx`, `execution-preview.tsx`.

**Preserve**
- `domains.tsx` — `useDomains()` destructure, `targetTypeFilter`/`setTargetTypeFilter`, `deletingDomain`,
  `filteredDomains` memo, `ALL_FILTER`, card `onClick→navigate('/scans/'+id)`, delete `stopPropagation`, the whole
  `ConfirmationDialog` + `handleConfirm`, loading/empty branches, `formatDate`/`getTargetTypeLabel`.
- `domain.tsx` — `FlowCard`'s `useFinishFlow/DeleteFlow/RenameFlowMutation`, `isActive`, all handlers + toasts +
  `onChanged()` refetch, click-nav + keydown, the `stopPropagation` on the dropdown/portal, the **sibling** Rename
  `Dialog`/`ConfirmationDialog`. `Domain`'s `useDomain()`, `useDomains().deleteDomain`, the **exact `isScanBooting`
  derivation** and `useScanStage(undefined, isScanBooting || (isLoading && !domain))`, all three render branches with
  `ScanInitializing` mounted in both spots, the bottom `ConfirmationDialog`→`deleteDomain→navigate('/scans')`.
- `new-engagement.tsx` — **highest-risk file:** all state, `createStage = useScanStage(undefined, isLoading)`, every
  derived memo (`targetType`, `needsCredentials`, `availableTemplates`, `selectedIds`, `stepKeys`, `canAdvance`,
  `isLast`), **`buildCredential()` byte-identical** (all `ScanCredentialKind` branches + exact JSON payload shapes/
  key order), **`onSubmit()`** (`createScan` input + `navigate('/scans/'+created.id)` + catch/finally), the loading
  branch swapping to `<ScanInitializing stageIndex={createStage}/>`, all controlled inputs + `ToggleGroup` + footer
  nav.

**Restyle approach**
- **domains.tsx** → CommandBar header + mono context line (`{domains.length} targets · {running} running`) + EMBER
  primary CTA. Add a **derived-only** status roll-up KPI strip (`useMemo` over already-loaded `domains` — no query):
  Targets / Running (hero, amber) / Needs input / Finished. Cards → **Dossier cards** (status edge bar via
  `--st-*`, target glyph tile, mono name + `#id · type · scope`, restyled `DomainStatusBadge`, footer
  `createdAt · {flows.length} flows`). **No severity/findings block** (not in the query). Keep the grid + delete
  button + `stopPropagation`. **Omit** the list/grid toggle + pager (would add state).
- **domain.tsx** → CommandBar + header **dossier card** (target glyph, name, chip row of **real** facts:
  `TargetTypeChip`/scope/box/createdAt, restyled `DomainStatusBadge`, `{flows.length} child flows`, Delete=`.btn-danger`).
  Child `FlowCard`s → dossier cards (status edge, `FlowStatusIcon` + title, `#id · provider.name`, `Started …`,
  dropdown preserved). **No** phase/agents/severity/mode chips. **No "Findings NN"** on the header.
- **new-engagement.tsx** → map to `newscan.js` visually, same control flow: `.stepper` (numbered circles),
  `ChoiceCard`→`.choice` (icon tile + check pip), templates rows + run-mode `.seg`, credentials `.input` on `--well`,
  review card, optional sticky **summary aside** reading existing derived values only. CommandBar header. All
  `onClick`/`setCred`/`onSubmit` bindings unchanged.

**Verify** — build/lint. `dev`: Scans list KPI strip + dossier grid (both themes, collapse 3→2→1); Scan detail;
run the create-scan wizard end-to-end. **System function (critical):** create a scan → it must `navigate('/scans/:id)`
and the `ScanInitializing` boot animation must play (proves `buildCredential`/`onSubmit`/`useScanStage` intact); grep
confirms no new query/`lazyQuery` added for the KPI strip.

---

### P5 — Flows list + Flow Cockpit

**Files to touch**
- `src/pages/flows/flow.tsx` (cockpit shell), `src/pages/flows/flows.tsx` (list — table only, restyle in place).
- `src/features/flows/flow-central-tabs.tsx`, `flow-tabs.tsx` (tab hosts).
- `src/features/flows/messages/flow-message.tsx`, `flow-message-type-icon.tsx`,
  `flow-automation-messages.tsx`, `flow-assistant-messages.tsx`.
- `src/features/flows/flow-form.tsx` (input dock), `flow-tasks-dropdown.tsx`.
- **PRESERVE VERBATIM (no visual DOM):** `src/providers/flow-provider.tsx`.

**Preserve**
- `flow-provider.tsx` — all 3 queries, **15 subscriptions**, 6 mutations + wrapper callbacks, `isAssistantMode`
  inference, `selectedAssistantId` resolution, `flowStatus` memo, the `submitAutomationMessage` early-return on
  `Finished`, the `FlowFormValues` import path from `flow-form.tsx`.
- `flow.tsx` — `useBreakpoint().isDesktop` desktop `ResizablePanelGroup`/`ResizableHandle` (50/50) vs mobile single
  card, the **entire scan-boot machinery** (`hasStreamedContent`, `isInitializing`, `useScanStage`,
  `<ScanInitializing>` + `animate-scan-fade`, `isFlowLoading` overlay), the redirect effect, desktop/mobile tab
  state (`desktopTabsTab`, `useFlowTabDetection`), **all of `FlowReportDropdown`** (isAssistant, `buildMarkdown`, 4
  export handlers, disabled gating, the `{(!!tasks.length || assistantLogs.length>0) && …}` render gate), favorites star.
- `flow-central-tabs.tsx` — `useFlowTabDetection`, `usePermission('usage.view')`, `isAssistantMode` conditional
  render, dashboard gate, `<Tabs value onValueChange>`, `ScrollArea`/`ScrollBar`.
- `flow-tabs.tsx` — `FlowExecNavProvider` + `onOpenTerminal`, every `!isDesktop && …` mobile-only guard, and the
  **critical** Terminal `TabsContent` `forceMount` + `data-[state=inactive]:hidden` + `overflow-hidden` (keeps xterm
  alive — do not convert to unmount).
- `flow-message.tsx` — prop contract + `memo`, destructure, `searchChecks` + auto-expand effect, **both**
  independent disclosures (`isThinkingVisible`/`isDetailsVisible`) + `shouldShowThinking`/`shouldShowThinkingToggle`,
  `renderDetailsContent`/`renderThinkingContent` branches, `handleCopy`, toggle text strings, the `type===Input`
  conditional.
- `flow-message-type-icon.tsx` — the 11-type `messageTypeIcons` map + tooltip + props.
- `flow-automation-messages.tsx` / `flow-assistant-messages.tsx` — all `useFlow` pulls, zod search schema + rhf +
  the full debounce set (3 effects + cleanup + reset-on-flowId), `filteredLogs`, status-driven `placeholder`, every
  handler, the **exact StatusType gating** (`isFormDisabled`/`isFormLoading`/`isProviderChangeAllowed` /
  `isProviderDisabled`), `useAutoScroll`, all empty states, `<FlowMessage>` mapping, `<FlowForm>` props. For
  assistant: `AssistantsDropdown` (groups, `renderAssistantItem`, `isProviderValid`, delete), the create-vs-call
  branch, all five render branches.
- `flow-form.tsx` — zod `formSchema`, `useForm` + full destructure, `useProviders`/`useTemplates` + search memos,
  the defaultValues-sync effect, `isFormDisabled`, refocus effect, `handleSubmit`/`handleKeyDown`/`handleApplyTemplate`
  + replace flow, provider/template `DropdownMenu`s, the `useAgents` `Switch` (assistant only), the **submit⇄stop
  swap**, all prop plumbing.
- `flows.tsx` — `useFlows`/`useFavorites`/`useRenameFlowMutation`, all dialog/edit/finish/delete state,
  `handleColumnSort` (3-way), URL page sync via `useSearchParams`, every handler, the full `columns` `ColumnDef[]`,
  `renderRowContextMenu`, loading/empty `StatusCard`, `ConfirmationDialog`, the `<DataTable>` contract, `statusConfig`.
- `flow-tasks-dropdown.tsx` — selection cascade logic, `Popover`/`Command`, `onChange`/`value` contract.

**Restyle approach**
- **flow.tsx** — header → CommandBar (`#id` mono + target title; provider/status in a mono ctx strip); Report →
  `.btn-outline`, star → `.icon-btn`; each `ResizablePanel` inner div gets an EMBER `.pane-head` (mono overline
  label). Keep the resizable split (it **is** the EMBER two-pane cockpit). **Optional/deferred:** a Live/Stale pill
  keyed off existing `flowStatus` only (no new subscription) — omit if unsure.
- **flow-central-tabs / flow-tabs** — inherit the P1 underline tabs; optionally wrap in `.pane-head`, render the
  mode label as a mono overline + Dashboard/Conversation as a `.seg`, add per-tab leading icons + optional status
  dot (Terminal/Tasks). Keep real `TabsTrigger`s and the `forceMount` contract.
- **flow-message + type-icon** — bubble → EMBER `.msg` row (leading colored `.mtype` 28px type tile tinted per
  `MessageLogType` via a new `messageTypeTint` map on `--ag-*`/mtype hues; `rounded-xl`→8px). Thinking/details
  toggles → `.thought summary` rows (mono 11px + leading icon; open panel on `--well`). Input vs agent distinguished
  by a brand-tinted tile/left-accent (className-only; keep the `type===Input` conditional).
- **message hosts** — sticky search header → `.kbar`/`.chip`; list → `.pane-body`; scroll-to-bottom → `.icon-btn`
  outline + amber new-message dot; input dock wrapped in the EMBER dock frame (P5 flow-form). `AssistantsDropdown`
  trigger → outline pill (status dot + provider + index).
- **flow-form** — wrap `InputGroup` in `border rounded-lg bg-well p-3`; provider/template `InputGroupButton`s →
  ghost chips; submit → EMBER primary gradient, stop → `.btn-danger` (map onto existing `default`/`destructive`
  variants — verify cva resolves the new tokens). Keep `InputGroupTextareaAutosize` + `Switch`.
- **flows.tsx** — reskin the existing `DataTable` as the EMBER **List** view (`.tbl` mono overline heads, mono id/
  target cells, `hover:bg-muted/40`), status via the restyled `FlowStatusIcon`/pill, provider `.chip`, header
  CommandBar + primary CTA. **Out of scope (flag as follow-up, needs data):** the EMBER dossier-card **Grid** + grid/
  list toggle (per-flow severity/findings not in the list query).

**Verify** — build/lint. `dev` (desktop + mobile): cockpit two-pane split resizes; tabs are underline; a message
shows both "Show thinking" and "Show details"; the input dock submit⇄stop swaps. **System functions:** send an
automation message (provider/template lock behavior by status); switch tabs and confirm the terminal/xterm stays
alive (`forceMount`); the scan-boot overlay still plays on a fresh flow; open the report dropdown export items.

---

### P6 — Terminal + Tasks (chrome restyle only; NO perf change yet)

**Files to touch**
- `src/features/flows/terminal/flow-terminal.tsx`, `flow-split-terminal.tsx`, `flow-command-panes.tsx`
- `src/components/shared/terminal/terminal-output-card.tsx`, `terminal-frame.tsx`, `terminal-config.ts` (values)
- `src/features/flows/tasks/flow-tasks.tsx`, `flow-task.tsx`, `flow-subtask.tsx`, `flow-task-status-icon.tsx`
  (if not already done in P3), `flow-tasks-dropdown.tsx` (if not already done in P5)
- **PRESERVE VERBATIM:** `shared/terminal/terminal.tsx`, `use-xterm.ts`, `use-terminal-search.ts`,
  `flow-command-list.tsx`; and (this phase) `terminal-highlight.tsx` — its lazy change is **P9**.

**Preserve**
- `flow-terminal.tsx` — zod schema/rhf, `debouncedUpdateSearch`, all memos, `terminalRef` + find/reset handlers,
  `<Terminal>` + `<FlowTasksDropdown>` wiring.
- `flow-split-terminal.tsx` — `steps`/`groupCommands` memos, `NONE_KEY`/`RAW_KEY`, `selectedStep`/`activeStep`,
  `handleStepChange` + `nav.clearPendingStep`, `<StepPanes>` + Raw `<Terminal>`.
- `flow-command-panes.tsx` — **the entire budget engine** (`budgetStep`, `STEP_LINE_BUDGET 1500`,
  `PANE_MAX_LINES 200`, `STEP_PANE_CAP 100`), `<TermCommandLines>`/`<TermOutput maxLines>`/`<TermChromeBar>`,
  `CommandTerminals` `onOpen`/`sections`, the truncated-performance notice + "open Raw tab" copy.
- `terminal-output-card.tsx` — `TYPE_BADGE_LABEL`, `MAX_LINES 300`, wiring. `terminal-frame.tsx` —
  `TerminalCopyButton` (clipboard + `execCommand` fallback). `terminal-config.ts` — `TERMINAL_OPTIONS`, addons,
  `getSearchDecorations`, the SGR bright-remap.
- Tasks: `flow-tasks.tsx` all state/memos (`commandsBySubtask`, `openCommands`, `FocusedCommands`, `useAutoScroll`,
  both `<Empty>` branches); `flow-task.tsx`/`flow-subtask.tsx` `memo`, search-match memos + auto-expand, progress
  math, "Show details"/"Show commands · N" toggles, `EMPTY_COMMANDS` stable ref. `flow-command-list.tsx` untouched.

**Restyle approach** (className/value only)
- Search headers → EMBER `.kbar`/`.input` on `--well` with `--brand-ring` focus, mono field. Empty states → mono
  overline.
- Per-step `TabsList`/`TabsTrigger` → EMBER underline tabs (keep `flex-wrap`, `FlowTaskStatusIcon`, truncated title).
- Command panes → EMBER pane (`background:var(--term-bg)`, `border`, `rounded-lg`); `TermChromeBar` shows a mono
  `SHELL` overline chip; "Open in Terminal" → `--primary` + `ArrowUpRight`.
- `terminal-config.ts` **values only:** align `TERMINAL_SURFACE`/`RANKLOCAL_TERMINAL.background` `#0f1216→#0B0D10`
  and cursor `#f5843a→#F57214`; keep the SGR remap. Optionally nudge `.terminal-scope` in index.css to match.
- Tasks tree → EMBER `tasksTree` (task card on `--card`, `Progress` 5px `--muted`/`--primary`, subtasks left-ruled
  `--border-strong`, "Show commands · N" as ghost primary). **Drop the leftover `border-red` class on
  `flow-task.tsx:167`.**

**Verify** — build/lint. `dev`: open a flow with terminal output — per-step underline tabs, EMBER pane surface, Raw
xterm tab still WebGL-renders and streams. **System function:** switch between step tabs and the Raw tab (xterm stays
alive), run terminal search find-next/prev, open "Show commands" in Tasks. Verify terminal text/copy/find still work.

---

### P7 — Dashboard + Report + Templates

**Files to touch**
- **Dashboard:** `src/pages/dashboard/dashboard.tsx`, `dashboard-analytics.tsx`, `dashboard-overview.tsx`
  (`format-utils.ts` untouched); `src/features/flows/dashboard/flow-dashboard.tsx`, `flow-dashboard-overview.tsx`.
- **Report:** `src/pages/flows/flow-report.tsx`, `src/features/flows/report/flow-report-view.tsx`,
  `flow-report-executive-summary.tsx`, `flow-report-findings-summary.tsx`, `flow-report-findings-detail.tsx`,
  `flow-report-section.tsx`, `flow-report-toc.tsx`, `src/components/shared/finding-card.tsx`; PDF visuals in
  `src/lib/report-pdf/*` (`styles.ts`, `cover-page.tsx`, `executive-summary-pdf.tsx`, `finding-card-pdf.tsx`,
  `findings-summary-pdf.tsx`, `section-pdf.tsx`, `toc-pdf.tsx`, `page-chrome.tsx`).
  **PRESERVE 100% (pure logic):** `src/lib/build-report-model.ts`, `report-model.ts`, `report-pdf.tsx` orchestrator.
- **Templates:** `src/pages/templates/templates.tsx`        --sidebar-ring: #F57214;

        /* EMBER brand + surface helpers (light) */
        --primary-hover: #DD6400;
        --brand-tint: rgba(245,114,20,.11);
        --brand-tint-2: rgba(245,114,20,.06);
        --brand-ring: rgba(245,114,20,.55);
        --well: #F4F2EF;
        --border-strong: #D6D1CB;
        --glow-brand: 0 1px 2px rgba(245,114,20,.3), 0 8px 20px -8px rgba(245,114,20,.45);
        --hi: 0 1px 2px 0 rgba(20,18,16,.05);

        /* severity ramp (light — AA on white) */
        --sev-crit: #D0102E; --sev-crit-bg: rgba(208,16,46,.10);
        --sev-high: #C2410C; --sev-high-bg: rgba(194,65,12,.10);
        --sev-med:  #A66300; --sev-med-bg:  rgba(166,99,0,.11);
        --sev-low:  #0369A1; --sev-low-bg:  rgba(3,105,161,.10);
        --sev-info: #585F6B; --sev-info-bg: rgba(88,95,107,.10);
        /* status ramp (shared) */
        --st-created: #6E747E; --st-classifying: #A78BFA; --st-running: #F57214;
        --st-waiting: #35B9E9; --st-finished: #2FBF71;  --st-failed: #FB3B4E;
        /* agent identity (shared) */
        --ag-researcher: #38BDF8; --ag-developer: #A78BFA;
        --ag-executor: #34D399;  --ag-default: #8B93A0;

        --font-sans: Inter, sans-serif;
        --font-serif: Inter, serif;
        --font-mono: 'JetBrains Mono', 'Roboto Mono', ui-monospace, monospace;
        --radius: 0.5rem;                 /* 8px — kills the rounded-xl tell */
        color-scheme: light;
        /* …keep the existing --shadow-x … --spacing lines below unchanged… */
    }
```

### 3c. Replace the color/font/radius lines in `.dark` (DARK = EMBER `:root`, the new default surface, ~lines 371–407)

Keep the `--shadow-x … --shadow-2xl` tail untouched; replace color/font/radius and append the helpers + ramps:

```css
    .dark {
        /* neutrals — warm graphite (hue ~60, very low chroma) */
        --background: #0E0F11;
        --foreground: #E9EBED;
        --card: #16181B;
        --card-foreground: #E9EBED;
        --popover: #1D1F23;
        --popover-foreground: #E9EBED;
        --primary: #F57214;               /* ember amber — full strength */
        --primary-foreground: #1B1206;
        --secondary: #191B1F;
        --secondary-foreground: #E9EBED;
        --muted: #1A1C1F;
        --muted-foreground: #9BA1AB;
        --accent: #202226;
        --accent-foreground: #E9EBED;
        --destructive: #FB3B4E;           /* = sev-crit (dark) */
        --destructive-foreground: #FFF5F5;
        --border: rgba(255,255,255,.09);
        --input: rgba(255,255,255,.12);
        --ring: #F57214;
        --chart-1: oklch(0.8784 0.1662 91.53);  /* keep existing owned-orange ramp */
        --chart-2: oklch(0.7697 0.1689 68.03);
        --chart-3: oklch(0.6663 0.1632 55.93);
        --chart-4: oklch(0.5551 0.152 47.65);
        --chart-5: oklch(0.4729 0.1329 46.03);
        /* rail — graphite */
        --sidebar: #0A0C0E;
        --sidebar-foreground: #E9EBED;
        --sidebar-primary: #F57214;
        --sidebar-primary-foreground: #1B1206;
        --sidebar-accent: rgba(245,114,20,.12);
        --sidebar-accent-foreground: #F57214;
        --sidebar-border: rgba(255,255,255,.09);
        --sidebar-ring: #F57214;

        /* EMBER brand + surface helpers (dark) */
        --primary-hover: #FF8636;
        --brand-tint: rgba(245,114,20,.12);
        --brand-tint-2: rgba(245,114,20,.06);
        --brand-ring: rgba(245,114,20,.55);
        --well: #131417;
        --border-strong: #2A2D31;
        --glow-brand: 0 0 0 1px rgba(245,114,20,.55), 0 0 26px -6px rgba(245,114,20,.40);
        --hi: inset 0 1px 0 rgba(255,255,255,.045);

        /* severity ramp (dark) */
        --sev-crit: #FB3B4E; --sev-crit-bg: rgba(251,59,78,.14);
        --sev-high: #FF6B2C; --sev-high-bg: rgba(255,107,44,.14);
        --sev-med:  #F5A524; --sev-med-bg:  rgba(245,165,36,.14);
        --sev-low:  #35B9E9; --sev-low-bg:  rgba(53,185,233,.14);
        --sev-info: #8B93A0; --sev-info-bg: rgba(139,147,160,.14);
        /* status ramp (shared) */
        --st-created: #6E747E; --st-classifying: #A78BFA; --st-running: #F57214;
        --st-waiting: #35B9E9; --st-finished: #2FBF71;  --st-failed: #FB3B4E;
        /* agent identity (shared) */
        --ag-researcher: #38BDF8; --ag-developer: #A78BFA;
        --ag-executor: #34D399;  --ag-default: #8B93A0;

        --font-sans: Inter, sans-serif;
        --font-serif: Inter, serif;
        --font-mono: 'JetBrains Mono', 'Roboto Mono', ui-monospace, monospace;
        --radius: 0.5rem;
        color-scheme: dark;
        /* …keep the existing --shadow-x … --shadow-2xl lines below unchanged… */
    }
```

### 3d. Optional base-layer nicety (inside the existing `@layer base`, near `body { … }`)

```css
    ::selection { background-color: var(--brand-tint); color: var(--primary); }
    /* only if not already present — running/waiting status pulse used by P3 */
    @keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: .45 } }
```

### 3e. Do NOT touch in index.css

`.terminal-scope` (~523–621, already on-EMBER — the P6 `terminal-config.ts` nudge is optional), every `@keyframes`/
`.scan-*`/`.term-line` block (scan animation depends on them), `.prose`/`.dark .prose`, `@font-face` (JetBrains
already loaded 400–700), `@utility container`, the scrollbar rules, and any existing `@theme --color-*` mapping
(components reference them — only add).

---

## 4. Risk register — where logic could break, and how to touch it safely

| # | File(s) | The risk | Safe-touch rule |
|---|---|---|---|
| R1 | `providers/flow-provider.tsx` | Renders no DOM; holds 3 queries + **15 subscriptions** + 6 mutations + `isAssistantMode`/`selectedAssistantId` inference. A stray edit silently breaks live updates or mode selection. | **Do not open to restyle.** Zero edits. Downstream JSX reads its bindings — restyle the consumers, never the provider. |
| R2 | `pages/domains/new-engagement.tsx` | `buildCredential()` JSON shapes + `onSubmit`'s `createScan` input + `navigate('/scans/'+id)` are the create→scan contract. Reordering a key or touching a branch corrupts scan creation. | Restyle **wrappers only** (stepper/choice-card/review/`.input`). Never enter `buildCredential`/`onSubmit`. Verify by creating a real scan end-to-end. |
| R3 | `settings-provider.tsx` (per-agent form) | The `AgentsConfigInput` `reduce` builder + per-agent `setValue('agents.{key}.price.*')` cascades + 6 mutations. The densest rhf surface in the app. | Restyle `FormLabel`/`FormDescription`/`Input`/`Accordion`/`Dialog` **className only**. Do not touch `useForm`/`useController`/`setValue`/handlers. Verify: expand an agent, pick a model (prices cascade), run Test, Save. |
| R4 | `lib/severity-palette.ts` | Shared by **web + PDF + markdown**. `weight` drives `compareFindings` sort; `pdf.*` is a literal-hex print palette; `iconClass.includes('animate-spin')` is a string contract. | **Values only.** Never touch `weight`, `label`, `cvssRange`, keys, or the `pdf` object structure. Recolor web classes + `pdf` hex. Verify: report sort order unchanged + PDF exports. |
| R5 | `lib/report-pdf/*` + `flow-report.tsx` | react-pdf can't read CSS vars; the report is a client deliverable + has an auto-download `useEffect` + markdown tokenizer. | PDF reskin is **`StyleSheet` + `pdf.*` hex only** (mostly falls out of R4). Do not touch `flow-report.tsx` data logic, `build-report-model.ts`, `report-model.ts`, or `report-pdf.tsx` orchestrator. Verify: `?download` auto-export still fires and closes the tab. |
| R6 | `features/flows/messages/*` + `flow-form.tsx` | The **StatusType gating** (`isFormDisabled`/`isFormLoading`/`isProviderChangeAllowed`/`isProviderDisabled`) + debounce effects + submit⇄stop swap. Break it and the input dock mis-enables during a run. | Restyle the dock **frame + chips + buttons** onto existing cva variants. Preserve every gating derivation + zod + effects. Verify: provider/template lock while Running, unlock on Waiting; Send→Stop while running. |
| R7 | `flow-tabs.tsx` Terminal `TabsContent` | `forceMount` + `data-[state=inactive]:hidden` keeps xterm alive across tab switches (prevents the cloud-log freeze). Converting to unmount is a silent regression. | Restyle the tab **row** only. Never remove `forceMount` or change the content mount contract. Verify: switch tabs and back — xterm still streams. |
| R8 | `terminal-highlight.tsx` (P9) | The **only** behavioral change. If the wrapper element isn't byte-identical across the highlight flip, the fade re-fires (flash); a per-chunk index changes stagger timing (visible change). | Keep wrapper `<div>` className/key/style stable; swap **children only**; use the **global** line index in `lineDelay`; IO-fallback to eager. Verify: no plain-text flash, find-in-page + copy see full text, load stall gone. |
| R9 | `ui/sidebar.tsx` + `main-sidebar.tsx` | Stateful infra: `SidebarProvider` cookie state, ⌘/Ctrl+B, mobile `<Sheet>`, the profile `DropdownMenu` (theme/logout/change-password). Hand-rolling the pop breaks outside-click/a11y. | Restyle via `--sidebar-*` tokens + className. **Keep the shadcn `DropdownMenu`** — don't rebuild EMBER's manual pop. Preserve `toggleSidebar`/`SidebarRail.onClick`. Verify: collapse, mobile drawer, theme switch persist. |
| R10 | `components/ui/data-table.tsx` (+ `tabs`/`card`/`badge`) | Shared primitives: one edit repaints providers/tokens/users/prompts/flows. A cva-key rename cascades a build break everywhere. | className-only; never rename/drop a variant/size key; preserve sorting/paging/visibility/context-menu/expand logic. Verify a table on each of the 4+ pages after. |
| R11 | `password-change-form.tsx` | Legacy 8/16 zod policy vs CLAUDE.md's 12-char mandate vs EMBER "12+ chars" copy. Hard rule 1 forbids changing the zod. | Preserve `passwordChangeSchema` exactly; keep the existing `FormDescription`; don't let restyle copy misstate the real rule. Reconcile only on explicit approval. |
| R12 | `scan-initializing.tsx` / `use-scan-stage.ts` / `.scan-*` keyframes | The scan boot animation — draws from tokens + keyframes; must survive the reskin untouched at every call-site. | **Zero edits.** It re-skins automatically from P1. Keep all `<ScanInitializing stageIndex=…>` mounts + props identical. Verify: boot animation plays on new scan + booting flow. |

**Cross-cutting safety:** after every phase, `git diff` the logic files and confirm the diff is className/JSX-only —
no changed hook option, GraphQL variable, `navigate()` target, or effect dependency array.

---

## 5. Self-loop prompt (fire once per iteration until the plan is complete)

```
You are the EMBER reskin implementer for the PentAGI frontend (frontend/). Drive ONE phase to completion, then stop.

1. Read frontend/IMPLEMENTATION-PLAN.md and frontend/PROGRESS.md in full.
2. Pick the FIRST unchecked phase in PROGRESS.md (respect order — do not skip; if a phase is partially done, resume it).
3. Implement that phase EXACTLY as the plan specifies:
   - Change ONLY JSX structure / className / inline-style / the P1 token block (and, in P9 only, the specced
     TermOutput lazy-highlight). Preserve ALL logic byte-for-byte: no GraphQL/Apollo/hook/zod/rhf/effect/handler/
     navigate()/permission/subscription changes. Never rename or drop a cva variant/size key.
   - Honor every "Preserve" item and Risk-register rule for the files in this phase. If a restyle appears to need
     data the schema doesn't return, OMIT it (do not add a query).
4. Verify (all must pass — do not tick the phase until they do):
   - `npm run build`   (tsc + vite)
   - `npm run lint`
   - `npm run prettier:fix` then `npm run prettier`
   - `npm run dev`, then screenshot this phase's screen(s) in BOTH dark and light themes.
   - Manually exercise this phase's named "System functions" and confirm they still work (proves zero logic change).
   - `git diff` the logic files for this phase and confirm the diff is className/JSX/token-only.
   If anything fails: fix within the same phase and re-verify. Do NOT proceed to the next phase with a red gate.
5. Commit: `git add -A && git commit` on a feature branch (branch off main if on main), message
   `style(ember): P<n> <phase name> — reskin, no logic change`.
6. In PROGRESS.md, tick this phase's checkbox to [x], append a one-line note (commit SHA + any deferred item flagged
   in the plan), and save.
7. If unchecked phases remain, STOP and report "Phase P<n> done, N phases remain — re-run to continue." If all
   phases are [x], run the P10 gate once more and report "EMBER reskin complete."

Rules: never edit CLAUDE.md, settings, or permissions. If a phase surfaces a genuine logic-change requirement or an
ambiguous product decision (e.g. password-policy reconcile, always-dark vs theme-aware rail, dossier-grid data
enablement), STOP and surface it rather than guessing.
```
 (list → gallery), `template.tsx` (editor);
  `TargetTypePicker` restyle.
- **NEW shared (if not from P3):** `Kpi` tile visual (utilities or a small component), `SeverityBar`
  (`components/shared/severity-bar.tsx`).

**Preserve**
- **Dashboard** — every query + `loading` flag (11 global + 5 per-flow, enumerated in the module map), all chart-data
  `[...(data??[])].reverse().map(...)` transforms, `CHART_COLORS` `var(--color-chart-N)` refs, `CustomTooltip`,
  collapsible open state, dedupe/sort memos, `StatCard`/`UsageStatsRow`/`UsageStatsTable` shapes, all `format*` calls.
  `format-utils.ts` untouched. **Do NOT hoist** the total-stat hooks to build a cross-tab KPI strip (relocates data
  flow). `flow-dashboard.tsx` hidden-`TabsList` structure preserved.
- **Report** — `flow-report.tsx` is the data brain: all param/searchParam parsing, `useFlowReportQuery`/
  `useAssistantsQuery`/`useAssistantLogsQuery`, `isAutomation` branch, the big `model` memo, `fileBaseName`, the
  auto-download effect, `handleCopy/DownloadMarkdown/DownloadPdf`, gating. `flow-report-view.tsx` — `isEmpty`, the
  export `DropdownMenu`, `max-w-6xl lg:grid-cols-[220px_1fr]` TOC layout, child order. Each report child's
  conditional field blocks, `overallPosture`/`deriveSummaryNarrative`, `SEVERITY_ORDER.map`, `CopyButton`,
  `ScreenshotView`, `finding.cvss.toFixed(1)`, `flow-report-toc.tsx` `IntersectionObserver` scroll-spy.
- **Templates** — `templates.tsx` `useTemplates`, all state, `filteredTemplates` memo, `handleTemplateOpen/
  DeleteDialogOpen/Delete` (optimistic `deletingIds`), `renderRowContextMenu`, target-type `Select`, empty
  `StatusCard`s, `ConfirmationDialog`. `template.tsx` — zod schema, `useForm`, `useFlowTemplateQuery`, load effect,
  `hasUnsavedChanges`, create-vs-update branch, `handleApplyPreset`/replace flow, `PRESET_TEMPLATES`,
  `useBreakpoint` Sheet/aside, `TargetTypePicker`.

**Restyle approach**
- **Dashboard** — underline tabs (Analytics/Overview) + period `.seg` segmented control; analytics cards →
  `.card-head` mono overline + the **source-query chip** convention (e.g. `usageStatsByProvider`); charts recolored
  to tokens; StatCards → EMBER `.kpi` (first = `.kpi.hero` brand-tint gradient); breakdown tables → `.tbl` density +
  optional cost-share mini-bars + agent monogram share-bars (client-side pct from existing data — no new query).
  **No fabricated findings/severity KPI** on the global dashboard.
- **Report** — add the EMBER **report masthead** (brand wordmark, "Confidential" overline in `--sev-crit`, target in
  large mono, engagement fields **derived from `model`**, risk-gauge grade **derived from `overallPosture`** — never
  hardcoded "C"). **Drop** Acme/"Prepared for"/Compliance card/hardcoded CVE `<mark>` table. Findings summary →
  `.sevbar` stacked mix bar + `.sev-pill` counts. Finding cards → severity `border-l` from recolored `borderClass`,
  `.evidence` mono panel (no invented `<mark>` token list), remediation callout retuned to `--st-finished` green.
  PDF reskin **mostly falls out of P3** (`severity-palette pdf.*` + `BRAND`); align cover/exec layout in
  `report-pdf/*` `StyleSheet`s. **Report stays theme-aware** — no theme forcing.
- **Templates** — list → EMBER **card gallery** (`filteredTemplates.map` over `.card` cells; target glyph tile +
  title + `#id` + `systemOwned`→`.badge-sys`/else `.badge-outline` + `DropdownMenu` reusing existing Edit/Delete +
  `deletingIds` spinner; `line-clamp-2` body; `TargetTypeChip` footer). **Drop the "N uses"** (not in schema). Keep
  the target-type `Select` filter + both `StatusCard` empty states + `ContextMenu`. **Consciously accept** the
  gallery drops DataTable's built-in title-search + column-sort (do not smuggle in new filter state; flag if
  re-adding). Editor → EMBER `.card`/`.input`/`.textarea` + preset aside; keep Sheet on mobile.

**Verify** — build/lint. `dev`: dashboards (global + per-flow, both themes); open a report (web view) + trigger PDF
export; templates gallery + editor. **System functions:** period toggle refetches; report PDF downloads and renders
with EMBER severity colors; create/edit a template (create-vs-update branch); the report's derived risk grade
matches actual max severity (not "C").

---

### P8 — Settings + Login + Auth

**Files to touch**
- **Settings:** `settings-providers.tsx`, `settings-provider.tsx` (the big per-agent form — highest risk here),
  `settings-prompts.tsx`, `settings-prompt.tsx`, `settings-api-tokens.tsx`, `settings-users.tsx`.
  (`settings-layout.tsx` was P2.)
- **Login/Auth:** `src/pages/login.tsx`, `src/features/authentication/login-form.tsx`,
  `src/features/authentication/password-change-form.tsx`. **PRESERVE 100%:** `src/providers/user-provider.tsx`.
- **Shared primitives (restyle once, global):** `components/ui/data-table.tsx` (the pager lives here),
  `card.tsx`/`status-card.tsx`/`badge.tsx`/`accordion.tsx`/`command.tsx`/`popover.tsx` (most already touched in P1).

**Preserve**
- Every settings page: all `use*Query`/`use*Mutation` + subscriptions (api-tokens has 3), `useSearchParams` paging,
  3-way `handleColumnSort`, the full `columns` `ColumnDef[]` (incl. inline edit `Input`/`Select`/`Calendar`/`Popover`,
  `sortingFn`, `size`, `meta`), `renderSubComponent`/`renderRowContextMenu`, `ConfirmationDialog`, loading/empty
  branches, external Playground/Swagger links. `settings-provider.tsx` — **the entire `AgentsConfigInput` handling**
  (`agentTypes`, the `reduce` default builder, per-agent `setValue('agents.{key}.price.*')` cascades, temperature/
  maxTokens/reasoning), `useForm`/zod, all 6 mutations + `handleTestAgent`, `Accordion` + inline Test
  `stopPropagation`, the test-result `Dialog`. `settings-users.tsx` — REST `fetchUsers`/`fetchRoles`/`updateUser`,
  the `currentUserId` self-guard tooltips/disabled.
- `login.tsx` — `getSafeReturnUrl(..., '/flows/new')`, `authProviders`, the `!isLoading` gate. `login-form.tsx` —
  `formSchema` (mail `.refine` admin/demo/email, password `.min(1)`), all state, `useUser` calls, `handleSubmit`/
  `handleProviderLogin`/skip/success, the `shouldShowPasswordChange` branch, `providerActions.filter`, submit-disabled.
  `password-change-form.tsx` — **`passwordChangeSchema` EXACTLY** (legacy 8/16 policy + both cross-field refines),
  the `axios.put('/user/password', …)`, the `err.response.data.code` switch, all props. `user-provider.tsx` untouched.

**Restyle approach**
- Settings tables via the shared `data-table.tsx` restyle (mono overline heads, `hover:bg-muted/40`, `rounded-lg
  border overflow-x-auto`, EMBER `.pager` footer). Status cells → `StatusPill`; "Default"/system → `.badge-sys`;
  type/CUSTOM → `.badge-outline`; ids/dates/models/prices → `font-mono`. Provider name cell wraps the real brand
  `providerIcons[type]` in a bordered tile (**keep the real brand SVG** — do not replace with a letter monogram).
  `settings-provider.tsx` form: `.field-label`/`.field-hint`, inputs on `--well` with `--brand-ring` focus, Accordion
  Test pill → `.btn-sm`, test-result `Dialog` → EMBER modal. `settings-prompts.tsx` Agent column prepends
  `AgentMonogram` (camelCase→snake_case). `settings-prompt.tsx` System/Human → P1 underline tabs. Optional intro
  cards (api-tokens/users) are pure-presentational.
- **Login** → EMBER split (`.auth`): decorative column becomes the hero (inline static constellation SVG,
  `AgentStack(['researcher','developer','executor'])`, stat strip), hidden `<lg`; form column hosts `<LoginForm>`
  unchanged (optional grid-order swap to hero-left). `login-form.tsx` → EMBER sign-in card (OAuth `.btn-outline`
  above an "or continue with" divider, `.input`, submit `.btn-primary .btn-lg`). `password-change-form.tsx` → EMBER
  `.input` + eye toggles + `.field-hint`.
- **Password-policy call-out:** the login `.field-hint` "12+ chars" copy must not contradict the **actual** legacy
  schema in `password-change-form.tsx` (8/16). Keep the existing `FormDescription` text; **do not** change the zod
  (hard rule 1). Reconcile only on explicit approval.

**Verify** — build/lint. `dev` (both themes): each settings table + the big provider form + login split + password-
change screen. **System functions:** create/edit an API token (inline row edit + one-time-secret dialog + copy);
open the provider form, expand an agent Accordion, run Test; log in with email/password (returnUrl redirect) and the
self-guard disables Block/Delete on your own user row.

---

### P9 — Terminal lazy-highlight  *(the ONE permitted behavioral change)*

**File to touch:** `src/components/shared/terminal/terminal-highlight.tsx` — **only** the `TermOutput` component.

**Preserve** — all regexes, `walk`/`detectLine`/`detectBlockType`/`textLineBase`/`flattenLines`/`renderOutputLine`/
`TermCommandLines`, every bound (`MAX_PREVIEW_CHARS`/`MAX_LINE_CHARS`/`MAX_FLAT_LINES`/budgets), and all exports.
`copyText` computed separately — untouched. No className changes (colors come from `.term-*` tokens).

**Restyle/change approach** (scroll-driven progressive highlight; **output-identical**):
1. In `TermOutput` compute `flat`/`hidden`/`shown` exactly as now; split `shown` into `CHUNK = 40`-line chunks
   (preserve the **global** line index for `lineDelay`).
2. Internal `<LineChunk startIndex lines highlight>`: **deferred** state renders each line as
   `<div className={cn('term-line break-all whitespace-pre-wrap', base)} style={{animationDelay: lineDelay(i)}}>
   {line.text}</div>` (raw text but same eager `base` line-class = ~5 cheap `.test()`s); **highlighted** state swaps
   **only the children** to `{renderOutputLine(line.text, isErr)}`. Wrapper element/className/key/style **byte-identical**
   between states → React reconciles children in place (no re-mount, no fade re-fire, no layout shift; concatenated
   text === `clean`).
3. **Chunk 0 eager** (top paints colored on first frame); all other chunks start deferred.
4. One `IntersectionObserver` per `TermOutput` (`root:null`, `rootMargin:'600px 0px'`), observe each deferred chunk's
   wrapper via ref-callback; on first intersection flip `highlight=true` + `unobserve` (one-way). Disconnect in the
   `useEffect` cleanup.
5. **Fallback:** if `typeof IntersectionObserver === 'undefined'` → all chunks `highlight=true` (current eager
   behavior). Outputs ≤1 chunk are fully eager (zero IO).

**Risk notes** — keep the wrapper `<div>` stable across the flip (branching the whole element re-fires
`term-line-in` → flash). Use the global index into `lineDelay` (per-chunk index changes stagger timing = visible
change). `rootMargin` ≥ a screenful. Radix already unmounts inactive `TabsContent`, so the observer only lives for
the active tab.

**Verify** — build/lint. `dev`: open a flow whose terminal has a long (≥hundreds of lines) step output — the visible
top is colored on first frame, off-screen chunks colorize just before scrolling into view, **no plain-text flash**,
no layout jump. **System functions:** native browser find-in-page (Ctrl+F) finds text in not-yet-highlighted lines
(full text always in DOM); copy still returns the full untruncated text; the message "Show details" panel
(`TermOutputCard`, same code path) also loads fast. Confirm flow **load time** improves (the original stall is gone).

---

### P10 — Responsiveness + regression pass  *(final gate)*

**No new files.** A dedicated sweep, not new feature work.

**Do**
- Walk every reskinned screen at mobile (<768px) / tablet (768–1200px) / desktop in **both themes**. Confirm: no
  horizontal body scroll; dossier grids collapse 3→2→1; KPI strips 4→2→1; the wizard two-col → one-col; tables/
  terminals scroll inside their own `overflow-x-auto`; message bubbles cap `max-w-*`; titles `min-w-0 truncate`;
  the rail folds to the `<Sheet>` drawer and the collapsed 68px icon rail centers brand/CTA.
- Confirm all shadcn cva variants (`Badge`/`Button`/`InputGroupButton`/`Switch`/`Tabs`) resolve to the new
  `--primary`/`--destructive`/`--muted` tokens (they reference semantic tokens — no per-call fix needed).
- **Full regression of the preserved system functions** across P2–P9 (see each phase's "System functions"): login,
  create scan → boot animation → navigate, send automation + assistant messages, provider/template lock-by-status,
  tab-switch xterm survival, favorites, theme toggle persistence, report export (web + PDF), settings inline edits +
  provider Test, API-token one-time secret, users self-guard.
- Re-run the whole gate once more end-to-end: `npm run build` (tsc + vite), `npm run lint`, `npm run prettier`,
  `npm run test` (Vitest — confirm nothing regressed; note: no test imports `terminal-highlight`).

**Verify** — the above all green; screenshots of every screen in both themes archived; a final grep proving no
GraphQL doc / hook option / mutation-variable / `navigate()` target changed anywhere (`git diff` scoped to logic
files should be className/JSX-only).

---

## 3. P1 token block — exact `src/styles/index.css` edits

> Values are the **approved EMBER hex** (byte-exact to `redesign/ember.css`). Tailwind v4's `--color-*: var(--x)`
> mappings resolve hex, and `/opacity` modifiers compile to `color-mix(…, transparent)` which works with hex.
> `--chart-1..5` keep their existing oklch owned-orange ramp. This is a translation of EMBER `:root` (dark) → app
> `.dark`, and EMBER `.theme-light` → app `:root`. Keep every `--shadow-*`/`--tracking-normal`/`--spacing` tail line
> and all other blocks unchanged.

### 3a. Additions to the `@theme` block (insert after `--color-chart-5` mapping, ~line 206)

```css
    /* EMBER severity ramp → utilities (bg-sev-crit, text-sev-high, bg-sev-crit-bg …) */
    --color-sev-crit: var(--sev-crit);
    --color-sev-crit-bg: var(--sev-crit-bg);
    --color-sev-high: var(--sev-high);
    --color-sev-high-bg: var(--sev-high-bg);
    --color-sev-med: var(--sev-med);
    --color-sev-med-bg: var(--sev-med-bg);
    --color-sev-low: var(--sev-low);
    --color-sev-low-bg: var(--sev-low-bg);
    --color-sev-info: var(--sev-info);
    --color-sev-info-bg: var(--sev-info-bg);

    /* operational status → utilities (text-st-running, bg-st-finished …) */
    --color-st-created: var(--st-created);
    --color-st-classifying: var(--st-classifying);
    --color-st-running: var(--st-running);
    --color-st-waiting: var(--st-waiting);
    --color-st-finished: var(--st-finished);
    --color-st-failed: var(--st-failed);

    /* agent identity → utilities (bg-ag-researcher …) */
    --color-ag-researcher: var(--ag-researcher);
    --color-ag-developer: var(--ag-developer);
    --color-ag-executor: var(--ag-executor);
    --color-ag-default: var(--ag-default);

    /* brand + surface helpers → bg-brand-tint, text-primary-hover, bg-well … */
    --color-primary-hover: var(--primary-hover);
    --color-brand-tint: var(--brand-tint);
    --color-brand-tint-2: var(--brand-tint-2);
    --color-well: var(--well);
    --color-border-strong: var(--border-strong);

    /* EMBER glow → shadow-glow-brand (single live-scan card / primary CTA) */
    --shadow-glow-brand: var(--glow-brand);
```

*(No change to the `--radius-sm/md/lg/xl` mappings — they derive from `--radius`, retuned below to `0.5rem` so the
scale snaps to EMBER: sm=4 md=6 lg=8 xl=12.)*

### 3b. Replace the color/font/radius lines in `:root` (LIGHT = EMBER `.theme-light`, ~lines 314–350)

Keep the `--shadow-x … --spacing` tail untouched; replace the color/font/radius lines and append the helpers + ramps:

```css
    :root {
        /* neutrals — warm off-white */
        --background: #FAF9F7;
        --foreground: #141210;
        --card: #FFFFFF;
        --card-foreground: #141210;
        --popover: #FFFFFF;
        --popover-foreground: #141210;
        --primary: #F57214;               /* ember amber — kept */
        --primary-foreground: #FFF7ED;
        --secondary: #F2F0ED;
        --secondary-foreground: #141210;
        --muted: #F1EFEC;
        --muted-foreground: #5F5A54;
        --accent: #EFEDE9;
        --accent-foreground: #141210;
        --destructive: #D0102E;           /* = sev-crit (light) */
        --destructive-foreground: #FFFFFF;
        --border: #E6E2DD;
        --input: #E0DBD5;
        --ring: #F57214;
        --chart-1: oklch(0.8784 0.1662 91.53);  /* keep existing owned-orange ramp */
        --chart-2: oklch(0.7697 0.1689 68.03);
        --chart-3: oklch(0.6663 0.1632 55.93);
        --chart-4: oklch(0.5551 0.152 47.65);
        --chart-5: oklch(0.4729 0.1329 46.03);
        /* rail — theme-aware warm-light (EMBER iteration-2) */
        --sidebar: #F0EEEA;
        --sidebar-foreground: #141210;
        --sidebar-primary: #F57214;
        --sidebar-primary-foreground: #FFF7ED;
        --sidebar-accent: rgba(245,114,20,.11);
        --sidebar-accent-foreground: #B85E12;
        --sidebar-border: #E6E2DD;
        --sidebar-ring: #F57214;

        /* EMBER brand + surface helpers (light) */
        --primary-hover: #DD6400;
        --brand-tint: rgba(245,114,20,.11);
        --brand-tint-2: rgba(245,114,20,.06);
        --brand-ring: rgba(245,114,20,.55);
        --well: #F4F2EF;
        --border-strong: #D6D1CB;
        --glow-brand: 0 1px 2px rgba(245,114,20,.3), 0 8px 20px -8px rgba(245,114,20,.45);
        --hi: 0 1px 2px 0 rgba(20,18,16,.05);

        /* severity ramp (light — AA on white) */
        --sev-crit: #D0102E; --sev-crit-bg: rgba(208,16,46,.10);
        --sev-high: #C2410C; --sev-high-bg: rgba(194,65,12,.10);
        --sev-med:  #A66300; --sev-med-bg:  rgba(166,99,0,.11);
        --sev-low:  #0369A1; --sev-low-bg:  rgba(3,105,161,.10);
        --sev-info: #585F6B; --sev-info-bg: rgba(88,95,107,.10);
        /* status ramp (shared) */
        --st-created: #6E747E; --st-classifying: #A78BFA; --st-running: #F57214;
        --st-waiting: #35B9E9; --st-finished: #2FBF71;  --st-failed: #FB3B4E;
        /* agent identity (shared) */
        --ag-researcher: #38BDF8; --ag-developer: #A78BFA;
        --ag-executor: #34D399;  --ag-default: #8B93A0;

        --font-sans: Inter, sans-serif;
        --font-serif: Inter, serif;
        --font-mono: 'JetBrains Mono', 'Roboto Mono', ui-monospace, monospace;
        --radius: 0.5rem;                 /* 8px — kills the rounded-xl tell */
        color-scheme: light;
        /* …keep the existing --shadow-x … --spacing lines below unchanged… */
    }
```

### 3c. Replace the color/font/radius lines in `.dark` (DARK = EMBER `:root`, the new default surface, ~lines 371–407)

Keep the `--shadow-x … --shadow-2xl` tail untouched; replace color/font/radius and append the helpers + ramps:

```css
    .dark {
        /* neutrals — warm graphite (hue ~60, very low chroma) */
        --background: #0E0F11;
        --foreground: #E9EBED;
        --card: #16181B;
        --card-foreground: #E9EBED;
        --popover: #1D1F23;
        --popover-foreground: #E9EBED;
        --primary: #F57214;               /* ember amber — full strength */
        --primary-foreground: #1B1206;
        --secondary: #191B1F;
        --secondary-foreground: #E9EBED;
        --muted: #1A1C1F;
        --muted-foreground: #9BA1AB;
        --accent: #202226;
        --accent-foreground: #E9EBED;
        --destructive: #FB3B4E;           /* = sev-crit (dark) */
        --destructive-foreground: #FFF5F5;
        --border: rgba(255,255,255,.09);
        --input: rgba(255,255,255,.12);
        --ring: #F57214;
        --chart-1: oklch(0.8784 0.1662 91.53);  /* keep existing owned-orange ramp */
        --chart-2: oklch(0.7697 0.1689 68.03);
        --chart-3: oklch(0.6663 0.1632 55.93);
        --chart-4: oklch(0.5551 0.152 47.65);
        --chart-5: oklch(0.4729 0.1329 46.03);
        /* rail — graphite */
        --sidebar: #0A0C0E;
        --sidebar-foreground: #E9EBED;
        --sidebar-primary: #F57214;
        --sidebar-primary-foreground: #1B1206;
        --sidebar-accent: rgba(245,114,20,.12);
        --sidebar-accent-foreground: #F57214;
        --sidebar-border: rgba(255,255,255,.09);
        --sidebar-ring: #F57214;

        /* EMBER brand + surface helpers (dark) */
        --primary-hover: #FF8636;
        --brand-tint: rgba(245,114,20,.12);
        --brand-tint-2: rgba(245,114,20,.06);
        --brand-ring: rgba(245,114,20,.55);
        --well: #131417;
        --border-strong: #2A2D31;
        --glow-brand: 0 0 0 1px rgba(245,114,20,.55), 0 0 26px -6px rgba(245,114,20,.40);
        --hi: inset 0 1px 0 rgba(255,255,255,.045);

        /* severity ramp (dark) */
        --sev-crit: #FB3B4E; --sev-crit-bg: rgba(251,59,78,.14);
        --sev-high: #FF6B2C; --sev-high-bg: rgba(255,107,44,.14);
        --sev-med:  #F5A524; --sev-med-bg:  rgba(245,165,36,.14);
        --sev-low:  #35B9E9; --sev-low-bg:  rgba(53,185,233,.14);
        --sev-info: #8B93A0; --sev-info-bg: rgba(139,147,160,.14);
        /* status ramp (shared) */
        --st-created: #6E747E; --st-classifying: #A78BFA; --st-running: #F57214;
        --st-waiting: #35B9E9; --st-finished: #2FBF71;  --st-failed: #FB3B4E;
        /* agent identity (shared) */
        --ag-researcher: #38BDF8; --ag-developer: #A78BFA;
        --ag-executor: #34D399;  --ag-default: #8B93A0;

        --font-sans: Inter, sans-serif;
        --font-serif: Inter, serif;
        --font-mono: 'JetBrains Mono', 'Roboto Mono', ui-monospace, monospace;
        --radius: 0.5rem;
        color-scheme: dark;
        /* …keep the existing --shadow-x … --shadow-2xl lines below unchanged… */
    }
```

### 3d. Optional base-layer nicety (inside the existing `@layer base`, near `body { … }`)

```css
    ::selection { background-color: var(--brand-tint); color: var(--primary); }
    /* only if not already present — running/waiting status pulse used by P3 */
    @keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: .45 } }
```

### 3e. Do NOT touch in index.css

`.terminal-scope` (~523–621, already on-EMBER — the P6 `terminal-config.ts` nudge is optional), every `@keyframes`/
`.scan-*`/`.term-line` block (scan animation depends on them), `.prose`/`.dark .prose`, `@font-face` (JetBrains
already loaded 400–700), `@utility container`, the scrollbar rules, and any existing `@theme --color-*` mapping
(components reference them — only add).

---

## 4. Risk register — where logic could break, and how to touch it safely

| # | File(s) | The risk | Safe-touch rule |
|---|---|---|---|
| R1 | `providers/flow-provider.tsx` | Renders no DOM; holds 3 queries + **15 subscriptions** + 6 mutations + `isAssistantMode`/`selectedAssistantId` inference. A stray edit silently breaks live updates or mode selection. | **Do not open to restyle.** Zero edits. Downstream JSX reads its bindings — restyle the consumers, never the provider. |
| R2 | `pages/domains/new-engagement.tsx` | `buildCredential()` JSON shapes + `onSubmit`'s `createScan` input + `navigate('/scans/'+id)` are the create→scan contract. Reordering a key or touching a branch corrupts scan creation. | Restyle **wrappers only** (stepper/choice-card/review/`.input`). Never enter `buildCredential`/`onSubmit`. Verify by creating a real scan end-to-end. |
| R3 | `settings-provider.tsx` (per-agent form) | The `AgentsConfigInput` `reduce` builder + per-agent `setValue('agents.{key}.price.*')` cascades + 6 mutations. The densest rhf surface in the app. | Restyle `FormLabel`/`FormDescription`/`Input`/`Accordion`/`Dialog` **className only**. Do not touch `useForm`/`useController`/`setValue`/handlers. Verify: expand an agent, pick a model (prices cascade), run Test, Save. |
| R4 | `lib/severity-palette.ts` | Shared by **web + PDF + markdown**. `weight` drives `compareFindings` sort; `pdf.*` is a literal-hex print palette; `iconClass.includes('animate-spin')` is a string contract. | **Values only.** Never touch `weight`, `label`, `cvssRange`, keys, or the `pdf` object structure. Recolor web classes + `pdf` hex. Verify: report sort order unchanged + PDF exports. |
| R5 | `lib/report-pdf/*` + `flow-report.tsx` | react-pdf can't read CSS vars; the report is a client deliverable + has an auto-download `useEffect` + markdown tokenizer. | PDF reskin is **`StyleSheet` + `pdf.*` hex only** (mostly falls out of R4). Do not touch `flow-report.tsx` data logic, `build-report-model.ts`, `report-model.ts`, or `report-pdf.tsx` orchestrator. Verify: `?download` auto-export still fires and closes the tab. |
| R6 | `features/flows/messages/*` + `flow-form.tsx` | The **StatusType gating** (`isFormDisabled`/`isFormLoading`/`isProviderChangeAllowed`/`isProviderDisabled`) + debounce effects + submit⇄stop swap. Break it and the input dock mis-enables during a run. | Restyle the dock **frame + chips + buttons** onto existing cva variants. Preserve every gating derivation + zod + effects. Verify: provider/template lock while Running, unlock on Waiting; Send→Stop while running. |
| R7 | `flow-tabs.tsx` Terminal `TabsContent` | `forceMount` + `data-[state=inactive]:hidden` keeps xterm alive across tab switches (prevents the cloud-log freeze). Converting to unmount is a silent regression. | Restyle the tab **row** only. Never remove `forceMount` or change the content mount contract. Verify: switch tabs and back — xterm still streams. |
| R8 | `terminal-highlight.tsx` (P9) | The **only** behavioral change. If the wrapper element isn't byte-identical across the highlight flip, the fade re-fires (flash); a per-chunk index changes stagger timing (visible change). | Keep wrapper `<div>` className/key/style stable; swap **children only**; use the **global** line index in `lineDelay`; IO-fallback to eager. Verify: no plain-text flash, find-in-page + copy see full text, load stall gone. |
| R9 | `ui/sidebar.tsx` + `main-sidebar.tsx` | Stateful infra: `SidebarProvider` cookie state, ⌘/Ctrl+B, mobile `<Sheet>`, the profile `DropdownMenu` (theme/logout/change-password). Hand-rolling the pop breaks outside-click/a11y. | Restyle via `--sidebar-*` tokens + className. **Keep the shadcn `DropdownMenu`** — don't rebuild EMBER's manual pop. Preserve `toggleSidebar`/`SidebarRail.onClick`. Verify: collapse, mobile drawer, theme switch persist. |
| R10 | `components/ui/data-table.tsx` (+ `tabs`/`card`/`badge`) | Shared primitives: one edit repaints providers/tokens/users/prompts/flows. A cva-key rename cascades a build break everywhere. | className-only; never rename/drop a variant/size key; preserve sorting/paging/visibility/context-menu/expand logic. Verify a table on each of the 4+ pages after. |
| R11 | `password-change-form.tsx` | Legacy 8/16 zod policy vs CLAUDE.md's 12-char mandate vs EMBER "12+ chars" copy. Hard rule 1 forbids changing the zod. | Preserve `passwordChangeSchema` exactly; keep the existing `FormDescription`; don't let restyle copy misstate the real rule. Reconcile only on explicit approval. |
| R12 | `scan-initializing.tsx` / `use-scan-stage.ts` / `.scan-*` keyframes | The scan boot animation — draws from tokens + keyframes; must survive the reskin untouched at every call-site. | **Zero edits.** It re-skins automatically from P1. Keep all `<ScanInitializing stageIndex=…>` mounts + props identical. Verify: boot animation plays on new scan + booting flow. |

**Cross-cutting safety:** after every phase, `git diff` the logic files and confirm the diff is className/JSX-only —
no changed hook option, GraphQL variable, `navigate()` target, or effect dependency array.

---

## 5. Self-loop prompt (fire once per iteration until the plan is complete)

```
You are the EMBER reskin implementer for the PentAGI frontend (frontend/). Drive ONE phase to completion, then stop.

1. Read frontend/IMPLEMENTATION-PLAN.md and frontend/PROGRESS.md in full.
2. Pick the FIRST unchecked phase in PROGRESS.md (respect order — do not skip; if a phase is partially done, resume it).
3. Implement that phase EXACTLY as the plan specifies:
   - Change ONLY JSX structure / className / inline-style / the P1 token block (and, in P9 only, the specced
     TermOutput lazy-highlight). Preserve ALL logic byte-for-byte: no GraphQL/Apollo/hook/zod/rhf/effect/handler/
     navigate()/permission/subscription changes. Never rename or drop a cva variant/size key.
   - Honor every "Preserve" item and Risk-register rule for the files in this phase. If a restyle appears to need
     data the schema doesn't return, OMIT it (do not add a query).
4. Verify (all must pass — do not tick the phase until they do):
   - `npm run build`   (tsc + vite)
   - `npm run lint`
   - `npm run prettier:fix` then `npm run prettier`
   - `npm run dev`, then screenshot this phase's screen(s) in BOTH dark and light themes.
   - Manually exercise this phase's named "System functions" and confirm they still work (proves zero logic change).
   - `git diff` the logic files for this phase and confirm the diff is className/JSX/token-only.
   If anything fails: fix within the same phase and re-verify. Do NOT proceed to the next phase with a red gate.
5. Commit: `git add -A && git commit` on a feature branch (branch off main if on main), message
   `style(ember): P<n> <phase name> — reskin, no logic change`.
6. In PROGRESS.md, tick this phase's checkbox to [x], append a one-line note (commit SHA + any deferred item flagged
   in the plan), and save.
7. If unchecked phases remain, STOP and report "Phase P<n> done, N phases remain — re-run to continue." If all
   phases are [x], run the P10 gate once more and report "EMBER reskin complete."

Rules: never edit CLAUDE.md, settings, or permissions. If a phase surfaces a genuine logic-change requirement or an
ambiguous product decision (e.g. password-policy reconcile, always-dark vs theme-aware rail, dossier-grid data
enablement), STOP and surface it rather than guessing.
```
