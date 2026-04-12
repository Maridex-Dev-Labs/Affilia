BEGIN;

SET search_path = public;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_password_changed_at timestamptz,
  ADD COLUMN IF NOT EXISTS managed_by_admin uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS account_origin text NOT NULL DEFAULT 'self_service';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_account_origin_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_account_origin_check
      CHECK (account_origin IN ('self_service', 'admin_provisioned'));
  END IF;
END $$;

ALTER TABLE public.admin_users
  ADD COLUMN IF NOT EXISTS is_super_admin boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS provisioned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.academy_tutor_profiles
  ADD COLUMN IF NOT EXISTS provisioned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'self_service';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'academy_tutor_profiles_source_check'
  ) THEN
    ALTER TABLE public.academy_tutor_profiles
      ADD CONSTRAINT academy_tutor_profiles_source_check
      CHECK (source IN ('self_service', 'admin_provisioned'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_password_flags ON public.profiles(must_change_password, account_origin);
CREATE INDEX IF NOT EXISTS idx_admin_users_super_admin ON public.admin_users(is_super_admin, status);

COMMIT;
