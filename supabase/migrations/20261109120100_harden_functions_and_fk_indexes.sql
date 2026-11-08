-- Follow-up to 20261109120000_rebuild_schema_new_project.sql, from the
-- Supabase security and performance advisors.

-- Functions that should not be callable through the REST API.
-- handle_new_user only runs as the auth.users trigger; update_daily_analytics
-- is not called by the app; get_current_user_role is only needed by signed-in
-- users' RLS checks. The super_admin_* functions stay callable by anon on
-- purpose: the super admin panel has no Supabase Auth session.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_daily_analytics() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_current_user_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_current_user_role() TO authenticated;

ALTER FUNCTION public.try_cast_double(text) SET search_path = public;

-- Indexes for foreign keys that had none.
CREATE INDEX IF NOT EXISTS idx_bills_created_by ON public.bills(created_by);
CREATE INDEX IF NOT EXISTS idx_dispatch_return_order_id ON public.dispatch_return_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_super_admin_sessions_user_id ON public.super_admin_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_transport_loaded_by ON public.transport(loaded_by);
