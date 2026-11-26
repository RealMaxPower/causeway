# Causeway phased remediation plan

Implement the November 26, 2026 review in 22 focused pull requests across five
phases. Start with publication safeguards and correctness, then complete the
curriculum, connect the learning and decision tools, and optimize the finished
experience. All 44 existing nodes and all 15 identified interaction gaps are
included. The count is a review boundary, not a reason to combine oversized
changes; split a PR if its independent changes cannot be reviewed together.

Status: PR 1 is being prepared locally; no PRs or commits have been created.
The required PII and secret scans apply immediately, including to these plan
files before any commit. Obtain the user's explicit approval of the concrete
diff and redacted scan summary before every repository commit or GitHub
publication. Implementation approval does not authorize publication.

## Publication requirements

No local commit, GitHub push, or other publication of repository material may
proceed without successful local secret and PII checks of the material being
published. GitHub CI repeats the checks as defense in depth; a check that runs
after upload cannot satisfy the requirement to scan before upload.

Use pinned Gitleaks for secrets and a local Presidio-based PII scanner with
documented recognizers and deterministic supplemental checks. Pin scanner,
model, and configuration versions. Repository content stays local during the
scan. Tool documentation: [Gitleaks](https://github.com/gitleaks/gitleaks),
[Presidio Analyzer](https://presidio.dataprivacystack.org/analyzer/),
[Git hooks](https://git-scm.com/docs/githooks), and
[Git write-tree](https://git-scm.com/docs/git-write-tree).

### Bootstrap and scan boundaries

1. Before PR 1's first commit, install the scanners locally and audit the tracked
   tree and relevant existing history. Use a trusted pinned scanner invocation
   independent of the unverified new wrapper to scan the entire staged tree,
   final message, and intended author/committer metadata; also test the new
   gate manually. The first commit gets no exemption.
2. The pre-commit gate captures the staged tree identifier and scans its blobs,
   including partially staged files and force-added ignored files. It must not
   substitute working-directory content for staged content or honor export
   exclusions that omit tracked material. Verify the staged tree is unchanged
   when the scan finishes. The final commit-msg gate scans the final message
   and intended author/committer metadata, and rechecks tree and policy
   identifiers. Any change requires a fresh scan. Do not run mutating hooks
   after this final validation.
3. The pre-push gate reads every ref update from Git's hook input and scans all
   newly introduced commits, changed blobs, messages, author/committer metadata,
   and applicable annotated-tag/ref metadata. A secret added and subsequently
   removed must still fail. Support
   multiple refs, merges, new branches, tags, and force pushes; missing history
   blocks the scan. An audited ancestor may avoid rescanning unchanged blobs
   only when their scanner, model, and policy versions still match; it must
   never serve as an exemption for unresolved findings.
4. Scan PR titles/bodies and attachments before every GitHub creation, update,
   or upload, including revisions to previously scanned material.
   Generated corpora, fixtures, screenshots, reports, and other artifacts are
   in scope. Images and non-text artifacts require supported local extraction
   plus review; unsupported payloads block publication. Account for LFS objects
   and submodule changes if they are introduced.
5. Any change to scanned content, scanner configuration, or outgoing commit
   set invalidates the relevant pass. Record safe tree/commit identifiers,
   tool/config versions, timestamp, and disposition; do not retain raw matches
   in committed attestations or PR descriptions.

### Findings and exceptions

PII checks cover email addresses, phone numbers, IP addresses, government
identifiers, payment/bank details, and person/address/location candidates.
Public bibliography, author attribution, and intentionally synthetic examples
need narrowly reviewed exceptions. Each exception identifies the detector,
specific location or fingerprint, and rationale. No blanket exclusions for
content, tests, documentation, or environment examples are acceptable.

Reports contain only safe rule identifiers, locations, fingerprints, and
dispositions. Redact match text and surrounding context; do not print secrets,
environment values, or personal data. Store diagnostics outside tracked paths
with restricted permissions. Do not upload raw scanner reports as CI artifacts.

Missing tools/models, timeouts, parser failures, unsupported files, and unresolved
findings fail closed. PII recognition is imperfect, so review changed content
and artifacts alongside automated detection. Hooks can be bypassed; this
workflow prohibits bypasses and unscanned GitHub web/API edits. Required CI
checks provide another control without replacing local scans.

An existing secret is not grandfathered by the baseline. Rotate exposed
credentials and resolve the finding before publication. If already-published
history needs rewriting, prepare a separate remediation decision; this plan
does not authorize force-pushing rewritten shared history.

## Phase 1 establish publication and verification gates

### PR 1 local PII and secret gates and CI coverage

Implement the requirements above through versioned scripts, detector policy,
hook installation, and documented bootstrap instructions. Add pnpm test to CI,
retain existing lint/typecheck/build/link/E2E checks, and run the same sensitive
data policy in CI. Update contributor instructions and stale CI descriptions.

Acceptance:

- Prove a staged secret hidden by an unstaged cleanup is blocked.
- Prove a secret added in one outgoing commit and deleted in another is blocked.
- Block PII in commit messages, force-added environment files, unreviewed
  binaries, missing tools, and failed scanners.
- Prove an exact synthetic exception does not mask an unrelated finding.
- Exercise hook behavior on macOS and Linux, including multi-ref pushes and
  merge commits, in temporary repositories with no remote publication.
- Preserve existing hooks through explicit integration; verify installation.
- Complete and record redacted scans before PR 1's first commit and push.

Dependencies: none. Every other PR depends on this gate.

## Phase 2 restore numerical correctness and reliable application behavior

### PR 2 economic model arithmetic and constraints

Fix duration units, cumulative-return/drawdown consistency, and delayed-scenario
confirmation timing. Correct credit-spread response and hike/cut narration.
Use a defined crypto risk-contribution measure. Introduce instrument-specific
leverage failure conditions, including margin maintenance, fixed/floating
payments, household affordability, and rental debt service. Bound QE by
available securities. Keep approximations explicit in the UI.

Acceptance: independently calculated expected values, supported-range boundary
checks, and explanatory-text consistency tests. Include the duration default
regression (31.5 percent under the documented additive approximation), symmetric
50/50 risk contributions, a margin boundary case, nonnegative spread outputs,
and 26 repeated QE attempts. Test revised defaults and verdicts without merely
asserting their rankings. All affected widgets work at mobile widths.

Primary files: components/widgets/*/model.ts, cb-ledger/reducer.ts, their UI,
and tests/widgets. Dependency: PR 1.

### PR 3 trustworthy data and comparison parsing

Validate FRED observations, finite values, and required CPI history; represent
missingness explicitly and add timeouts. Expose observation date, source, and
fallback freshness per series, including mixed World Bank results. Normalize
repeated country/indicator query parameters. Label currency snapshots honestly;
replace unsupported median/percentile labels with actual range statistics or
derive them from observations. Align conversion-schedule claims with the
algorithm rather than promising a fixed percentage it does not deliver.

Acceptance: empty/malformed responses never become confident live zeros;
partial data and stale snapshots stay identifiable; repeated query keys render
without errors; offline tests require no provider secrets; currency schedule
totals and descriptions agree for every supported horizon.

Primary files: lib/data, app/compare, currency-planner. Dependency: PR 1.

### PR 4 evidence based regime descriptions and implications

Separate observed level, historical change, freshness, and classification.
Replace trend claims inferred from a single level. Define confirmation against
the displayed regime rather than one favorable scenario. Compute decision
implications from the same classification, including uncertain/unavailable
states, and label model assumptions such as the neutral-rate estimate.

Acceptance: rising versus falling inflation, hiking versus cutting cycles,
coherent adverse regimes, mixed signals, and missing observations produce
consistent headings, scores, explanations, and implications. An opposing
regime changes relevant implications without presenting personalized trades.

Primary files: lib/data/regime.ts, app/regime/page.tsx. Dependency: PR 3.

### PR 5 saved state sharing and navigation

Give shared Playbooks explicit preview/import ownership. Preserve the existing
saved Playbook until import and settle URL state after adoption. Fix edits and
reset surviving reload, clipboard rejection, and Layer 3 reopening. Validate
shared Lab state, pin/import/export round trips, corrupt inputs, and storage
failures; use versioned migrations where formats change.

Acceptance: opening a shared URL cannot silently destroy saved work; edited
imports persist; reset survives refresh; share failures expose a selectable
URL; Layer 3 reopens at Layer 3. Browser tests cover two contexts, reloads,
back/forward navigation, and unavailable storage with synthetic fixtures.

Primary files: components/playbook, components/progress, components/lab,
lib/playbook.ts, lib/regime-scenarios.ts. Dependency: PR 1.

### PR 6 accessible navigation and overlays

Audit the mobile drawer, search palette, scenario drawer, Playbook confirmation,
reader settings, and tutor. Use consistent dialog primitives or equivalent
focus handling. Remove hidden controls from the tab order, move/contain/restore
focus for modals, and support Escape and background inertness. Give nonmodal
panels appropriate behavior. Correct tab/combobox semantics and keyboard
shortcut conflicts where applicable.

Acceptance: browser keyboard tests reproduce and prevent the hidden drawer
focus defect; no focus escapes a modal; closing restores the trigger. Include
screen-reader labeling checks, mobile layouts, reduced motion, and text
alternatives for interactive visualizations. Dependency: PR 1; coordinate
shared Playbook components with PR 5.

### PR 7 tutor availability privacy and spending controls

Resolve complete Redis credential pairs atomically and handle configured Redis
failures deliberately. Reject unknown nodes; distinguish burst limits, daily
limits, unavailable service, and budget exhaustion in the client. Require known
model pricing. Implement a shared atomic reservation/settlement budget with
documented expiry and failure semantics; retain an explicit development mode.
Correct IP-processing disclosures and minimize stored identifiers/limiter
analytics. Remove production dependence on arbitrary file logging that causes
whole-project tracing, and update SECURITY.md to match actual behavior.

Acceptance: blank/partial environment configurations, Redis failures, unknown
prices, concurrent admissions, provider errors/timeouts, reservation cleanup,
and UTC day rollover have deterministic mocked tests. No private prompt or raw
IP appears in fixtures or reports. A production build no longer traces unrelated
project files through the cost log. Dependency: PR 1.

## Phase 3 establish evidence standards and complete the curriculum

### PR 8 citations authoring contracts and learning metadata

Make source titles link to canonical registry URLs and support claim-level
citations. Correct HEAD-to-GET fallback and add source-check deadlines. Add
review/as-of metadata for changing assertions and consistent per-layer timing
metadata consumed by content headers, the layer switch, homepage journey cards,
and catalog/track totals. Remove the blanket 25-minute promise. Define content
validation, assessment IDs, and
privacy-preserving learning event contracts before the curriculum rollout.

Repair the known E2 policy-framework and mortgage-rate explanations and the
F1 five/six/seven-stage contradiction immediately. Update authoring templates
to include evidence, assumptions, limitations, relevant links, and meaningful
checks. Validate content exports, source/related/prerequisite references,
exactly one defensible correct answer, and declared learning/interaction
objectives. Structural checks supplement editorial review; they cannot prove
economic accuracy. Dependency: PR 1. This PR can run alongside Phase 2.

### Common acceptance criteria for curriculum PRs

Each node must have a complete pocket explanation, an L2 interaction that
teaches its mechanism, and an L3 with a worked example or historical episode,
assumptions, limitations, and evidence. Present real disagreement with clear
attribution. Use honest durations and sufficient depth without padding to a
word count. Define jargon at first use. Review the 38 existing L1 inline tables:
retain useful comparisons and replace tables that obscure a mechanism with a
clearer visual or interaction, without adding decorative animation. Make
diagrams available as text and interactions usable by keyboard and at mobile
widths.

Connect each practical callout to a relevant decision node. Add a meaningful
prediction or transfer check with reviewed distractors. Align lesson text,
widget behavior, catalog metadata, source claims, and answers. Record review
dates for temporal claims. Regenerate the search corpus and run applicable
content, model, and browser checks. Mark completion per node below only after
the rubric is satisfied. Do not replace the full rollout with a pilot.

All curriculum PRs depend on PR 8 and the relevant Phase 2 model/data fixes.
New widgets follow docs/WIDGETS.md. Interactions can be evidence comparisons
or causal exercises where a numerical simulation would imply unjustified
certainty. Reuse shared primitives without introducing another content registry.

| PR | Curriculum scope | Interaction gaps to close | Completion checklist |
| --- | --- | --- | --- |
| 9 | Money | A1 | [ ] A1; [ ] A2; [ ] A3; [ ] A4; [ ] A5; [ ] A6 |
| 10 | Markets | B3, B4 | [ ] B1; [ ] B2; [ ] B3; [ ] B4 |
| 11 | Macroeconomy | C3 | [ ] C1; [ ] C2; [ ] C3; [ ] C4; [ ] C5 |
| 12 | Trade and capital | D3, D5 | [ ] D1; [ ] D2; [ ] D3; [ ] D4; [ ] D5 |
| 13 | Institutions part one | E2, E3 | [ ] E1; [ ] E2; [ ] E3 |
| 14 | Institutions part two | E4, E5 | [ ] E4; [ ] E5 |
| 15 | Crises | F1 | [ ] F1; [ ] F2; [ ] F3; [ ] F4 |
| 16 | Frontier part one | G2 | [ ] G1; [ ] G2; [ ] G3 |
| 17 | Frontier part two | G4, G5, G6 | [ ] G4; [ ] G5; [ ] G6 |
| 18 | Practical decisions part one | Improve existing models | [ ] H1; [ ] H2; [ ] H3; [ ] H4 |
| 19 | Practical decisions part two | Improve existing models | [ ] H5; [ ] H6; [ ] H7; [ ] H8; [ ] H9 |

PR 9 also calibrates categorical origin-of-money claims. PR 10 explains jargon
at first use. PRs 13 and 14 distinguish historical institutional rules from
current ones. PR 15 locks the crisis sequence across every representation.
PR 17 uses qualitative evidence exercises where assumptions are contested.
PRs 18 and 19 replace blanket financial prescriptions with conditional reasoning
and make model inputs and limitations visible. New interaction counts across
these eleven PRs total 15; node counts total 44.

## Phase 4 connect learning evidence scenarios and decisions

### PR 20 complete learning journeys and reasoned Playbooks

Connect observed regimes or explicitly hypothetical scenarios to the lab and
Playbook, retaining source/as-of/assumption context. Add exposure, relevant
assumptions, expected consequences, a stress case, rationale, and a revisit
trigger across all eight existing Playbook axes. Preserve local storage with
versioned migration and keep imported/shared state safe. Generate conditional
explanations from relevant axes rather than copying independent option blurbs.

Deliver one coherent demonstration journey through rates, housing/debt stress,
and a saved decision. Use it to prove integration, not to limit the rollout.
Distinguish opening a layer, manipulating a model, and demonstrating
understanding. Persist first-attempt assessment status across all 44 nodes
locally using versioned assessment IDs. Instrument meaningful interaction across
existing and new widgets. Add low-cardinality events for meaningful interaction,
comprehension, Playbook completion, and successful sharing; never transmit
notes, questions, personal financial values, or encoded state URLs as analytics.

Acceptance: all eight axes preserve reasoning and respond appropriately to
relevant scenario changes; irrelevant changes do not rewrite unrelated choices.
The full journey passes on desktop and mobile, including save/share/return and
old-state migration. Assert that synthetic notes, personal financial values,
and encoded Playbook URLs never appear in analytics payloads. Define engagement
and comprehension denominators; validate
learning through a consented think-aloud/usability exercise and synthetic or
anonymized results. Behavior-change follow-up remains a measured research
outcome, never inferred from page views or promised as a release result.

Dependencies: PRs 4, 5, 8, and 9–19; use PR 8's assessment/event contracts.

### PR 21 grounded tutor and evaluation harness

Build bounded node/layer evidence packages from the canonical reviewed content,
registered source IDs, and model assumptions. Include relevant widget context
only when explicitly invoked, plus bounded conversation history. Validate
citations and render real source links; repair H[H1] formatting and H9 support.
Scope or reset conversation state when changing nodes. Make uncertainty and
unsupported questions explicit.

Acceptance: deterministic citation/context tests cover all 44 nodes; the golden
evaluation set contains at least one scored case per node and includes
mechanisms, contested claims, stale data, unsupported
questions, follow-ups, and decision-shaped questions. Test grounded explanations
against actual model inputs/outputs. Set the quality rubric before evaluation
and report failures; mocked tests alone do not establish answer quality. Use
synthetic learner inputs, cost-bounded live evaluation, and scan/redact artifacts
before publication. No learner's private notes are sent automatically.

Dependencies: PRs 7, 8, 9–19, and PR 20's context contract.

## Phase 5 measure and optimize the completed experience

### PR 22 loading interaction and operational performance

Lazy-load search UI/corpus and tutor Markdown rendering on intent. Inspect and
reduce unnecessary per-node widget loading, using client boundaries compatible
with the installed Next.js documentation. Evaluate static/cached content routes
while preserving shareable layer URLs and accessible navigation. Measure lab
interaction before changing context updates or memoization. Audit unused
dependencies and font loading based on actual use.

Baseline from the reviewed production build: node route 1,148,261 bytes of
uncompressed first-load JavaScript (350,295 bytes locally gzipped); home 665,278
(211,988 gzipped); lab 744,712 (234,121 gzipped). These are build measurements,
not network timings or Core Web Vitals. Refresh the baseline after feature work.

Acceptance: compare production cold loads and interaction traces on a fixed
mobile profile, document before/after bundle and timing results, and add
explicit budgets. Initial search/tutor implementations should not burden
unopened features. Require no material regression in layout stability,
keyboard behavior, or shareable routing; confirm the tutor server trace remains
scoped after PR 7. Set numerical performance targets from the reproducible
baseline before implementing optimizations. Dependency: PRs 1–21.

## Merge order and review controls

Merge PR 1 first. PRs 2, 3, 5, 6, 7, and 8 can be developed independently;
merge PR 4 after PR 3. After the shared contracts in PR 8 settle, prepare
curriculum batches in parallel, keeping shared metadata/source changes small
and regenerating the search corpus after rebases. PR 20 integrates completed
content and decisions; PR 21 consumes the same context contract. PR 22 measures
the integrated application.

Each PR contains a concrete before/after description, covered findings and
node IDs, relevant regression evidence, limitations, and redacted scan status
for its final staged tree/outgoing commits. Use small branches and reviewable
commits. Rebase conflicts, generated changes, or merge resolutions require
fresh checks. Schema/storage changes need migration and rollback tests; do not
erase a user's saved work to simplify rollback.

Before each commit, finish code/content review and applicable tests, stage the
intended changes, scan the staged tree and message, and commit only on success.
Before push, scan every outgoing commit and publication artifact. Run the
repository checks before merge:

    pnpm lint
    pnpm typecheck
    pnpm test
    pnpm check:links
    pnpm build
    pnpm e2e

Regenerate and verify the search corpus for content changes. Run external
source checks for changed citations with timeouts and explicit treatment of
publisher anti-bot responses. Keep network-independent CI fixtures separate
from bounded live-provider validation. No missing scanner, unavailable model,
or unsupported scan payload can be treated as a passing publication check.

## Coverage of the review

| Review finding or recommendation | Owning PR |
| --- | --- |
| Mandatory PII/secrets gates; missing CI unit tests | 1 |
| Duration conversion/drawdown; credit spread sign/text; crypto risk formula; margin contracts; negative QE holdings | 2 |
| Missing FRED values; timeout; comparison provenance; repeated query keys; currency snapshot/statistics/schedules | 3 |
| False regime trends; fixed advice; confirmation-score semantics | 4 |
| Shared Playbook data loss/reset/share fallback; Layer 3 reopening; Lab persistence | 5 |
| Hidden mobile focus and overlay accessibility | 6 |
| Redis credential fallback; limiter errors; privacy disclosure; global budget; unknown pricing; server trace | 7 |
| Unlinked sources; source checker; timing contracts; freshness metadata; known E2/F1 contradictions | 8 |
| Complete content depth, honest claims, citations, checks, and all missing interactions | 9–19 |
| Reasoned Playbook across eight axes; scenario continuity; complete learning journey; comprehension measurement | 20 |
| Tutor grounding/history; source links; H9; golden evaluations across all nodes | 21 |
| Client payloads; route/loading architecture; measured interaction performance; budgets | 22 |

Completion requires every row and all 44 node checklist entries to meet their
acceptance criteria. A passing test suite, a pilot journey, or opening the 22
PRs alone does not complete the program.
