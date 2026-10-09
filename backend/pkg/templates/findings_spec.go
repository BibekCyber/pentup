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
// The wording keeps the original prompt's per-field checklists, which produce findings of
// the length and shape of the client's reference report (one-paragraph description, about
// five impact and recommendation bullets), and adds only targeted fixes measured on real
// reporter inputs (docs/research/reporter-prompt-v3.md): CVSS required with the band
// deciding severity, no sandbox paths or internal proxies, evidence copied or marked
// "Observed (summary):", steps that state their observed result, confirmed findings only,
// one root cause per finding, no generic impact bullets added to reach a count, and
// recommendations that name where to make each change on the target's stack.
const StructuredFindingsSpec = `### Who reads a finding

These entries ARE the client's penetration-test report. The client is paying for a
professional audit deliverable, and each finding is read by three different audiences:
an executive deciding how much budget the risk justifies, an engineer who must fix it,
and an auditor who must independently re-test it. A finding is INCOMPLETE until all
three of those readers have what they need. Write every field to that bar.

Ground everything in the supplied evidence. Where the evidence is silent, say what was
observed and stop: do NOT invent detail, and do NOT restate the same point in different
words to appear thorough. Substance only.

Never mention files, folders, scripts or helper services from the testing environment
(anything under /tmp or /work, a subtask folder, or an internal proxy such as r.jina.ai)
in any field. The client cannot open or use them; quote what they showed instead.

### Required content of each field

- "title": short, specific, plain-text name of the issue.
- "severity": critical/high/medium/low/informational, aligned to its CVSS v3.1 band
  (critical 9.0-10.0, high 7.0-8.9, medium 4.0-6.9, low 0.1-3.9, informational 0.0).
  Judge technical risk from the evidence, not subtask status claims.
- "cvss": REQUIRED for every finding rated low or above. Derive a CVSS v3.1 base score
  from the base metrics the evidence supports, and set "severity" to that score's band;
  the band decides, even when a subtask labelled the issue differently. A missing CVE is
  never a reason to omit it. An informational finding has no "cvss".
- "cve": include only when a specific CVE applies; otherwise omit.
- "affected_urls": every concrete endpoint, host, parameter or asset affected.

- "description": a complete technical account written as ONE paragraph of flowing prose
  (not a list) that covers ALL SEVEN of the following, quoting observed values exactly as
  they appear in the input:
  (a) what the weakness is and which specific component, endpoint, parameter or
      configuration in THIS target carries it, and what that component is there to do;
  (b) the underlying technical root cause — the design or implementation decision that
      produces the flaw, not merely the symptom it shows;
  (c) how it manifested during testing, citing the concrete observed values (status
      codes, header names, tokens, versions, response bodies, timings) from the evidence;
  (d) why the controls that should have prevented this did not — the missing, disabled
      or incorrectly ordered check — or that no such control exists at all;
  (e) the realistic attack path: what an adversary does, in what order, to turn this into
      an actual compromise, and what capability or position they must hold first;
  (f) how widespread it is across the target: which endpoints, hosts or instances share
      the weakness, and whether it is systemic or isolated to one place;
  (g) the conditions that widen or limit exploitability (authentication required, network
      position, configuration dependent, production versus development).

- "evidence": the concrete proof, one item per line. Copy commands and output lines exactly
  as they appear in the input; do not retype, reorder, complete or tidy them. Where the
  input describes a result instead of showing the output, write a line starting
  "Observed (summary):" with that description of the result itself, never where a file
  was saved. Never reconstruct output that is not in the input.

- "impact": an array of 4-5 DISTINCT consequences. Give each consequence its own array
  element, and make each element a complete sentence that names all three of:
  the concrete outcome an attacker achieves; WHO or WHAT it affects (which data, which
  users, which systems, at what scale); and the realistic situation in which it plays
  out. Cover genuinely different dimensions — direct technical compromise, exposure of
  data or accounts, onward or lateral abuse, operational and business disruption, and
  regulatory or contractual exposure where it genuinely applies — rather than restating
  one consequence five ways. Every consequence must follow from this weakness on this
  target; never add a generic one (reputation, compliance friction, security maturity,
  how easy the fix is) just to reach the count. Never a bare fragment such as
  "data exposure".

- "steps_to_reproduce": an ordered array that lets an auditor with NO prior knowledge of
  this target reproduce the finding from scratch. Give each step its own array element,
  and make each step self-contained by including:
  the precondition or setup the step assumes (credentials, tooling, prior step's output);
  the exact action — a copy-pasteable command or request, with the real endpoint, method,
  headers, parameters and payload, plus how to obtain any non-standard tool used; and the
  specific result that confirms the issue at that step (status code, response body,
  timing, or behaviour), stated in the same element as its command. Include the initial
  setup step and the final confirming observation; a step such as "test the endpoint" is
  unacceptable. Use only tools a client auditor has (curl, a browser, dig, openssl, nmap,
  Burp Suite). Example element: "Request the home page headers with curl -sI
  https://target.example/; the response is HTTP/2 200 and contains no
  Content-Security-Policy header."

- "recommendation": implementation-ready remediation in prose, covering, in this order:
  (1) the PRIMARY fix — the exact configuration, code pattern, header, policy or control
      to apply, with the specific recommended value or setting, and where it belongs in
      the stack;
  (2) the supporting defence-in-depth controls that reduce the risk if the primary fix
      fails or is delayed;
  (3) how to VERIFY the fix actually closes the issue — the concrete re-test to run and
      the result that proves closure.
  Name the concrete place to make each change on the stack observed on this target (for
  example the CDN dashboard setting, the server or framework config file, or the plugin),
  and give the primary fix, the defence-in-depth controls and the verification each their
  own sentences.
  Never "follow best practices" without naming the practice and how to apply it here.

- "references": an array of 4-5 authoritative sources a remediating engineer would
  actually open. Give each its own array element as a COMPLETE URL (never a bare
  identifier such as "CWE-613"), and include one of each of these kinds wherever it
  applies to the finding:
  the specific CWE entry (https://cwe.mitre.org/data/definitions/<id>.html);
  the applicable OWASP Top 10 category page;
  the matching OWASP Cheat Sheet or Web Security Testing Guide test;
  the vendor, framework, standard or RFC documentation for the exact control you
  recommended in "recommendation";
  and the CVE or security advisory when one applies to this finding.
  Cite ONLY canonical documentation whose URL you are certain of — CWE, OWASP, NVD/CVE,
  IETF/RFC, NIST, or the official vendor or framework documentation. NEVER cite videos,
  blog posts, forums, tutorials or search results, and NEVER construct a URL whose exact
  path you are unsure of: a reference that 404s destroys the report's credibility. When
  in doubt, cite the canonical landing page for the standard rather than guessing a deep
  link, and give fewer references rather than an invented one.

### Coverage is not traded against depth

Report EVERY distinct issue the evidence supports, each as its own entry, AND write each
one to the full standard above. Report only weaknesses the testing confirmed on the
target; a version or scanner match that testing could not confirm is not a finding. Never drop a finding, merge two distinct findings, or
shorten fields to save room — a report that omits a real issue has failed the client even
if the findings it does contain are excellent.

### Completeness check before you emit

For every finding, confirm each field satisfies every element listed above. If a field is
missing a required element, add the missing substance. If you cannot add it because the
evidence does not support it, leave it out and keep the finding accurate — accuracy always
outranks completeness. Depth must come from real analysis of the evidence, never from
padding, hedging or repetition.

Rules:
- Every string field MUST be plain prose with NO markdown markup (no **, ##, ` + "`" + ` or list
  markers) — these render as styled report cards, not markdown.
- "impact", "steps_to_reproduce", "references" and "affected_urls" are JSON ARRAYS: one
  item per element, never several joined into a single string.
- Only include findings genuinely supported by evidence in this task; never invent or pad.
- Use an EMPTY array when the task produced no security findings (for example setup,
  reconnaissance-only, infrastructure or failed tasks). Do not force findings.
- Do not duplicate the same finding across multiple entries. One root cause is one
  finding, even when the input reports it twice: a missing control and the attack it
  enables (for example a missing X-Frame-Options header and clickjacking) are a single
  entry that lists every affected URL and carries the proof of exploitation.`
