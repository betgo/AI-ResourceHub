create extension if not exists pgcrypto;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'resource_status'
      and n.nspname = 'public'
  ) then
    create type public.resource_status as enum ('pending', 'published', 'rejected');
  end if;
end
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  created_at timestamptz not null default now(),
  constraint categories_name_key unique (name),
  constraint categories_slug_key unique (slug)
);

create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  created_at timestamptz not null default now(),
  constraint tags_name_key unique (name),
  constraint tags_slug_key unique (slug)
);

create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  title text not null,
  description text not null,
  file_url text not null,
  cover_url text,
  status public.resource_status not null default 'pending',
  review_reason text,
  published_at timestamptz,
  rejected_at timestamptz,
  download_count integer not null default 0 check (download_count >= 0),
  favorite_count integer not null default 0 check (favorite_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search_vector tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(description, '')), 'B')
  ) stored
);

create table if not exists public.resource_tags (
  resource_id uuid not null references public.resources(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (resource_id, tag_id)
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.resources(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null check (char_length(trim(content)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  resource_id uuid not null references public.resources(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, resource_id)
);

create table if not exists public.downloads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  resource_id uuid not null references public.resources(id) on delete cascade,
  ip_hash text,
  created_at timestamptz not null default now()
);

create index if not exists idx_resources_status on public.resources (status);
create index if not exists idx_resources_category_id on public.resources (category_id);
create index if not exists idx_resources_created_at on public.resources (created_at desc);
create index if not exists idx_resources_search_vector on public.resources using gin (search_vector);

create index if not exists idx_resource_tags_tag_id on public.resource_tags (tag_id);
create index if not exists idx_comments_resource_id_created_at on public.comments (resource_id, created_at desc);
create index if not exists idx_favorites_resource_id on public.favorites (resource_id);
create index if not exists idx_downloads_resource_id_created_at on public.downloads (resource_id, created_at desc);

drop trigger if exists set_resources_updated_at on public.resources;
create trigger set_resources_updated_at
before update on public.resources
for each row
execute function public.set_updated_at();

drop trigger if exists set_comments_updated_at on public.comments;
create trigger set_comments_updated_at
before update on public.comments
for each row
execute function public.set_updated_at();
