-- ─────────────────────────────────────────────────────────────────────────────
-- 004_profile_hardening.sql — Safe profile column alignment
--
-- Idempotent. Run after any partial schema that may lack name/avatar columns.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── Ensure columns exist ────────────────────────────────────────────────────

alter table public.profiles
  add column if not exists email               text,
  add column if not exists full_name           text,
  add column if not exists avatar_url          text,
  add column if not exists display_name        text,
  add column if not exists onboarding_complete boolean not null default false;

-- ─── Backfill from legacy display_name ───────────────────────────────────────

update public.profiles
set full_name = display_name
where full_name is null
  and display_name is not null
  and display_name <> '';

-- ─── OAuth-aware profile creation trigger ────────────────────────────────────

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  v_full_name text;
  v_avatar    text;
begin
  v_full_name := coalesce(
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'name', ''),
    nullif(new.raw_user_meta_data ->> 'display_name', '')
  );

  v_avatar := coalesce(
    nullif(new.raw_user_meta_data ->> 'avatar_url', ''),
    nullif(new.raw_user_meta_data ->> 'picture', '')
  );

  insert into public.profiles (id, email, full_name, display_name, avatar_url)
  values (
    new.id,
    new.email,
    v_full_name,
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), v_full_name),
    v_avatar
  )
  on conflict (id) do update set
    email        = coalesce(excluded.email, public.profiles.email),
    full_name    = coalesce(public.profiles.full_name, excluded.full_name),
    display_name = coalesce(public.profiles.display_name, excluded.display_name),
    avatar_url   = coalesce(public.profiles.avatar_url, excluded.avatar_url),
    updated_at   = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── Sync helper for existing OAuth users (run once, safe to re-run) ─────────

update public.profiles p
set
  full_name = coalesce(
    p.full_name,
    u.raw_user_meta_data ->> 'full_name',
    u.raw_user_meta_data ->> 'name',
    u.raw_user_meta_data ->> 'display_name'
  ),
  display_name = coalesce(
    p.display_name,
    u.raw_user_meta_data ->> 'display_name',
    u.raw_user_meta_data ->> 'full_name',
    u.raw_user_meta_data ->> 'name'
  ),
  avatar_url = coalesce(
    p.avatar_url,
    u.raw_user_meta_data ->> 'avatar_url',
    u.raw_user_meta_data ->> 'picture'
  ),
  email = coalesce(p.email, u.email),
  updated_at = now()
from auth.users u
where u.id = p.id
  and (
    p.full_name is null
    or p.avatar_url is null
    or p.display_name is null
    or p.email is null
  );
