-- LostLink Phase 2 — Core Schema & Seed Migration
-- Canonical source: DATABASE_DESIGN.md & LOSTLINK_PROJECT_CONTEXT.md

-- 1. EXTENSIONS
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- 2. ENUMERATED TYPES
do $$ begin
  if not exists (select 1 from pg_type where typname = 'report_type') then
    create type report_type as enum ('lost', 'found');
  end if;
  if not exists (select 1 from pg_type where typname = 'report_status') then
    create type report_status as enum ('active', 'claim_accepted', 'resolved', 'closed');
  end if;
  if not exists (select 1 from pg_type where typname = 'moderation_state') then
    create type moderation_state as enum ('visible', 'hidden');
  end if;
  if not exists (select 1 from pg_type where typname = 'photo_visibility') then
    create type photo_visibility as enum ('public', 'restricted');
  end if;
  if not exists (select 1 from pg_type where typname = 'matching_status') then
    create type matching_status as enum ('pending', 'running', 'complete', 'degraded', 'failed');
  end if;
end $$;

-- 3. REFERENCE TABLES

-- Campuses
create table if not exists public.campuses (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  created_at timestamptz default now() not null
);

-- Campus Areas (12 approved areas)
create table if not exists public.campus_areas (
  id uuid primary key default gen_random_uuid(),
  campus_id uuid not null references public.campuses(id) on delete cascade,
  slug text not null,
  label text not null,
  sort_order int not null,
  is_active boolean default true not null,
  constraint campus_areas_campus_slug_key unique (campus_id, slug)
);

-- Categories (17 approved categories)
create table if not exists public.categories (
  id smallint generated always as identity primary key,
  slug text unique not null,
  label text not null,
  group_slug text not null,
  photo_visibility public.photo_visibility default 'public' not null,
  sort_order int not null,
  is_active boolean default true not null
);

-- App Settings
create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz default now() not null
);

-- 4. PROFILES & ROLES

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 40),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table if not exists public.user_roles (
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('admin')),
  created_at timestamptz default now() not null,
  primary key (user_id, role)
);

-- Admin check helper
create or replace function public.is_admin(p_user_id uuid default auth.uid())
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.user_roles
    where user_id = p_user_id and role = 'admin'
  );
$$;

-- Automatic profile creation on auth sign-up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'display_name'), ''),
      split_part(new.email, '@', 1)
    )
  )
  on conflict (id) do update
  set display_name = excluded.display_name,
      updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert or update of raw_user_meta_data on auth.users
  for each row execute function public.handle_new_user();

-- 5. REPORTS TABLE

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  campus_id uuid not null references public.campuses(id) on delete restrict,
  report_type public.report_type not null,
  status public.report_status default 'active' not null,
  moderation_state public.moderation_state default 'visible' not null,
  hidden_at timestamptz,
  hidden_by uuid references public.profiles(id),
  hidden_reason text,
  title text not null check (char_length(title) between 3 and 100),
  description text not null check (char_length(description) between 10 and 1500),
  category_id smallint not null references public.categories(id),
  primary_color text check (
    primary_color is null or primary_color in (
      'black', 'white', 'grey', 'silver', 'gold', 'brown', 'beige',
      'red', 'pink', 'orange', 'yellow', 'green', 'blue', 'purple',
      'multicolor', 'transparent', 'other'
    )
  ),
  brand text check (brand is null or char_length(brand) <= 60),
  distinctive_features text check (distinctive_features is null or char_length(distinctive_features) <= 300),
  campus_area_id uuid not null references public.campus_areas(id),
  location_note text check (location_note is null or char_length(location_note) <= 120),
  occurred_at timestamptz not null check (occurred_at <= now() + interval '5 minutes'),
  matching_status public.matching_status default 'pending' not null,
  matching_started_at timestamptz,
  matching_finished_at timestamptz,
  client_request_id uuid,
  request_fingerprint text,
  pending_claim_count int default 0 not null,
  closed_at timestamptz,
  closed_reason text,
  resolved_at timestamptz,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  constraint reports_owner_client_request_key unique (owner_id, client_request_id)
);

-- Indexes for Explore queries and User dashboards
create index if not exists idx_reports_explore
  on public.reports (campus_id, report_type, status, moderation_state, occurred_at desc);

create index if not exists idx_reports_owner
  on public.reports (owner_id, status, created_at desc);

create index if not exists idx_reports_category_area
  on public.reports (category_id, campus_area_id, occurred_at desc);

-- 6. REPORT IMAGES TABLE

create table if not exists public.report_images (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null unique references public.reports(id) on delete cascade,
  bucket_id text default 'report-images' not null,
  object_path text unique not null,
  sha256 text not null,
  bytes int not null check (bytes > 0 and bytes <= 2097152), -- max 2MB hard limit
  width int not null check (width > 0),
  height int not null check (height > 0),
  removed_at timestamptz,
  created_at timestamptz default now() not null
);

-- 7. REPORT EVENTS (Audit Timeline)

create table if not exists public.report_events (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  event_type text not null check (event_type in ('created', 'edited', 'closed', 'resolved', 'reopened', 'matched', 'claim_submitted', 'claim_accepted', 'claim_rejected', 'claim_withdrawn', 'handover_cancelled', 'moderation_hidden', 'moderation_restored')),
  safe_public_metadata jsonb default '{}'::jsonb not null,
  created_at timestamptz default now() not null
);

create index if not exists idx_report_events_report
  on public.report_events (report_id, created_at asc);

-- 8. STORAGE BUCKET INITIALIZATION
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'report-images',
  'report-images',
  false,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = false,
  file_size_limit = 2097152,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

-- 9. NAMED SQL FUNCTIONS (Secure Transactions)

-- Create Report (Lost: 0 photos; Found: exactly 1 photo)
create or replace function public.create_report(
  p_owner_id uuid,
  p_campus_id uuid,
  p_report_type public.report_type,
  p_title text,
  p_description text,
  p_category_id smallint,
  p_primary_color text,
  p_brand text,
  p_distinctive_features text,
  p_campus_area_id uuid,
  p_location_note text,
  p_occurred_at timestamptz,
  p_client_request_id uuid,
  p_request_fingerprint text,
  p_image_object_path text default null,
  p_image_sha256 text default null,
  p_image_bytes int default null,
  p_image_width int default null,
  p_image_height int default null
)
returns public.reports language plpgsql security definer as $$
declare
  v_report public.reports;
  v_category public.categories;
begin
  -- Caller authorization check
  if auth.uid() is distinct from p_owner_id and not public.is_admin(auth.uid()) then
    raise exception 'Unauthorized: Owner ID must match current session user';
  end if;

  -- Validate Category
  select * into v_category from public.categories where id = p_category_id and is_active = true;
  if not found then
    raise exception 'Invalid or inactive category';
  end if;

  -- Idempotency check
  if p_client_request_id is not null then
    select * into v_report from public.reports
    where owner_id = p_owner_id and client_request_id = p_client_request_id;
    if found then
      return v_report;
    end if;
  end if;

  -- Rule: Lost report must have NO photo
  if p_report_type = 'lost' and p_image_object_path is not null then
    raise exception 'Lost reports cannot have an uploaded image';
  end if;

  -- Rule: Found report requires exactly 1 photo
  if p_report_type = 'found' and p_image_object_path is null then
    raise exception 'Found reports require an image';
  end if;

  -- Insert Report
  insert into public.reports (
    owner_id, campus_id, report_type, title, description,
    category_id, primary_color, brand, distinctive_features,
    campus_area_id, location_note, occurred_at,
    client_request_id, request_fingerprint, matching_status
  ) values (
    p_owner_id, p_campus_id, p_report_type, trim(p_title), trim(p_description),
    p_category_id, p_primary_color, nullif(trim(p_brand), ''), nullif(trim(p_distinctive_features), ''),
    p_campus_area_id, nullif(trim(p_location_note), ''), p_occurred_at,
    p_client_request_id, p_request_fingerprint, 'pending'
  ) returning * into v_report;

  -- If Found, insert Report Image
  if p_report_type = 'found' then
    insert into public.report_images (
      report_id, bucket_id, object_path, sha256, bytes, width, height
    ) values (
      v_report.id, 'report-images', p_image_object_path, p_image_sha256,
      p_image_bytes, p_image_width, p_image_height
    );
  end if;

  -- Record Timeline Event
  insert into public.report_events (
    report_id, actor_id, event_type, safe_public_metadata
  ) values (
    v_report.id, p_owner_id, 'created', jsonb_build_object(
      'report_type', p_report_type,
      'has_photo', (p_image_object_path is not null)
    )
  );

  return v_report;
end;
$$;

-- Edit Report (Owner only, Active only)
create or replace function public.edit_report(
  p_report_id uuid,
  p_title text,
  p_description text,
  p_category_id smallint,
  p_primary_color text,
  p_brand text,
  p_distinctive_features text,
  p_campus_area_id uuid,
  p_location_note text,
  p_occurred_at timestamptz
)
returns public.reports language plpgsql security definer as $$
declare
  v_report public.reports;
begin
  select * into v_report from public.reports where id = p_report_id;
  if not found then
    raise exception 'Report not found';
  end if;

  if v_report.owner_id is distinct from auth.uid() and not public.is_admin(auth.uid()) then
    raise exception 'Unauthorized: Only report owner can edit';
  end if;

  if v_report.status != 'active' then
    raise exception 'Cannot edit report: Only active reports can be edited';
  end if;

  update public.reports set
    title = trim(p_title),
    description = trim(p_description),
    category_id = p_category_id,
    primary_color = p_primary_color,
    brand = nullif(trim(p_brand), ''),
    distinctive_features = nullif(trim(p_distinctive_features), ''),
    campus_area_id = p_campus_area_id,
    location_note = nullif(trim(p_location_note), ''),
    occurred_at = p_occurred_at,
    matching_status = 'pending', -- Flag for re-matching
    updated_at = now()
  where id = p_report_id
  returning * into v_report;

  insert into public.report_events (
    report_id, actor_id, event_type, safe_public_metadata
  ) values (
    p_report_id, auth.uid(), 'edited', jsonb_build_object('timestamp', now())
  );

  return v_report;
end;
$$;

-- Close Report (Owner or Admin)
create or replace function public.close_report(
  p_report_id uuid,
  p_reason text
)
returns public.reports language plpgsql security definer as $$
declare
  v_report public.reports;
begin
  select * into v_report from public.reports where id = p_report_id;
  if not found then
    raise exception 'Report not found';
  end if;

  if v_report.owner_id is distinct from auth.uid() and not public.is_admin(auth.uid()) then
    raise exception 'Unauthorized: Only report owner or admin can close report';
  end if;

  if v_report.status != 'active' then
    raise exception 'Report is not active';
  end if;

  update public.reports set
    status = 'closed',
    closed_at = now(),
    closed_reason = nullif(trim(p_reason), ''),
    updated_at = now()
  where id = p_report_id
  returning * into v_report;

  insert into public.report_events (
    report_id, actor_id, event_type, safe_public_metadata
  ) values (
    p_report_id, auth.uid(), 'closed', jsonb_build_object('reason', nullif(trim(p_reason), ''))
  );

  return v_report;
end;
$$;

-- 10. ROW LEVEL SECURITY (RLS) POLICIES

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.campuses enable row level security;
alter table public.campus_areas enable row level security;
alter table public.categories enable row level security;
alter table public.app_settings enable row level security;
alter table public.reports enable row level security;
alter table public.report_images enable row level security;
alter table public.report_events enable row level security;

-- Profiles: Members can read display names, owners can update their own
create policy "Profiles are viewable by authenticated users"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Roles: Viewable by authenticated users
create policy "User roles viewable by authenticated users"
  on public.user_roles for select
  to authenticated
  using (true);

-- Reference Tables: Viewable by authenticated users
create policy "Campuses viewable by authenticated" on public.campuses for select to authenticated using (true);
create policy "Campus areas viewable by authenticated" on public.campus_areas for select to authenticated using (true);
create policy "Categories viewable by authenticated" on public.categories for select to authenticated using (true);
create policy "App settings viewable by authenticated" on public.app_settings for select to authenticated using (true);

-- Reports:
-- Visitors have zero access.
-- Authenticated members can read visible reports OR their own reports (even if hidden).
create policy "Reports readable by authenticated members"
  on public.reports for select
  to authenticated
  using (
    (moderation_state = 'visible' and status in ('active', 'claim_accepted', 'resolved', 'closed'))
    or (owner_id = auth.uid())
    or public.is_admin(auth.uid())
  );

-- Report Images:
-- Readable if report is readable AND (category is public OR viewer is owner/admin)
create policy "Report images viewable by authorized members"
  on public.report_images for select
  to authenticated
  using (
    removed_at is null
    and exists (
      select 1 from public.reports r
      join public.categories c on c.id = r.category_id
      where r.id = report_images.report_id
        and (
          (r.moderation_state = 'visible' and c.photo_visibility = 'public')
          or (r.owner_id = auth.uid())
          or public.is_admin(auth.uid())
        )
    )
  );

-- Report Events: Viewable by authenticated users who can view the report
create policy "Report events viewable by report readers"
  on public.report_events for select
  to authenticated
  using (
    exists (
      select 1 from public.reports r
      where r.id = report_events.report_id
        and (r.moderation_state = 'visible' or r.owner_id = auth.uid() or public.is_admin(auth.uid()))
    )
  );

-- Storage Objects Policies for report-images bucket
create policy "Authenticated users can upload report images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'report-images');

create policy "Authorized users can read report images via signed urls"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'report-images');

-- 11. APPROVED SEED DATA

-- Single Campus
insert into public.campuses (slug, name)
values ('campus-main', 'Campus')
on conflict (slug) do nothing;

-- 12 Approved Campus Areas
insert into public.campus_areas (campus_id, slug, label, sort_order)
select c.id, a.slug, a.label, a.sort_order
from public.campuses c
cross join (values
  ('block-a', 'BLOCK A', 1),
  ('block-b', 'BLOCK B', 2),
  ('block-c', 'BLOCK C', 3),
  ('block-d', 'BLOCK D', 4),
  ('block-e', 'BLOCK E', 5),
  ('library', 'Library', 6),
  ('sports-ground', 'Sports Ground', 7),
  ('canteen', 'Canteen', 8),
  ('main-gate', 'Main Gate', 9),
  ('cde-ground', 'CDE Ground', 10),
  ('fountain', 'Fountain', 11),
  ('other', 'Other', 12)
) as a(slug, label, sort_order)
where c.slug = 'campus-main'
on conflict (campus_id, slug) do update set
  label = excluded.label,
  sort_order = excluded.sort_order;

-- 17 Approved Categories
insert into public.categories (slug, label, group_slug, photo_visibility, sort_order)
values
  ('phones-tablets', 'Phones and tablets', 'electronics', 'public', 1),
  ('laptops-computers', 'Laptops and computers', 'electronics', 'public', 2),
  ('headphones-earbuds', 'Headphones and earbuds', 'electronics', 'public', 3),
  ('chargers-cables', 'Chargers and cables', 'electronics', 'public', 4),
  ('other-electronics', 'Other electronics', 'electronics', 'public', 5),
  ('bags-backpacks', 'Bags and backpacks', 'carry', 'public', 6),
  ('wallets-purses', 'Wallets and purses', 'carry', 'public', 7),
  ('id-cards-documents', 'ID cards and documents', 'documents', 'restricted', 8),
  ('keys-cards', 'Keys and key cards', 'keys', 'public', 9),
  ('water-bottles-lunch-boxes', 'Water bottles and lunch boxes', 'everyday', 'public', 10),
  ('books-stationery', 'Books and stationery', 'study', 'public', 11),
  ('clothing-accessories', 'Clothing and accessories', 'clothing', 'public', 12),
  ('jewelry-watches', 'Jewelry and watches', 'accessories', 'public', 13),
  ('glasses-sunglasses', 'Glasses and sunglasses', 'accessories', 'public', 14),
  ('sports-equipment', 'Sports equipment', 'sports', 'public', 15),
  ('umbrellas', 'Umbrellas', 'everyday', 'public', 16),
  ('other', 'Other', 'other', 'public', 17)
on conflict (slug) do update set
  label = excluded.label,
  group_slug = excluded.group_slug,
  photo_visibility = excluded.photo_visibility,
  sort_order = excluded.sort_order;

-- App Settings
insert into public.app_settings (key, value)
values
  ('app_timezone', '"Asia/Kolkata"'::jsonb),
  ('report_max_age_days', '90'::jsonb),
  ('ai_match_user_day_limit', '5'::jsonb),
  ('ai_match_global_day_limit', '100'::jsonb),
  ('matching_candidate_limit', '15'::jsonb),
  ('matching_result_limit', '5'::jsonb),
  ('matching_stale_minutes', '5'::jsonb),
  ('claim_max_pending', '5'::jsonb)
on conflict (key) do update set
  value = excluded.value,
  updated_at = now();
