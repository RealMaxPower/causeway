## What this changes
<!-- A short summary. Link any related issue with "Closes #123". -->

## Type
- [ ] Content (new or corrected concept node)
- [ ] Widget / interactive
- [ ] App / infrastructure
- [ ] Docs

## Checklist
- [ ] `pnpm lint` passes
- [ ] `pnpm typecheck` passes
- [ ] `pnpm build:corpus` produces no diff (search index in sync) — if content changed
- [ ] `pnpm check:links` passes (internal links, node IDs, and citations resolve)
- [ ] New citations are in `lib/sources.ts` and pass `pnpm check:sources`
- [ ] Tests added or updated where it makes sense (`pnpm test`)

## Notes for reviewers
