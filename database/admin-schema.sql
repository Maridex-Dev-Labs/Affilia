-- AFFILIA admin schema
-- Run after the base application schema.
-- Admin accounts are created manually in Supabase Auth, then allowlisted here.

BEGIN;

SET search_path = public;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL UNIQUE,
  full_name text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'revoked')),
  is_super_admin boolean NOT NULL DEFAULT FALSE,
  requires_totp boolean NOT NULL DEFAULT TRUE,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  provisioned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.admin_ip_whitelist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL REFERENCES public.admin_users(id) ON DELETE CASCADE,
  ip_address inet NOT NULL,
  label text,
  is_active boolean NOT NULL DEFAULT TRUE,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  UNIQUE (admin_user_id, ip_address)
);

CREATE TABLE IF NOT EXISTS public.admin_access_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid REFERENCES public.admin_users(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type text NOT NULL CHECK (event_type IN ('login', 'logout', '2fa_verified', 'access_denied', 'ip_denied')),
  ip_address inet,
  user_agent text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_users_status ON public.admin_users(status);
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON public.admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_ip_whitelist_lookup ON public.admin_ip_whitelist(admin_user_id, is_active, ip_address);
CREATE INDEX IF NOT EXISTS idx_admin_access_log_user_created_at ON public.admin_access_log(user_id, created_at DESC);

DROP TRIGGER IF EXISTS trg_admin_users_updated_at ON public.admin_users;
CREATE TRIGGER trg_admin_users_updated_at
BEFORE UPDATE ON public.admin_users
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.is_admin(uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_users au
    WHERE au.user_id = uid
      AND au.status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.current_admin_record()
RETURNS public.admin_users
LANGUAGE sql
STABLE
AS $$
  SELECT au.*
  FROM public.admin_users au
  WHERE au.user_id = auth.uid()
    AND au.status = 'active'
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_admin_ip_allowed(uid uuid, ip inet)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT CASE
    WHEN ip IS NULL THEN FALSE
    WHEN NOT EXISTS (
      SELECT 1
      FROM public.admin_ip_whitelist w
      JOIN public.admin_users au ON au.id = w.admin_user_id
      WHERE au.user_id = uid
        AND au.status = 'active'
        AND w.is_active = TRUE
    ) THEN TRUE
    ELSE EXISTS (
      SELECT 1
      FROM public.admin_ip_whitelist w
      JOIN public.admin_users au ON au.id = w.admin_user_id
      WHERE au.user_id = uid
        AND au.status = 'active'
        AND w.is_active = TRUE
        AND w.ip_address = ip
    )
  END;
$$;

GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_admin_record() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_admin_ip_allowed(uuid, inet) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.current_session_meets_admin_aal()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT CASE
    WHEN EXISTS (
      SELECT 1
      FROM public.admin_users au
      WHERE au.user_id = auth.uid()
        AND au.status = 'active'
        AND au.requires_totp = TRUE
    ) THEN COALESCE((SELECT auth.jwt()->>'aal'), 'aal1') = 'aal2'
    ELSE TRUE
  END;
$$;

GRANT EXECUTE ON FUNCTION public.current_session_meets_admin_aal() TO authenticated, service_role;

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_ip_whitelist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_access_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_users_self_or_admin_select ON public.admin_users;
CREATE POLICY admin_users_self_or_admin_select
ON public.admin_users
FOR SELECT
USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS admin_users_admin_insert ON public.admin_users;
CREATE POLICY admin_users_admin_insert
ON public.admin_users
FOR INSERT
WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS admin_users_admin_update ON public.admin_users;
CREATE POLICY admin_users_admin_update
ON public.admin_users
FOR UPDATE
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS admin_ip_whitelist_admin_only ON public.admin_ip_whitelist;
CREATE POLICY admin_ip_whitelist_admin_only
ON public.admin_ip_whitelist
FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS admin_access_log_self_or_admin_select ON public.admin_access_log;
CREATE POLICY admin_access_log_self_or_admin_select
ON public.admin_access_log
FOR SELECT
USING (
  user_id = auth.uid()
  OR public.is_admin(auth.uid())
);

DROP POLICY IF EXISTS admin_access_log_self_insert ON public.admin_access_log;
CREATE POLICY admin_access_log_self_insert
ON public.admin_access_log
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  OR public.is_admin(auth.uid())
);

GRANT SELECT, INSERT, UPDATE ON public.admin_users TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_ip_whitelist TO authenticated, service_role;
GRANT SELECT, INSERT ON public.admin_access_log TO authenticated, service_role;

DROP POLICY IF EXISTS mfa_required_for_admin_sessions ON public.admin_ip_whitelist;
CREATE POLICY mfa_required_for_admin_sessions
ON public.admin_ip_whitelist
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (public.current_session_meets_admin_aal())
WITH CHECK (public.current_session_meets_admin_aal());

DROP POLICY IF EXISTS mfa_required_for_admin_sessions ON public.admin_access_log;
CREATE POLICY mfa_required_for_admin_sessions
ON public.admin_access_log
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (public.current_session_meets_admin_aal())
WITH CHECK (public.current_session_meets_admin_aal());

-- Manual admin bootstrap example:
-- 1. Create the admin in Supabase Auth dashboard.
-- 2. Insert the matching auth.users id here:
-- INSERT INTO public.admin_users (user_id, email, full_name, is_super_admin)
-- VALUES ('<auth-user-uuid>', 'admin@example.com', 'Super Admin', TRUE);

COMMIT;
