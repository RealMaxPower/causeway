# Sensitive-data publication checks

Every real repository commit and GitHub publication requires a successful
local secret and PII check of the exact material being published. CI repeats
checks after upload; it cannot replace the local gate. Agents also need
explicit user approval before committing, pushing, or publishing to GitHub.
A scan pass is evidence for review, not permission to publish.

## Install and verify

Use Git, Node 22, pnpm from `package.json`, and Python 3.11–3.13. CI uses
Python 3.12 on Linux and macOS.

```bash
pnpm privacy:setup
pnpm privacy:tools
pnpm privacy:install-hooks
```

Bootstrap downloads pinned Gitleaks and a Python environment containing
Presidio, spaCy, and the pinned English model. Download and dependency hashes
are part of the tool configuration. The default installation directory is
`.sensitive-data-tools/`, which is ignored. Downloading tools needs network
access; the detectors analyze repository content locally.

The hook installer refuses to overwrite unrelated hooks or a custom hooks
configuration. Preserve those hooks and ask the maintainer to review their
integration. Any mutating hooks must run before the final sensitive-data gate.
Do not disable hooks, use `--no-verify`, or treat an installer failure as a pass.

The change introducing the gate has no bootstrap exemption: review the wrapper,
run its isolated guard tests, and independently check the complete staged
snapshot with the pinned detectors before its first approved commit. Audit the
tracked tree and relevant existing history as well. New or changed policy
exceptions require review; a baseline cannot waive unresolved findings.

## Commands and exact scope

| Command | Scope |
| --- | --- |
| `pnpm privacy:tools` | Verify required scanner, environment, and model integrity. This does not scan content. |
| `pnpm privacy:scan` | Current tracked working files and unignored untracked files. Useful before staging; not proof of the future commit's contents. |
| `pnpm privacy:staged` | The complete staged snapshot, including partially staged files and force-added ignored files. |
| `pnpm privacy:history` | All available refs and their reachable history by default. Use a full clone; missing required history blocks the check. |
| `pnpm privacy:history --range <git-range>` | An explicit investigation range. A limited range does not replace the push hook's complete outgoing-ref check. |
| `pnpm privacy:artifacts <file...>` | Exact publication files, such as proposed PR text and attachments, including files outside the repository. |
| `pnpm test:privacy` | Guard regression tests in isolated temporary repositories. Passing tests does not establish that the real repository is free of findings. |

The installed pre-commit hook scans staged blobs, rather than their potentially
different working copies. The final commit-message hook checks the message and
revalidates the staged snapshot. A staged secret therefore remains a finding
even if an unstaged edit has removed it from the working file.

The staged check also requires the privacy scripts, policy, and managed hooks
being executed to match their staged versions. Stage their final reviewed
changes together; an unstaged policy change cannot silently weaken the scan
for a different committed policy. To check a proposed commit message directly:

```bash
node scripts/sensitive-data/cli.mjs commit-msg /path/to/commit-message.txt
```

This command rechecks the staged snapshot when no matching pre-commit receipt
exists. It does not create a commit or grant publication approval.

The pre-push hook consumes every ref update supplied by Git. It checks newly
introduced commits, their content and messages, and applicable ref/tag metadata.
A secret added in one commit and deleted in another remains in outgoing
history and blocks publication. New branches, merges, tags, multiple ref
updates, and force pushes do not exempt content. This policy does not authorize
rewriting or force-pushing shared history.

A changed staged tree, message, outgoing commit set, detector/model version,
or policy invalidates the corresponding scan evidence. Re-run the relevant
checks after rebases, merge conflict resolutions, regenerated files, and edits
to previously scanned PR text or attachments. A stale receipt is not a pass.

## Findings and narrow exceptions

Gitleaks detects credential patterns. Presidio and supplemental deterministic
recognizers flag personal-data candidates such as contact details, identifiers,
payment information, names, addresses, and locations. Detection is imperfect:
false positives require review, and a clean automated result still requires
review of the changed content and artifacts.

The bundled language model recognizes English names and locations. Identifier
coverage is rule-specific, including US identity/bank candidates, payment cards,
IBANs, and phone patterns for selected regions; it is not exhaustive worldwide
PII recognition. Review other languages and unsupported formats locally rather
than assuming the automated detectors cover them.

Do not put real learner notes, financial profiles, API keys, private contact
details, or production logs into examples or tests. Use synthetic fixtures.
Already committed data is still in scope; rotate an exposed credential and
resolve its publication risk rather than hiding the finding with an exception.
If existing shared history needs remediation, prepare a separate approved plan.

The version 2 policy lives in `scripts/sensitive-data/policy.json`. Each text
exception contains `detector`, `rule`, `pathSha256`, `sha256`, `fingerprint`, and
`disposition`. `pathSha256` hashes the scanner's exact UTF-8 record path;
`sha256` hashes the complete content. Matching still requires the exact path,
content, detector, rule, and finding. There are no directory exclusions, globs,
or regex exemptions, and a changed file requires renewed review.

The allowed text dispositions are `public-reference`, `technical-syntax`, and
`synthetic-fixture`. They identify a completed review, not an automatic waiver
for those categories. Keep the detailed rationale and original path in ignored
local review proposals. The committed policy stores hashes and controlled codes
so an exception cannot itself expose a sensitive filename or introduce a new
finding through free-form explanation.

The exact `scripts/sensitive-data/policy.json` record receives a narrow machine
classification after Node independently validates its closed version 2 schema
and canonical JSON tokens. Formatting whitespace is allowed; duplicate keys,
alternative token encodings, unknown fields, rules, or dispositions fail closed.
Node computes the classification itself and discards caller-supplied flags.
Python analyzes the unchanged content and omits only name/location candidates
from its NLP recognizer for that validated record. Gitleaks and deterministic
contact/identity detectors still scan the complete bytes. Other repository file
paths retain the usual checks; the policy receives no self-exception or file skip.

Git metadata has separate structure checks in `machine-fields.mjs` and
`signature-packets.mjs`. These apply only to `metadata:` records at recognized
virtual Git field paths. Complete lowercase 40- or 64-digit object identifiers
in tree, parent, and tag-object fields, and signed 64-bit epoch values with valid
numeric timezone offsets in author/committer/tagger time fields, suppress only
NLP name/location and phone candidates. Gitleaks and the other deterministic
PII rules still receive the complete unchanged bytes.

Recognized `gpgsig` and `gpgsig-sha256` fields require complete PGP or SSH armor
and validation of the decoded packet structure. Supported PGP version 4 document
signatures permit only fixed creation/expiration, key-ID, and fingerprint
subpackets. Supported SSH version 1 signatures require the Git namespace, an
empty reserved field, and complete supported bare-key and signature structures.
Signature classification suppresses only NLP name/location candidates; phone
detection still runs. This validates structure, not cryptographic authenticity.
Free-form, text-bearing, unknown, and unsupported structures receive ordinary
scanning. Identity, message, and filename records remain unchanged, and Node
discards caller-supplied classification flags.

Only record safe rule identifiers, path hashes, content hashes, fingerprints,
and disposition codes in publication reports. Never copy a raw match, sensitive
filename, or surrounding sensitive context into an issue, PR, terminal transcript,
or committed policy. Private local receipts live
under the Git directory's `causeway-privacy/` directory; do not publish them or
raw scanner output as CI artifacts.

## Images, binaries, and publication artifacts

Binary content is not implicitly safe because it is not text. Unreviewed
payloads block the gate. The policy's `artifacts` records contain `pathSha256`,
`sha256`, `disposition`, `reviewedBySha256`, and `reviewedAt`. The disposition
must be `visual-and-metadata-review`; the reviewer identity is hashed and the
review date uses `YYYY-MM-DD`. Keep the original path, reviewer identity, and
detailed inspection rationale in ignored local review proposals. Inspect the
actual bytes and any embedded metadata using appropriate local tools before
adding a record. Inspect visible image content as well as
extractable text; do not approve an archive without inspecting its contents.
If inspection or extraction is unsupported, do not publish the payload.

A hash identifies reviewed bytes; calculating it alone is not an inspection or
PII scan. A changed binary requires a new review. Artifact records cannot waive
unsupported symlinks, LFS objects, or submodule changes. Keep approvals specific
to the intended asset rather than exempting an extension or directory.

Write proposed PR titles and bodies to local files and scan those exact files
before using them for publication. Scan attachments separately. For example:

```bash
pnpm privacy:artifacts /path/to/pr-title.txt /path/to/pr-body.md
```

Automatic Playwright trace and screenshot uploads are disabled. Traces can
contain page content, network data, and storage snapshots. Reproduce failures
locally and inspect any proposed artifact before its scanned, explicitly
approved upload. Do not replace the upload step with an unchecked manual upload.

## Failure and review workflow

Missing tools or models, integrity mismatches, timeouts, malformed policy,
failed parsers, incomplete history, unsupported content, and unresolved findings
must fail closed. Repair the cause, review narrowly justified exceptions, and
run the gate again. Do not relabel a failed or incomplete scan as clean.

For each proposed commit:

1. Complete the code/content review and relevant repository tests.
2. Review and stage only the intended changes; scan the complete staged tree.
3. Prepare and scan the final commit message. Obtain explicit user approval
   for agent-created commits; hooks recheck the exact inputs when committing.
4. Before an approved push, let the push gate inspect the complete outgoing
   ref set. Scan publication text and attachments before any GitHub upload.
5. Report covered scope, safe identifiers, and unresolved limitations accurately.
   Tests, tool verification, partial scans, and full publication checks are
   different results.

CI uses full-history checkout and runs the same history scan and guard tests
on Linux and macOS. A passing CI job only covers what that job actually fetched
and scanned. Configure required checks through the repository's approved
administration process; the workflow file alone does not enable branch protection.
