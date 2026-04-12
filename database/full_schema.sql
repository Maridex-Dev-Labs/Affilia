-- AFFILIA full Supabase schema
-- Authoritative bootstrap script for a fresh project.
-- Includes: extensions, tables, indexes, functions, triggers, grants, RLS, storage buckets, storage policies.

BEGIN;

SET search_path = public;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  avatar_url text,
  role text CHECK (role IN ('merchant', 'affiliate', 'admin')),
  phone_number text UNIQUE,
  business_name text,
  business_verified boolean NOT NULL DEFAULT FALSE,
  payout_phone text,
  mpesa_till text,
  niches text[] NOT NULL DEFAULT '{}',
  promotion_channels text[] NOT NULL DEFAULT '{}',
  documents jsonb NOT NULL DEFAULT '{}'::jsonb,
  store_description text,
  xp_points integer NOT NULL DEFAULT 0 CHECK (xp_points >= 0),
  level integer NOT NULL DEFAULT 1 CHECK (level >= 1),
  onboarding_complete boolean NOT NULL DEFAULT FALSE,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.merchant_escrow (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  balance_kes numeric(12,2) NOT NULL DEFAULT 0.00 CHECK (balance_kes >= 0),
  lifetime_deposits_kes numeric(12,2) NOT NULL DEFAULT 0.00 CHECK (lifetime_deposits_kes >= 0),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  price_kes numeric(10,2) NOT NULL CHECK (price_kes >= 0),
  commission_percent numeric(5,2) NOT NULL CHECK (commission_percent >= 0 AND commission_percent <= 100),
  commission_flat_kes numeric(10,2) GENERATED ALWAYS AS (price_kes * commission_percent / 100) STORED,
  images text[] NOT NULL DEFAULT '{}',
  category text,
  stock_status text NOT NULL DEFAULT 'in_stock' CHECK (stock_status IN ('in_stock', 'low_stock', 'out')),
  is_active boolean NOT NULL DEFAULT TRUE,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.affiliate_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  unique_code text NOT NULL UNIQUE,
  link_type text NOT NULL DEFAULT 'smart_link' CHECK (link_type IN ('smart_link', 'promo_code')),
  destination_url text NOT NULL,
  clicks integer NOT NULL DEFAULT 0 CHECK (clicks >= 0),
  conversions integer NOT NULL DEFAULT 0 CHECK (conversions >= 0),
  total_earned_kes numeric(12,2) NOT NULL DEFAULT 0.00 CHECK (total_earned_kes >= 0),
  created_at timestamptz NOT NULL DEFAULT NOW(),
  expires_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.click_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id uuid NOT NULL REFERENCES public.affiliate_links(id) ON DELETE CASCADE,
  visitor_ip text,
  user_agent text,
  referer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  geo_country text,
  geo_city text,
  clicked_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.conversions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  click_id uuid REFERENCES public.click_events(id) ON DELETE SET NULL,
  link_id uuid NOT NULL REFERENCES public.affiliate_links(id) ON DELETE CASCADE,
  affiliate_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  merchant_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  order_value_kes numeric(10,2) NOT NULL CHECK (order_value_kes >= 0),
  commission_earned_kes numeric(10,2) NOT NULL CHECK (commission_earned_kes >= 0),
  platform_fee_kes numeric(10,2) NOT NULL CHECK (platform_fee_kes >= 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
  merchant_approved boolean NOT NULL DEFAULT FALSE,
  approved_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  badge_icon text,
  xp_reward integer NOT NULL DEFAULT 0 CHECK (xp_reward >= 0),
  requirement_type text,
  requirement_value integer
);

CREATE TABLE IF NOT EXISTS public.user_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  achievement_id uuid NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  unlocked_at timestamptz NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, achievement_id)
);

CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  action_type text NOT NULL,
  target_type text,
  target_id uuid,
  previous_state jsonb,
  new_state jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.official_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_number text NOT NULL UNIQUE,
  receipt_type text NOT NULL CHECK (receipt_type IN ('deposit', 'payout', 'sweep_batch')),
  recipient_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount_kes numeric(12,2) NOT NULL CHECK (amount_kes >= 0),
  mpesa_reference text,
  pdf_url text,
  verification_hash text NOT NULL,
  generated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  generated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.deposit_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount_kes numeric(12,2) NOT NULL CHECK (amount_kes > 0),
  mpesa_code text,
  screenshot_url text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'flagged')),
  ocr_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  approved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount_kes numeric(12,2) NOT NULL CHECK (amount_kes > 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'paid', 'failed')),
  mpesa_reference text,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  paid_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.sweep_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  total_kes numeric(12,2) NOT NULL CHECK (total_kes >= 0),
  recipients integer NOT NULL DEFAULT 0 CHECK (recipients >= 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  created_at timestamptz NOT NULL DEFAULT NOW(),
  confirmed_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.forum_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'hidden')),
  created_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.broadcasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL,
  audience text NOT NULL DEFAULT 'all' CHECK (audience IN ('all', 'merchant', 'affiliate', 'admin')),
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.is_admin(uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = uid
      AND role = 'admin'
  );
$$;

CREATE INDEX IF NOT EXISTS idx_profiles_role_verified ON public.profiles(role, business_verified);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON public.profiles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_merchant_id ON public.products(merchant_id);
CREATE INDEX IF NOT EXISTS idx_products_active_category ON public.products(is_active, category);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON public.products(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_affiliate_links_affiliate_id ON public.affiliate_links(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_links_product_id ON public.affiliate_links(product_id);
CREATE INDEX IF NOT EXISTS idx_click_events_link_clicked_at ON public.click_events(link_id, clicked_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversions_affiliate_created_at ON public.conversions(affiliate_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversions_merchant_created_at ON public.conversions(merchant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversions_product_id ON public.conversions(product_id);
CREATE INDEX IF NOT EXISTS idx_receipts_recipient_generated_at ON public.official_receipts(recipient_id, generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_deposit_requests_merchant_status ON public.deposit_requests(merchant_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payouts_affiliate_status ON public.payouts(affiliate_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sweep_batches_created_at ON public.sweep_batches(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_forum_posts_status_created_at ON public.forum_posts(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_broadcasts_audience_created_at ON public.broadcasts(audience, created_at DESC);

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_merchant_escrow_updated_at ON public.merchant_escrow;
CREATE TRIGGER trg_merchant_escrow_updated_at
BEFORE UPDATE ON public.merchant_escrow
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_products_updated_at ON public.products;
CREATE TRIGGER trg_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    full_name,
    avatar_url
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    NEW.raw_user_meta_data ->> 'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.get_leaderboard(limit_count integer DEFAULT 50)
RETURNS TABLE (affiliate_id uuid, total numeric)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.affiliate_id,
    SUM(c.commission_earned_kes) AS total
  FROM public.conversions c
  GROUP BY c.affiliate_id
  ORDER BY total DESC
  LIMIT limit_count;
$$;

GRANT EXECUTE ON FUNCTION public.get_leaderboard(integer) TO authenticated, service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO authenticated, service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchant_escrow ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.click_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.official_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deposit_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sweep_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broadcasts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_select_all ON public.profiles;
CREATE POLICY profiles_select_all
ON public.profiles
FOR SELECT
USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
CREATE POLICY profiles_insert_own
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own
ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS profiles_admin_update ON public.profiles;
CREATE POLICY profiles_admin_update
ON public.profiles
FOR UPDATE
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS escrow_owner ON public.merchant_escrow;
CREATE POLICY escrow_owner
ON public.merchant_escrow
FOR ALL
USING (auth.uid() = merchant_id)
WITH CHECK (auth.uid() = merchant_id);

DROP POLICY IF EXISTS escrow_admin_select ON public.merchant_escrow;
CREATE POLICY escrow_admin_select
ON public.merchant_escrow
FOR SELECT
USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS escrow_admin_insert ON public.merchant_escrow;
CREATE POLICY escrow_admin_insert
ON public.merchant_escrow
FOR INSERT
WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS escrow_admin_update ON public.merchant_escrow;
CREATE POLICY escrow_admin_update
ON public.merchant_escrow
FOR UPDATE
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS products_select_active_or_owner ON public.products;
CREATE POLICY products_select_active_or_owner
ON public.products
FOR SELECT
USING (is_active = TRUE OR merchant_id = auth.uid());

DROP POLICY IF EXISTS products_owner_write ON public.products;
CREATE POLICY products_owner_write
ON public.products
FOR INSERT
WITH CHECK (merchant_id = auth.uid());

DROP POLICY IF EXISTS products_owner_update ON public.products;
CREATE POLICY products_owner_update
ON public.products
FOR UPDATE
USING (merchant_id = auth.uid())
WITH CHECK (merchant_id = auth.uid());

DROP POLICY IF EXISTS products_owner_delete ON public.products;
CREATE POLICY products_owner_delete
ON public.products
FOR DELETE
USING (merchant_id = auth.uid());

DROP POLICY IF EXISTS products_admin_select ON public.products;
CREATE POLICY products_admin_select
ON public.products
FOR SELECT
USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS products_admin_update ON public.products;
CREATE POLICY products_admin_update
ON public.products
FOR UPDATE
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS links_select_owner_or_merchant ON public.affiliate_links;
CREATE POLICY links_select_owner_or_merchant
ON public.affiliate_links
FOR SELECT
USING (
  affiliate_id = auth.uid()
  OR product_id IN (
    SELECT p.id
    FROM public.products p
    WHERE p.merchant_id = auth.uid()
  )
);

DROP POLICY IF EXISTS links_owner_write ON public.affiliate_links;
CREATE POLICY links_owner_write
ON public.affiliate_links
FOR INSERT
WITH CHECK (affiliate_id = auth.uid());

DROP POLICY IF EXISTS links_owner_update ON public.affiliate_links;
CREATE POLICY links_owner_update
ON public.affiliate_links
FOR UPDATE
USING (affiliate_id = auth.uid())
WITH CHECK (affiliate_id = auth.uid());

DROP POLICY IF EXISTS links_owner_delete ON public.affiliate_links;
CREATE POLICY links_owner_delete
ON public.affiliate_links
FOR DELETE
USING (affiliate_id = auth.uid());

DROP POLICY IF EXISTS links_admin_select ON public.affiliate_links;
CREATE POLICY links_admin_select
ON public.affiliate_links
FOR SELECT
USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS clicks_select_affiliate ON public.click_events;
CREATE POLICY clicks_select_affiliate
ON public.click_events
FOR SELECT
USING (
  link_id IN (
    SELECT al.id
    FROM public.affiliate_links al
    WHERE al.affiliate_id = auth.uid()
  )
);

DROP POLICY IF EXISTS clicks_insert_public ON public.click_events;
CREATE POLICY clicks_insert_public
ON public.click_events
FOR INSERT
WITH CHECK (TRUE);

DROP POLICY IF EXISTS clicks_admin_select ON public.click_events;
CREATE POLICY clicks_admin_select
ON public.click_events
FOR SELECT
USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS conversions_select_owner ON public.conversions;
CREATE POLICY conversions_select_owner
ON public.conversions
FOR SELECT
USING (affiliate_id = auth.uid() OR merchant_id = auth.uid());

DROP POLICY IF EXISTS conversions_insert_public ON public.conversions;
CREATE POLICY conversions_insert_public
ON public.conversions
FOR INSERT
WITH CHECK (TRUE);

DROP POLICY IF EXISTS conversions_update_merchant ON public.conversions;
CREATE POLICY conversions_update_merchant
ON public.conversions
FOR UPDATE
USING (merchant_id = auth.uid())
WITH CHECK (merchant_id = auth.uid());

DROP POLICY IF EXISTS conversions_admin_select ON public.conversions;
CREATE POLICY conversions_admin_select
ON public.conversions
FOR SELECT
USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS achievements_read_all ON public.achievements;
CREATE POLICY achievements_read_all
ON public.achievements
FOR SELECT
USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS achievements_admin_insert ON public.achievements;
CREATE POLICY achievements_admin_insert
ON public.achievements
FOR INSERT
WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS achievements_admin_update ON public.achievements;
CREATE POLICY achievements_admin_update
ON public.achievements
FOR UPDATE
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS achievements_admin_delete ON public.achievements;
CREATE POLICY achievements_admin_delete
ON public.achievements
FOR DELETE
USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS achievements_owner ON public.user_achievements;
CREATE POLICY achievements_owner
ON public.user_achievements
FOR SELECT
USING (user_id = auth.uid());

DROP POLICY IF EXISTS user_achievements_admin_insert ON public.user_achievements;
CREATE POLICY user_achievements_admin_insert
ON public.user_achievements
FOR INSERT
WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS admin_audit_admin_only ON public.admin_audit_log;
CREATE POLICY admin_audit_admin_only
ON public.admin_audit_log
FOR SELECT
USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS admin_audit_insert ON public.admin_audit_log;
CREATE POLICY admin_audit_insert
ON public.admin_audit_log
FOR INSERT
WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS receipts_recipient_or_admin ON public.official_receipts;
CREATE POLICY receipts_recipient_or_admin
ON public.official_receipts
FOR SELECT
USING (recipient_id = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS receipts_admin_insert ON public.official_receipts;
CREATE POLICY receipts_admin_insert
ON public.official_receipts
FOR INSERT
WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS deposit_select_owner_or_admin ON public.deposit_requests;
CREATE POLICY deposit_select_owner_or_admin
ON public.deposit_requests
FOR SELECT
USING (merchant_id = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS deposit_insert_owner ON public.deposit_requests;
CREATE POLICY deposit_insert_owner
ON public.deposit_requests
FOR INSERT
WITH CHECK (merchant_id = auth.uid());

DROP POLICY IF EXISTS deposit_update_admin ON public.deposit_requests;
CREATE POLICY deposit_update_admin
ON public.deposit_requests
FOR UPDATE
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS payout_select_owner_or_admin ON public.payouts;
CREATE POLICY payout_select_owner_or_admin
ON public.payouts
FOR SELECT
USING (affiliate_id = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS payout_insert_admin ON public.payouts;
CREATE POLICY payout_insert_admin
ON public.payouts
FOR INSERT
WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS payouts_admin_update ON public.payouts;
CREATE POLICY payouts_admin_update
ON public.payouts
FOR UPDATE
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS sweep_admin_only ON public.sweep_batches;
CREATE POLICY sweep_admin_only
ON public.sweep_batches
FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS forum_insert_auth ON public.forum_posts;
CREATE POLICY forum_insert_auth
ON public.forum_posts
FOR INSERT
WITH CHECK (auth.role() = 'authenticated' AND author_id = auth.uid());

DROP POLICY IF EXISTS forum_select_auth ON public.forum_posts;
CREATE POLICY forum_select_auth
ON public.forum_posts
FOR SELECT
USING (
  status = 'approved'
  OR author_id = auth.uid()
  OR public.is_admin(auth.uid())
);

DROP POLICY IF EXISTS forum_update_admin ON public.forum_posts;
CREATE POLICY forum_update_admin
ON public.forum_posts
FOR UPDATE
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS broadcast_admin_all ON public.broadcasts;
CREATE POLICY broadcast_admin_all
ON public.broadcasts
FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS broadcast_select_auth ON public.broadcasts;
CREATE POLICY broadcast_select_auth
ON public.broadcasts
FOR SELECT
USING (
  auth.role() = 'authenticated'
  AND (
    audience = 'all'
    OR audience = COALESCE((SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()), '')
  )
);

INSERT INTO storage.buckets (id, name, public)
VALUES
  ('merchant-docs', 'merchant-docs', FALSE),
  ('product-images', 'product-images', TRUE),
  ('avatars', 'avatars', TRUE),
  ('receipts', 'receipts', FALSE)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS merchant_docs_insert_own ON storage.objects;
CREATE POLICY merchant_docs_insert_own
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'merchant-docs'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS merchant_docs_select_own ON storage.objects;
CREATE POLICY merchant_docs_select_own
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'merchant-docs'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.is_admin(auth.uid())
  )
);

DROP POLICY IF EXISTS product_images_insert_auth ON storage.objects;
CREATE POLICY product_images_insert_auth
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'product-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS product_images_select_public ON storage.objects;
CREATE POLICY product_images_select_public
ON storage.objects
FOR SELECT
USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS avatars_insert_auth ON storage.objects;
CREATE POLICY avatars_insert_auth
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS avatars_select_public ON storage.objects;
CREATE POLICY avatars_select_public
ON storage.objects
FOR SELECT
USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS receipts_insert_admin ON storage.objects;
CREATE POLICY receipts_insert_admin
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'receipts'
  AND public.is_admin(auth.uid())
);

DROP POLICY IF EXISTS receipts_select_recipient_or_admin ON storage.objects;
CREATE POLICY receipts_select_recipient_or_admin
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'receipts'
  AND (
    public.is_admin(auth.uid())
    OR (storage.foldername(name))[1] = auth.uid()::text
  )
);

COMMIT;
