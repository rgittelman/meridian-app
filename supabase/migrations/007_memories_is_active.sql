-- 007_memories_is_active.sql
-- Ensures memories.is_active column exists. Idempotent.
-- Needed because some deployments ran schema.sql before is_active was added.

ALTER TABLE memories ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
