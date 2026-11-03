-- ==============================================================================
-- LostLink Phase 6 Migration: Flags, Admin Moderation, Audited Access & Bookmarks
-- ==============================================================================

-- 1. ENUMS FOR FLAGS AND MODERATION (DATABASE_DESIGN.md Section 3)
do $$
begin
  if not exists (select 1 from pg_type where typname = 'flag_status') then
    create type public.flag_status as enum ('open', 'reviewing', 'actioned', 'dismissed');
  end if;

  if not exists (select 1 from pg_type where typname = 'flag_reason') then
    create type public.flag_reason as enum (
      'spam',
      'inappropriate',
      'suspicious_claim',
      'harassment',
      'personal_info',
      'other'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'flag_target_type') then
    create type public.flag_target_type as enum ('report', 'claim', 'conversation', 'message', 'profile');
  end if;
end;
$$;

-- 2. FLAGS TABLE
create table if not exists public.flags (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_type public.flag_target_type not null,
  target_id uuid not null,
  reason public.flag_reason not null,
  details text check (details is null or length(details) <= 1000),
  status public.flag_status not null default 'open',
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  resolution_notes text check (resolution_notes is null or length(resolution_notes) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. ADMIN ACTIONS AUDIT TABLE (DATABASE_DESIGN.md Section 10 & 11)
-- Strictly audited immutable log. NO ordinary client SELECT or INSERT policy.
create table if not exists public.admin_actions (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.profiles(id) on delete cascade,
  flag_id uuid references public.flags(id) on delete set null,
  target_type text not null,
  target_id uuid not null,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- 4. RATE LIMITS TABLE (DATABASE_DESIGN.md Section 10)
create table if not exists public.rate_limits (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  count int not null default 1,
  window_start timestamptz not null default now()
);

-- 5. BOOKMARKS TABLE (LOSTLINK_PROJECT_CONTEXT.md Section 11)
create table if not exists public.bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  report_id uuid not null references public.reports(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint uq_bookmarks_user_report unique (user_id, report_id)
);

-- 6. ENABLE RLS
alter table public.flags enable row level security;
alter table public.admin_actions enable row level security;
alter table public.rate_limits enable row level security;
alter table public.bookmarks enable row level security;

-- 7. RLS POLICIES FOR FLAGS
-- Reporters can see flags they created
drop policy if exists "Reporters can view their own flags" on public.flags;
create policy "Reporters can view their own flags"
  on public.flags for select
  to authenticated
  using (reporter_id = auth.uid());

-- Admins can view and update all flags
drop policy if exists "Admins can view all flags" on public.flags;
create policy "Admins can view all flags"
  on public.flags for select
  to authenticated
  using (public.is_admin(auth.uid()));

drop policy if exists "Admins can update flags" on public.flags;
create policy "Admins can update flags"
  on public.flags for update
  to authenticated
  using (public.is_admin(auth.uid()));

-- RLS FOR ADMIN ACTIONS
-- DATABASE_DESIGN.md Section 11: "no normal member policy. Every private-content read writes an audit row."
-- No client INSERT policy; inserts happen via SECURITY DEFINER functions only.
-- Admins can query audit log only.
drop policy if exists "Admins can view audit log" on public.admin_actions;
create policy "Admins can view audit log"
  on public.admin_actions for select
  to authenticated
  using (public.is_admin(auth.uid()));

-- RLS FOR BOOKMARKS
drop policy if exists "Users can manage their own bookmarks" on public.bookmarks;
create policy "Users can manage their own bookmarks"
  on public.bookmarks for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- 8. SUBMIT FLAG RPC
create or replace function public.submit_flag(
  p_target_type text,
  p_target_id uuid,
  p_reason text,
  p_details text default null
)
returns public.flags language plpgsql security definer as $$
declare
  v_flag public.flags;
  v_parsed_type public.flag_target_type;
  v_parsed_reason public.flag_reason;
begin
  if auth.uid() is null then
    raise exception 'Unauthorized';
  end if;

  v_parsed_type := p_target_type::public.flag_target_type;
  v_parsed_reason := p_reason::public.flag_reason;

  insert into public.flags (
    reporter_id, target_type, target_id, reason, details
  ) values (
    auth.uid(), v_parsed_type, p_target_id, v_parsed_reason, nullif(trim(p_details), '')
  ) returning * into v_flag;

  return v_flag;
end;
$$;

-- 9. AUDITED ADMIN READ: FLAGGED CLAIM
-- Strictly checks flag status in ('open', 'reviewing'); denies access if 'actioned' or 'dismissed' (I-ADM-04)
-- Atomically inserts an admin_actions audit row on every privileged read (I-ADM-05)
create or replace function public.admin_read_flagged_claim(p_flag_id uuid)
returns jsonb language plpgsql security definer as $$
declare
  v_flag public.flags;
  v_claim public.claims;
  v_detail text;
  v_result jsonb;
begin
  -- 1. Verify admin privilege (I-ADM-06, S-09, S-17)
  if not public.is_admin(auth.uid()) then
    raise exception 'Unauthorized: Administrator access required';
  end if;

  -- 2. Lookup flag
  select * into v_flag from public.flags where id = p_flag_id;
  if not found then
    raise exception 'Flag not found';
  end if;

  if v_flag.target_type != 'claim' then
    raise exception 'Target of this flag is not a claim';
  end if;

  -- 3. Enforce open/reviewing status strictly (I-ADM-04)
  if v_flag.status not in ('open', 'reviewing') then
    raise exception 'Access denied: Flag is % and closed to audited review', v_flag.status;
  end if;

  -- 4. Atomically insert admin audit row (I-ADM-05)
  insert into public.admin_actions (
    admin_id, flag_id, target_type, target_id, action, metadata
  ) values (
    auth.uid(), p_flag_id, 'claim', v_flag.target_id, 'read_private_claim',
    jsonb_build_object('flag_reason', v_flag.reason, 'read_at', now())
  );

  -- 5. Update flag status to reviewing if open
  if v_flag.status = 'open' then
    update public.flags set
      status = 'reviewing',
      reviewed_by = coalesce(reviewed_by, auth.uid()),
      reviewed_at = coalesce(reviewed_at, now()),
      updated_at = now()
    where id = p_flag_id;
  end if;

  -- 6. Fetch claim & private detail
  select * into v_claim from public.claims where id = v_flag.target_id;
  if not found then
    raise exception 'Target claim not found';
  end if;

  select ownership_detail into v_detail from public.claim_details where claim_id = v_claim.id;

  v_result := jsonb_build_object(
    'claim', to_jsonb(v_claim),
    'ownership_detail', v_detail,
    'audit_logged', true
  );

  return v_result;
end;
$$;

-- 10. AUDITED ADMIN READ: FLAGGED CONVERSATION
create or replace function public.admin_read_flagged_conversation(p_flag_id uuid)
returns jsonb language plpgsql security definer as $$
declare
  v_flag public.flags;
  v_conv public.conversations;
  v_messages jsonb;
  v_target_conv_id uuid;
  v_result jsonb;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Unauthorized: Administrator access required';
  end if;

  select * into v_flag from public.flags where id = p_flag_id;
  if not found then
    raise exception 'Flag not found';
  end if;

  if v_flag.target_type not in ('conversation', 'message') then
    raise exception 'Target of this flag is not a conversation or message';
  end if;

  -- Enforce open/reviewing status strictly (I-ADM-04)
  if v_flag.status not in ('open', 'reviewing') then
    raise exception 'Access denied: Flag is % and closed to audited review', v_flag.status;
  end if;

  if v_flag.target_type = 'conversation' then
    v_target_conv_id := v_flag.target_id;
  else
    -- If targeting a message, resolve parent conversation
    select conversation_id into v_target_conv_id from public.messages where id = v_flag.target_id;
  end if;

  -- Atomically insert audit row (I-ADM-05)
  insert into public.admin_actions (
    admin_id, flag_id, target_type, target_id, action, metadata
  ) values (
    auth.uid(), p_flag_id, 'conversation', v_target_conv_id, 'read_private_conversation',
    jsonb_build_object('flag_reason', v_flag.reason, 'read_at', now())
  );

  -- Update flag status to reviewing
  if v_flag.status = 'open' then
    update public.flags set
      status = 'reviewing',
      reviewed_by = coalesce(reviewed_by, auth.uid()),
      reviewed_at = coalesce(reviewed_at, now()),
      updated_at = now()
    where id = p_flag_id;
  end if;

  select * into v_conv from public.conversations where id = v_target_conv_id;
  if not found then
    raise exception 'Target conversation not found';
  end if;

  select jsonb_agg(
    jsonb_build_object(
      'id', m.id,
      'sender_id', m.sender_id,
      'body', m.body,
      'created_at', m.created_at
    ) order by m.created_at asc
  ) into v_messages
  from public.messages m
  where m.conversation_id = v_target_conv_id;

  v_result := jsonb_build_object(
    'conversation', to_jsonb(v_conv),
    'messages', coalesce(v_messages, '[]'::jsonb),
    'audit_logged', true
  );

  return v_result;
end;
$$;

-- 11. ADMIN MODERATE REPORT (HIDE / UNHIDE)
-- When hiding, set moderation_state='hidden', hidden_at=now(), hidden_by=auth.uid(), hidden_reason together (DATABASE_DESIGN.md Section 5)
create or replace function public.admin_moderate_report(
  p_flag_id uuid,
  p_report_id uuid,
  p_action text,
  p_reason text
)
returns public.reports language plpgsql security definer as $$
declare
  v_report public.reports;
  v_trimmed_reason text;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Unauthorized: Administrator access required';
  end if;

  v_trimmed_reason := nullif(trim(p_reason), '');
  if p_action = 'hide' and v_trimmed_reason is null then
    raise exception 'A reason is required to hide a report';
  end if;

  if p_action = 'hide' then
    update public.reports set
      moderation_state = 'hidden',
      hidden_at = now(),
      hidden_by = auth.uid(),
      hidden_reason = v_trimmed_reason,
      updated_at = now()
    where id = p_report_id
    returning * into v_report;

    -- Audit row
    insert into public.admin_actions (
      admin_id, flag_id, target_type, target_id, action, metadata
    ) values (
      auth.uid(), p_flag_id, 'report', p_report_id, 'hide_report',
      jsonb_build_object('reason', v_trimmed_reason)
    );

    -- Timeline event
    insert into public.report_events (
      report_id, actor_id, event_type, safe_public_metadata
    ) values (
      p_report_id, auth.uid(), 'moderated',
      jsonb_build_object('action', 'hidden', 'reason', v_trimmed_reason)
    );
  elsif p_action = 'unhide' then
    update public.reports set
      moderation_state = 'visible',
      hidden_at = null,
      hidden_by = null,
      hidden_reason = null,
      updated_at = now()
    where id = p_report_id
    returning * into v_report;

    insert into public.admin_actions (
      admin_id, flag_id, target_type, target_id, action, metadata
    ) values (
      auth.uid(), p_flag_id, 'report', p_report_id, 'unhide_report', '{}'::jsonb
    );
  else
    raise exception 'Invalid moderation action: %', p_action;
  end if;

  return v_report;
end;
$$;

-- 12. ADMIN RESOLVE FLAG
create or replace function public.admin_resolve_flag(
  p_flag_id uuid,
  p_status text,
  p_resolution_notes text default null
)
returns public.flags language plpgsql security definer as $$
declare
  v_flag public.flags;
  v_parsed_status public.flag_status;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Unauthorized: Administrator access required';
  end if;

  v_parsed_status := p_status::public.flag_status;
  if v_parsed_status not in ('actioned', 'dismissed') then
    raise exception 'Flag must be resolved to actioned or dismissed';
  end if;

  update public.flags set
    status = v_parsed_status,
    resolution_notes = nullif(trim(p_resolution_notes), ''),
    reviewed_by = auth.uid(),
    reviewed_at = now(),
    updated_at = now()
  where id = p_flag_id
  returning * into v_flag;

  insert into public.admin_actions (
    admin_id, flag_id, target_type, target_id, action, metadata
  ) values (
    auth.uid(), p_flag_id, v_flag.target_type::text, v_flag.target_id,
    case when v_parsed_status = 'actioned' then 'action_flag' else 'dismiss_flag' end,
    jsonb_build_object('notes', p_resolution_notes)
  );

  return v_flag;
end;
$$;

-- 13. GET AUDIT LOGS RPC (Admins only)
create or replace function public.get_admin_audit_logs(p_limit int default 50)
returns table (
  id uuid,
  admin_id uuid,
  admin_name text,
  flag_id uuid,
  target_type text,
  target_id uuid,
  action text,
  metadata jsonb,
  created_at timestamptz
) language plpgsql security definer as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Unauthorized';
  end if;

  return query
  select
    a.id,
    a.admin_id,
    p.display_name as admin_name,
    a.flag_id,
    a.target_type,
    a.target_id,
    a.action,
    a.metadata,
    a.created_at
  from public.admin_actions a
  join public.profiles p on p.id = a.admin_id
  order by a.created_at desc
  limit p_limit;
end;
$$;
