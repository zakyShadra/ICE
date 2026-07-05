# ICE — Intelligent Cognitive Engine

ICE is a Personal AI Agent and AI Operating System. Users only interact with
ICE — Claude, GPT, Gemini, DeepSeek, Qwen, and local (Ollama) models are
interchangeable engines underneath, selected automatically by ICE's AI Router
or chosen manually by the user.

This is not a chatbot wrapper. The intelligence — memory, planning, routing,
agent execution — belongs to ICE itself.

## Documentation

The full design of this project is documented before any code was written.
Read in order:

1. `docs/architecture/01-prd.md` — Product Requirement Document
2. `docs/architecture/02-system-architecture.md` — System Architecture & Software Design
3. `docs/architecture/03-database-auth.md` — Database Design & Authentication Strategy

Every non-trivial decision has a recorded reason in `docs/adr/`.

## Repository Structure

```
apps/
  backend/      Fastify + TypeScript API server
  mobile/       Flutter Android app (Phase 2)
  desktop/      Flutter Windows app (future)
  cli/          CLI client (future)

packages/
  core/         ICE Core — framework-independent. No dependency on Fastify,
                Flutter, or Supabase. This is the actual product.
  types/        Shared TypeScript domain types (Core <-> Backend <-> SDK)
  config/       Schema-validated environment configuration
  sdk/          Typed client SDK (Phase 2)
  ui/           Shared Flutter design system (Phase 2)

docs/           Architecture documentation and ADRs
```

## Getting Started

```bash
pnpm install
cp .env.example .env      # fill in Supabase + provider keys
pnpm --filter @ice/backend prisma:generate
pnpm dev
```

The backend starts on `http://localhost:3000`. Check `GET /health`.

## Core Architectural Rule

> ICE Core has no idea it's running inside Fastify, being called from
> Flutter, or storing data in Supabase.

Concretely enforced in this codebase:

- Only `packages/core/src/router/providers/**` imports a provider SDK or
  calls a provider's HTTP API directly.
- Only `packages/core`'s Memory module (and, once implemented, its
  Prisma-backed repository) touches persistence.
- `apps/backend` contains no business logic — controllers authenticate,
  validate, call one `Brain` method, and serialize the result.

See `docs/architecture/02-system-architecture.md`, Section 4, for the full
dependency rules and why they matter.

## Status

**Phase 1 (this commit):** Monorepo foundation, `packages/config`,
`packages/types`, `packages/core` (all modules wired end-to-end with a real
in-memory Memory implementation and a real Anthropic + Ollama provider
adapter), `apps/backend` (Fastify server with auth, health check, and a
working `/v1/chat` endpoint), Prisma schema.

**Not yet built:** Flutter app, `packages/sdk`, `packages/ui`, production
Postgres-backed Memory repository, full test suite, Docker/deploy configs.
