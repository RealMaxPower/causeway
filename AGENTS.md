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

## Required checks before commits and GitHub publication

- This is a public repository. Obtain the user's explicit approval of the concrete diff and redacted scan summary before creating any repository commit or publishing anything to GitHub. Approval of implementation work is not approval to commit, push, open a PR, or upload artifacts.
- Run local secret and PII scans before every commit and every push. This is a user requirement; GitHub CI alone does not satisfy it.
- Before committing, scan the exact staged tree, final commit message, and intended author/committer metadata. Before pushing, scan every outgoing commit and relevant ref metadata, including content subsequently deleted in a later commit.
- Missing tools, failed scans, unsupported content, and unresolved findings block committing or publishing. Re-scan after changes; do not bypass hooks or scan failures.
- Include generated content, fixtures, documentation, and any artifacts or PR text intended for upload, on every creation or update. Keep scanner output redacted and raw reports out of GitHub.
- Allow only reviewed, narrowly scoped exceptions for intentional public information, synthetic examples, or false positives. Never broadly exclude tests or documentation.
- See docs/REMEDIATION_PLAN.md for the required bootstrap procedure and implementation gates. Until the automated gate exists, equivalent local scans are still required before any commit or push.
