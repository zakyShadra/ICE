# Contributing to ICE

## Before You Start

Read `docs/architecture/02-system-architecture.md`, Section 4 (Dependency
Rules) and Section 11 (Engineering Standards) before opening a PR that
touches `packages/core` or `apps/backend`. These aren't suggestions — they're
the boundaries that keep ICE Core replaceable and framework-independent.

## Workflow

1. Branch from `main`.
2. `pnpm install`
3. Make your change. If it touches `packages/core`, write or update tests
   using fakes from `packages/testing` (planned) rather than real Prisma or
   provider calls.
4. `pnpm lint && pnpm typecheck && pnpm test`
5. Commit using Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`,
   etc.) — enforced by commitlint on commit.
6. Open a PR. Any PR touching `packages/core` needs an explicit boundary
   review, not just a normal code-quality review — see Section 11.5 of the
   architecture doc.

## Adding a New Tool (Agent capability)

Any new entry in `packages/core/src/tools/tool-registry.ts` gets the
strictest review bar in the codebase — see Section 11.5. Specifically:

- Set `isDestructive: true` if the tool has any side effect that isn't
  trivially reversible.
- Never call a Memory or Router method from inside a tool's `execute` —
  tools are deliberately dumb and stateless (Document 2, Section 3.1).

## Adding a New AI Provider

Implement `IProviderAdapter` in `packages/core/src/router/providers/`, add
it to the composition root in `apps/backend/src/di/container.ts`. Nothing
else should need to change — if it does, that's a signal the Router's
interface boundary has a leak worth fixing first.
