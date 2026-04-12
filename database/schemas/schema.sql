-- Affilia core schema
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT CHECK (role IN ('merchant', 'affiliate', 'admin')),
  phone_number TEXT UNIQUE,
  business_name TEXT,
  business_verified BOOLEAN DEFAULT FALSE,
  payout_phone TEXT,
  mpesa_till TEXT,
  niches TEXT[] DEFAULT '{}',
  promotion_channels TEXT[] DEFAULT '{}',
  documents JSONB DEFAULT '{}'::jsonb,
  store_description TEXT,
  xp_points INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  onboarding_complete BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS merchant_escrow (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID UNIQUE REFERENCES profiles(id),
  balance_kes DECIMAL(12,2) DEFAULT 0.00 CHECK (balance_kes >= 0),
  lifetime_deposits_kes DECIMAL(12,2) DEFAULT 0.00,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID REFERENCES profiles(id),
  title TEXT NOT NULL,
  description TEXT,
  price_kes DECIMAL(10,2) NOT NULL,
  commission_percent DECIMAL(5,2) NOT NULL,
  commission_flat_kes DECIMAL(10,2) GENERATED ALWAYS AS (price_kes * commission_percent / 100) STORED,
  images TEXT[] DEFAULT '{}',
  category TEXT,
  stock_status TEXT DEFAULT 'in_stock',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS affiliate_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID REFERENCES profiles(id),
  product_id UUID REFERENCES products(id),
  unique_code TEXT UNIQUE NOT NULL,
  link_type TEXT CHECK (link_type IN ('smart_link', 'promo_code')),
  destination_url TEXT NOT NULL,
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  total_earned_kes DECIMAL(12,2) DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS click_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id UUID REFERENCES affiliate_links(id),
  visitor_ip TEXT,
  user_agent TEXT,
  referer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  geo_country TEXT,
  geo_city TEXT,
  clicked_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  click_id UUID REFERENCES click_events(id),
  link_id UUID REFERENCES affiliate_links(id),
  affiliate_id UUID REFERENCES profiles(id),
  merchant_id UUID REFERENCES profiles(id),
  product_id UUID REFERENCES products(id),
  order_value_kes DECIMAL(10,2) NOT NULL,
  commission_earned_kes DECIMAL(10,2) NOT NULL,
  platform_fee_kes DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending',
  merchant_approved BOOLEAN DEFAULT FALSE,
  approved_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  badge_icon TEXT,
  xp_reward INTEGER DEFAULT 0,
  requirement_type TEXT,
  requirement_value INTEGER
);

CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  achievement_id UUID REFERENCES achievements(id),
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES profiles(id),
  action_type TEXT NOT NULL,
  target_type TEXT,
  target_id UUID,
  previous_state JSONB,
  new_state JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS official_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_number TEXT UNIQUE NOT NULL,
  receipt_type TEXT CHECK (receipt_type IN ('deposit', 'payout', 'sweep_batch')),
  recipient_id UUID REFERENCES profiles(id),
  amount_kes DECIMAL(12,2) NOT NULL,
  mpesa_reference TEXT,
  pdf_url TEXT,
  verification_hash TEXT NOT NULL,
  generated_by UUID REFERENCES profiles(id),
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS deposit_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID REFERENCES profiles(id),
  amount_kes DECIMAL(12,2) NOT NULL,
  mpesa_code TEXT,
  screenshot_url TEXT,
  status TEXT DEFAULT 'pending',
  ocr_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID REFERENCES profiles(id),
  amount_kes DECIMAL(12,2) NOT NULL,
  status TEXT DEFAULT 'pending',
  mpesa_reference TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  paid_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS sweep_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  total_kes DECIMAL(12,2) NOT NULL,
  recipients INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS forum_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID REFERENCES profiles(id),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  audience TEXT DEFAULT 'all',
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
