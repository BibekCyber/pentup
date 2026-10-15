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
// Keep findings concise and actionable without losing exact evidence, prerequisites,
// target-specific remediation, or distinct confirmed issues. The same writing rules
// apply to automation and assistant reports.
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

- "description": explain the weakness, affected component, and confirmed behaviour in
  plain language. Include the supported root cause, missing or failed control, affected
  scope, and conditions that affect exploitation. Distinguish observations from
  hypotheses and quote observed values accurately.
  Use short sentences and readable paragraphs. Give enough detail for an engineer to
  understand and fix the issue and an auditor to reproduce it. Do not impose a sentence
  or word limit. Avoid repeated explanations and generic background. Keep detailed
  commands, output, impact and remediation in their own fields.

- "evidence": the concrete proof, one item per line. Copy commands and output lines exactly
  as they appear in the input; do not retype, reorder, complete or tidy them. Where the
  input describes a result instead of showing the output, write a line starting
  "Observed (summary):" with that description of the result itself, never where a file
  was saved. Never reconstruct output that is not in the input.

- "impact": an array of DISTINCT technical or business consequences supported by the
  evidence. Name the concrete outcome and who or what it affects. Evidence determines
  the number of items; do not add speculative consequences to fill the section or omit
  a supported consequence for brevity. Distinguish demonstrated impact from conditional
  possibilities and state the conditions explicitly. Never add generic reputation,
  compliance or business claims unsupported by the evidence.

- "steps_to_reproduce": an ordered array that lets a reader with no prior knowledge of
  this target reproduce the finding without guessing.
  State required access, credentials and tools once in the initial setup step, including
  how to obtain any non-standard tool used. Then give one action per array element.
  Use direct verbs: Open, Click, Enter, Copy, Send, Run, Check.
  For UI actions, name the page, control and value to enter.
  For terminal actions, say where to run the command and put the exact copy-pasteable
  command or request on a separate line within the same element. Preserve the real
  endpoint, method, required headers, parameters and payload. Use explicit placeholders
  for credentials and explain how an authorized tester obtains those values; never
  expose live credentials in the report.
  Follow the relevant action with a short confirming observation (status code, response
  body, timing or behaviour). Use a separate array element for the observation when
  that improves readability. Include the final observation that confirms the issue.
  Use client-accessible tools such as curl, a browser, dig, openssl, nmap or Burp Suite.
  Include only actions and results supported by the supplied evidence. Do not invent
  navigation, commands, output or successful exploitation. If a required setup detail
  is unavailable, state the gap rather than guessing.

- "recommendation": a single string containing implementation-ready remediation,
  with one short instruction per line, in this order:
  (1) the PRIMARY fix — the exact configuration, code pattern, header, policy or control
      to apply, with the recommended value or setting and where it belongs in the stack;
  (2) any necessary supporting defence-in-depth controls;
  (3) a concrete verification action and the expected result that proves closure.
  Name the place to make each change on the stack observed on this target. Do not
  invent a framework, config file or vendor setting when the stack is unknown; state
  the control needed and the implementation detail that must be confirmed.
  Avoid generic advice such as "follow best practices" and repeated explanations.

- "references": an array of directly relevant, authoritative sources a remediating
  engineer would actually open. Give each its own array element as a COMPLETE URL
  (never a bare identifier such as "CWE-613"). Choose the applicable CWE, OWASP guidance,
  official vendor or framework documentation, standard, RFC, or CVE/security advisory.
  Do not add references to meet a fixed count.
  Cite ONLY canonical documentation whose URL you are certain of — CWE, OWASP, NVD/CVE,
  IETF/RFC, NIST, or the official vendor or framework documentation. NEVER cite videos,
  blog posts, forums, tutorials or search results, and NEVER construct a URL whose exact
  path you are unsure of: a reference that 404s destroys the report's credibility. When
  in doubt, cite the canonical landing page for the standard rather than guessing a deep
  link, and give fewer references rather than an invented one.

### Example: preserve observations and limitations

This synthetic example illustrates structure, not wording or length to repeat in every
finding. Its hosts and credentials are placeholders; never copy its facts into a report.

Input:
An authorized standard test user logs in to https://app.example/ and copies the bearer
token from the browser's Network panel. The API authenticates requests with that token.
The following requests and responses were recorded using the same token:
POST https://app.example/api/logout -> HTTP 200, Content-Type: text/html
GET https://app.example/api/session -> HTTP 200, {"authenticated":true}
The UI logout workflow, token expiry and server framework were not tested or established.
The supplied CVSS v3.1 base score is 4.3. Reference: https://cwe.mitre.org/data/definitions/613.html

Example finding JSON:
{
  "title": "Bearer token remains valid after the tested logout request",
  "severity": "medium",
  "cvss": 4.3,
  "affected_urls": ["https://app.example/api/logout", "https://app.example/api/session"],
  "description": "The API accepts the same bearer token after a standard user sends a POST request to /api/logout. That request returns HTTP 200 with HTML content, and a subsequent GET to /api/session returns HTTP 200 with authenticated set to true. The session endpoint uses the token to authenticate requests, so this sequence shows that the tested logout request did not terminate token-based access. The evidence does not establish whether the logout handler is missing, incorrectly routed, or failing to invalidate the token. Testing covered these two endpoints only. The application's UI logout workflow and token expiry were not tested, so the result does not establish that every logout method fails or that access persists indefinitely.",
  "evidence": "POST https://app.example/api/logout -> HTTP 200, Content-Type: text/html\nGET https://app.example/api/session -> HTTP 200, {\"authenticated\":true}",
  "steps_to_reproduce": [
    "Log in to https://app.example/ with an authorized standard test account.",
    "Copy its bearer token from an authenticated request in your browser's Network panel. Replace <TEST_TOKEN> in the commands below with that value.",
    "In your terminal, send the logout request:\ncurl -i -X POST https://app.example/api/logout -H 'Authorization: Bearer <TEST_TOKEN>'",
    "Observe HTTP 200 with Content-Type: text/html.",
    "Request the session endpoint using the same token:\ncurl -i https://app.example/api/session -H 'Authorization: Bearer <TEST_TOKEN>'",
    "Observe HTTP 200 and authenticated set to true. The token is still accepted after the tested logout request."
  ],
  "impact": ["A person holding this bearer token can retain authenticated access to the session endpoint after the tested logout request. The duration and access to other endpoints were not established."],
  "recommendation": "Confirm the intended logout route and its server-side handler.\nEnsure that successful logout invalidates the associated session or token in the API's authentication layer. The server framework was not established, so the exact configuration must be confirmed.\nRepeat the sequence using the intended logout workflow and verify that the old token is rejected by protected endpoints.",
  "references": ["https://cwe.mitre.org/data/definitions/613.html"]
}

### Writing style and technical depth

Write directly about this target. Avoid stock openings, repeated transitions and
formulaic phrases such as "The root cause is". Use "systemic" only when the testing
supports that scope. Preserve all material technical details and differences between
tested cases. State uncertainty explicitly; never claim broader coverage or exploitation
than the evidence demonstrates.

### Coverage and final check

Report EVERY distinct issue the evidence supports, each as its own entry. Report only
weaknesses the testing confirmed on the target; an unconfirmed version or scanner match
is not a finding. Never drop a confirmed finding or merge distinct issues for brevity.
Remove repetition while preserving proof and reproducibility. Never shorten a command,
omit a prerequisite, or remove an important limitation merely to reduce length.

Before emitting, check that the reader can identify the issue, follow each action and
recognize the confirming observation without guessing. Keep the finding accurate when
evidence is missing: state material gaps, and never invent missing details to satisfy
completeness. Check the supplied evidence against the whole finding: no material tested
case, technical detail or uncertainty may disappear merely to make the report shorter.
Keep detailed proof in evidence and avoid repeating it across fields.

Rules:
- Write string fields as plain text, without Markdown headings, emphasis, code fences
  or list markers; report renderers provide their own styling and numbering. Preserve
  literal syntax inside commands and evidence. Use line breaks to separate commands
  from instructions in steps_to_reproduce and instructions in recommendation. In JSON,
  encode those line breaks as \n within the string; do not change the field types.
- "impact", "steps_to_reproduce", "references" and "affected_urls" are JSON ARRAYS: one
  item per element, never several joined into a single string.
- Only include findings genuinely supported by evidence in this task; never invent or pad.
- Use an EMPTY array when the task produced no security findings (for example setup,
  reconnaissance-only, infrastructure or failed tasks). Do not force findings.
- Do not duplicate the same finding across multiple entries. One root cause is one
  finding, even when the input reports it twice: a missing control and the attack it
  enables (for example a missing X-Frame-Options header and clickjacking) are a single
  entry that lists every affected URL and carries the proof of exploitation.`
