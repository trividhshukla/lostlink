-- LostLink Phase 3 & 4 — Matching Engine, Quota Reservation, and Notifications Schema
-- Canonical source: ARCHITECTURE.md, DATABASE_DESIGN.md, PRD.md

-- 1. MATCH LABEL ENUM
do $$ begin
  if not exists (select 1 from pg_type where typname = 'match_label') then
    create type public.match_label as enum ('possible', 'good', 'strong');
  end if;
end $$;

-- 2. MATCHES TABLE
create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  lost_report_id uuid not null references public.reports(id) on delete cascade,
  found_report_id uuid not null references public.reports(id) on delete cascade,
  label public.match_label not null,
  reasons jsonb not null default '[]'::jsonb,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  constraint matches_pair_unique unique (lost_report_id, found_report_id)
);

create index if not exists idx_matches_lost on public.matches (lost_report_id);
create index if not exists idx_matches_found on public.matches (found_report_id);

-- 3. AI MATCH USAGE (Atomic Daily Quota Ledger)
create table if not exists public.ai_match_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  report_id uuid not null references public.reports(id) on delete cascade,
  quota_day date not null,
  request_key text not null unique,
  outcome text not null check (outcome in ('ok', 'timeout', 'rate_limited', 'invalid_response', 'unavailable')),
  created_at timestamptz default now() not null
);

create index if not exists idx_ai_match_usage_user_day on public.ai_match_usage (user_id, quota_day);

-- 4. NOTIFICATIONS TABLE (Strict Idempotency)
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('new_match', 'match_updated', 'claim_received', 'claim_accepted', 'handover_confirmed')),
  report_id uuid references public.reports(id) on delete cascade,
  match_id uuid references public.matches(id) on delete cascade,
  claim_id uuid, -- Nullable ready for Phase 5 claims
  idempotency_key text not null unique,
  title text not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz default now() not null
);

create index if not exists idx_notifications_user on public.notifications (user_id, read_at, created_at desc);

-- 5. ROW LEVEL SECURITY (RLS)
alter table public.matches enable row level security;
alter table public.ai_match_usage enable row level security;
alter table public.notifications enable row level security;

-- Matches: Readable by owner of either report in pair AND both active/visible
create policy "Matches readable by pair owners"
  on public.matches for select
  to authenticated
  using (
    exists (
      select 1 from public.reports r
      where (r.id = matches.lost_report_id or r.id = matches.found_report_id)
        and r.owner_id = auth.uid()
        and r.moderation_state = 'visible'
    )
    or public.is_admin(auth.uid())
  );

-- Notifications: Recipient only
create policy "Notifications readable by recipient"
  on public.notifications for select
  to authenticated
  using (user_id = auth.uid());

create policy "Notifications updatable by recipient"
  on public.notifications for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- AI Match Usage: Viewable by owner
create policy "AI match usage viewable by owner"
  on public.ai_match_usage for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin(auth.uid()));

-- 6. CANDIDATE SELECTION FUNCTION
-- Up to 15 active, visible, opposite-type reports within 90 days
-- MAT-UNIT-11: Excludes restricted 'ID cards and documents' from candidate payloads
create or replace function public.get_matching_candidates(p_report_id uuid)
returns table (
  id uuid,
  report_type public.report_type,
  title text,
  description text,
  category_id smallint,
  category_label text,
  category_group text,
  primary_color text,
  brand text,
  distinctive_features text,
  campus_area_id uuid,
  campus_area_label text,
  location_note text,
  occurred_at timestamptz
) language plpgsql security definer stable as $$
declare
  v_source public.reports;
  v_source_group text;
begin
  select * into v_source from public.reports where reports.id = p_report_id;
  if not found then
    return;
  end if;

  select c.group_slug into v_source_group
  from public.categories c
  where c.id = v_source.category_id;

  return query
  select
    r.id,
    r.report_type,
    r.title,
    r.description,
    r.category_id,
    c.label as category_label,
    c.group_slug as category_group,
    r.primary_color,
    r.brand,
    r.distinctive_features,
    r.campus_area_id,
    ca.label as campus_area_label,
    r.location_note,
    r.occurred_at
  from public.reports r
  join public.categories c on c.id = r.category_id
  join public.campus_areas ca on ca.id = r.campus_area_id
  where r.campus_id = v_source.campus_id
    and r.report_type != v_source.report_type
    and r.status = 'active'
    and r.moderation_state = 'visible'
    and r.owner_id != v_source.owner_id
    and r.occurred_at >= now() - interval '90 days'
  order by
    -- Prioritize matching group, same campus area, or same colour
    (case when c.group_slug = v_source_group then 3 else 0 end +
     case when r.campus_area_id = v_source.campus_area_id then 2 else 0 end +
     case when r.primary_color is not null and r.primary_color = v_source.primary_color then 2 else 0 end) desc,
    r.occurred_at desc
  limit 15;
end;
$$;

-- 7. ATOMIC AI MATCH QUOTA RESERVATION FUNCTION
-- Asia/Kolkata boundary. 5/user/day, 100/global/day
create or replace function public.reserve_ai_match_quota(
  p_user_id uuid,
  p_report_id uuid,
  p_request_key text
)
returns boolean language plpgsql security definer as $$
declare
  v_today date;
  v_user_count int;
  v_global_count int;
begin
  -- Local day boundary in Asia/Kolkata
  v_today := (timezone('Asia/Kolkata', now()))::date;

  -- Check existing reservation for idempotency
  if exists (select 1 from public.ai_match_usage where request_key = p_request_key) then
    return true;
  end if;

  -- User limit check (max 5)
  select count(*) into v_user_count
  from public.ai_match_usage
  where user_id = p_user_id and quota_day = v_today;

  if v_user_count >= 5 then
    return false;
  end if;

  -- Global limit check (max 100)
  select count(*) into v_global_count
  from public.ai_match_usage
  where quota_day = v_today;

  if v_global_count >= 100 then
    return false;
  end if;

  -- Insert reservation atomically
  insert into public.ai_match_usage (
    user_id, report_id, quota_day, request_key, outcome
  ) values (
    p_user_id, p_report_id, v_today, p_request_key, 'ok'
  );

  return true;
end;
$$;

-- 8. RECORD AI MATCH USAGE OUTCOME
create or replace function public.record_ai_match_usage(
  p_request_key text,
  p_outcome text
)
returns void language plpgsql security definer as $$
begin
  update public.ai_match_usage
  set outcome = p_outcome
  where request_key = p_request_key;
end;
$$;

-- 9. FINISH MATCHING & NOTIFICATIONS TRANSACTION
-- Saves validated pairs, updates matching status, logs events, and creates idempotent notifications
create or replace function public.finish_matching(
  p_report_id uuid,
  p_matches jsonb,
  p_matching_status public.matching_status
)
returns void language plpgsql security definer as $$
declare
  v_source public.reports;
  v_item jsonb;
  v_lost_id uuid;
  v_found_id uuid;
  v_label public.match_label;
  v_reasons jsonb;
  v_match_id uuid;
  v_lost_owner uuid;
  v_found_owner uuid;
  v_lost_title text;
  v_found_title text;
  v_notif_key_lost text;
  v_notif_key_found text;
begin
  select * into v_source from public.reports where id = p_report_id;
  if not found then
    raise exception 'Report not found';
  end if;

  -- Process match suggestions
  for v_item in select * from jsonb_array_elements(p_matches) loop
    v_lost_id := (v_item->>'lost_report_id')::uuid;
    v_found_id := (v_item->>'found_report_id')::uuid;
    v_label := (v_item->>'label')::public.match_label;
    v_reasons := coalesce(v_item->'reasons', '[]'::jsonb);

    -- Upsert match pair (stores only label and reasons, never numeric score)
    insert into public.matches (
      lost_report_id, found_report_id, label, reasons, updated_at
    ) values (
      v_lost_id, v_found_id, v_label, v_reasons, now()
    )
    on conflict (lost_report_id, found_report_id) do update set
      label = excluded.label,
      reasons = excluded.reasons,
      updated_at = now()
    returning id into v_match_id;

    -- Fetch owners and titles for notifications
    select owner_id, title into v_lost_owner, v_lost_title from public.reports where id = v_lost_id;
    select owner_id, title into v_found_owner, v_found_title from public.reports where id = v_found_id;

    -- Notification for Lost Report Owner
    if v_lost_owner is not null then
      v_notif_key_lost := 'match:' || v_match_id || ':user:' || v_lost_owner;
      insert into public.notifications (
        user_id, type, report_id, match_id, idempotency_key, title, body
      ) values (
        v_lost_owner, 'new_match', v_lost_id, v_match_id, v_notif_key_lost,
        'Potential match found for your lost item',
        'A campus listing "' || v_found_title || '" may match your lost report "' || v_lost_title || '".'
      )
      on conflict (idempotency_key) do nothing;
    end if;

    -- Notification for Found Report Owner
    if v_found_owner is not null then
      v_notif_key_found := 'match:' || v_match_id || ':user:' || v_found_owner;
      insert into public.notifications (
        user_id, type, report_id, match_id, idempotency_key, title, body
      ) values (
        v_found_owner, 'new_match', v_found_id, v_match_id, v_notif_key_found,
        'Your found item has a potential match',
        'A member reported losing "' || v_lost_title || '", which may correspond to your found listing.'
      )
      on conflict (idempotency_key) do nothing;
    end if;
  end loop;

  -- Update report matching state
  update public.reports set
    matching_status = p_matching_status,
    matching_finished_at = now(),
    updated_at = now()
  where id = p_report_id;

  -- Record report timeline event
  insert into public.report_events (
    report_id, actor_id, event_type, safe_public_metadata
  ) values (
    p_report_id, v_source.owner_id, 'matched', jsonb_build_object(
      'matches_count', jsonb_array_length(p_matches),
      'matching_status', p_matching_status
    )
  );
end;
$$;
