-- ICE — Initial migration
--
-- NOTE ON PROVENANCE: this file is hand-authored to match
-- schema.prisma exactly, because generating it properly requires
-- `prisma migrate dev` against a live Postgres connection, which this
-- development environment does not have (no network access). Before
-- relying on this in a real environment, run:
--
--   pnpm --filter @ice/backend prisma migrate dev --name init
--
-- against a real Supabase/Postgres instance and let Prisma verify (and
-- if needed, regenerate) this file from the schema directly — treat
-- this SQL as a correct-by-construction starting point, not a
-- substitute for that verification step.

-- Required for KnowledgeChunk.embedding (Document 3, Section 1.2's
-- pgvector decision).
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE "user_profiles" (
    "id" UUID NOT NULL,
    "display_name" TEXT,
    "onboarded_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "user_settings" (
    "user_id" UUID NOT NULL,
    "enabled_providers" TEXT[],
    "default_routing_mode" TEXT NOT NULL DEFAULT 'auto',
    "memory_visibility_opt_in" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "user_settings_pkey" PRIMARY KEY ("user_id")
);

CREATE TABLE "sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "title" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "session_id" UUID NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "provider_used" TEXT,
    "router_metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "memories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "project_id" UUID,
    "type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "relevance_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_accessed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),
    CONSTRAINT "memories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "projects" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "knowledge_documents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "source_uri" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "knowledge_documents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "knowledge_chunks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "document_id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "chunk_index" INTEGER NOT NULL,
    "embedding" vector(1536), -- added via raw SQL per schema.prisma's note; Prisma's pgvector column support is still evolving
    CONSTRAINT "knowledge_chunks_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "agent_tasks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "project_id" UUID,
    "goal" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'planning',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "agent_tasks_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "agent_steps" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "task_id" UUID NOT NULL,
    "step_index" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "tool_name" TEXT NOT NULL,
    "input" JSONB NOT NULL,
    "output" JSONB,
    "executed_at" TIMESTAMP(3),
    CONSTRAINT "agent_steps_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "provider_usage_log" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "task_type" TEXT NOT NULL,
    "tokens_in" INTEGER,
    "tokens_out" INTEGER,
    "cost_estimate" DOUBLE PRECISION,
    "latency_ms" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "provider_usage_log_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "audit_log" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "actor" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "file_assets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "project_id" UUID,
    "file_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "storage_path" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "file_assets_pkey" PRIMARY KEY ("id")
);

-- Indexes (Document 3, Section 3)
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");
CREATE INDEX "messages_session_id_created_at_idx" ON "messages"("session_id", "created_at");
CREATE INDEX "memories_user_id_type_idx" ON "memories"("user_id", "type");
CREATE INDEX "memories_user_id_project_id_idx" ON "memories"("user_id", "project_id");
CREATE INDEX "projects_user_id_idx" ON "projects"("user_id");
CREATE INDEX "knowledge_documents_project_id_idx" ON "knowledge_documents"("project_id");
CREATE INDEX "knowledge_chunks_document_id_idx" ON "knowledge_chunks"("document_id");
CREATE INDEX "agent_tasks_user_id_idx" ON "agent_tasks"("user_id");
CREATE INDEX "agent_steps_task_id_step_index_idx" ON "agent_steps"("task_id", "step_index");
CREATE INDEX "provider_usage_log_user_id_created_at_idx" ON "provider_usage_log"("user_id", "created_at");
CREATE INDEX "provider_usage_log_provider_created_at_idx" ON "provider_usage_log"("provider", "created_at");
CREATE INDEX "audit_log_user_id_created_at_idx" ON "audit_log"("user_id", "created_at");
CREATE INDEX "file_assets_user_id_idx" ON "file_assets"("user_id");
CREATE INDEX "file_assets_project_id_idx" ON "file_assets"("project_id");

-- pgvector ANN index — approximate nearest neighbor search is meaningless
-- without one at any real scale (Document 3, Section 3's CTO Note).
CREATE INDEX "knowledge_chunks_embedding_idx" ON "knowledge_chunks" USING ivfflat ("embedding" vector_cosine_ops);

-- Foreign keys
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "messages" ADD CONSTRAINT "messages_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "memories" ADD CONSTRAINT "memories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "memories" ADD CONSTRAINT "memories_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects" ADD CONSTRAINT "projects_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "knowledge_documents" ADD CONSTRAINT "knowledge_documents_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "knowledge_chunks" ADD CONSTRAINT "knowledge_chunks_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "knowledge_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "agent_tasks" ADD CONSTRAINT "agent_tasks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "agent_tasks" ADD CONSTRAINT "agent_tasks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "agent_steps" ADD CONSTRAINT "agent_steps_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "agent_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "provider_usage_log" ADD CONSTRAINT "provider_usage_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "file_assets" ADD CONSTRAINT "file_assets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "file_assets" ADD CONSTRAINT "file_assets_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Row-Level Security (Document 3, Section 4) — defense-in-depth behind
-- the Repository-layer access control every service above already enforces.
ALTER TABLE "user_profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "messages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "memories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "projects" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "knowledge_documents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "knowledge_chunks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "agent_tasks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "agent_steps" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "file_assets" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_row" ON "user_profiles" FOR ALL USING (auth.uid() = id);
CREATE POLICY "own_row" ON "user_settings" FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own_row" ON "sessions" FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own_row" ON "messages" FOR ALL USING (
  auth.uid() = (SELECT user_id FROM "sessions" WHERE "sessions".id = "messages".session_id)
);
CREATE POLICY "own_row" ON "memories" FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own_row" ON "projects" FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own_row" ON "knowledge_documents" FOR ALL USING (
  auth.uid() = (SELECT user_id FROM "projects" WHERE "projects".id = "knowledge_documents".project_id)
);
CREATE POLICY "own_row" ON "knowledge_chunks" FOR ALL USING (
  auth.uid() = (
    SELECT p.user_id FROM "projects" p
    JOIN "knowledge_documents" kd ON kd.project_id = p.id
    WHERE kd.id = "knowledge_chunks".document_id
  )
);
CREATE POLICY "own_row" ON "agent_tasks" FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own_row" ON "agent_steps" FOR ALL USING (
  auth.uid() = (SELECT user_id FROM "agent_tasks" WHERE "agent_tasks".id = "agent_steps".task_id)
);
CREATE POLICY "own_row" ON "file_assets" FOR ALL USING (auth.uid() = user_id);

-- provider_usage_log / audit_log: insert-only from the backend's
-- service role (which bypasses RLS entirely), select scoped to the
-- owning user (Document 3, Section 4.1).
ALTER TABLE "provider_usage_log" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_log" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_row_select" ON "provider_usage_log" FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own_row_select" ON "audit_log" FOR SELECT USING (auth.uid() = user_id);
