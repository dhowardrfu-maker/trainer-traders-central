create or replace function public.enforce_reserved_names()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  jwt_role text := coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', '');
begin
  if coalesce(new.is_admin, false) then
    return new;
  end if;

  if tg_op = 'INSERT' then
    -- Signups: quietly swap a reserved name for a neutral one so signup never fails
    if public.is_reserved_name(new.username) then
      new.username := 'user' || substr(replace(new.user_id::text, '-', ''), 1, 8);
    end if;
    if public.is_reserved_name(new.display_name) then
      new.display_name := new.username;
    end if;
    return new;
  end if;

  -- Updates from the app (signed-in users) are checked; dashboard/service role and admins are not
  if jwt_role in ('authenticated', 'anon') and not public.is_profile_admin(auth.uid()) then
    if new.username is distinct from old.username and public.is_reserved_name(new.username) then
      raise exception 'That username is reserved. Please choose a different one.';
    end if;
    if new.display_name is distinct from old.display_name and public.is_reserved_name(new.display_name) then
      raise exception 'That display name is reserved. Please choose a different one.';
    end if;
  end if;
  return new;
end;
$$;
