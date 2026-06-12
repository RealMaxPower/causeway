# Causeway · review against brief

*Reviewed 2026-05-12 against `cowork_brief_global_economics_platform.md`. Running build at localhost:3003, version badge: v0.2 · 43 nodes scaffolded.*

> **Status — resolved as of v0.7 (2026-05).** This is a historical snapshot of the
> v0.2 build, kept as a record of how the project audited itself and closed the gaps.
> Every "Suggested next move" below has since shipped, so the criticisms here
> (≈2 complete nodes, an inflated "ready" count, broken mobile, a single-page callout)
> describe **v0.2, not the current site**. Resolution per item:
>
> 1. **Status-badge honesty** — all 44 nodes now ship full L1/L2/L3, so "ready" is accurate; per-node time estimates were recalibrated to content-derived values (homepage total ~990 → 361 min).
> 2. **Mobile on `/nodes/[id]`** — breadcrumb and L1/L2/L3 tablist wrap, the left rail is an off-canvas drawer below `lg`, content padding is `px-4 sm:px-6 lg:px-9`.
> 3. **"In your life" callout** — now a reusable `Callout` component used across the node set, including A1–A4, C1, F1.
> 4. **Second flagship widget** — C2 ships the business-cycle PhaseClock; A2 ships the three-jobs trilemma scorecard.
> 5. **A3 $60 / $500** — reconciled; the node uses $500 throughout.
> 6. **Regime dashboard** — live at `/regime` with four FRED axes (CPI, Fed funds, unemployment, SLOOS), 6-hour ISR.
> 7. **L1-only placeholders** — moot: no L1-only nodes remain; all 44 are three-layer complete.

---

## TL;DR

Causeway has shipped exactly the thing the brief asked for in Phase 1 — the A3 reference node — and shipped it well. The three-layer scaffold works, the bank-balance-sheet sandbox is genuinely the "wow" widget the brief predicted, and the editorial tone is on target. Everything past that is scaffolding: 43 routes exist, but only ~2 nodes are actually three-layer complete, and the homepage's "15 ready" claim doesn't survive an audit. Mobile is broken on node pages. Fixing the status badges and the mobile layout are the two highest-leverage moves before any new content lands.

---

## Completeness

**Structure: on plan.** 8 tracks × 43 nodes is exactly the brief's content map. Routes resolve, navigation is wired, breadcrumbs and prev/next track buttons all work. Cross-cutting routes (`/regime`, `/playbook`) exist and honestly self-label as "NOT YET PORTED — ships during Step 5," which is the right kind of stub.

**Depth: severely uneven, and the homepage misrepresents it.** I fetched every node's L1/L2/L3 server response and measured rendered text. Result:

| Tier | Count | Examples | Behavior |
|---|---|---|---|
| **Three-layer complete** | 2 | A3, A4 | L2 ≈ 5,000 chars of real prose + working widget; L3 ≈ 4,000–6,400 chars with timeline, debate panel, primary sources |
| **Has real prose at all layers** | 4 | A1, A2, C1, F1 | L2 ≈ 2,000–2,300 chars; the bones are there |
| **L1 only — L2/L3 are placeholders** | ~37 | A5, A6, B1–B4, C2–C5, D1–D5, E1–E5, F2–F4, G1–G6, H1–H8 | L2 and L3 return identical ~900-char shells; only the pocket version has real content |

The homepage and track index pages mark 15 nodes with a green "● ready" dot — including A5, A6, C2, F2, H1, H2, H3 — but those nodes' L2 and L3 tabs are empty shells. The status badge needs at minimum a fourth state (something like *"L1 ready · L2/L3 drafting"*) or the count drops from 15 → 6 honestly.

**Track H is the most-stubbed of all 8 tracks.** It's also the brief's stated differentiator ("the point of the rest"). H1, H2, H3 carry the "ready" badge but have no working model, no widgets, no deep dive. The brief's signature "🧭 In your life" callout — which is supposed to appear on every concept node in A–G — currently appears on exactly one page (A3). Once it's a real component, retrofit it across the existing prose nodes.

**Cross-cutting features:** Regime dashboard and Personal Playbook are placeholders pointing to a `legacy/v0-prototype/` directory. Per the brief, those are Phase 3 deliverables — so it's on plan to defer them, but surfacing them in the primary nav sets an expectation users will click through and bounce.

**Out of scope so far (also on plan):** replayable history scrubber, comprehension checks, evaluation harness, accessibility pass, A/B harness — all Phase 3/4.

## Usability

**Desktop (1440w): strong.** The editorial-meets-instrument-panel direction has landed. Calm neutral palette, decisive typography, the KPI strip on A3 (92% bank-created M2, 0% reserve req, 4.5% Basel) frames the working model exactly the way the brief wanted. The L1/L2/L3 tablist is the right control for depth-on-demand; the URL syncs (`?l=2`), which means a user can deep-link to a particular layer.

**The A3 widget actually works.** I drove it: clicking "Issue loan → Alice" wrote symmetrical $500 entries to both sides, the deposits delta showed ▲ 500, the status feed updated, the session counter incremented. That is the proof-of-concept the brief specified for Phase 1 and it lands.

**Mobile (390w): broken on node pages.** The homepage and track pages reflow fine — no horizontal scroll. But every node page overflows: scrollWidth 536 vs viewport 390. Three culprits:

- The header bar (logo + breadcrumb + L1/L2/L3 tablist + prev/next track) is a single horizontal row with no wrapping rule.
- `main` has `px-9` (36px each side) which is fine on desktop but eats most of an iPhone's width.
- The left-rail track navigation (`A · Money 6` … with sub-list under the active track) is always-visible. There's no off-canvas drawer / hamburger pattern below the `lg` breakpoint.

The brief was emphatic: *"Layer 1 and most of Layer 2 must work on a phone."* Right now neither does on node pages.

**Other usability observations:**

- The "Open tutor / ?" pill in the bottom-right is great UX — it signals the AI Q&A layer from Phase 3 without committing to it visually.
- The "★ Start here" badge on A3/A4/A6/H1 etc. is a good wayfinding affordance; it answers the brief's question *"where does a first-time user enter?"*
- No skip-link, no visible focus rings on interactive widget buttons (one to check before accessibility audit), and the A3 sandbox status feed isn't wired to `aria-live`. All defer-able to Phase 4 but worth a single backlog item.

## Comprehension

**A3 lands the core insight.** Hero copy → static animation in L1 → four-step driven sequence in L2 (setup → loan → constraints → central bank lever) → historical timeline + mainstream/heterodox debate panel in L3. The pedagogical arc the brief described — *"a flight simulator with a tour guide"* — is visible here. The "In your life" callout on A3 — *"Your savings rate is not the country's lending capacity… watch the SLOOS survey, not deposit growth"* — is exactly the abstract-to-concrete bridge the brief specified.

**Tone matches the brief.** Confident, plainspoken, no jargon dump, the heterodox column on A3 names actual people (Kotlikoff, Cochrane, Werner) instead of strawmanning. The Bank of England quote in L3 is the kind of citation that earns trust with sophisticated learners.

**One small comprehension bug.** The L1 pocket animation on A3 reads "Money supply has grown by $60." The rest of the page (L2 widget, L3 examples) talks in $500s. A learner toggling between layers will notice the unit mismatch. Either change the L1 animation copy to $500, or set the L2 default amount to $60 so the two views agree.

**The pedagogy can't yet be evaluated beyond A3.** Because A4 is the only other three-layer complete node, and almost everything past Track A is a shell, the "scales depth on demand" claim is currently true for one chapter. The structural promise is intact; the content is one node deep.

---

## Suggested next moves, in priority order

1. **Honesty pass on status badges.** Recompute "ready" against L2+L3 actually having content. Add a fourth state for L1-only nodes. The homepage's "15 · 990 min" overstates roughly 2.5×.
2. **Mobile fix on `/nodes/[id]`.** Collapse the breadcrumb, allow the L1/L2/L3 tablist to wrap, convert the left rail to an off-canvas drawer below `lg`, drop `px-9` to `px-4` on small viewports. Single PR, opens the door for the brief's mobile-first promise.
3. **Build the "🧭 In your life" callout as a component, retrofit across A1–A4, C1, F1.** This is the brief's signature differentiator and currently lives on one page.
4. **Pick the second flagship widget and ship it depth-first.** Brief priority order says C2 (business cycle, manipulable model) or A3-adjacent A2 (three jobs of money). Avoid building seven half-finished widgets in parallel.
5. **Fix the A3 $60 / $500 inconsistency** — five-minute job, prevents a small but recurring comprehension snag.
6. **Stub the Regime dashboard with three real FRED indicators wired up.** Even a degraded version sells the live-data story and unblocks H1 (Reading the regime), which is the entry point for Track H.
7. **Backfill: write a one-paragraph "what this node will become" placeholder for all the L1-only nodes**, so a user clicking through doesn't feel like they hit a 404 of expectations.

---

*Reviewed by Cowork against the brief sections 1–10. Method: site walk on desktop and mobile viewports, programmatic content-length audit across all 43 node × 3 layers, hands-on test of the A3 working model.*
