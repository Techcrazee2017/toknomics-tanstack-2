-- ============================================================================
-- TokNomics — Euler Stream OAuth token storage
-- Stores per-user Euler Stream OAuth access/refresh tokens so the app can
-- pull live gift data on the user's behalf. Identity stays email/password
-- (Cloud auth); TikTok is only a data authorization, not the sign-in.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.tiktok_oauth_tokens (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    access_token    TEXT NOT NULL,
    refresh_token   TEXT NOT NULL,
    token_type      TEXT NOT NULL DEFAULT 'Bearer',
    expires_at      TIMESTAMPTZ NOT NULL,
    refresh_expires_at TIMESTAMPTZ NOT NULL,
    scopes          TEXT[] NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.tiktok_oauth_tokens IS 'Per-user Euler Stream OAuth tokens for TikTok LIVE data access. Owned by the authenticated user.';

-- Index for fast per-user lookups
CREATE INDEX IF NOT EXISTS idx_tiktok_tokens_user_id
    ON public.tiktok_oauth_tokens (user_id);

-- ============================================================================
-- Row Level Security — only the owner can read/modify their tokens
-- ============================================================================
ALTER TABLE public.tiktok_oauth_tokens ENABLE ROW LEVEL SECURITY;

-- Users can read only their own tokens
CREATE POLICY "tiktok_tokens_select_own"
    ON public.tiktok_oauth_tokens
    FOR SELECT
    TO authenticated
    USING (user_id = (select auth.uid()));

-- Users can insert only their own tokens
CREATE POLICY "tiktok_tokens_insert_own"
    ON public.tiktok_oauth_tokens
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = (select auth.uid()));

-- Users can update only their own tokens (e.g. token refresh)
CREATE POLICY "tiktok_tokens_update_own"
    ON public.tiktok_oauth_tokens
    FOR UPDATE
    TO authenticated
    USING (user_id = (select auth.uid()))
    WITH CHECK (user_id = (select auth.uid()));

-- Users can delete only their own tokens (disconnect TikTok)
CREATE POLICY "tiktok_tokens_delete_own"
    ON public.tiktok_oauth_tokens
    FOR DELETE
    TO authenticated
    USING (user_id = (select auth.uid()));

-- ============================================================================
-- Grants
-- ============================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tiktok_oauth_tokens TO authenticated;
GRANT ALL ON public.tiktok_oauth_tokens TO service_role;