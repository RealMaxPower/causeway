# Authoring a node

A "node" is a three-layer concept page at `/nodes/<id>` (e.g. `/nodes/H7`).
Adding one touches **three files**. Skim, copy from an existing node, ship.

## TL;DR

1. Append a `ConceptNode` to `lib/tracks.ts` for the track you're growing.
2. Create `content/nodes/<id>.mdx` with the four exports.
3. Run `pnpm build:corpus` and commit the regenerated `lib/search-corpus.generated.ts`.

That's it. Routing, the side-nav listing, search, and the see-also rail all pick up the new node automatically.

---

## Step 1 · Register in tracks.ts

```ts
// lib/tracks.ts — inside the relevant track's `nodes` array
{
  id: "H9",
  title: "Crypto in a real portfolio",
  pocket: "Two honest readings of bitcoin coexist… (~ one sentence used as the SSR fallback before MDX loads)",
  time: "20 min",
  status: "ready",        // "ready" | "drafted"
  topicContested: true,   // optional · flags genuinely contested literature
  star: false,            // optional · recommended starting point in the track
},
```

The `ConceptNode` interface lives at the top of `lib/tracks.ts`. Required fields: `id`, `title`, `pocket`, `time`, `status`. Optional: `topicContested`, `star`.

---

## Step 2 · Author `content/nodes/<id>.mdx`

Every MDX node exports four named values. Copy the skeleton from a recently shipped node — **`content/nodes/H7.mdx`** and **`content/nodes/H9.mdx`** are the canonical templates.

```tsx
import { L1, L1QA, L2, L2Grid, L2Step, Callout, L3, L3Grid, Debate, DebateSide, Sources, Check } from "@/components/layers";
// import any widget you embed:
// import { CryptoSizer } from "@/components/widgets/crypto-sizer";

export const meta = {
  // The right rail has two semantic slots — use either, both, or neither.
  // See "Hero rail conventions" below.
  heroClaim: {
    lbl: "The trilemma",   // precise framing word
    text: "1–2 sentence claim the rest of the page builds on.",
    sub: "Optional supporting line, muted and small.",
  },
  heroStatsLabel: "By the numbers",   // override of the default "Key facts"
  heroStats: [
    { lbl: "Hyperinflations since 1796", val: "56+", sub: "Hanke & Krus 2013." },
    // 0–3 entries. Each `sub` should carry a source attribution.
  ],
  relatedNodes: ["H2", "H8", "G5"],   // 2–3 ids · feeds the see-also rail
};

export const L1Body = (
  <L1 title="…">
    <div>
      <L1QA question="What is this?">…</L1QA>
      <L1QA question="Why should I care?">…</L1QA>
    </div>
    {/* Right column: dl visual or two-line summary */}
  </L1>
);

export const L2Body = (
  <L2 title="…">
    <L2Grid>
      <L2Step num="01" title="…">…</L2Step>
      <L2Step num="02" title="…">…</L2Step>
      {/* …more steps… */}
      <Callout title="…" link={{ to: "/nodes/H1", text: "H1 · Reading the regime" }}>…</Callout>
    </L2Grid>
    {/* <SomeWidget /> · optional embedded widget — see docs/WIDGETS.md */}
  </L2>
);

export const L3Body = (
  <L3 title="…">
    <L3Grid sources={
      <Sources ids={["fred-cpiaucsl", "bis-borio-financial-cycle-2014"]} />
    }>
      <h3>History</h3>
      <p>…</p>
      <Debate question="…">
        <DebateSide side="mainstream" who="● Position">…</DebateSide>
        <DebateSide side="heterodox" who="● Position">…</DebateSide>
      </Debate>
      <Check
        question="…"
        options={[
          { label: "…", correct: true, explain: "Why this is right." },
          { label: "…",                explain: "Why this misses." },
          { label: "…",                explain: "Why this misses." },
        ]}
        seeAlso={{ href: "/nodes/<id>?l=2", label: "the model in L2" }}
      />
    </L3Grid>
  </L3>
);
```

---

## Step 3 · Refresh the search corpus

```bash
pnpm build:corpus
```

Reads every `content/nodes/*.mdx`, strips JSX, and writes a plain-text index to `lib/search-corpus.generated.ts`. **Commit the regenerated file** — CI verifies that the corpus is in sync with the MDX.

---

## Layer-component reference

All imported from `@/components/layers`.

| Component | Props | Used in |
| --- | --- | --- |
| `L1` | `title`, `time?`, `children` | L1Body wrapper |
| `L1QA` | `question`, `children` | one Q+A pair inside L1 |
| `L2` | `title`, `time?`, `children` | L2Body wrapper |
| `L2Grid` | `children`, `rail?` | two-column prose + optional rail |
| `L2Step` | `num` ("01"…), `title`, `children` | numbered step |
| `Callout` | `title`, `label?`, `link?: {to, text}`, `children` | "In your life" emphasis box |
| `SideRail` | `title`, `children` | sticky rail (use with `KeyTerm`s) |
| `KeyTerm` | `term`, `children` | glossary entry inside a SideRail |
| `L3` | `title`, `time?`, `children` | L3Body wrapper |
| `L3Grid` | `children`, `sources?` | two-column prose + sources rail |
| `Timeline` | `entries: { year, event }[]` | year-event timeline |
| `Debate` | `question`, `label?`, `children` | live-debate box |
| `DebateSide` | `side: "mainstream" \| "heterodox" \| string`, `who`, `children` | one side of the debate |
| `Sources` | `entries?: SourceEntry[]`, `ids?: string[]` | L3 sources rail (mix both) |
| `Cite` | `id` | inline citation resolving to `lib/sources.ts` |
| `Check` | `question`, `options[]`, `seeAlso?` | end-of-L3 comprehension check |

---

## Hero rail conventions

The right rail beside the H1 has **two semantic slots**, both optional:

**`heroClaim`** — the *argument*. A 1–2 sentence framing the rest of the page builds on. Use when the node's anchor isn't a number — it's a thesis or a paradox (e.g. A2's trilemma, "no currency does all three jobs well"). The `lbl` is the eyebrow shown above the claim; authors choose a precise framing word: *"The trilemma" · "The thesis" · "The framing" · "The paradox" · "The pattern"*. Optional `sub` line for a one-liner of support.

**`heroStats`** — the *numbers*. 0–3 quantitative anchor facts. Each `sub` line should carry an explicit source attribution (institution, paper, date). The section eyebrow defaults to *"Key facts"*; nodes that pass the quantitative-with-sources bar should override `heroStatsLabel` to *"By the numbers"*.

Pick the configuration that fits the node:

| Node shape | Configuration |
| --- | --- |
| Real numbers anchor the page (A3, A1) | `heroStats` + `heroStatsLabel: "By the numbers"`, no `heroClaim` |
| A thesis or paradox anchors the page (A2) | `heroClaim` + 0–1 supporting `heroStats` |
| Mixed framing + data | both slots |
| No good anchor at L1 | neither — drop the rail, the L1 prose carries it |

**What hero stats are not.** A `val` field is for a verifiable number, not a rhetorical phrase. *"no currency"*, *"compressed info"*, or *"the inframarginal"* belong in a `heroClaim` (or in L1 prose), not in `heroStats`. If a stat doesn't have a date/institution that fits in `sub`, it probably isn't a stat.

**Label voice — plain language only.** The same plain-language contract that governs L1 prose applies to the `lbl` field. A curious adult with no econ background must be able to read the label and know what the number measures, without first decoding Fed/Basel/BIS acronyms. The *technical term* belongs in `sub`, never as the headline label.

| Don't | Do |
| --- | --- |
| `Bank-created share of M2` | `Money created by banks, not government` (sub: *"Share of US M2; FRED, 2025 monthly avg."*) |
| `Common-equity Tier 1 floor` | `Bank's own money cushion (minimum)` (sub: *"Basel III CET1; the constraint that binds."*) |
| `Reserve requirement` | `Cash banks must park at the Fed` (sub: *"US reserve requirement, since March 2020 · Federal Reserve."*) |
| `Age of credit-and-tally records` | `Oldest written debt records` (sub: *"Mesopotamian temple ledgers, ~3000 BCE onward."*) |

The technical term gets one mention in `sub` so a sophisticated reader can map back. The headline reads like a sentence a friend would say.

---

## Cross-linking

- **See-also rail** — set `meta.relatedNodes: ["H3", "G2"]`. `components/chrome/RelatedNodes.tsx` renders the cards automatically.
- **Inline link** — `<a href="/nodes/H3" style={{ color: "var(--gold-deep)" }}>H3</a>`.
- **Track-H call to action** — `<Callout link={{ to: "/nodes/H8", text: "H8 · Portfolio under regime change" }}>…</Callout>`.

---

## Sources & citations

Two paths.

**Inline literals** — one-off references that aren't worth registering:
```tsx
<Sources entries={[{ who: "Mehrling", title: "The New Lombard Street", year: "2010" }]} />
```

**Registry** — sources you'll cite from multiple nodes, or that need URL validation via CI:
```tsx
// 1. Add to lib/sources.ts
"mehrling-new-lombard-street-2011": {
  id: "mehrling-new-lombard-street-2011",
  who: "Perry Mehrling",
  title: "The New Lombard Street",
  year: "2011",
  kind: "academic",
  url: "https://press.princeton.edu/books/hardcover/9780691143989/the-new-lombard-street",
},

// 2. Reference in MDX
<Sources ids={["mehrling-new-lombard-street-2011"]} />

// 3. Or inline in prose
<Cite id="mehrling-new-lombard-street-2011" />
```

`<Sources>` accepts both `entries` and `ids` and renders the union — mix freely.

`pnpm check:sources` HEAD-requests every registered URL and reports broken links. The PR-gating workflow runs it as a non-blocking job; transient publisher outages produce yellow warnings rather than red gates.

---

## Common gotchas

- **Title in `<L1>`/`<L2>`/`<L3>`** doesn't need to match `tracks.ts` exactly — use a sub-heading that's more specific than the node title. Track-map listings use `tracks.ts`.
- **`pocket`** is the SSR fallback used before the MDX hydrates. Keep it to one tight sentence.
- **`time`** is the displayed reading time on the layer header; pick honest minutes (15/20/25/30).
- **Static rendering** — every node is statically generated at build time via `app/nodes/[id]/page.tsx` and `allNodeIds()`. New nodes appear on the next build with no further wiring.
