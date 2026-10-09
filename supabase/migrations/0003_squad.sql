-- 0003_squad.sql
-- Squad invitations: resolve a peer by email and create a pending friendship.
-- Run after 0001_core_schema.sql and 0002_triggers_functions.sql.

create or replace function public.invite_friend(p_email text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := auth.uid();
  v_peer uuid;
  v_status text;
begin
  if v_me is null then
    return jsonb_build_object('ok', false, 'message', 'You are not signed in.');
  end if;

  if p_email is null or length(trim(p_email)) = 0 then
    return jsonb_build_object('ok', false, 'message', 'Enter an email address.');
  end if;

  select u.id into v_peer
  from auth.users u
  where lower(u.email) = lower(trim(p_email))
  limit 1;

  if v_peer is null then
    return jsonb_build_object(
      'ok', false,
      'message', 'No ATLAS account uses that email yet.'
    );
  end if;

  if v_peer = v_me then
    return jsonb_build_object('ok', false, 'message', 'That is your own email.');
  end if;

  select f.status into v_status
  from public.friendships f
  where (f.requester_id = v_me and f.addressee_id = v_peer)
     or (f.requester_id = v_peer and f.addressee_id = v_me)
  limit 1;

  if v_status = 'accepted' then
    return jsonb_build_object('ok', false, 'message', 'You are already squadmates.');
  end if;

  if v_status = 'pending' then
    return jsonb_build_object('ok', false, 'message', 'An invite is already pending.');
  end if;

  if v_status = 'blocked' then
    return jsonb_build_object('ok', false, 'message', 'This account cannot be invited.');
  end if;

  insert into public.friendships (requester_id, addressee_id, status)
  values (v_me, v_peer, 'pending');

  return jsonb_build_object('ok', true, 'message', 'Invite sent.');
end;
$$;

revoke execute on function public.invite_friend(text) from public, anon;
grant execute on function public.invite_friend(text) to authenticated, service_role;
