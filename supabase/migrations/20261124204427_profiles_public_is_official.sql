create or replace view public.profiles_public as
 select user_id, username, display_name, avatar_url, bio, location, created_at,
        coalesce(is_admin, false) as is_official
   from public.profiles;
