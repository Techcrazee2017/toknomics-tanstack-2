-- ============================================================================
-- TokNomics — Initial Schema Migration
-- TikTok Live Stream Gift Transaction Tracking
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. PROFILES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    tiktok_user_id  TEXT UNIQUE NOT NULL,
    unique_id       TEXT NOT NULL,
    display_name    TEXT,
    avatar_url      TEXT,
    created_at      TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE public.profiles IS 'TikTok user profiles linked to Supabase Auth accounts.';

-- ============================================================================
-- 2. TRACKED TARGETS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.tracked_targets (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unique_id           TEXT UNIQUE NOT NULL,
    is_registered_user  BOOLEAN DEFAULT false,
    is_live             BOOLEAN DEFAULT false,
    last_checked_at     TIMESTAMPTZ,
    created_at          TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE public.tracked_targets IS 'TikTok handles monitored by the WebSocket ingestion worker — includes registered users and arbitrary external targets.';

-- ============================================================================
-- 3. GIFT TRANSACTIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.gift_transactions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id             TEXT,
    sender_user_id      TEXT NOT NULL,
    sender_unique_id    TEXT NOT NULL,
    sender_avatar       TEXT,
    receiver_unique_id  TEXT NOT NULL,
    gift_id             TEXT NOT NULL,
    gift_name           TEXT NOT NULL,
    repeat_count        INTEGER DEFAULT 1 NOT NULL,
    diamond_cost        INTEGER DEFAULT 0 NOT NULL,
    created_at          TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE public.gift_transactions IS 'Gift events captured from TikTok live streams via the Euler Stream WebSocket API.';

-- ============================================================================
-- 4. INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_gifts_sender_created
    ON public.gift_transactions (sender_unique_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_gifts_receiver_created
    ON public.gift_transactions (receiver_unique_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_targets_unique_id
    ON public.tracked_targets (unique_id);

-- ============================================================================
-- 5. ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE public.profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracked_targets    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_transactions  ENABLE ROW LEVEL SECURITY;

-- --- Profiles policies ---
-- Authenticated users can read all profiles (needed for leaderboards)
CREATE POLICY "profiles_select_authenticated"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (true);

-- Users can insert/update only their own profile
CREATE POLICY "profiles_insert_own"
    ON public.profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update_own"
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- --- Tracked targets policies ---
-- Authenticated users can read all tracked targets (status list)
CREATE POLICY "targets_select_authenticated"
    ON public.tracked_targets
    FOR SELECT
    TO authenticated
    USING (true);

-- Authenticated users can insert arbitrary handles into tracked_targets
CREATE POLICY "targets_insert_authenticated"
    ON public.tracked_targets
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Authenticated users can delete tracked targets
CREATE POLICY "targets_delete_authenticated"
    ON public.tracked_targets
    FOR DELETE
    TO authenticated
    USING (true);

-- --- Gift transactions policies ---
-- Authenticated users can read all gift transactions (feeds + leaderboards)
CREATE POLICY "gifts_select_authenticated"
    ON public.gift_transactions
    FOR SELECT
    TO authenticated
    USING (true);

-- Only the service role (worker) can insert gift transactions
-- No INSERT policy for authenticated → service role bypasses RLS
-- (Service role key ignores RLS entirely)

-- ============================================================================
-- 6. TRIGGER — Auto-upsert tracked_targets on profile creation
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_profile_target()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- When a new user logs in and writes to profiles, automatically
    -- upsert their unique_id into tracked_targets with is_registered_user = true
    INSERT INTO public.tracked_targets (unique_id, is_registered_user)
    VALUES (NEW.unique_id, true)
    ON CONFLICT (unique_id)
    DO UPDATE SET is_registered_user = true;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_profile_to_target
    AFTER INSERT OR UPDATE OF unique_id ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_profile_target();

-- ============================================================================
-- 7. REALTIME — Enable realtime for gift_transactions
-- ============================================================================
ALTER TABLE public.gift_transactions REPLICA IDENTITY FULL;

-- Add table to the realtime publication (Supabase creates this by default)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'gift_transactions'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.gift_transactions;
    END IF;
END;
$$;
