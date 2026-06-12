# ADR 0001 — Migrate Causeway from Babel-in-browser prototype to Next.js

**Status:** Accepted
**Date:** 2026-05-12
**Decider:** Marshall Cahill

## Context

Causeway began as a Babel-standalone-in-browser React 18 prototype: ~85 files at the repo root, no build step, no package manager, no git. The original execution brief (`docs/brief.md`) specifies Next.js App Router + TypeScript + Tailwind + shadcn + MDX + Anthropic SDK, with FRED / World Bank / IMF data fetching. The prototype achieved its purpose — proving the three-layer pedagogical scaffold and prototyping 17 bespoke node pages plus 16 widgets — but cannot be deployed as a public product without the substrate the brief calls for.

Specifically, the gap:

- No production deploy target (in-browser Babel transpilation is for prototyping only).
- The tutor calls `window.claude.complete`, which only exists in the Claude Artifact runtime.
- Content is locked in a single `node-content.jsx` `window.NODE_CONTENT` object rather than per-node MDX files (which the brief specs and which authors expect).
- No types, tests, or CI hygiene.
- Naming, license, and other repo-level signals were undefined.

## Decision

Three decisions locked together:

1. **Stack:** Migrate now (not later, not hybrid) to **Next.js 15 App Router + TypeScript + Tailwind + shadcn/ui + MDX + Anthropic SDK**, per `docs/brief.md` §8.
2. **License:** **MIT**.
3. **Name:** **Causeway** is final. The "Atlas" working title in the brief is superseded.

## Rationale

- The brief was written before the prototype existed, but the brief defines the production product. The prototype was a tool for de-risking pedagogy, not a deployable substrate.
- The longer the prototype runs, the more content authoring debt accumulates against an architecture that cannot ship.
- All 17 bespoke nodes already exist as visual references and prose drafts — the port is mechanical, not creative work. A3 (the bank-sandbox node) is the highest-fidelity port target and exercises every architectural seam (chrome, layers, widget, tutor).
- MIT chosen over Apache 2.0 (no expected patent surface), CC-BY-NC for content (over-restrictive given uncertain distribution model), or proprietary (closes optionality).
- "Causeway" already pervades the prototype and reads better than "Atlas" — there is no benefit to relitigating Phase 0 naming.

## Consequences

- **Positive:** Deployable repo. Real backend for the tutor. MDX-per-node authoring workflow. Types and tests from day one. A canonical reference port (A3) that the remaining 42 nodes follow.
- **Negative:** No new content authored during the port. ~1 week of engineering before the next node ships. Some widget logic will need rework to remove module-level mutation (audit during each port).
- **Permanent:** The migration is one-way. The v0 prototype that seeded the project is not included in this repository.

## Migration order

1. Freeze v0, scaffold Next.js, hygiene files.
2. Port design tokens (CSS variables) and build typed `lib/tracks.ts`.
3. Build chrome (Topbar, SideNav, LayerSwitch, Hero).
4. **Port A3 end-to-end** as the reference node (bank-sandbox widget + tutor backend).
5. Generic MDX renderer for the remaining nodes.
6. Port bespoke widgets in brief §9.2 order: A → C → H → D → B → E → F → G.
7. Data layer, analytics, tests.
8. Decommission `legacy/`. ✓ Done — see commit history.

Top risks: module-level state mutation in widgets (especially `bank-sandbox.jsx`), CSS specificity collisions if the full v0 stylesheets ship globally, and MDX server/client boundary errors when widgets are imported directly into MDX bodies.
