BEGIN;

SET search_path = public;

CREATE OR REPLACE FUNCTION public.current_session_meets_admin_aal()
RETURNS boolean
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  requires_totp boolean := FALSE;
BEGIN
  IF to_regclass('public.admin_users') IS NULL THEN
    RETURN TRUE;
  END IF;

  EXECUTE $sql$
    SELECT EXISTS (
      SELECT 1
      FROM public.admin_users au
      WHERE au.user_id = auth.uid()
        AND au.status = 'active'
        AND au.requires_totp = TRUE
    )
  $sql$
  INTO requires_totp;

  IF NOT requires_totp THEN
    RETURN TRUE;
  END IF;

  RETURN COALESCE((SELECT auth.jwt()->>'aal'), 'aal1') = 'aal2';
END;
$$;

GRANT EXECUTE ON FUNCTION public.current_session_meets_admin_aal() TO authenticated, service_role;

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'admin_ip_whitelist',
    'admin_access_log',
    'admin_roles',
    'admin_permissions',
    'admin_role_permissions',
    'admin_user_roles',
    'backend_outage_events',
    'merchant_escrow',
    'products',
    'affiliate_links',
    'click_events',
    'conversions',
    'achievements',
    'user_achievements',
    'admin_audit_log',
    'official_receipts',
    'deposit_requests',
    'payouts',
    'sweep_batches',
    'forum_posts',
    'broadcasts',
    'legal_agreements',
    'legal_agreement_events',
    'profile_plan_selections',
    'academy_tutor_profiles',
    'academy_memberships',
    'academy_sessions',
    'academy_session_attendees',
    'academy_posts'
  ]
  LOOP
    IF to_regclass(format('public.%I', table_name)) IS NULL THEN
      CONTINUE;
    END IF;

    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('DROP POLICY IF EXISTS mfa_required_for_admin_sessions ON public.%I', table_name);
    EXECUTE format(
      'CREATE POLICY mfa_required_for_admin_sessions ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (public.current_session_meets_admin_aal()) WITH CHECK (public.current_session_meets_admin_aal())',
      table_name
    );
  END LOOP;
END;
$$;

COMMIT;
