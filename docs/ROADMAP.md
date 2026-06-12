# Roadmap

Causeway is an explorable-economics platform: every concept in three layers — a
30-second pocket answer, a 5-minute working model you drive, and a 20-minute
deep dive with sources — taught through models you manipulate rather than
diagrams you read. The eight tracks and 44 nodes that exist today are all
three-layer complete. The work from here is depth, polish, and the
cross-cutting tools that turn understanding into decisions.

This file is **forward-looking only**. For what has already shipped, see the
[CHANGELOG](../CHANGELOG.md).

## Direction

Themes, not dated commitments — a solo project moves as time allows.

- **Pedagogy depth.** Tighten the thinnest L2/L3 bodies and keep the "In your
  life" leverage callout consistent across Tracks A–G.
- **Decision tools.** The Personal Macro Playbook and the live regime dashboard
  both ship; the next leverage is wiring more of Track H's axes into them.
- **Tutor quality.** A golden-test harness — question/answer pairs checked
  against the registered sources — so tutor changes are measurable, not vibes.
- **Authoring ergonomics.** A scaffold command for "new node + register its
  sources" so contributors spend their time on content, not boilerplate.

## Where to contribute

- **New or deeper nodes** — start at [docs/AUTHORING.md](AUTHORING.md).
- **New widgets** — start at [docs/WIDGETS.md](WIDGETS.md).
- **Citations** — add canonical-URL sources to `lib/sources.ts`; see
  [CONTRIBUTING.md](../CONTRIBUTING.md).
- Good first contributions: fill out one node's L3 sources rail, or do a
  mobile-polish pass on a single widget.

## Non-goals

Deliberately out of scope, to keep the project coherent:

- **User accounts / server-side auth.** Personal state — playbook, lab
  scenarios, reading progress — lives in the browser's local storage and
  travels by shareable URL. No login, no user database.
- **Personalized investment advice.** Track H teaches frameworks for thinking
  about decisions under a macro regime; it does not recommend positions.
- **Real-time market data.** Live feeds are macro-cadence (FRED, cached for
  hours), not tick-level market data.

The distribution model (free / freemium / B2B) is an open question, not a
non-goal — it's deliberately undecided.

## Maintenance

Causeway is solo-maintained as a learning project. Issues and PRs are welcome
and reviewed on a best-effort basis — there is no support SLA. Security reports
go through the private channel described in [SECURITY.md](../SECURITY.md).
