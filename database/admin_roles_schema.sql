-- AFFILIA admin roles schema
-- Prerequisite: run `database/admin-schema.sql` first.
-- This file isolates admin RBAC from the main application schema.

BEGIN;

SET search_path = public;

CREATE TABLE IF NOT EXISTS public.admin_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.admin_permissions (
  code text PRIMARY KEY,
  name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.admin_role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL REFERENCES public.admin_roles(id) ON DELETE CASCADE,
  permission_code text NOT NULL REFERENCES public.admin_permissions(code) ON DELETE CASCADE,
  UNIQUE (role_id, permission_code)
);

CREATE TABLE IF NOT EXISTS public.admin_user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL REFERENCES public.admin_users(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES public.admin_roles(id) ON DELETE CASCADE,
  UNIQUE (admin_user_id, role_id)
);

INSERT INTO public.admin_permissions (code, name, description)
VALUES
  ('dashboard.view', 'View dashboard', 'Access platform overview and operational metrics.'),
  ('merchant.verify', 'Verify merchants', 'Review and approve merchant verification requests.'),
  ('deposit.approve', 'Approve deposits', 'Review OCR deposit requests and release escrow credit.'),
  ('payout.manage', 'Manage payouts', 'Preview and process payout sweep batches.'),
  ('user.manage', 'Manage users', 'View and manage merchant and affiliate records.'),
  ('product.review', 'Review products', 'Approve or reject merchant product listings.'),
  ('forum.moderate', 'Moderate community', 'Moderate forum posts, comments, and discussions.'),
  ('academy.manage', 'Manage academy', 'Manage tutors, academy content, and live sessions.'),
  ('audit.view', 'View audit log', 'Read platform audit activity.'),
  ('broadcast.manage', 'Manage broadcasts', 'Create and manage system broadcasts.'),
  ('admin.manage', 'Manage admins', 'Provision and assign admin access roles.')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.admin_roles (code, name, description)
VALUES
  ('super_admin', 'Super Admin', 'Full administrative access across the platform.'),
  ('operations_admin', 'Operations Admin', 'Merchant verification, user review, and product moderation.'),
  ('finance_admin', 'Finance Admin', 'Deposit approvals, payouts, and finance-sensitive operations.'),
  ('community_admin', 'Community Admin', 'Forum moderation, academy oversight, and broadcasts.')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.admin_role_permissions (role_id, permission_code)
SELECT r.id, p.code
FROM public.admin_roles r
JOIN public.admin_permissions p
  ON (
    (r.code = 'super_admin')
    OR (r.code = 'operations_admin' AND p.code IN ('dashboard.view', 'merchant.verify', 'user.manage', 'product.review', 'audit.view'))
    OR (r.code = 'finance_admin' AND p.code IN ('dashboard.view', 'deposit.approve', 'payout.manage', 'audit.view'))
    OR (r.code = 'community_admin' AND p.code IN ('dashboard.view', 'forum.moderate', 'academy.manage', 'broadcast.manage', 'audit.view'))
  )
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.admin_has_permission(uid uuid, permission_key text)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_users au
    WHERE au.user_id = uid
      AND au.status = 'active'
      AND au.is_super_admin = true
  )
  OR EXISTS (
    SELECT 1
    FROM public.admin_users au
    JOIN public.admin_user_roles aur ON aur.admin_user_id = au.id
    JOIN public.admin_role_permissions arp ON arp.role_id = aur.role_id
    WHERE au.user_id = uid
      AND au.status = 'active'
      AND arp.permission_code = permission_key
  );
$$;

GRANT EXECUTE ON FUNCTION public.admin_has_permission(uuid, text) TO authenticated, service_role;

ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_roles_admin_only ON public.admin_roles;
CREATE POLICY admin_roles_admin_only
ON public.admin_roles
FOR SELECT
USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS admin_permissions_admin_only ON public.admin_permissions;
CREATE POLICY admin_permissions_admin_only
ON public.admin_permissions
FOR SELECT
USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS admin_role_permissions_admin_only ON public.admin_role_permissions;
CREATE POLICY admin_role_permissions_admin_only
ON public.admin_role_permissions
FOR SELECT
USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS admin_user_roles_admin_only ON public.admin_user_roles;
CREATE POLICY admin_user_roles_admin_only
ON public.admin_user_roles
FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_roles TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_permissions TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_role_permissions TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_user_roles TO authenticated, service_role;

COMMIT;
