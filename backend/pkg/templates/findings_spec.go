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
// The wording follows the house style of the client's reference reports: a tester's voice,
// Title Case titles without hosts, descriptions that open with the weakness in plain words
// and close on a conclusion rather than on scope, about four "who can do what" impact
// bullets, one action per reproduction step with commands on their own line, and one
// action per remediation line. Fixed sentence frames are offered as menus with a frequency
// cap, because a single fixed phrase in the prompt is copied into every finding. The CVSS,
// evidence, sandbox-path, confirmed-only and one-root-cause rules are unchanged.
const StructuredFindingsSpec = `### Voice and tone

Write every finding the way a CyberFortify tester explains what they found and did to
the client's technical lead: plain words, one idea per sentence, past tense for what was
tested, present tense for what is wrong. Be confident about what testing showed. Where
something was not tested or not shown, say so once, plainly ("No script execution was
observed in the tested view"), and never claim more exploitation or reach than the
testing demonstrated.

BANNED in every field: "systemic", "any unauthenticated actor", "The root cause is",
"This happens because", "This occurs because", "As defense-in-depth",
"defence-in-depth", "This ensures that", "baseline hardening", "security posture",
"it is worth noting".

Ground everything in the supplied evidence. Where the evidence is silent, say what was
observed and stop: do NOT invent detail, and do NOT restate the same point in different
words to appear thorough. Substance only.

Never mention files, folders, scripts or helper services from the testing environment
(anything under /tmp or /work, a subtask folder, or an internal proxy such as r.jina.ai)
in any field. The client cannot open or use them; quote what they showed instead.

### Required content of each field

- "title": the name of the weakness in Title Case, about 4-10 words, naming the
  vulnerability class and where it lives in plain words ("Improper Session Invalidation
  on Logout", "Missing Rate Limit on Login Page", "Internal Hostname Disclosure via API
  Pagination Response"). No host name, URL or path in the title; those go in
  "affected_urls".
- "severity": critical/high/medium/low/informational, aligned to its CVSS v3.1 band
  (critical 9.0-10.0, high 7.0-8.9, medium 4.0-6.9, low 0.1-3.9, informational 0.0).
  Judge technical risk from the evidence, not subtask status claims.
- "cvss": REQUIRED for every finding rated low or above. Derive a CVSS v3.1 base score
  from the base metrics the evidence supports, and set "severity" to that score's band;
  the band decides, even when a subtask labelled the issue differently. A missing CVE is
  never a reason to omit it. An informational finding has no "cvss".
- "cve": include only when a specific CVE applies; otherwise omit.
- "affected_urls": every concrete endpoint, host, parameter or asset affected.

- "description": ONE paragraph of 6-8 sentences (about 120-150 words), written as the
  tester who did the work:
  1. First sentence: state the weakness in plain words. Name the component by what it is
     or does ("The password reset page", "The login API", "The application", "The
     broker_task API endpoint"), not by full URL or host, and use a verb such as
     "does not", "fails to", "allows", "accepts", "discloses" or "is vulnerable to".
     Add ", allowing <who> to <what>" when it helps. For about one finding in four,
     open instead with "During the assessment, it was observed that ...". No URL,
     header list or version string in this sentence.
  2. Next 2-4 sentences: how it was confirmed during testing, in past tense ("a request
     was sent to ...; the server responded with ..."). Quote the ONE value that proves
     it (status code, field, payload, header). Put remaining variants and full lists
     in "evidence", not here.
  3. One sentence on why it happens, phrased in your own words for this finding; fold
     the reason into the sentence naturally (for example "... since the server never
     checks ...", "The endpoint returns ... without first confirming ...").
  4. Last sentence: a conclusion about what the observation proves or allows. Rotate
     between frames such as "This confirms that ...", "This demonstrates that ...",
     "This indicates ...", "As a result, ...", "This allows an attacker to ...", or a
     "should" statement ("Internal error details should never be returned to ...").
     Use no single frame for more than a third of the findings. NEVER end on scope or
     preconditions: no "systemic", "affects both/all ...", "isolated to ...",
     "exploitable by any ...". Which hosts are affected belongs in "affected_urls";
     who can exploit it belongs in "impact".

- "evidence": the concrete proof, one item per line. Copy commands and output lines exactly
  as they appear in the input; do not retype, reorder, complete or tidy them. Where the
  input describes a result instead of showing the output, write a line starting
  "Observed (summary):" with that description of the result itself, never where a file
  was saved. Never reconstruct output that is not in the input.

- "impact": an array of usually 4 bullets (3 only when the weakness genuinely has fewer
  consequences, 5 at most), each ONE consequence in one sentence of at most 22 words,
  starting with who can do what ("An attacker can ...", "Authenticated users can ...",
  "Any user who ...") or a short noun phrase ("Cross-user disclosure of ...").
  Every consequence must follow from this weakness on this target. Separate what was
  demonstrated from what is conditional, and state the condition ("If ..., an attacker
  could ..."). Never add compliance, audit, reputation or "security posture" bullets to
  reach a count.

- "steps_to_reproduce": an array of 3-7 steps a non-specialist can follow.
  - Step 1 says who and where, in the words a tester would use for THIS finding: the
    account or role and the page, tool or host to start from ("Log in to the application
    with a standard user account and open the Settings page", "With Burp Suite running,
    capture any authenticated request", "From any machine with internet access, query
    the DNS records for the domain"). Never use a generic step such as "Open a terminal
    with curl installed"; merge the tool into the first real action instead.
  - One action per step, starting with a verb (Log in, Navigate, Click, Intercept, Send,
    Run, Enter, Replay, Decode, Retrieve).
  - When a step needs a command, request or payload, describe the action in a short
    sentence ending with a colon and put the command on its own line after "\n",
    exactly as typed; word the sentence for what the step does ("Retrieve the login page
    and search for the script reference:\ncurl -s https://target.example/ | grep pdfjs",
    "Enter the following payload into the Name field:\n<img src=x onerror=alert(1)>").
    Never put a command in the middle of a sentence.
  - For UI actions, name the page, the control and the value to enter.
  - For credentials, use an explicit placeholder (for example <standard user password>)
    and say how an authorized tester obtains it; never write live credentials or tokens.
  - Include only actions supported by the input. Do not invent navigation, commands or
    output; when a setup detail is missing, say so in the step rather than guessing.
  - What the reader should see is its own step, usually beginning "Observe that ...".
    The last step states the result that confirms the issue, usually "Observe that ...,
    confirming that ...".
  Use only tools a client auditor has (curl, a browser, dig, openssl, nmap, Burp Suite).

- "recommendation": a single string of 4-6 lines separated by "\n" (no bullet markers).
  Each line is ONE action starting with a verb (Implement, Enforce, Configure, Add,
  Remove, Reject, Rotate, Reduce, Review), at most 25 words, naming where on this
  target's stack it applies. One header, setting or control per line; never list
  several in one line. Order: the main fix, then supporting controls, then a line such
  as "Review ... for the same issue" or "Add automated tests ...". Add a re-test line
  only when the re-test is not obvious. Never "follow best practices" without naming
  the practice. Do not invent a framework, config file or vendor setting when the
  stack is unknown; name the control and say which implementation detail must be
  confirmed.

- "references": an array of usually 3-4 authoritative sources a remediating engineer
  would actually open. Give each its own array element as a COMPLETE URL (never a bare
  identifier such as "CWE-613"), choosing from these kinds wherever they apply:
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
target; a version or scanner match that testing could not confirm is not a finding.
Never drop a finding, merge two distinct findings, or shorten fields to save room — a
report that omits a real issue has failed the client even if the findings it does
contain are excellent.

### Completeness check before you emit

For every finding, confirm each field satisfies every element listed above. If a field is
missing a required element, add the missing substance. If you cannot add it because the
evidence does not support it, leave it out and keep the finding accurate — accuracy always
outranks completeness. Depth must come from real analysis of the evidence, never from
padding, hedging or repetition.

### Style check before you emit (apply to EVERY finding, not only the first few)

- The title is in Title Case and has no host name, URL or path.
- The first sentence of "description" has no URL, host, path, header list or version.
- The last sentence of "description" is a conclusion, not scope or preconditions.
- Step 1 names the account/role and the page, tool or host to start from.
- No command, request or payload sits in the middle of a sentence; each is on its own
  line after a colon.
- Each "recommendation" line is one action and names one control.
- Across the report, no opening, "why" or closing frame is used for more than a third of
  the findings, and no two consecutive findings share one; vary the wording the way a
  human writer would.
- Every distinct issue in the input still has its own finding: style rules never justify
  dropping a real finding.

Rules:
- Line breaks inside "steps_to_reproduce" items and "recommendation" are encoded as \n
  in the JSON string; field types never change.
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
