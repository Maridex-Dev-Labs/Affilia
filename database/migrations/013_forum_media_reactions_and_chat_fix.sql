BEGIN;

SET search_path = public;

ALTER TABLE public.forum_posts
  ADD COLUMN IF NOT EXISTS media jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS mention_user_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS likes_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dislikes_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT NOW();

ALTER TABLE public.forum_comments
  ADD COLUMN IF NOT EXISTS mention_user_ids uuid[] NOT NULL DEFAULT '{}';

DROP TRIGGER IF EXISTS trg_forum_posts_updated_at ON public.forum_posts;
CREATE TRIGGER trg_forum_posts_updated_at
BEFORE UPDATE ON public.forum_posts
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.forum_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.forum_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reaction text NOT NULL CHECK (reaction IN ('like', 'dislike')),
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_forum_reactions_post_created_at ON public.forum_reactions(post_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_forum_reactions_user_created_at ON public.forum_reactions(user_id, created_at DESC);

DROP TRIGGER IF EXISTS trg_forum_reactions_updated_at ON public.forum_reactions;
CREATE TRIGGER trg_forum_reactions_updated_at
BEFORE UPDATE ON public.forum_reactions
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.sync_forum_post_reaction_counts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected_post_id uuid;
BEGIN
  affected_post_id := COALESCE(NEW.post_id, OLD.post_id);

  UPDATE public.forum_posts
  SET
    likes_count = (
      SELECT COUNT(*)
      FROM public.forum_reactions
      WHERE post_id = affected_post_id
        AND reaction = 'like'
    ),
    dislikes_count = (
      SELECT COUNT(*)
      FROM public.forum_reactions
      WHERE post_id = affected_post_id
        AND reaction = 'dislike'
    )
  WHERE id = affected_post_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_forum_reactions_sync_counts_insert ON public.forum_reactions;
CREATE TRIGGER trg_forum_reactions_sync_counts_insert
AFTER INSERT ON public.forum_reactions
FOR EACH ROW
EXECUTE FUNCTION public.sync_forum_post_reaction_counts();

DROP TRIGGER IF EXISTS trg_forum_reactions_sync_counts_update ON public.forum_reactions;
CREATE TRIGGER trg_forum_reactions_sync_counts_update
AFTER UPDATE ON public.forum_reactions
FOR EACH ROW
EXECUTE FUNCTION public.sync_forum_post_reaction_counts();

DROP TRIGGER IF EXISTS trg_forum_reactions_sync_counts_delete ON public.forum_reactions;
CREATE TRIGGER trg_forum_reactions_sync_counts_delete
AFTER DELETE ON public.forum_reactions
FOR EACH ROW
EXECUTE FUNCTION public.sync_forum_post_reaction_counts();

ALTER TABLE public.forum_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS forum_reactions_select_auth ON public.forum_reactions;
CREATE POLICY forum_reactions_select_auth
ON public.forum_reactions
FOR SELECT
USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS forum_reactions_insert_auth ON public.forum_reactions;
CREATE POLICY forum_reactions_insert_auth
ON public.forum_reactions
FOR INSERT
WITH CHECK (
  auth.role() = 'authenticated'
  AND user_id = auth.uid()
);

DROP POLICY IF EXISTS forum_reactions_update_owner_or_admin ON public.forum_reactions;
CREATE POLICY forum_reactions_update_owner_or_admin
ON public.forum_reactions
FOR UPDATE
USING (user_id = auth.uid() OR public.is_admin(auth.uid()))
WITH CHECK (user_id = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS forum_reactions_delete_owner_or_admin ON public.forum_reactions;
CREATE POLICY forum_reactions_delete_owner_or_admin
ON public.forum_reactions
FOR DELETE
USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.forum_reactions TO authenticated, service_role;

INSERT INTO storage.buckets (id, name, public)
VALUES ('community-media', 'community-media', TRUE)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS community_media_insert_auth ON storage.objects;
CREATE POLICY community_media_insert_auth
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'community-media'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS community_media_select_public ON storage.objects;
CREATE POLICY community_media_select_public
ON storage.objects
FOR SELECT
USING (bucket_id = 'community-media');

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

DROP POLICY IF EXISTS chat_threads_select_member ON public.chat_threads;
CREATE POLICY chat_threads_select_member
ON public.chat_threads
FOR SELECT
USING (
  public.is_admin(auth.uid())
  OR created_by = auth.uid()
  OR public.chat_user_in_thread(id, auth.uid())
);

DROP POLICY IF EXISTS chat_thread_members_select_member ON public.chat_thread_members;
CREATE POLICY chat_thread_members_select_member
ON public.chat_thread_members
FOR SELECT
USING (
  public.is_admin(auth.uid())
  OR user_id = auth.uid()
  OR public.chat_user_in_thread(thread_id, auth.uid())
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

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.forum_reactions;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;

COMMIT;
