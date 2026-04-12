-- Allowlist an existing Supabase Auth user as an AFFILIA admin.
-- Prerequisite:
-- 1. Run `database/admin-schema.sql`
-- 2. Create the auth user through Supabase Auth Admin API or Dashboard
--
-- This script does not create the email/password credential.
-- Supabase manages `auth.users`; direct SQL writes there are brittle across versions.

BEGIN;

DO $$
DECLARE
  admin_email constant text := 'maridexdevlabs@gmail.com';
  admin_full_name constant text := 'Maridex Dev Labs';
  target_user_id uuid;
BEGIN
  IF to_regclass('public.admin_users') IS NULL THEN
    RAISE EXCEPTION 'public.admin_users does not exist. Run database/admin-schema.sql first.';
  END IF;

  SELECT id
  INTO target_user_id
  FROM auth.users
  WHERE email = admin_email;

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION
      'Auth user % does not exist. Create it first via Supabase Auth or run scripts/create-admin-user.mjs locally.',
      admin_email;
  END IF;

  INSERT INTO public.profiles (id, full_name, avatar_url, role)
  VALUES (target_user_id, admin_full_name, null, null)
  ON CONFLICT (id) DO UPDATE
  SET
    full_name = excluded.full_name,
    account_origin = 'admin_provisioned',
    updated_at = now();

  INSERT INTO public.admin_users (user_id, email, full_name, is_super_admin, requires_totp, status)
  VALUES (target_user_id, admin_email, admin_full_name, true, false, 'active')
  ON CONFLICT (user_id) DO UPDATE
  SET
    email = excluded.email,
    full_name = excluded.full_name,
    is_super_admin = excluded.is_super_admin,
    requires_totp = excluded.requires_totp,
    status = excluded.status,
    updated_at = now();
END $$;

COMMIT;
