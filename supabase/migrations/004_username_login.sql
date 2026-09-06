-- ============================================================
-- Migration 004: Username login
-- Users sign up with a username (plus email) and log in with
-- username + password. Supabase auth is email-based under the
-- hood, so we store the username in profiles and resolve it to
-- the account email with a security-definer function.
-- ============================================================

-- 1. USERNAME COLUMN — unique (case-insensitive) per user
-- ============================================================
alter table public.profiles add column username text;

create unique index idx_profiles_username_lower
  on public.profiles (lower(username));

-- 2. STORE USERNAME ON SIGNUP — extend the existing trigger
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, name, username, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    coalesce(new.raw_user_meta_data ->> 'username', null),
    coalesce(new.raw_user_meta_data ->> 'role', 'student')
  );
  return new;
end;
$$;

-- 3. BACKFILL — give existing users a username (email prefix)
-- Only where that prefix is not already taken, so the unique
-- index above is never violated.
-- ============================================================
update public.profiles p
set username = split_part(u.email, '@', 1)
from auth.users u
where p.id = u.id
  and (p.username is null or p.username = '')
  and not exists (
    select 1
    from public.profiles p2
    join auth.users u2 on u2.id = p2.id
    where lower(split_part(u2.email, '@', 1)) = lower(split_part(u.email, '@', 1))
      and p2.id <> p.id
  );

-- 4. USERNAME -> EMAIL LOOKUP — used by the login page.
-- SECURITY DEFINER so the anon key can read auth.users; only
-- exposes the email for usernames that exist.
-- ============================================================
create or replace function public.get_email_by_username(p_username text)
returns text
language sql
security definer
set search_path = ''
as $$
  select u.email
  from public.profiles p
  join auth.users u on u.id = p.id
  where lower(p.username) = lower(p_username)
  limit 1;
$$;

grant execute on function public.get_email_by_username(text) to anon, authenticated;