create or replace function public.is_reserved_name(_name text)
returns boolean language sql immutable set search_path = public as $$
  with n as (
    select translate(lower(regexp_replace(coalesce(_name,''), '[^a-zA-Z0-9]', '', 'g')), '013457', 'oleast') as v
  )
  select v ~ '(prelovedkick|admin|support|trustandsafety|trustsafety|moderator|official|staff|verification|customerservice|security)'
      or v in ('help','team','system','mod','mods','verify','safety','trust','plk')
  from n
$$;

-- enforce_reserved_names() is defined in 20261124203948_reserved_usernames_fix_privilege_check.sql
create or replace function public.enforce_reserved_names()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  return new;
end;
$$;

drop trigger if exists enforce_reserved_names on public.profiles;
create trigger enforce_reserved_names
  before insert or update of username, display_name on public.profiles
  for each row execute function public.enforce_reserved_names();

-- Clients should never set these on insert (profiles are created by the signup trigger)
revoke insert (is_admin, stripe_connect_id, stripe_connect_enabled, scanning_enabled,
  scanning_purchased_at, scanning_payment_intent_id, referral_rewarded)
  on public.profiles from anon, authenticated;
revoke insert on public.profiles from anon;
