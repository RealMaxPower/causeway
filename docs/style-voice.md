# Voice guide

Causeway is read by a curious adult with no econ background. Every layer should pass the *"would my smart non-econ friend understand this on first read?"* test. This file collects the conventions that make that possible. It is short by design. Pull before/afters from `content/nodes/A1.mdx`, `A2.mdx`, `A3.mdx` when in doubt — they are the canonical exemplars.

---

## L1 · Pocket

The brief defines L1 as *"one sentence answer to what is this, one sentence answer to why should I care, plus one animated visual."* The corresponding hard rules:

- **≤ 30 words per Q&A**, ideally one sentence each.
- **End on a concrete image** the reader can picture: a temple ledger, a banker writing a number, a queue at a gas pump.
- **Ban abstract nouns without an anchor in the same sentence.** Words like *substrate, premise, contingent, incidental, folk theory, inframarginal, exogenous* either become a `<Term def="…">word</Term>` wrap or get replaced by a concrete equivalent.
- **One concrete replacement story per node.** If you're saying *"Smith's barter villagers didn't exist"*, also show what *did* exist (the Mesopotamian temple ledger). Don't only negate.
- The right column is a **visual**, not a `<dl>` table. Use `<Scene>`, `<Comparator>`, or `<MicroAnimate>` from `@/components/layers`.

### Before / after (from A1)

```diff
- Barter is a myth. There's no archaeological record of a society that ran on it.
- Credit and debt came first. Money emerged later as a unit for measuring obligations
- to the temple, the king, and each other.
+ The first "money" wasn't a coin — it was a debt entry on a Mesopotamian
+ clay tablet, three thousand years before anyone struck a coin.
+ Barter never happened.
```

```diff
- If you start from the barter myth, money is fundamentally a thing — a token,
- a coin, ideally backed by something scarce. If you start from the credit-first
- record, money is fundamentally an accounting unit, and the substrate is
- incidental. Almost every monetary debate inherits one or the other premise.
+ If you start from barter, today's dollar is an IOU for gold. If you start
+ from the tally, the dollar is an IOU for everything else — and that split
+ shapes every monetary argument you'll ever hear.
```

The "after" form names the same insight with concrete anchors (clay tablet, gold, IOU) and ditches *substrate, incidental, premise*.

---

## L2 · Working model

Same vocabulary bar as L1. Different shape: 3–5 numbered steps that interleave with a widget when the node has one.

- **Each step opens with a concrete example or moment** before introducing terminology. The reader should be able to picture what's happening before learning what it's called.
- The **"In your life" `<Callout>`** is the brief's signature differentiator. Every L2 should land one. Frame as a practical implication the reader could act on or look for.
- Widgets are out of scope of voice (different track of work). When prose lives next to a widget, **point at the widget** — *"click Issue loan → Alice, watch what does not happen"* — instead of describing it.
- L2 widget *gap* (nodes that have prose-only L2 with no widget) is a per-node deep-work item tracked separately from voice.

---

## L3 · Full picture

Register can escalate. By L3 the reader has self-selected for depth and the brief explicitly calls for *"where economists disagree."* Heterodox/mainstream debate frames and named scholars are fine.

- Still: **no jargon-as-shorthand.** First use of a term either explains itself in plain language or wraps in `<Term>`. *"Wicksell, Hawtrey, and later Keynes formalise the idea that bank credit, not the monetary base, is the operative variable for the cycle"* is fine — it's a complete thought, not a name-drop.
- The `<Debate>` block is for **live disagreements with real positions**, not strawman vs straw-man. Name the actual people on each side (Kotlikoff, Cochrane, Werner) so the reader can chase the argument if they want.
- The `<Sources>` rail at the bottom is for **registered primary sources** (FRED, BIS, IMF, peer-reviewed work). The `<Cite>` component handles inline citations.

L3 is also where the implicit *"advanced mode"* lives. The layered system itself is the depth toggle — we don't ship a parallel voice register, only deeper content.

---

## Hero rail

The right column beside the H1 has two semantic slots — pick the configuration that fits the node.

### `heroClaim` — the *argument*

Use when the node's anchor isn't a number, it's a thesis or a paradox. *A2's trilemma is the canonical example.* The `lbl` field carries the eyebrow: choose a precise framing word — *"The trilemma" · "The thesis" · "The framing" · "The paradox" · "The pattern"*. The `text` field is 1–2 sentences. Optional `sub` for a supporting one-liner.

### `heroStats` — the *numbers*

0–3 quantitative anchor facts. Each `sub` line should carry an explicit source attribution (institution, paper, date). Section eyebrow defaults to *"Key facts"*; nodes that pass the quantitative-with-sources bar should set `heroStatsLabel: "By the numbers"`.

### Plain-language labels

The same plain-language rule that governs L1 prose applies to the `lbl` field. A curious adult must be able to read the label and know what the number measures, without first decoding Fed/Basel/BIS acronyms. The technical term belongs in `sub`, never as the headline.

| Don't | Do |
| --- | --- |
| `Bank-created share of M2` | `Money created by banks, not government` (sub: *"Share of US M2; FRED, 2025 monthly avg."*) |
| `Common-equity Tier 1 floor` | `Bank's own money cushion (minimum)` (sub: *"Basel III CET1; the constraint that binds."*) |
| `Reserve requirement` | `Cash banks must park at the Fed` (sub: *"US reserve requirement, since March 2020 · Federal Reserve."*) |
| `Age of credit-and-tally records` | `Oldest written debt records` (sub: *"Mesopotamian temple ledgers, ~3000 BCE onward."*) |

### What hero stats are *not*

A `val` field is for a verifiable number, not a rhetorical phrase. *"no currency"*, *"compressed info"*, *"the inframarginal"*, *"structure doesn't change"* belong in `heroClaim` (or in L1 prose), not in `heroStats`. If a stat doesn't have a date, institution, or paper that fits in `sub`, it probably isn't a stat — promote it to `heroClaim` or delete it.

### Decision table

| Node shape | Configuration |
| --- | --- |
| Real numbers anchor the page (A3, A6) | `heroStats` + `heroStatsLabel: "By the numbers"`, no `heroClaim` |
| Thesis or paradox anchors the page (A2, F1) | `heroClaim` + 0–1 supporting `heroStats` |
| Mixed framing + data | both slots |
| Node is widget-driven, with no concept-level anchor | neither — or `heroClaim` describing the widget |

---

## Inline glossary · `<Term>`

When an academic word survives the rewrite, wrap it once on first use:

```tsx
<Term def="The stuff money is made of — gold, paper, a database row.">substrate</Term>
```

This renders as the word with a dotted underline; hover (or long-press on mobile) shows the definition. Self-identified sophisticated readers can suppress the underlines via the **Plain mode** toggle in the `LayerSwitch` popover — the title= tooltip still works on hover, only the visual scaffold disappears.

Use `<Term>` sparingly. If a node has more than ~5 Term-wraps in L1, the prose is doing too much work; rewrite it. Term is for *occasional academic survivors*, not a license to keep the jargon.

---

## Prereq hint

Set `meta.prereq = "<id>"` when the node is best read after another and reading it cold would actively confuse. `NodeHero` renders a small italic *"Best read after A1 · Why money exists"* line above the title. Use sparingly — a track is already a sequence.

---

## Anti-patterns (a quick checklist)

- ❌ Academic abstraction without a concrete anchor (*"the substrate is incidental"*)
- ❌ Rhetorical `val` field (*"no currency"*, *"folk theory"*) — promote to `heroClaim`
- ❌ Source-less stat (`sub` is editorial commentary, not attribution)
- ❌ Negating without replacing ("X is a myth" with no "what actually happened")
- ❌ Inline-styled `<dl>` table where a `<Scene>` or `<Comparator>` belongs
- ❌ Jargon label as the headline of a stat (*"Common-equity Tier 1 floor"*)
- ❌ More than ~5 `<Term>` wraps in a single L1 (the prose itself is too dense)
- ❌ `<Debate>` with strawmen instead of named, real positions
