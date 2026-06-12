# Contributing to Causeway

Thanks for opening this. Causeway is a small, opinionated project — most contributions land cleanly if you start from the right doc.

## I want to…

### …add or edit a concept node (MDX)
Read **[docs/AUTHORING.md](docs/AUTHORING.md)**. It's a single page that walks through the three files you touch:

1. `lib/tracks.ts` — register the node
2. `content/nodes/<id>.mdx` — write the three layers (pocket / working model / full picture)
3. `pnpm build:corpus` — regenerate the search index (commit the result)

Layer components (`L1`, `L2Grid`, `Callout`, `Debate`, `Sources`, `Check`, …) all live in `@/components/layers`. Copy the shape from a recently shipped node like [content/nodes/H7.mdx](content/nodes/H7.mdx) or [content/nodes/H9.mdx](content/nodes/H9.mdx).

### …add or edit an interactive widget
Read **[docs/WIDGETS.md](docs/WIDGETS.md)**. Three files per widget:

1. `index.tsx` — `"use client"` React component
2. `model.ts` — pure compute (no React, no DOM)
3. `<name>.module.css` — scoped styling

The doc also covers the three lab-mode opt-in patterns (writer / reader-stacks-on-regime / reader-overrides-regime) and the mobile breakpoint convention (`@media (max-width: 880px)` for tablet collapse, `@media (max-width: 479px)` for mobile sweep).

### …add a citation
Two paths, both fine, mix freely on the same rail:

```tsx
<Sources
  ids={["mehrling-new-lombard-street-2011"]}
  entries={[
    { who: "Some One-Off Author", title: "Untitled paper", year: "2023" },
  ]}
/>
```

- **Registry path**: add to `lib/sources.ts` with a canonical URL, then reference by id. CI's `pnpm check:sources` HEAD-pings every URL — if you can't find a stable publisher landing page in <60s, leave the citation inline.
- **Inline path**: `entries={[{ who, title, year }]}` works for one-off references.

### …fix a bug or polish a widget
Open an issue first if the change is non-obvious. Small fixes can come straight in as a PR — keep the diff focused and update `docs/ROADMAP.md` if you're closing a roadmap item.

## Local setup

```bash
pnpm install
cp .env.example .env.local   # FRED_API_KEY, ANTHROPIC_API_KEY (optional)
pnpm dev
```

Dev server runs at `http://localhost:3000`. Pass `-p 3033` (or your preferred port) if 3000 is busy.

## Before you commit

```bash
pnpm typecheck     # tsc --noEmit
pnpm lint          # eslint
pnpm build:corpus  # regenerate search index if you touched any .mdx
```

CI runs lint + typecheck + corpus-drift + `check:links` + `check:sources` + `pnpm audit --prod --audit-level=high` on every PR (plus a Sunday-06:00-UTC cron). The corpus check **will fail your PR** if you edited an MDX without committing the regenerated `lib/search-corpus.generated.ts`. The link checker validates every `/nodes/<id>` href, `meta.relatedNodes`, `<Cite id>`, and `<Sources ids>` against the catalogue. `check:sources` is non-blocking (publisher anti-bot rules surface as yellow warnings, not red gates).

## Commit messages

We use conventional-commit prefixes:

- `feat:` user-visible new capability
- `fix:` bug fix
- `chore:` infrastructure, deps, version bumps
- `docs:` documentation only
- `refactor:` no behaviour change

Scopes are loose — use whichever maps to the change (`feat(lab):`, `fix(regime):`, `chore(version):`).

## Code style

- File length cap: ~400 lines. Split before you hit it.
- File names: kebab-case in app/lib/scripts; PascalCase for React component files matching the export name.
- No comments explaining what code does — name things well instead. Comments belong on hidden constraints, non-obvious invariants, or workarounds for specific bugs.
- TypeScript strict mode is on; new code must typecheck.

## Questions

Open an issue on [GitHub](https://github.com/RealMaxPower/causeway/issues). For private questions about contributing, the maintainer is reachable via the GitHub profile.
