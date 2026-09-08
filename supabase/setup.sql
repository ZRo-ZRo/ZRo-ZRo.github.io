-- ZRo-ZRo production database setup
-- Run this file once in Supabase SQL Editor.
-- Afterward create your Owner user in Authentication, then add its UUID to public.owner_users.

begin;

create extension if not exists pgcrypto;

create table if not exists public.owner_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.localizations (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  arabic_title text not null default '',
  category text not null default '',
  version text not null default '',
  status text not null default 'مكتمل',
  short_description text not null default '',
  description text not null default '',
  cover_url text not null default '',
  screenshots text[] not null default array['','','','']::text[],
  download_url text not null,
  featured boolean not null default false,
  views bigint not null default 0 check (views >= 0),
  downloads bigint not null default 0 check (downloads >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint localizations_slug_format check (slug ~ '^[a-z0-9\u0600-\u06ff]+(?:-[a-z0-9\u0600-\u06ff]+)*$'),
  constraint localizations_title_len check (char_length(title) between 1 and 180),
  constraint localizations_slug_len check (char_length(slug) between 1 and 180),
  constraint localizations_screenshots_max check (cardinality(screenshots) <= 4)
);

create index if not exists localizations_featured_created_idx
  on public.localizations (featured desc, created_at desc);
create index if not exists localizations_category_idx
  on public.localizations (category);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_localizations_updated_at on public.localizations;
create trigger trg_localizations_updated_at
before update on public.localizations
for each row execute function public.set_updated_at();

create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.owner_users o
    where o.user_id = auth.uid()
  );
$$;

revoke all on function public.is_owner() from public;
grant execute on function public.is_owner() to authenticated;

alter table public.owner_users enable row level security;
alter table public.localizations enable row level security;

-- Owner table: only an authenticated owner may read it.
drop policy if exists "owner_users_select_owner" on public.owner_users;
create policy "owner_users_select_owner"
on public.owner_users
for select
to authenticated
using (public.is_owner());

-- Public library is readable by everyone.
drop policy if exists "localizations_public_read" on public.localizations;
create policy "localizations_public_read"
on public.localizations
for select
to anon, authenticated
using (true);

-- Only Owner accounts can write library content.
drop policy if exists "localizations_owner_insert" on public.localizations;
create policy "localizations_owner_insert"
on public.localizations
for insert
to authenticated
with check (public.is_owner());

drop policy if exists "localizations_owner_update" on public.localizations;
create policy "localizations_owner_update"
on public.localizations
for update
to authenticated
using (public.is_owner())
with check (public.is_owner());

drop policy if exists "localizations_owner_delete" on public.localizations;
create policy "localizations_owner_delete"
on public.localizations
for delete
to authenticated
using (public.is_owner());

-- Public counters are increment-only through fixed RPCs.
create or replace function public.increment_localization_views(row_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.localizations
  set views = views + 1
  where id = row_id;
$$;

create or replace function public.increment_localization_downloads(row_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.localizations
  set downloads = downloads + 1
  where id = row_id;
$$;

revoke all on function public.increment_localization_views(uuid) from public;
revoke all on function public.increment_localization_downloads(uuid) from public;
grant execute on function public.increment_localization_views(uuid) to anon, authenticated;
grant execute on function public.increment_localization_downloads(uuid) to anon, authenticated;

-- Public media bucket. Upload/delete remains Owner-only through storage RLS.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'zro-zro-media',
  'zro-zro-media',
  true,
  8388608,
  array['image/jpeg','image/png','image/webp','image/avif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "zrozro_media_owner_insert" on storage.objects;
create policy "zrozro_media_owner_insert"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'zro-zro-media' and public.is_owner());

drop policy if exists "zrozro_media_owner_update" on storage.objects;
create policy "zrozro_media_owner_update"
on storage.objects
for update
to authenticated
using (bucket_id = 'zro-zro-media' and public.is_owner())
with check (bucket_id = 'zro-zro-media' and public.is_owner());

drop policy if exists "zrozro_media_owner_delete" on storage.objects;
create policy "zrozro_media_owner_delete"
on storage.objects
for delete
to authenticated
using (bucket_id = 'zro-zro-media' and public.is_owner());

commit;

-- ============================================================
-- OWNER BOOTSTRAP (run only after creating the Owner account)
-- Replace the UUID below with the user's UUID from Supabase Auth > Users.
-- Example:
-- insert into public.owner_users (user_id)
-- values ('00000000-0000-0000-0000-000000000000')
-- on conflict (user_id) do nothing;
-- ============================================================
