<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Causeway

Interactive economics learning platform. Next.js 16 App Router · React 19 · TS · Tailwind v4. Package manager is **pnpm**.

- Before a content node: read `docs/AUTHORING.md`.
- Before a widget: read `docs/WIDGETS.md`. Widgets live one-folder-each under `components/widgets/`.
- Design intent / product vision: `docs/brief.md`; current state in the README and `docs/ROADMAP.md`.
- Before done: `pnpm lint && pnpm typecheck && pnpm test` (E2E: `pnpm e2e`).
- The v0 prototype that seeded the project is not included in this repository.
