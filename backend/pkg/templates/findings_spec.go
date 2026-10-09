package templates

// StructuredFindingsSpec is the SINGLE source of truth for how the model must write each
// structured security finding. Both report-producing paths render it:
//
//   - Automation mode, via the "Findings" section of reporter.tmpl
//   - Assistant mode, via the findings-extraction prompt in providers/assistant.go
//
// Keeping one copy matters: the two paths previously carried independent instructions, so
// depth improvements made for automation silently did not apply to assistant reports.
//
// The wording was chosen by A/B testing against real reporter inputs on the production
// reporter profile (docs/research/reporter-prompt-v3.md). A few rules look redundant but
// each fixed a measured failure: the sandbox-path ban only held as a top-level rule, the
// "Observed (summary):" outlet stops the model reconstructing output it never saw, the
// explicit "\n\n" stops whole runs coming back as one paragraph, and the inline example
// keeps "Expected:" in the same step as its command.
const StructuredFindingsSpec = `### Who reads a finding

Each finding is a section of a paid penetration-test report. Three people read it: an
executive deciding how much the risk matters, an engineer who must fix it, and an auditor
who must re-test it. Write so each of them can act without asking a follow-up question.

### Hard rules

1. Every fact comes from the input. Be specific to THIS target; never fill a gap with what
   is "usually" true, and never write a placeholder or example value (such as 12345,
   <uuid> or a guessed header).
2. Never mention files, folders or scripts from the testing environment (anything under
   /tmp, /work or a subtask folder). The client cannot open them. Quote what they showed
   instead, or leave them out.
3. Plain text only: no markdown (no **, #, backticks or list markers).

### Fields

- "title": the weakness and where it is, e.g. "Reflected XSS in the q parameter of /search".

- "cvss" and "severity": first score the weakness with CVSS v3.1 base metrics from the
  evidence, then set "severity" to exactly that score's band: critical 9.0-10.0, high
  7.0-8.9, medium 4.0-6.9, low 0.1-3.9. The band decides, even when a subtask labelled the
  issue differently. "cvss" is required for every finding rated low or above; a missing
  CVE is never a reason to omit it. A finding with no exploitable impact is
  "informational" and has no "cvss" at all. Set "cve" only when a specific CVE applies.

- "affected_urls": every concrete URL, host:port, parameter or DNS record affected.

- "description": three paragraphs of 2-4 sentences, separated by a blank line ("\n\n").
  1. What and where: the weakness, the exact component, endpoint or setting that has it,
     and whether it is isolated or repeated across the target.
  2. What was observed and why: the concrete values from testing, quoted exactly as they
     appear in the input (header line, version string, status code, response fragment,
     DNS record), and the root cause. Label any inference as an inference.
  3. How it is exploited: the attacker's starting position, what they do step by step,
     what they gain, and what limits it.
  At most one sentence of general background.

- "evidence": the proof, one item per line. Copy commands and output lines exactly as they
  appear in the input; do not retype, reorder, complete or tidy them. Where the input
  describes a result instead of showing the output, write a line starting
  "Observed (summary):" with that description. Never reconstruct output that is not in
  the input.

- "impact": 3-5 distinct consequences, one sentence each: what the attacker achieves,
  against which data, users or systems, and in what realistic situation. Only
  consequences this specific weakness enables; no generic compliance or reputation filler.

- "steps_to_reproduce": the minimal ordered steps an auditor runs from their own machine
  against the live target. Each array element is ONE complete step: the exact command or
  request (real host, path, parameters, payload), then "Expected:" and the confirming
  result, in the same string. Example element:
  "Request the home page headers: curl -sI https://target.example/ - Expected: no
  Content-Security-Policy header in the response."
  Never put "Expected:" in an element of its own.

- "recommendation": three paragraphs separated by a blank line ("\n\n").
  1. The fix: the literal value to deploy (complete header line, config directive or code
     pattern) and where it goes.
  2. Defence in depth: what limits the damage if the fix is delayed or bypassed.
  3. Verification: the re-test command and the result that proves the issue is closed.

- "references": 2-5 complete URLs you are certain exist: the CWE entry, the relevant OWASP
  page, and the vendor or RFC documentation for the recommended control. When unsure of a
  deep link, use the standard's landing page.

### Which findings to report

- One entry per distinct weakness the input substantiates. Do not merge two weaknesses,
  split one, or repeat one.
- Report confirmed low-risk observations (exposed version banners, missing hardening) as
  informational findings. Do not report things that were tested and held.
- Never drop a finding or shorten a field to save space.
- Use an empty array when the task produced no security findings.
- "affected_urls", "impact", "steps_to_reproduce" and "references" are JSON arrays, one
  item per element.`
