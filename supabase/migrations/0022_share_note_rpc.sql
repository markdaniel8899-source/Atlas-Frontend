-- Share note RPC function that copies a note and sets shared_by/shared_at
create or replace function public.share_note(
  p_note_id bigint,
  p_recipient_id uuid
) returns jsonb
language plpgsql
security definer
as $$
declare
  v_note record;
  v_new_note_id bigint;
  v_sender_id uuid := auth.uid();
begin
  -- Check if the note exists and belongs to the sender
  select * into v_note
  from public.notes
  where id = p_note_id
    and user_id = v_sender_id;

  if not found then
    return jsonb_build_object('ok', false, 'message', 'Note not found or access denied');
  end if;

  -- Check if recipient is an accepted friend
  if not exists (
    select 1 from public.friendships
    where ((requester_id = v_sender_id and addressee_id = p_recipient_id)
       or (requester_id = p_recipient_id and addressee_id = v_sender_id))
      and status = 'accepted'
  ) then
    return jsonb_build_object('ok', false, 'message', 'Can only share with accepted friends');
  end if;

  -- Insert the copied note for the recipient with shared_by and shared_at
  insert into public.notes (
    user_id,
    title,
    content,
    course_id,
    topic_id,
    tags,
    shared_by,
    shared_at
  ) values (
    p_recipient_id,
    v_note.title,
    v_note.content,
    v_note.course_id,
    v_note.topic_id,
    v_note.tags,
    v_sender_id,
    now()
  ) returning id into v_new_note_id;

  return jsonb_build_object('ok', true, 'message', 'Note shared successfully', 'note_id', v_new_note_id);
exception
  when others then
    return jsonb_build_object('ok', false, 'message', sqlerrm);
end;
$$;

-- Grant execute to authenticated users
grant execute on function public.share_note(bigint, uuid) to authenticated;