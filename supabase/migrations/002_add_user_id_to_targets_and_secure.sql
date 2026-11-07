-- ============================================================================
-- TokNomics — Migration 002: Add user_id to tracked_targets & secure DELETE
-- Incremental security update on top of 001_init.sql baseline
-- ============================================================================

-- ============================================================================
-- 1. ADD user_id COLUMN (if not already present)
-- ============================================================================
-- Tracks ownership of each tracked target so RLS can enforce per-user deletes.
-- ON DELETE SET NULL: if a user account is deleted, their targets become orphaned
-- rather than cascading a delete (preserves historical monitoring data).
ALTER TABLE public.tracked_targets
    ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Backfill: mark existing registered-user targets with the profile owner's id
-- (only for rows where is_registered_user = true and user_id is still null)
UPDATE public.tracked_targets t
SET user_id = p.id
FROM public.profiles p
WHERE t.is_registered_user = true
  AND t.unique_id = p.unique_id
  AND t.user_id IS NULL;

-- ============================================================================
-- 2. INDEX for ownership-based queries
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_targets_user_id
    ON public.tracked_targets (user_id);

-- ============================================================================
-- 3. TIGHTEN RLS POLICIES
-- ============================================================================

-- --- INSERT: enforce that user_id matches the authenticated user ---
-- Drop the old permissive insert policy
DROP POLICY IF EXISTS "targets_insert_authenticated" ON public.tracked_targets;

CREATE POLICY "targets_insert_authenticated"
    ON public.tracked_targets
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- --- UPDATE: users can update only their own tracked targets ---
DROP POLICY IF EXISTS "targets_update_own" ON public.tracked_targets;

CREATE POLICY "targets_update_own"
    ON public.tracked_targets
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- --- DELETE: users can delete only their own tracked targets ---
-- Drop the old permissive delete policy
DROP POLICY IF EXISTS "targets_delete_authenticated" ON public.tracked_targets;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.tracked_targets;

CREATE POLICY "Users can delete their own tracked targets"
    ON public.tracked_targets
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- NOTE: The service role (worker) bypasses RLS entirely, so it retains full
-- access to all rows regardless of these policies.
