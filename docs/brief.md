# Cowork Execution Brief

> The original brief that kicked off the project (working title "Atlas," shipped
> as **Causeway**). Kept for the product intent and pedagogy it lays out; for the
> project as it actually shipped, see the [README](../README.md),
> [ROADMAP](ROADMAP.md), and [authoring guide](AUTHORING.md).

## Project: **Atlas** — A Layered, Interactive Way to Understand the Global Economy and Use That Understanding in Daily Life

**Working title:** Atlas (placeholder — Cowork should propose 2–3 alternatives in Phase 0)
**Owner:** Marshall
**Mode:** Autonomous research → spec → build → iterate
**Primary deliverable:** A web-based, modular learning experience (single-page app + supporting artifacts)
**Secondary deliverables:** Standalone interactive widgets (embeddable), companion content, evaluation harness

---

## 1. Mission

Build a learning environment that does three things existing econ resources do poorly:

1. **Scales depth on demand.** Every concept has a 30-second version, a 5-minute version, and a 30-minute version. The user controls depth, not the curriculum.
2. **Shows the machine running.** Concepts are taught through manipulable models, not static diagrams. Move a slider, watch the consequences propagate.
3. **Closes the loop to daily life.** Every concept ends with "so what does this change about a decision you actually make?" — mortgage timing, savings allocation, career bets, big purchases, voting, business decisions.

Atlas should feel less like a textbook and more like a flight simulator with a tour guide.

---

## 2. Audience and Outcomes

### Primary audiences (concentric)

- **Curious adult, no econ background.** Wants to understand why their groceries cost more, what the Fed actually does, why their mortgage rate moved.
- **Decision-makers without formal training.** Small business owners, mid-career professionals, parents planning a financial future. Need to translate macro into action.
- **Sophisticated learners going deeper.** Already know basics; want to see system dynamics, edge cases, and unresolved debates with intellectual honesty.

### Learning outcomes (measurable)

By module completion, a user should be able to:
- Explain in their own words how a change in one variable (rates, currency, trade policy) propagates through at least three downstream effects.
- Identify which economic regime they are likely living in (high inflation / low growth / loose money / tight credit / etc.) using public data.
- Map at least five everyday decisions they personally make to the macro variables that affect those decisions.
- Distinguish strong empirical claims from contested ones — Atlas teaches the disagreements honestly.

---

## 3. Pedagogical Architecture: The Three-Layer Scaffold

Every concept node in Atlas is built in three nested layers. The user picks which layer to enter; layers below auto-collapse.

### Layer 1 — **The Pocket Version** (~30 seconds)
- One sentence answer to "what is this?"
- One sentence answer to "why should I care?"
- One animated visual showing the core mechanic in motion.

### Layer 2 — **The Working Model** (~5 minutes)
- Interactive widget the user actually plays with.
- 3–5 short prose blocks interleaved with the widget's states.
- "What this means for you" callout: 2–3 concrete daily-life implications.

### Layer 3 — **The Full Picture** (~20–40 minutes)
- Historical context, key debates, edge cases, where economists disagree.
- Linked primary sources (FRED, BIS, IMF, Fed papers, peer-reviewed work).
- Worked examples from real episodes (1970s stagflation, 2008, 2020, 2022 inflation).
- Optional deep-dive on the math for users who want it (collapsed by default).

> **Design rule:** A user must be able to graduate from Layer 1 → Layer 2 → Layer 3 without ever feeling pushed. Each layer has to be genuinely complete on its own.

---

## 4. Content Architecture: The Module Map

Eight tracks, each with 4–8 concept nodes. Tracks are non-linear — users can enter from anywhere — but Atlas suggests a default path for first-time learners.

### Track A — **Money: What It Actually Is**
- A1. Why money exists (barter is a myth, debt came first)
- A2. Three jobs of money (medium of exchange / unit of account / store of value) and the tradeoffs between them
- A3. How banks create money (the loan-creates-deposit mechanic, with manipulable balance sheets)
- A4. Central banks and the monetary base
- A5. Inflation, deflation, and what they actually measure
- A6. Currency, exchange rates, and the dollar's special role

### Track B — **Markets and Prices**
- B1. Supply and demand as a coordination mechanism (not a moral law)
- B2. Price signals and what they get right and wrong
- B3. Externalities, public goods, and where markets fail
- B4. Market structures (competitive, monopolistic, oligopolistic) and why it matters for what you pay

### Track C — **The Macroeconomy**
- C1. GDP and what it does and doesn't capture
- C2. The business cycle (expansion, peak, contraction, trough) — with a manipulable model
- C3. Unemployment: what the headline number hides
- C4. Inflation regimes and how they reshape everything else
- C5. Interest rates as the price of time (and the Fed as time's broker)

### Track D — **Global Trade and Capital**
- D1. Comparative advantage (with the standard story AND the modern critiques)
- D2. Balance of payments: where the money actually goes
- D3. Global supply chains and why your phone touches 40 countries
- D4. Capital flows, hot money, and currency crises
- D5. Tariffs, sanctions, and industrial policy — what works and what doesn't

### Track E — **Institutions and Power**
- E1. Central banks (Fed, ECB, BOJ, PBOC) and how their mandates differ
- E2. The IMF, World Bank, BIS, WTO — what they do, who they serve, where they fail
- E3. Reserve currencies and the exorbitant privilege
- E4. Sanctions architecture and the financial plumbing (SWIFT, CHIPS, correspondent banking)

### Track F — **Cycles and Crises**
- F1. Anatomy of a financial crisis (Minsky, Kindleberger)
- F2. Replayable case studies: 1929, 1970s stagflation, 1997 Asian crisis, 2008 GFC, 2020 COVID, 2022 inflation
- F3. Debt cycles (short-term and long-term)
- F4. Bubbles, manias, and how to spot one you're inside of

### Track G — **The Modern Frontier**
- G1. Globalization, deglobalization, and "friend-shoring"
- G2. Climate, energy transition, and the new political economy of resources
- G3. Demographics: aging societies, dependency ratios, and what they predict
- G4. AI, automation, and labor — the live debate
- G5. Crypto, stablecoins, CBDCs — sorting hype from substance

### Track H — **Leverage: Using This in Your Life**
*This is the differentiator. Cross-cuts every other track.*
- H1. Reading the regime: which macro environment are you in right now?
- H2. Personal finance under different regimes (saving, borrowing, investing)
- H3. Housing decisions: rent vs. buy, fixed vs. variable, timing
- H4. Career and industry: which sectors thrive in which macro climates
- H5. Big purchases and timing (cars, appliances, large discretionary)
- H6. Currency and travel
- H7. Running a small business through cycles
- H8. Civic and political literacy: evaluating policy claims honestly

---

## 5. Interactivity and Visualization Specification

Atlas is interactive-first. Every concept node must have at least one widget; many should have several.

### Widget categories

**Manipulable models.** User changes inputs, watches outputs propagate. Examples:
- Move the policy rate, watch yield curve, mortgage rates, asset prices, and unemployment respond on a delay.
- Run a central bank: hit a 2% inflation target through three macro shocks.
- Trade balance simulator: change the exchange rate and watch exports, imports, and capital flows respond.
- A bank balance sheet sandbox: issue a loan, see deposit creation, see what happens at default.

**Replayable history.** A scrubber lets the user move through real economic episodes with annotated commentary.
- 2008 GFC: scrub from August 2007 to March 2009 with key indicators, Fed actions, and "what was visible vs. invisible at the time."
- 2022 inflation: scrub through the rate hike cycle.

**Decision tools.** Personal-life calculators wired to live data.
- Mortgage decision tool: fixed vs. variable under user's regime read.
- Inflation impact tracker: "your $X today is $Y in five years under regime Z."
- Currency travel planner: when to convert, hedging basics for non-finance people.
- Career resilience scorer: how cyclical is your industry?

**Live dashboards.** Pulls real data (FRED, World Bank, BIS, IMF) and explains what it means today.
- Regime dashboard: a single screen telling you "right now, the US is in [regime]; here's what that implies for your decisions."

**Comparison and counterfactual tools.**
- "What if the Fed had cut in March 2008 instead of September?" — runs a documented model with caveats.
- Side-by-side country comparison (US vs. EU vs. Japan vs. China vs. EM) on any indicator.

### Visual design principles

- **Motion shows mechanism.** Static charts only when motion would distract. Animated transitions show causality.
- **Color encodes meaning consistently.** A single color system across all of Atlas: e.g., red = contractionary force, blue = expansionary, gray = neutral, gold = monetary, green = real economy. Document the system once; obey it everywhere.
- **One widget, one idea.** Resist the temptation to cram. If a concept has three sub-mechanics, build three widgets.
- **Mobile-first, but desktop-rich.** Layer 1 and most of Layer 2 must work on a phone. Layer 3 deep-dives can assume desktop.
- **Accessibility is non-negotiable.** All widgets keyboard-navigable, color-blind safe, captioned, and have a "show me this as text" fallback.

---

## 6. Design System (Brief)

Cowork will produce a full design tokens spec in Phase 1. Initial direction:

- **Tone:** Confident, plainspoken, intellectually honest. No jargon without immediate definition. No condescension. No false certainty on contested questions.
- **Visual language:** Editorial-meets-instrument-panel. Think *FT Alphaville* meets *Bret Victor's explorable explanations* meets *Our World in Data*.
- **Typography:** A workhorse sans for UI, a readable serif for long-form prose, a tabular monospace for numbers.
- **Default palette:** Neutral foundation, a small set of semantic colors, and one accent color that becomes Atlas's signature.

---

## 7. The Practical Leverage Framework

Track H is not a chapter at the end. It is a **callout layer** that appears on every concept node in Tracks A–G. The format is rigid for consistency:

> **🧭 In your life:**
> *(One sentence on the decision this concept affects.)*
> *(One sentence on the directional implication: "when X is high, you generally want to Y.")*
> *(One link to a deeper Track H module.)*

This keeps the abstract-to-concrete bridge present without being preachy. It also creates a coherent set of "leverage points" that can be aggregated into a personal dashboard at the end.

The closing artifact for any user who works through Atlas: a printable / saveable **Personal Macro Playbook** — their answers and the system's recommendations across the leverage axes, customized to where they live, what they earn, what they own, and what regime is currently running.

---

## 8. Technical Stack and Implementation Notes

Cowork should propose final stack in Phase 1. Initial preference:

- **Frontend:** Next.js (App Router), TypeScript, Tailwind, shadcn/ui. Animations via Framer Motion. Charts via D3 + Visx for custom widgets, Recharts for standard ones.
- **Content layer:** MDX for prose with embedded React widgets. Each concept node = one MDX file + colocated widget components.
- **Data layer:** Server-side fetching from FRED, World Bank, IMF SDMX, BIS, ECB SDW. Cache aggressively. Some widgets purely client-side with bundled illustrative data; live-data widgets clearly labeled.
- **AI layer (optional but powerful):** A "tutor mode" using a cheap fast model for inline Q&A on any concept. Instrument cost per request and route through a cost-aware proxy.
- **Persistence:** Lightweight (the Personal Macro Playbook needs storage). Defer auth complexity by using anonymous local storage in v1.
- **Analytics:** Privacy-respecting (Plausible or self-hosted). Track which Layer-2 widgets get used and where users drop off — that's the iteration signal.

---

## 9. Phased Execution Plan for Cowork

### Phase 0 — Naming, scoping, and design exploration *(1 session)*
- Propose 3 candidate project names with rationale.
- Audit 8–12 best-in-class learning experiences (Our World in Data, Bret Victor explorables, Khan Academy, Crash Course Econ, Marginal Revolution University, Tim Harford's work, Ray Dalio's *How the Economic Machine Works*, FT Edit). Distill what each does well; identify the gap Atlas fills.
- Produce a short style/voice guide.

### Phase 1 — Foundations *(1–2 sessions)*
- Lock the design system (tokens, typography, color, motion language, component library scaffold).
- Stand up the Next.js shell with one demo concept node fully built end-to-end (suggestion: A3 — *How banks create money*, because the manipulable balance sheet widget is the most "wow" and least-well-explained-elsewhere concept).
- Build the data fetcher abstractions for FRED + World Bank.

### Phase 2 — Core build, depth-first *(ongoing)*
- Build Track A (Money) end-to-end across all three layers. Ship it. Get Marshall's feedback. Iterate.
- Then Track C (Macroeconomy) — second most important.
- Then Track H (Leverage) — needs the prior tracks to link to.
- Then Tracks D, B, E, F, G in that order of priority.
- Each track gets shipped as a complete unit before moving on. **Avoid horizontal half-building.**

### Phase 3 — Cross-cutting features
- The Regime Dashboard (live).
- The Personal Macro Playbook generator.
- Tutor-mode AI Q&A wired to cheap inference.
- Replayable history scrubber for at least three crises.

### Phase 4 — Evaluation, polish, and launch
- Build a small evaluation harness: 20 understanding-check questions per track, A/B testable.
- Recruit 5–10 test users across the three audience tiers; run think-alouds.
- Polish, accessibility audit, performance pass.
- Decide on distribution: free, paywalled deep tracks, B2B licensable, etc.

---

## 10. Deliverables and Success Metrics

### Deliverables (in order of completion)
1. Phase 0 naming + competitive landscape memo
2. Design system spec
3. Scaffolded Next.js repo with component library
4. One reference concept node, fully built, all three layers
5. Track A (Money), complete
6. Tracks C, H, D, B, E, F, G in sequence
7. Cross-cutting features (Regime Dashboard, Playbook, Tutor AI)
8. Evaluation report and v1 launch

### Success metrics
- **Engagement depth:** ≥40% of users who land on a Layer 1 advance to Layer 2; ≥20% reach Layer 3 on at least one node.
- **Comprehension:** Users score ≥75% on track-end checks after first attempt.
- **Behavior change (the real test):** ≥50% of users who complete the Playbook report at least one decision they made differently as a result. Survey at 30 and 90 days.
- **Word of mouth:** ≥20% of users share a specific widget with someone else within 30 days.

---

## 11. Open Questions for Marshall to Decide

Cowork should not start Phase 1 until these are answered. Flag them clearly in a single message back.

1. **Naming and tone.** Atlas? Something else? How serious vs. playful?
2. **Distribution model.** Free and open? Freemium (Layer 1+2 free, Layer 3 paid)? B2B licensable to firms that want to upskill their workforce? Donation/patronage?
3. **Time and budget envelope.** What's the rough ceiling on Cowork hours and infrastructure spend before checking back in?
4. **Voice and politics.** Global economics has live political debates. Atlas should be honest about disagreements without being either both-sidesy or partisan. Where on that spectrum should Cowork land for ambiguous calls?

---

## 12. Operating Rules for Cowork

- **Show working.** At the end of every session, post a short progress note to a running log file (`atlas/log.md`) with what was done, what's next, and any decisions Cowork made unilaterally.
- **Ask before scope-expanding.** If a feature feels obviously good but isn't in this brief, raise it as a question, don't silently build it.
- **Default to depth-first.** Better to ship one fully-finished track than seven half-finished ones.
- **Keep production-grade hygiene.** Tests for widget logic, types throughout, accessible by default, performance budgets enforced.
- **Track API costs.** Atlas could become expensive if AI tutor mode is heavily used. Instrument cost per user from day one.

---

*End of brief. Awaiting Phase 0 kickoff confirmation.*
