BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS national_id_number text,
  ADD COLUMN IF NOT EXISTS affiliate_verification_status text NOT NULL DEFAULT 'not_started'
    CHECK (affiliate_verification_status IN ('not_started', 'submitted', 'under_review', 'verified', 'revision_requested', 'rejected', 'restricted_duplicate')),
  ADD COLUMN IF NOT EXISTS affiliate_verification_notes text,
  ADD COLUMN IF NOT EXISTS affiliate_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS affiliate_verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS duplicate_flag_reason text,
  ADD COLUMN IF NOT EXISTS active_plan_code text,
  ADD COLUMN IF NOT EXISTS active_plan_role text CHECK (active_plan_role IN ('merchant', 'affiliate')),
  ADD COLUMN IF NOT EXISTS plan_status text NOT NULL DEFAULT 'inactive'
    CHECK (plan_status IN ('inactive', 'pending', 'active', 'expired', 'cancelled')),
  ADD COLUMN IF NOT EXISTS plan_activated_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_profiles_affiliate_verification_status
  ON public.profiles(role, affiliate_verification_status);
CREATE INDEX IF NOT EXISTS idx_profiles_plan_status
  ON public.profiles(role, plan_status);
CREATE INDEX IF NOT EXISTS idx_profiles_national_id
  ON public.profiles(national_id_number)
  WHERE national_id_number IS NOT NULL;

ALTER TABLE public.affiliate_links
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'paused', 'archived')),
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DROP TRIGGER IF EXISTS trg_affiliate_links_updated_at ON public.affiliate_links;
CREATE TRIGGER trg_affiliate_links_updated_at
BEFORE UPDATE ON public.affiliate_links
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_affiliate_links_status
  ON public.affiliate_links(affiliate_id, status, created_at DESC);

ALTER TABLE public.merchant_escrow
  ADD COLUMN IF NOT EXISTS reserved_balance_kes numeric(12,2) NOT NULL DEFAULT 0.00 CHECK (reserved_balance_kes >= 0);

ALTER TABLE public.conversions
  ADD COLUMN IF NOT EXISTS quantity integer NOT NULL DEFAULT 1 CHECK (quantity >= 1),
  ADD COLUMN IF NOT EXISTS customer_reference text,
  ADD COLUMN IF NOT EXISTS entry_mode text NOT NULL DEFAULT 'tracked'
    CHECK (entry_mode IN ('tracked', 'manual')),
  ADD COLUMN IF NOT EXISTS submitted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reserved_commission_kes numeric(10,2) NOT NULL DEFAULT 0.00 CHECK (reserved_commission_kes >= 0),
  ADD COLUMN IF NOT EXISTS review_notes text,
  ADD COLUMN IF NOT EXISTS rejection_reason text;

CREATE INDEX IF NOT EXISTS idx_conversions_status_entry_mode
  ON public.conversions(status, entry_mode, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_conversions_merchant_product_customer_ref
  ON public.conversions(merchant_id, product_id, customer_reference)
  WHERE customer_reference IS NOT NULL;

ALTER TABLE public.payouts
  ADD COLUMN IF NOT EXISTS conversion_id uuid REFERENCES public.conversions(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_payouts_conversion_id
  ON public.payouts(conversion_id)
  WHERE conversion_id IS NOT NULL;

INSERT INTO public.admin_permissions (code, name, description)
VALUES
  ('affiliate.verify', 'Verify affiliates', 'Review affiliate verification submissions and duplicate-risk checks.'),
  ('billing.approve', 'Approve billing plans', 'Approve paid package submissions and activate plan entitlements immediately.'),
  ('conversion.review', 'Review attributed sales', 'Approve or reject manually submitted affiliate sale attributions.')
ON CONFLICT DO NOTHING;

INSERT INTO public.admin_role_permissions (role_id, permission_code)
SELECT r.id, p.code
FROM public.admin_roles r
JOIN public.admin_permissions p
  ON (
    (r.code = 'super_admin' AND p.code IN ('affiliate.verify', 'billing.approve', 'conversion.review'))
    OR (r.code = 'operations_admin' AND p.code IN ('affiliate.verify', 'conversion.review'))
    OR (r.code = 'finance_admin' AND p.code IN ('billing.approve', 'conversion.review'))
  )
ON CONFLICT DO NOTHING;

UPDATE public.profiles p
SET
  active_plan_code = s.plan_code,
  active_plan_role = s.role,
  plan_status = CASE WHEN s.status = 'active' THEN 'active' ELSE 'pending' END,
  plan_activated_at = COALESCE(s.activated_at, s.paid_at)
FROM public.profile_plan_selections s
WHERE s.profile_id = p.id
  AND s.status IN ('active', 'pending_verification', 'pending_payment')
  AND (p.active_plan_code IS NULL OR p.plan_status = 'inactive');

UPDATE public.profiles p
SET
  affiliate_verification_status = 'verified',
  affiliate_verified_at = COALESCE(p.affiliate_verified_at, now())
WHERE p.role = 'affiliate'
  AND p.affiliate_verification_status = 'not_started'
  AND (
    EXISTS (SELECT 1 FROM public.affiliate_links al WHERE al.affiliate_id = p.id)
    OR EXISTS (SELECT 1 FROM public.conversions c WHERE c.affiliate_id = p.id)
    OR EXISTS (SELECT 1 FROM public.payouts po WHERE po.affiliate_id = p.id)
  );

COMMIT;
