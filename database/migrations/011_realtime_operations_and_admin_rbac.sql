BEGIN;

SET search_path = public;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS media jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS moderation_status text NOT NULL DEFAULT 'pending' CHECK (moderation_status IN ('pending', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS moderation_notes text,
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rejected_at timestamptz;

UPDATE public.products
SET moderation_status = CASE WHEN is_active THEN 'approved' ELSE 'pending' END,
    submitted_at = COALESCE(submitted_at, created_at, NOW())
WHERE moderation_status IS NULL OR submitted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_products_moderation_status ON public.products(moderation_status, created_at DESC);

DROP POLICY IF EXISTS products_select_active_or_owner ON public.products;
CREATE POLICY products_select_active_or_owner
ON public.products
FOR SELECT
USING (
  (is_active = TRUE AND moderation_status = 'approved')
  OR merchant_id = auth.uid()
  OR public.is_admin(auth.uid())
);

CREATE TABLE IF NOT EXISTS public.forum_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.forum_posts(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'approved' CHECK (status IN ('approved', 'hidden')),
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_forum_comments_post_created_at ON public.forum_comments(post_id, created_at DESC);

DROP TRIGGER IF EXISTS trg_forum_comments_updated_at ON public.forum_comments;
CREATE TRIGGER trg_forum_comments_updated_at
BEFORE UPDATE ON public.forum_comments
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.forum_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS forum_comments_select_auth ON public.forum_comments;
CREATE POLICY forum_comments_select_auth
ON public.forum_comments
FOR SELECT
USING (
  status = 'approved'
  OR author_id = auth.uid()
  OR public.is_admin(auth.uid())
);

DROP POLICY IF EXISTS forum_comments_insert_auth ON public.forum_comments;
CREATE POLICY forum_comments_insert_auth
ON public.forum_comments
FOR INSERT
WITH CHECK (auth.role() = 'authenticated' AND author_id = auth.uid());

DROP POLICY IF EXISTS forum_comments_update_admin ON public.forum_comments;
CREATE POLICY forum_comments_update_admin
ON public.forum_comments
FOR UPDATE
USING (public.is_admin(auth.uid()) OR author_id = auth.uid())
WITH CHECK (public.is_admin(auth.uid()) OR author_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.chat_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject text,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.chat_thread_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT NOW(),
  UNIQUE(thread_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body text NOT NULL,
  media_url text,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  read_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_chat_thread_members_user ON public.chat_thread_members(user_id, joined_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_thread_created_at ON public.chat_messages(thread_id, created_at DESC);

DROP TRIGGER IF EXISTS trg_chat_threads_updated_at ON public.chat_threads;
CREATE TRIGGER trg_chat_threads_updated_at
BEFORE UPDATE ON public.chat_threads
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_chat_thread()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.chat_thread_members (thread_id, user_id)
  VALUES (NEW.id, NEW.created_by)
  ON CONFLICT (thread_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_chat_threads_membership ON public.chat_threads;
CREATE TRIGGER trg_chat_threads_membership
AFTER INSERT ON public.chat_threads
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_chat_thread();

CREATE OR REPLACE FUNCTION public.chat_user_in_thread(target_thread_id uuid, target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.chat_thread_members m
    WHERE m.thread_id = target_thread_id
      AND m.user_id = target_user_id
  );
$$;

GRANT EXECUTE ON FUNCTION public.chat_user_in_thread(uuid, uuid) TO authenticated, service_role;

ALTER TABLE public.chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_thread_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS chat_threads_select_member ON public.chat_threads;
CREATE POLICY chat_threads_select_member
ON public.chat_threads
FOR SELECT
USING (
  public.is_admin(auth.uid())
  OR created_by = auth.uid()
  OR public.chat_user_in_thread(id, auth.uid())
);

DROP POLICY IF EXISTS chat_threads_insert_owner ON public.chat_threads;
CREATE POLICY chat_threads_insert_owner
ON public.chat_threads
FOR INSERT
WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS chat_thread_members_select_member ON public.chat_thread_members;
CREATE POLICY chat_thread_members_select_member
ON public.chat_thread_members
FOR SELECT
USING (
  public.is_admin(auth.uid())
  OR user_id = auth.uid()
  OR public.chat_user_in_thread(thread_id, auth.uid())
);

DROP POLICY IF EXISTS chat_thread_members_insert_thread_owner ON public.chat_thread_members;
CREATE POLICY chat_thread_members_insert_thread_owner
ON public.chat_thread_members
FOR INSERT
WITH CHECK (
  public.is_admin(auth.uid())
  OR user_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.chat_threads t
    WHERE t.id = thread_id
      AND t.created_by = auth.uid()
  )
);

DROP POLICY IF EXISTS chat_messages_select_member ON public.chat_messages;
CREATE POLICY chat_messages_select_member
ON public.chat_messages
FOR SELECT
USING (
  public.is_admin(auth.uid())
  OR public.chat_user_in_thread(thread_id, auth.uid())
);

DROP POLICY IF EXISTS chat_messages_insert_member ON public.chat_messages;
CREATE POLICY chat_messages_insert_member
ON public.chat_messages
FOR INSERT
WITH CHECK (
  sender_id = auth.uid()
  AND public.chat_user_in_thread(thread_id, auth.uid())
);

DROP POLICY IF EXISTS chat_messages_update_sender_or_admin ON public.chat_messages;
CREATE POLICY chat_messages_update_sender_or_admin
ON public.chat_messages
FOR UPDATE
USING (sender_id = auth.uid() OR public.is_admin(auth.uid()))
WITH CHECK (sender_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.admin_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.admin_permissions (
  code text PRIMARY KEY,
  name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.admin_role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL REFERENCES public.admin_roles(id) ON DELETE CASCADE,
  permission_code text NOT NULL REFERENCES public.admin_permissions(code) ON DELETE CASCADE,
  UNIQUE(role_id, permission_code)
);

CREATE TABLE IF NOT EXISTS public.admin_user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL REFERENCES public.admin_users(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES public.admin_roles(id) ON DELETE CASCADE,
  UNIQUE(admin_user_id, role_id)
);

INSERT INTO public.admin_permissions (code, name, description)
VALUES
  ('dashboard.view', 'View dashboard', 'Access platform overview metrics.'),
  ('merchant.verify', 'Verify merchants', 'Approve and review merchant verification requests.'),
  ('deposit.approve', 'Approve deposits', 'Review OCR deposit requests and approve them.'),
  ('payout.manage', 'Manage payouts', 'Run payout sweeps and approve payout operations.'),
  ('user.manage', 'Manage users', 'View and manage platform users.'),
  ('product.review', 'Review products', 'Approve or reject merchant product listings.'),
  ('forum.moderate', 'Moderate community', 'Moderate forum posts and comments.'),
  ('academy.manage', 'Manage academy', 'Manage tutors, academy content, and sessions.'),
  ('audit.view', 'View audit log', 'Access admin audit history.'),
  ('broadcast.manage', 'Manage broadcasts', 'Send and manage platform-wide broadcasts.'),
  ('admin.manage', 'Manage admins', 'Assign admin roles and configure access.')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.admin_roles (code, name, description)
VALUES
  ('super_admin', 'Super Admin', 'Full administrative access across the platform.'),
  ('finance_admin', 'Finance Admin', 'Handles deposits, payouts, receipts, and money movement.'),
  ('operations_admin', 'Operations Admin', 'Handles merchant verifications, products, and user operations.'),
  ('community_admin', 'Community Admin', 'Handles forum, academy, and platform broadcasts.')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.admin_role_permissions (role_id, permission_code)
SELECT r.id, p.code
FROM public.admin_roles r
JOIN public.admin_permissions p ON (
  r.code = 'super_admin'
  OR (r.code = 'finance_admin' AND p.code IN ('dashboard.view', 'deposit.approve', 'payout.manage', 'audit.view'))
  OR (r.code = 'operations_admin' AND p.code IN ('dashboard.view', 'merchant.verify', 'user.manage', 'product.review', 'audit.view'))
  OR (r.code = 'community_admin' AND p.code IN ('dashboard.view', 'forum.moderate', 'academy.manage', 'broadcast.manage', 'audit.view'))
)
ON CONFLICT (role_id, permission_code) DO NOTHING;

CREATE OR REPLACE FUNCTION public.admin_has_permission(uid uuid, requested_permission text)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT CASE
    WHEN NOT public.is_admin(uid) THEN FALSE
    WHEN NOT EXISTS (
      SELECT 1
      FROM public.admin_user_roles aur
      JOIN public.admin_users au ON au.id = aur.admin_user_id
      WHERE au.user_id = uid
        AND au.status = 'active'
    ) THEN TRUE
    ELSE EXISTS (
      SELECT 1
      FROM public.admin_user_roles aur
      JOIN public.admin_users au ON au.id = aur.admin_user_id
      JOIN public.admin_role_permissions arp ON arp.role_id = aur.role_id
      WHERE au.user_id = uid
        AND au.status = 'active'
        AND arp.permission_code = requested_permission
    )
  END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_has_permission(uuid, text) TO authenticated, service_role;

ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_roles_admin_only ON public.admin_roles;
CREATE POLICY admin_roles_admin_only ON public.admin_roles
FOR ALL USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS admin_permissions_admin_only ON public.admin_permissions;
CREATE POLICY admin_permissions_admin_only ON public.admin_permissions
FOR SELECT USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS admin_role_permissions_admin_only ON public.admin_role_permissions;
CREATE POLICY admin_role_permissions_admin_only ON public.admin_role_permissions
FOR ALL USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS admin_user_roles_admin_only ON public.admin_user_roles;
CREATE POLICY admin_user_roles_admin_only ON public.admin_user_roles
FOR ALL USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.forum_comments TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_threads TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_thread_members TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_messages TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_roles TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_permissions TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_role_permissions TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_user_roles TO authenticated, service_role;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.forum_posts;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.forum_comments;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_threads;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_thread_members;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

COMMIT;
