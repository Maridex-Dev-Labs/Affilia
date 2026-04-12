BEGIN;

SET search_path = public;

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

COMMIT;
