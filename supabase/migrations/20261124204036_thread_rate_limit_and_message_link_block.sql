-- 1. Limit how many new conversations an account can start
create or replace function public.check_thread_rate_limit()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  jwt_role text := coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', '');
  starter uuid := coalesce(auth.uid(), new.buyer_id);
  account_age interval;
  last_hour integer;
  last_day integer;
begin
  if jwt_role <> 'authenticated' or public.is_profile_admin(starter) then
    return new;
  end if;

  select now() - created_at into account_age from auth.users where id = starter;

  select count(*) filter (where created_at > now() - interval '1 hour'),
         count(*) filter (where created_at > now() - interval '24 hours')
    into last_hour, last_day
  from public.threads
  where buyer_id = starter or seller_id = starter;

  if account_age < interval '24 hours' and last_day >= 3 then
    raise exception 'New accounts can only start 3 conversations in their first day. Please try again tomorrow.';
  end if;
  if last_hour >= 10 or last_day >= 30 then
    raise exception 'You have started a lot of conversations recently. Please wait a while before starting another.';
  end if;
  return new;
end;
$$;

drop trigger if exists check_thread_rate_limit on public.threads;
create trigger check_thread_rate_limit
  before insert on public.threads
  for each row execute function public.check_thread_rate_limit();

-- 2. Block links to other websites in messages (links to prelovedkicks.co.uk are allowed)
create or replace function public.message_has_external_link(_body text)
returns boolean language sql immutable set search_path = public as $$
  select regexp_replace(lower(coalesce(_body, '')), '(https?://)?(www\.)?prelovedkicks\.co\.uk\S*', '', 'g')
    ~ '(https?://|www\.|[a-z0-9-]+\.(com|co|uk|net|org|io|xyz|cfd|top|site|online|info|link|app|me|ly|gl|shop|store|click|live|biz|ru|cn|tk|ml|ga|cf|gq|sbs|icu|vip|club|page|dev|ai|gg|to|cc|in|eu|us|ws|su|pw|cyou|buzz|rest|mobi|lol)(\M|/))'
$$;

create or replace function public.check_message_links()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  jwt_role text := coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', '');
begin
  if jwt_role = 'authenticated'
     and not public.is_profile_admin(auth.uid())
     and public.message_has_external_link(new.body) then
    raise exception 'For your safety, links to other websites and email addresses can''t be sent in messages. Please keep the conversation on PrelovedKicks.';
  end if;
  return new;
end;
$$;

drop trigger if exists check_message_links on public.messages;
create trigger check_message_links
  before insert on public.messages
  for each row execute function public.check_message_links();
