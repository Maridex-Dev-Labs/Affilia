BEGIN;

SET search_path = public;

CREATE TABLE IF NOT EXISTS public.academy_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  access_level text NOT NULL DEFAULT 'free' CHECK (access_level IN ('free', 'premium')),
  source text NOT NULL DEFAULT 'manual',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.academy_tutor_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  headline text,
  bio text NOT NULL,
  expertise text[] NOT NULL DEFAULT '{}',
  google_meet_email text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'suspended')),
  is_featured boolean NOT NULL DEFAULT false,
  approved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at timestamptz,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.academy_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  summary text,
  content text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  access_level text NOT NULL DEFAULT 'free' CHECK (access_level IN ('free', 'premium')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  featured boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.academy_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id uuid NOT NULL REFERENCES public.academy_tutor_profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  topic text NOT NULL DEFAULT 'affiliate-marketing',
  level text NOT NULL DEFAULT 'beginner' CHECK (level IN ('beginner', 'intermediate', 'advanced')),
  access_level text NOT NULL DEFAULT 'free' CHECK (access_level IN ('free', 'premium')),
  meeting_provider text NOT NULL DEFAULT 'google_meet',
  meeting_url text,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  seat_limit integer CHECK (seat_limit IS NULL OR seat_limit > 0),
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('draft', 'scheduled', 'live', 'completed', 'cancelled')),
  featured boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT academy_sessions_end_after_start CHECK (ends_at > starts_at)
);

CREATE TABLE IF NOT EXISTS public.academy_session_attendees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.academy_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  attendance_status text NOT NULL DEFAULT 'registered' CHECK (attendance_status IN ('registered', 'attended', 'cancelled', 'no_show')),
  joined_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.academy_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES public.academy_posts(id) ON DELETE CASCADE,
  session_id uuid REFERENCES public.academy_sessions(id) ON DELETE CASCADE,
  title text NOT NULL,
  resource_url text NOT NULL,
  resource_type text NOT NULL DEFAULT 'link' CHECK (resource_type IN ('link', 'slides', 'worksheet', 'recording', 'document')),
  access_level text NOT NULL DEFAULT 'free' CHECK (access_level IN ('free', 'premium')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT academy_resources_source_check CHECK (post_id IS NOT NULL OR session_id IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS public.academy_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.academy_sessions(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, reviewer_id)
);

CREATE INDEX IF NOT EXISTS idx_academy_memberships_user_access ON public.academy_memberships(user_id, access_level);
CREATE INDEX IF NOT EXISTS idx_academy_tutor_profiles_status ON public.academy_tutor_profiles(status, is_featured, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_academy_posts_status_access ON public.academy_posts(status, access_level, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_academy_sessions_status_access ON public.academy_sessions(status, access_level, starts_at ASC);
CREATE INDEX IF NOT EXISTS idx_academy_session_attendees_user ON public.academy_session_attendees(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_academy_reviews_session ON public.academy_reviews(session_id, created_at DESC);

DROP TRIGGER IF EXISTS trg_academy_memberships_updated_at ON public.academy_memberships;
CREATE TRIGGER trg_academy_memberships_updated_at
BEFORE UPDATE ON public.academy_memberships
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_academy_tutor_profiles_updated_at ON public.academy_tutor_profiles;
CREATE TRIGGER trg_academy_tutor_profiles_updated_at
BEFORE UPDATE ON public.academy_tutor_profiles
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_academy_posts_updated_at ON public.academy_posts;
CREATE TRIGGER trg_academy_posts_updated_at
BEFORE UPDATE ON public.academy_posts
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_academy_sessions_updated_at ON public.academy_sessions;
CREATE TRIGGER trg_academy_sessions_updated_at
BEFORE UPDATE ON public.academy_sessions
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.is_academy_tutor(uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.academy_tutor_profiles tp
    WHERE tp.user_id = uid
      AND tp.status = 'approved'
  );
$$;

CREATE OR REPLACE FUNCTION public.has_academy_access(uid uuid, required_access text)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT CASE
    WHEN required_access = 'free' THEN auth.role() = 'authenticated'
    WHEN required_access = 'premium' THEN EXISTS (
      SELECT 1
      FROM public.academy_memberships m
      WHERE m.user_id = uid
        AND m.access_level = 'premium'
    ) OR public.is_academy_tutor(uid) OR public.is_admin(uid)
    ELSE false
  END;
$$;

GRANT EXECUTE ON FUNCTION public.is_academy_tutor(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_academy_access(uuid, text) TO authenticated, service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.academy_memberships TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.academy_tutor_profiles TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.academy_posts TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.academy_sessions TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.academy_session_attendees TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.academy_resources TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.academy_reviews TO authenticated, service_role;

ALTER TABLE public.academy_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_tutor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_session_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS academy_memberships_select_self_or_admin ON public.academy_memberships;
CREATE POLICY academy_memberships_select_self_or_admin
ON public.academy_memberships
FOR SELECT
USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS academy_memberships_admin_write ON public.academy_memberships;
CREATE POLICY academy_memberships_admin_write
ON public.academy_memberships
FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS academy_tutors_select_visible ON public.academy_tutor_profiles;
CREATE POLICY academy_tutors_select_visible
ON public.academy_tutor_profiles
FOR SELECT
USING (status = 'approved' OR user_id = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS academy_tutors_insert_own ON public.academy_tutor_profiles;
CREATE POLICY academy_tutors_insert_own
ON public.academy_tutor_profiles
FOR INSERT
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS academy_tutors_update_own_or_admin ON public.academy_tutor_profiles;
CREATE POLICY academy_tutors_update_own_or_admin
ON public.academy_tutor_profiles
FOR UPDATE
USING (user_id = auth.uid() OR public.is_admin(auth.uid()))
WITH CHECK (user_id = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS academy_posts_select_visible ON public.academy_posts;
CREATE POLICY academy_posts_select_visible
ON public.academy_posts
FOR SELECT
USING (
  (
    status = 'published'
    AND public.has_academy_access(auth.uid(), access_level)
  )
  OR author_id = auth.uid()
  OR public.is_admin(auth.uid())
);

DROP POLICY IF EXISTS academy_posts_insert_tutor_or_admin ON public.academy_posts;
CREATE POLICY academy_posts_insert_tutor_or_admin
ON public.academy_posts
FOR INSERT
WITH CHECK (
  author_id = auth.uid()
  AND (public.is_academy_tutor(auth.uid()) OR public.is_admin(auth.uid()))
);

DROP POLICY IF EXISTS academy_posts_update_tutor_or_admin ON public.academy_posts;
CREATE POLICY academy_posts_update_tutor_or_admin
ON public.academy_posts
FOR UPDATE
USING (
  (author_id = auth.uid() AND public.is_academy_tutor(auth.uid()))
  OR public.is_admin(auth.uid())
)
WITH CHECK (
  (author_id = auth.uid() AND public.is_academy_tutor(auth.uid()))
  OR public.is_admin(auth.uid())
);

DROP POLICY IF EXISTS academy_sessions_select_visible ON public.academy_sessions;
CREATE POLICY academy_sessions_select_visible
ON public.academy_sessions
FOR SELECT
USING (
  (
    status IN ('scheduled', 'live', 'completed')
    AND public.has_academy_access(
      auth.uid(),
      access_level
    )
  )
  OR tutor_id IN (
    SELECT tp.id
    FROM public.academy_tutor_profiles tp
    WHERE tp.user_id = auth.uid()
  )
  OR public.is_admin(auth.uid())
);

DROP POLICY IF EXISTS academy_sessions_insert_tutor_or_admin ON public.academy_sessions;
CREATE POLICY academy_sessions_insert_tutor_or_admin
ON public.academy_sessions
FOR INSERT
WITH CHECK (
  tutor_id IN (
    SELECT tp.id
    FROM public.academy_tutor_profiles tp
    WHERE tp.user_id = auth.uid()
      AND tp.status = 'approved'
  )
  OR public.is_admin(auth.uid())
);

DROP POLICY IF EXISTS academy_sessions_update_tutor_or_admin ON public.academy_sessions;
CREATE POLICY academy_sessions_update_tutor_or_admin
ON public.academy_sessions
FOR UPDATE
USING (
  tutor_id IN (
    SELECT tp.id
    FROM public.academy_tutor_profiles tp
    WHERE tp.user_id = auth.uid()
      AND tp.status = 'approved'
  )
  OR public.is_admin(auth.uid())
)
WITH CHECK (
  tutor_id IN (
    SELECT tp.id
    FROM public.academy_tutor_profiles tp
    WHERE tp.user_id = auth.uid()
      AND tp.status = 'approved'
  )
  OR public.is_admin(auth.uid())
);

DROP POLICY IF EXISTS academy_attendees_select_self_tutor_admin ON public.academy_session_attendees;
CREATE POLICY academy_attendees_select_self_tutor_admin
ON public.academy_session_attendees
FOR SELECT
USING (
  user_id = auth.uid()
  OR session_id IN (
    SELECT s.id
    FROM public.academy_sessions s
    JOIN public.academy_tutor_profiles tp ON tp.id = s.tutor_id
    WHERE tp.user_id = auth.uid()
  )
  OR public.is_admin(auth.uid())
);

DROP POLICY IF EXISTS academy_attendees_insert_self ON public.academy_session_attendees;
CREATE POLICY academy_attendees_insert_self
ON public.academy_session_attendees
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND session_id IN (
    SELECT s.id
    FROM public.academy_sessions s
    WHERE s.status IN ('scheduled', 'live', 'completed')
      AND public.has_academy_access(auth.uid(), s.access_level)
  )
);

DROP POLICY IF EXISTS academy_attendees_update_self_or_admin ON public.academy_session_attendees;
CREATE POLICY academy_attendees_update_self_or_admin
ON public.academy_session_attendees
FOR UPDATE
USING (user_id = auth.uid() OR public.is_admin(auth.uid()))
WITH CHECK (user_id = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS academy_resources_select_visible ON public.academy_resources;
CREATE POLICY academy_resources_select_visible
ON public.academy_resources
FOR SELECT
USING (
  public.has_academy_access(auth.uid(), access_level)
  OR public.is_admin(auth.uid())
);

DROP POLICY IF EXISTS academy_resources_insert_tutor_or_admin ON public.academy_resources;
CREATE POLICY academy_resources_insert_tutor_or_admin
ON public.academy_resources
FOR INSERT
WITH CHECK (
  public.is_admin(auth.uid())
  OR post_id IN (
    SELECT p.id
    FROM public.academy_posts p
    WHERE p.author_id = auth.uid()
  )
  OR session_id IN (
    SELECT s.id
    FROM public.academy_sessions s
    JOIN public.academy_tutor_profiles tp ON tp.id = s.tutor_id
    WHERE tp.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS academy_reviews_select_visible ON public.academy_reviews;
CREATE POLICY academy_reviews_select_visible
ON public.academy_reviews
FOR SELECT
USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS academy_reviews_insert_own ON public.academy_reviews;
CREATE POLICY academy_reviews_insert_own
ON public.academy_reviews
FOR INSERT
WITH CHECK (
  reviewer_id = auth.uid()
  AND session_id IN (
    SELECT session_id
    FROM public.academy_session_attendees
    WHERE user_id = auth.uid()
  )
);

COMMIT;
