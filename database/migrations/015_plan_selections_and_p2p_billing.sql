BEGIN;

CREATE TABLE IF NOT EXISTS public.profile_plan_selections (
  profile_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('merchant', 'affiliate')),
  plan_code text NOT NULL,
  plan_name text NOT NULL,
  amount_kes numeric(10,2) NOT NULL DEFAULT 0 CHECK (amount_kes >= 0),
  billing_cycle text NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly')),
  payment_channel text NOT NULL CHECK (payment_channel IN ('mpesa_p2p', 'free_activation')),
  payment_destination text,
  payment_reference text NOT NULL UNIQUE,
  payer_phone text,
  mpesa_reference text,
  status text NOT NULL DEFAULT 'pending_payment' CHECK (status IN ('pending_payment', 'pending_verification', 'active', 'expired', 'cancelled')),
  verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  verification_notes text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz,
  activated_at timestamptz,
  expires_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS set_profile_plan_selections_updated_at ON public.profile_plan_selections;
CREATE TRIGGER set_profile_plan_selections_updated_at
BEFORE UPDATE ON public.profile_plan_selections
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_profile_plan_selections_status ON public.profile_plan_selections(status);
CREATE INDEX IF NOT EXISTS idx_profile_plan_selections_role ON public.profile_plan_selections(role);

ALTER TABLE public.profile_plan_selections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can view their package selection" ON public.profile_plan_selections;
CREATE POLICY "Owners can view their package selection"
ON public.profile_plan_selections
FOR SELECT
TO authenticated
USING (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Owners can create their package selection" ON public.profile_plan_selections;
CREATE POLICY "Owners can create their package selection"
ON public.profile_plan_selections
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Owners can update their package selection" ON public.profile_plan_selections;
CREATE POLICY "Owners can update their package selection"
ON public.profile_plan_selections
FOR UPDATE
TO authenticated
USING (auth.uid() = profile_id)
WITH CHECK (auth.uid() = profile_id);

COMMIT;
