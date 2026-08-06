# TrustLens

TrustLens is a privacy transparency and threat-audit platform that inspects payloads, redacts sensitive data, explains risk, and records security activity.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/trustlens` — React/Vite web experience with sign-in, dashboard, inspector, and audit reports
- `artifacts/api-server` — Express API with auth, Gemini inspection, and audit endpoints
- `lib/api-spec/openapi.yaml` — source of truth for generated API clients and validation
- `lib/db/src/schema/index.ts` — Drizzle schema for TrustLens users and audit logs

## Architecture decisions

- Payload inspection happens on the API server so the Gemini key never reaches the browser.
- Audit records are scoped to the authenticated user and stored in PostgreSQL.
- The browser stores only the short-lived bearer token and receives sanitized inspection output.

## Product

- Create an account or sign in to a protected workspace.
- Inspect freeform payloads for PII, credentials, and secrets.
- Review redacted output, severity, threat signals, and compliance rationale.
- Monitor scan volume, weighted risk, severity mix, and recent audit activity.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
