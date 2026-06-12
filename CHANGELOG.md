# Changelog

All notable changes to Causeway are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
aims to follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Nine new interactive widgets, bringing the catalogue to 31: three-jobs
  trilemma (A2), supply-demand surplus (B1), price-discovery order book (B2),
  GDP scoreboard-vs-score (C1), comparative-advantage PPF (D1), debt-dynamics
  r-vs-g simulator (E1), bubble-o-meter confluence dashboard (F3), deleveraging
  four-levers mixer (F4), and population-pyramid / dependency-ratio explorer (G3).

### Changed
- Node reading-time estimates recalibrated to honest, content-derived values.
- CI: the source-URL audit now runs on the weekly schedule and manual dispatch
  only (not per-PR), since external link rot is time-based, not commit-based;
  GitHub Actions runners upgraded to the Node 24 runtime.

### Fixed
- Documentation accuracy sweep across README, `/about`, `/regime`, `/lab`, and
  the contributor docs (node count, framework versions, CI gate descriptions,
  stale "Phase 3" framing, deep-links to widget layers).
- Source URL corrections (OECD Pensions at a Glance) and anti-bot allowlisting
  (bruegel.org).

## [0.7.0] - 2026-05-27

First public release. Causeway is an interactive learning environment for
global economics, built around a three-layer scaffold: a thirty-second pocket
answer, a five-minute working model, and a twenty-minute deep dive with sources.

### Added
- 44 concept nodes across eight tracks (Money, Markets, Macro, Trade,
  Institutions, Crises, Frontier, Leverage), authored in MDX.
- Interactive widgets built with Motion, D3, and Visx.
- AI tutor endpoint (`/api/tutor`) backed by the Anthropic SDK, with Zod input
  validation, a daily-budget kill switch, an optional origin allowlist, and
  Upstash rate-limiting.
- Live macro data from FRED with server-side caching.
- Command-K search over a generated corpus of node content.
- Contributor documentation (`CONTRIBUTING.md`, `docs/AUTHORING.md`,
  `docs/WIDGETS.md`) and a security policy (`SECURITY.md`).
- CI for lint, typecheck, search-corpus drift, internal-link checks, source
  URL checks, and dependency audit.

### Note
- Causeway began as a Babel-in-browser prototype, rebuilt on Next.js for this
  release. The prototype is not included in this repository.

[Unreleased]: https://github.com/RealMaxPower/causeway/compare/v0.7.0...HEAD
[0.7.0]: https://github.com/RealMaxPower/causeway/releases/tag/v0.7.0
