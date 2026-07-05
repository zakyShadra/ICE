# @ice/core

ICE Core — Brain, Planner, Memory, AI Router, Agent, Executor, Observer,
Tools, Workflow Engine, Context Builder, Prompt Builder, Permission Manager.

**This package has zero dependency on Fastify, Flutter, Supabase, or any
provider SDK** (with one narrow, intentional exception: provider *adapters*
under `src/router/providers/` call provider HTTP APIs directly — that's the
one place in the entire codebase allowed to do so).

## Module Map

| Module | File | Responsibility |
|---|---|---|
| Brain | `src/brain/brain.ts` | Orchestrates a single user turn |
| Planner | `src/planner/planner.ts` | Decides chat vs. agent-task |
| Memory | `src/memory/` | Session/Long-Term/Project/Knowledge storage + retrieval |
| Context Builder | `src/context/context-builder.ts` | Assembles relevant context |
| Prompt Builder | `src/prompt/prompt-builder.ts` | Builds provider-neutral prompts |
| AI Router | `src/router/` | Selects + calls a provider, normalizes the response |
| Agent | `src/agent/agent.ts` | Owns multi-step task state |
| Workflow Engine | `src/agent/workflow-engine.ts` | Structural, inspectable plan state |
| Executor | `src/executor/executor.ts` | The only module that runs a tool side-effect |
| Permission Manager | `src/permission/permission-manager.ts` | Approves/denies actions |
| Tools | `src/tools/` | Registry of callable capabilities |
| Observer | `src/observer/observer.ts` | Non-blocking telemetry |

## Testing Philosophy

Every module depends on interfaces (`IMemory`, `IProviderAdapter`,
`RoutingStrategy`), never concrete implementations. Tests should construct
modules directly with hand-written fakes — never spin up Prisma or make a
real provider call from a test in this package.

## What's Real vs. What's Next

Every file in this package is a working implementation, not a stub — see
each file's header comment for what it does and why it's scoped the way it
is. What's intentionally simple for V1 (and why) is called out explicitly:

- `InMemoryMemoryRepository` — correct for dev/test; a Postgres-backed
  `IMemory` implementation is the next planned addition, swapped in at the
  DI composition root with no changes to any file that depends on `IMemory`.
- `Planner`'s agent-task detection is a small trigger-phrase heuristic — a
  model-assisted planner is future work per the PRD's roadmap, not a
  shortcut standing in for a "real" implementation.
- `WorkflowEngine` is in-memory only — deliberately, per Document 2, Section
  12.1, until real agent-task usage reveals what persistence it actually needs.
