# Security Policy

Causeway is an open-source, MIT-licensed interactive learning site. It has no
user accounts, stores no personal data, and runs a single AI-backed API route.
This document explains what we consider in-scope, how to report a vulnerability,
and the security properties the codebase relies on.

## Reporting a vulnerability

Please do **not** open a public GitHub issue for security reports.

Report privately by opening a
[GitHub Security Advisory](https://github.com/RealMaxPower/causeway/security/advisories/new)
on this repository. This is the primary channel for security reports.

When reporting, include:

1. A short description of the issue and the impact you believe it has.
2. Steps to reproduce, or a minimal proof-of-concept.
3. The commit SHA or deployed URL you tested against.
4. Whether you have shared the finding elsewhere.

We aim to acknowledge reports within **3 business days** and to ship a fix or
mitigation within **30 days** for high-severity issues. Researchers acting in
good faith under this policy will not be subject to legal action; please give
us a reasonable window to remediate before public disclosure.

## Supported versions

Only the current `main` branch and the latest deployed release receive security
fixes. The v0 prototype that seeded the project is not part of this repository.

## Scope

In scope:

- The Next.js application in this repository (`app/`, `components/`, `lib/`).
- The tutor API route (`app/api/tutor/route.ts`) and its supporting code in
  `lib/tutor/`.
- Build scripts under `scripts/` that run during CI or `pnpm build`.
- Dependency vulnerabilities that have a realistic attack path in this app.

Out of scope:

- Findings that require a compromised maintainer machine or stolen credentials.
- Self-XSS, clickjacking on pages without sensitive actions, missing
  best-practice headers without a concrete exploit.
- Denial-of-service via high-volume traffic against the public site — rate
  limiting at the edge is the deployment's responsibility, not the app's.
- Social-engineering of maintainers or third-party services.
- Vulnerabilities only reproducible in the v0 prototype that seeded the project
  (not part of this repository).

## Threat model

Causeway is a content site with one server action: forwarding short questions
to Anthropic. The realistic risks are:

1. **Secret exfiltration.** `ANTHROPIC_API_KEY` is the only high-value secret.
   It must never appear in client bundles, logs, error responses, or commits.
2. **Cost abuse of the tutor endpoint.** An attacker scripting `/api/tutor`
   could run up an Anthropic bill.
3. **Prompt injection of the tutor.** A crafted question could try to override
   the system prompt, exfiltrate it, or coerce the model into off-topic output.
   Impact is limited because the tutor is stateless, has no tools, and the
   response is rendered as text.
4. **Supply-chain compromise.** A malicious dependency could exfiltrate the
   API key at build or runtime.
5. **Content tampering.** MDX content is authored in-repo; the risk is a
   contributor adding a malicious `<script>`-equivalent payload that survives
   MDX rendering.

## Controls already in the codebase

- **Server-only secrets.** `ANTHROPIC_API_KEY` is read inside the
  `app/api/tutor/route.ts` server runtime (`export const runtime = "nodejs"`)
  and is never imported from client components. `lib/tutor/cost.ts` is marked
  `"server-only"` so a stray client import fails at build time.
- **Strict input validation.** The tutor route validates the request body with
  Zod: `nodeId` must match `/^[A-H][0-9]{1,3}$/` and `question` is capped at
  2000 characters. Malformed bodies return `400` with no echo of internal state.
- **Daily-budget kill switch.** `isWithinDailyBudget()` short-circuits the
  endpoint with `429 daily_budget_exceeded` once `TUTOR_DAILY_BUDGET_USD` is
  spent. Backed by a per-instance in-memory counter plus the JSONL log when
  one is configured — the counter resets on cold start, so this is defense
  in depth and not a substitute for edge rate limiting.
- **Origin allowlist (optional).** Set `TUTOR_ALLOWED_ORIGINS` to a
  comma-separated list of allowed Origin header values; browser requests
  from any other origin are rejected with `403 forbidden_origin`. Requests
  with no Origin header (curl, server-to-server) are not blocked.
- **Baseline security headers.** `next.config.ts` sets
  `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`,
  `Permissions-Policy`, and HSTS on every response. A full nonce-based CSP
  is left to deployers because the inline theme-bootstrap script in
  `app/layout.tsx` needs per-request nonces.
- **Scoped system prompt.** `buildSystemPrompt(nodeId)` constrains the tutor
  to a single concept node; it does not see prior messages, user identity, or
  any tool surface.
- **No PII collected.** There are no accounts, cookies set by application code,
  or analytics that identify users. Vercel Analytics is used in cookieless mode.
- **Opaque error responses.** Upstream failures return `503 tutor_unavailable`
  with the underlying error logged server-side only.
- **CI checks.** `pnpm lint`, `pnpm typecheck`, `pnpm build:corpus`
  (drift check), `pnpm check:links`, `pnpm check:sources` (non-blocking),
  and `pnpm audit --prod --audit-level=high` run on every PR plus a
  weekly Sunday cron. Unit (`pnpm test`) and E2E (`pnpm e2e`) suites
  exist locally but are not yet wired into the workflow — run them
  before tagging a release.

## What we ask deployers to add

These belong to the hosting environment rather than the repo, but a production
deployment of Causeway should:

- Put the public site behind a CDN/WAF that rate-limits `/api/tutor` per IP
  (suggested: 10 requests/minute, 200/day). This is the primary defense
  against cost abuse; the in-app kill switch is defense in depth.
- Set `TUTOR_DAILY_BUDGET_USD` to a value you are willing to lose to abuse.
- Set `TUTOR_ALLOWED_ORIGINS` to the public origin(s) of the deployment so
  cross-site browsers can't drive the tutor endpoint.
- Add a nonce-based CSP via `proxy.ts` if you need strict CSP; the inline
  theme-bootstrap script in `app/layout.tsx` will need the per-request nonce.
- Restrict the Anthropic API key to the minimum scopes required and rotate it
  on a schedule (suggested: every 90 days).
- Send server logs to a destination that retains the `[tutor.cost]` and
  `[tutor]` lines for at least 30 days, so abuse can be reconstructed.

## Secrets and configuration

Secrets live only in environment variables; see `.env.example` for the full
list. The repository's `.gitignore` excludes `.env`, `.env.local`, and
`data/tutor-cost.jsonl`. If you believe a secret has been committed:

1. Treat it as compromised and rotate immediately at the provider.
2. Remove it from history (`git filter-repo` or BFG) and force-push.
3. Open a private advisory describing the exposure window.

## Dependencies

- Dependabot security updates are enabled for npm dependencies.
- High- and critical-severity advisories block release; medium and below are
  triaged on the next maintenance cycle.
- Run `pnpm audit --prod` before tagging a release. Lockfile churn from
  transitive dependencies should be reviewed, not blindly accepted.

## Disclosure

Once a fix has shipped to `main` and the deployed site, we will publish a
GitHub Security Advisory describing the issue, affected versions, and the
remediation. Reporters who wish to be credited will be named in the advisory.
