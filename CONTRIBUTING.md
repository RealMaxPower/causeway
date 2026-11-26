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

- **Registry path**: add to `lib/sources.ts` with a canonical URL, then reference by id. `pnpm check:sources` checks registered URLs on the weekly schedule and manual CI runs. Prefer a stable publisher or institution landing page.
- **Inline path**: `entries={[{ who, title, year }]}` works for one-off references.

### …fix a bug or polish a widget
Open an issue first if the change is non-obvious. Small fixes can come straight in as a PR — keep the diff focused and update `docs/ROADMAP.md` if you're closing a roadmap item.

## Local setup

```bash
pnpm install
pnpm privacy:setup         # Git, Node 22, and Python 3.11–3.13 required
pnpm privacy:tools         # verify pinned detectors and model
pnpm privacy:install-hooks # installs the local publication gates
cp .env.example .env.local   # FRED_API_KEY, ANTHROPIC_API_KEY (optional)
pnpm dev
```

Dev server runs at `http://localhost:3000`. Pass `-p 3033` (or your preferred port) if 3000 is busy.

The sensitive-data bootstrap downloads pinned tools into the ignored
`.sensitive-data-tools/` directory; analysis runs locally. Hook installation
refuses conflicting custom hooks rather than overwriting them. Follow
[docs/SENSITIVE_DATA.md](docs/SENSITIVE_DATA.md) for setup, integration,
reviewed exceptions, artifact inspection, and the first-commit bootstrap.

## Before a commit or publication

Finish the relevant checks and review the complete diff:

```bash
pnpm lint          # eslint
pnpm typecheck     # tsc --noEmit
pnpm test          # application/model unit tests
pnpm test:privacy  # publication guards in isolated temporary repositories
pnpm build:corpus  # regenerate search index if you touched any .mdx
pnpm check:links
pnpm privacy:scan  # tracked working files + unignored untracked files
```

Run `pnpm build` and `pnpm e2e` for the final application check. Then stage
only the intended files and run `pnpm privacy:staged`. The hooks also scan
the exact staged tree and final commit message, rechecking their identity;
the push hook scans outgoing history, including secrets deleted by later
commits. A working-tree scan does not replace these checks. Missing tools,
unresolved findings, and unreviewed binary payloads block publication.

Scan PR titles, bodies, and attachments with `pnpm privacy:artifacts` before
upload, and rescan edits. Never paste raw detector matches or upload uninspected
Playwright traces. No bypasses or unscanned GitHub web/API edits are allowed.
**Agents need explicit user approval before a real repository commit, push,
or GitHub publication.** Passing checks does not grant that approval.

CI runs lint, typecheck, unit tests, corpus drift, internal links, an OSV
dependency scan, and production-build Playwright tests. Sensitive-data history
scans and guard regression tests run on both Linux and macOS. CI is a second
check after upload; local scans must pass before any upload. External source
URL checks run only on the Sunday schedule or manual dispatch and remain
non-blocking because publisher availability and anti-bot behavior can vary.

The corpus check fails if MDX changes lack a matching regenerated
`lib/search-corpus.generated.ts`. The internal link checker verifies node
references against MDX filenames and citation IDs against the source registry;
it does not establish that the cited source supports the claim.

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
