-- 0025_otp_verification.sql
-- Custom email OTP gate.
--
-- Supabase "Confirm email" stays OFF: signUp() creates an active auth user and
-- the app sends its own 6-digit code through the Magic Link template. This
-- migration moves the verification decision onto profiles so a password login
-- cannot skip the OTP step.

alter table public.profiles
  add column if not exists is_verified boolean not null default false;

-- Accounts created before this migration already had access. Grandfather them
-- so the rollout does not lock out existing users. New profile rows still get
-- false from the column default (handle_new_user inserts without the column).
update public.profiles
   set is_verified = true
 where is_verified is not true;

-- Only an OTP-backed session may flip is_verified. A password session's access
-- token has amr.method = "password"; verifyOtp() produces amr.method = "otp".
-- This closes the direct PostgREST bypass, not just the login form bypass.
create or replace function public.prevent_unverified_change()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_amr jsonb;
begin
  if new.is_verified is not distinct from old.is_verified then
    return new;
  end if;

  -- Trusted SQL editor / service-role paths.
  if current_user in ('postgres', 'service_role') then
    return new;
  end if;

  v_amr := coalesce(auth.jwt() -> 'amr', '[]'::jsonb);

  if exists (
    select 1
      from jsonb_array_elements(v_amr) as entry
     where entry ->> 'method' in ('otp', 'recovery')
  ) then
    return new;
  end if;

  raise exception 'Verify your email OTP before changing account verification.'
    using errcode = '42501';
end;
$$;

drop trigger if exists profiles_prevent_unverified_change on public.profiles;
create trigger profiles_prevent_unverified_change
  before update on public.profiles
  for each row execute function public.prevent_unverified_change();
