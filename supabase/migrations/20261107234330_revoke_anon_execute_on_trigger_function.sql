-- The SECURITY DEFINER trigger function handle_new_profile_target() is invoked
-- by its trigger on public.profiles, not over the REST RPC API. Close the
-- remaining anon execute path the advisor still flags (FROM PUBLIC already
-- done in the prior migration; revoke the anon role explicitly here).
-- Triggers run with the function's own privileges regardless of caller
-- EXECUTE grants, so this does not affect the profile -> tracked_targets
-- upsert behavior.
REVOKE EXECUTE ON FUNCTION public.handle_new_profile_target() FROM anon;