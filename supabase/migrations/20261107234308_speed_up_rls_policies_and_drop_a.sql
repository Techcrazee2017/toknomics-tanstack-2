-- ============================================================================
-- TokNomics — Performance optimization
-- 1. Drop redundant idx_targets_unique_id (duplicates the UNIQUE constraint
--    backing index tracked_targets_unique_id_key on the same column).
-- 2. Wrap auth.uid() in (SELECT ...) in ownership RLS policies so the planner
--    caches the value per statement instead of re-evaluating it per row.
-- 3. Revoke direct EXECUTE on the SECURITY DEFINER trigger function from
--    anon/authenticated so it cannot be invoked over the REST API; it is
--    still called by its trigger on public.profiles.
-- ============================================================================

DROP INDEX IF EXISTS public.idx_targets_unique_id;

-- --- profiles: insert own ---
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own"
    ON public.profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (id = (select auth.uid()));

-- --- profiles: update own ---
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (id = (select auth.uid()))
    WITH CHECK (id = (select auth.uid()));

-- --- tracked_targets: insert (ownership) ---
DROP POLICY IF EXISTS "targets_insert_authenticated" ON public.tracked_targets;
CREATE POLICY "targets_insert_authenticated"
    ON public.tracked_targets
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = (select auth.uid()));

-- --- tracked_targets: update own ---
DROP POLICY IF EXISTS "targets_update_own" ON public.tracked_targets;
CREATE POLICY "targets_update_own"
    ON public.tracked_targets
    FOR UPDATE
    TO authenticated
    USING (user_id = (select auth.uid()))
    WITH CHECK (user_id = (select auth.uid()));

-- --- tracked_targets: delete own ---
DROP POLICY IF EXISTS "Users can delete their own tracked targets" ON public.tracked_targets;
CREATE POLICY "Users can delete their own tracked targets"
    ON public.tracked_targets
    FOR DELETE
    TO authenticated
    USING ((select auth.uid()) = user_id);

-- --- Harden trigger function: not an RPC, so close public execute access ---
REVOKE EXECUTE ON FUNCTION public.handle_new_profile_target() FROM PUBLIC, authenticated;