BEGIN;

SET search_path = public;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS contract_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS current_agreement_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_contract_status_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_contract_status_check
      CHECK (contract_status IN ('pending', 'under_review', 'active', 'expired', 'rejected', 'revision_requested'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.legal_agreements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_number text UNIQUE,
  agreement_type text NOT NULL CHECK (agreement_type IN ('merchant', 'affiliate')),
  version text NOT NULL DEFAULT '1.0',
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'approved', 'rejected', 'revision_requested', 'expired', 'superseded')),
  acceptance_method text CHECK (acceptance_method IN ('digital_signature', 'uploaded_pdf', 'manual_signature')),
  digital_signature text,
  digital_signature_date timestamptz,
  digital_signature_ip inet,
  signature_full_name text,
  accepted_terms boolean NOT NULL DEFAULT false,
  accepted_fees boolean NOT NULL DEFAULT false,
  accepted_privacy boolean NOT NULL DEFAULT false,
  accepted_dispute boolean NOT NULL DEFAULT false,
  signed_contract_storage_path text,
  signed_contract_filename text,
  signed_contract_size_bytes integer,
  signed_contract_mime_type text,
  reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  review_notes text,
  rejection_reason text,
  effective_date date,
  expiry_date date,
  submitted_at timestamptz,
  contract_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  replaced_by_agreement_id uuid REFERENCES public.legal_agreements(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.legal_agreement_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id uuid NOT NULL REFERENCES public.legal_agreements(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  action text NOT NULL CHECK (action IN ('submitted', 'approved', 'rejected', 'revision_requested', 'superseded', 'expired')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_legal_agreements_user_type ON public.legal_agreements(user_id, agreement_type);
CREATE INDEX IF NOT EXISTS idx_legal_agreements_status ON public.legal_agreements(status);
CREATE INDEX IF NOT EXISTS idx_legal_agreements_submitted_at ON public.legal_agreements(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_legal_agreement_events_agreement ON public.legal_agreement_events(agreement_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.generate_agreement_number()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  prefix text;
  next_num integer;
BEGIN
  IF NEW.agreement_number IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.agreement_type = 'merchant' THEN
    prefix := 'AFF-MER';
  ELSE
    prefix := 'AFF-AFL';
  END IF;

  SELECT COALESCE(MAX((regexp_match(agreement_number, '(\d+)$'))[1]::integer), 0) + 1
    INTO next_num
  FROM public.legal_agreements
  WHERE agreement_type = NEW.agreement_type
    AND agreement_number LIKE prefix || '-' || to_char(now(), 'YYYY') || '-%';

  NEW.agreement_number := prefix || '-' || to_char(now(), 'YYYY') || '-' || lpad(next_num::text, 5, '0');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_generate_agreement_number ON public.legal_agreements;
CREATE TRIGGER trg_generate_agreement_number
BEFORE INSERT ON public.legal_agreements
FOR EACH ROW
EXECUTE FUNCTION public.generate_agreement_number();

DROP TRIGGER IF EXISTS trg_legal_agreements_updated_at ON public.legal_agreements;
CREATE TRIGGER trg_legal_agreements_updated_at
BEFORE UPDATE ON public.legal_agreements
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_current_agreement_id_fkey;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_current_agreement_id_fkey
  FOREIGN KEY (current_agreement_id)
  REFERENCES public.legal_agreements(id)
  ON DELETE SET NULL;

INSERT INTO public.admin_permissions (code, name, description)
VALUES ('legal.review', 'Review legal agreements', 'Review and approve merchant and affiliate legal agreement submissions.')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.admin_role_permissions (role_id, permission_code)
SELECT r.id, 'legal.review'
FROM public.admin_roles r
WHERE r.code IN ('super_admin', 'operations_admin')
ON CONFLICT DO NOTHING;

ALTER TABLE public.legal_agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_agreement_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS legal_agreements_owner_select ON public.legal_agreements;
CREATE POLICY legal_agreements_owner_select
ON public.legal_agreements
FOR SELECT
USING (user_id = auth.uid() OR public.admin_has_permission(auth.uid(), 'legal.review'));

DROP POLICY IF EXISTS legal_agreements_owner_insert ON public.legal_agreements;
CREATE POLICY legal_agreements_owner_insert
ON public.legal_agreements
FOR INSERT
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS legal_agreements_admin_update ON public.legal_agreements;
CREATE POLICY legal_agreements_admin_update
ON public.legal_agreements
FOR UPDATE
USING (public.admin_has_permission(auth.uid(), 'legal.review'))
WITH CHECK (public.admin_has_permission(auth.uid(), 'legal.review'));

DROP POLICY IF EXISTS legal_agreement_events_select ON public.legal_agreement_events;
CREATE POLICY legal_agreement_events_select
ON public.legal_agreement_events
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.legal_agreements la
    WHERE la.id = legal_agreement_events.agreement_id
      AND (la.user_id = auth.uid() OR public.admin_has_permission(auth.uid(), 'legal.review'))
  )
);

DROP POLICY IF EXISTS legal_agreement_events_insert ON public.legal_agreement_events;
CREATE POLICY legal_agreement_events_insert
ON public.legal_agreement_events
FOR INSERT
WITH CHECK (
  public.admin_has_permission(auth.uid(), 'legal.review')
  OR EXISTS (
    SELECT 1
    FROM public.legal_agreements la
    WHERE la.id = legal_agreement_events.agreement_id
      AND la.user_id = auth.uid()
  )
);

GRANT SELECT, INSERT, UPDATE ON public.legal_agreements TO authenticated, service_role;
GRANT SELECT, INSERT ON public.legal_agreement_events TO authenticated, service_role;

INSERT INTO storage.buckets (id, name, public)
VALUES ('legal-agreements', 'legal-agreements', FALSE)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS legal_agreements_insert_own ON storage.objects;
CREATE POLICY legal_agreements_insert_own
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'legal-agreements'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS legal_agreements_select_own_or_admin ON storage.objects;
CREATE POLICY legal_agreements_select_own_or_admin
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'legal-agreements'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.admin_has_permission(auth.uid(), 'legal.review')
  )
);

COMMIT;
