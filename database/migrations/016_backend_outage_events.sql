BEGIN;

SET search_path = public;

CREATE TABLE IF NOT EXISTS public.backend_outage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_app text NOT NULL CHECK (source_app IN ('admin', 'frontend', 'backend')),
  surface text NOT NULL,
  request_path text,
  method text,
  error_message text NOT NULL,
  origin text,
  environment text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'ignored')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_backend_outage_events_status_created_at
  ON public.backend_outage_events(status, created_at DESC);

DROP TRIGGER IF EXISTS trg_backend_outage_events_updated_at ON public.backend_outage_events;
CREATE TRIGGER trg_backend_outage_events_updated_at
BEFORE UPDATE ON public.backend_outage_events
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.admin_permissions (code, name, description)
VALUES
  ('system.outage.view', 'View backend outage queue', 'Review backend outage events raised by admin-sensitive operations.'),
  ('system.outage.manage', 'Manage backend outage queue', 'Update outage status and close incident records.')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.admin_role_permissions (role_id, permission_code)
SELECT r.id, p.code
FROM public.admin_roles r
JOIN public.admin_permissions p ON p.code IN ('system.outage.view', 'system.outage.manage')
WHERE r.code IN ('super_admin', 'operations_admin')
ON CONFLICT DO NOTHING;

ALTER TABLE public.backend_outage_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS backend_outage_events_admin_select ON public.backend_outage_events;
CREATE POLICY backend_outage_events_admin_select
ON public.backend_outage_events
FOR SELECT
USING (
  public.admin_has_permission(auth.uid(), 'system.outage.view')
  OR public.admin_has_permission(auth.uid(), 'system.outage.manage')
);

DROP POLICY IF EXISTS backend_outage_events_admin_insert ON public.backend_outage_events;
CREATE POLICY backend_outage_events_admin_insert
ON public.backend_outage_events
FOR INSERT
WITH CHECK (
  public.admin_has_permission(auth.uid(), 'system.outage.view')
  OR public.admin_has_permission(auth.uid(), 'system.outage.manage')
);

DROP POLICY IF EXISTS backend_outage_events_admin_update ON public.backend_outage_events;
CREATE POLICY backend_outage_events_admin_update
ON public.backend_outage_events
FOR UPDATE
USING (public.admin_has_permission(auth.uid(), 'system.outage.manage'))
WITH CHECK (public.admin_has_permission(auth.uid(), 'system.outage.manage'));

GRANT SELECT, INSERT, UPDATE ON public.backend_outage_events TO authenticated, service_role;

COMMIT;
