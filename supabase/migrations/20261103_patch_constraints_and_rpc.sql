-- ============================================================================
-- LostLink - Database Constraint & RPC Patch Migration (Phase 5 & Lifecycle Alignment)
-- 1. Updates report_events check constraint to permit all cross-phase event types.
-- 2. Updates notifications check constraint and sets safe defaults for title and body.
-- 3. Fixes get_matching_candidates RPC return type to public.report_type enum.
-- 4. Fixes submit_claim, accept_claim, reject_claim, withdraw_claim,
--    cancel_handover, confirm_handover, send_message, and close_report
--    to explicitly provide non-null title and body on all notification inserts.
-- ============================================================================

-- 1. Patch report_events check constraint
alter table public.report_events drop constraint if exists report_events_event_type_check;
alter table public.report_events add constraint report_events_event_type_check check (
  event_type in (
    'created',
    'edited',
    'closed',
    'resolved',
    'reopened',
    'matched',
    'claim_submitted',
    'claim_accepted',
    'claim_rejected',
    'claim_withdrawn',
    'handover_confirmed',
    'handover_cancelled',
    'moderation_hidden',
    'moderation_restored'
  )
);

-- 2. Patch notifications table safety defaults & type check constraint
alter table public.notifications alter column title set default 'Campus Update';
alter table public.notifications alter column body set default 'You have a new update regarding your campus report.';

alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (
  type in (
    'new_match',
    'match_updated',
    'claim_received',
    'claim_accepted',
    'claim_superseded',
    'claim_rejected',
    'handover_cancelled',
    'handover_confirmed',
    'handover_confirmed_one_side',
    'handover_completed',
    'new_message'
  )
);

-- 3. Patch get_matching_candidates to match public.report_type enum return type
drop function if exists public.get_matching_candidates(uuid);
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
    -- I-MAT-05: Exclude permanently rejected pairs from future candidate matches
    and not exists (
      select 1 from public.claims cl
      where ((cl.lost_report_id = v_source.id and cl.found_report_id = r.id)
          or (cl.lost_report_id = r.id and cl.found_report_id = v_source.id))
        and cl.status in ('rejected', 'cancelled')
        and cl.decided_at is not null
    )
  order by
    case when r.category_id = v_source.category_id then 0 else 1 end,
    case when r.campus_area_id = v_source.campus_area_id then 0 else 1 end,
    r.created_at desc
  limit 15;
end;
$$;

-- 4. Patch submit_claim RPC (with explicit title and body on notifications)
create or replace function public.submit_claim(
  p_lost_report_id uuid,
  p_found_report_id uuid,
  p_ownership_detail text,
  p_match_id uuid default null
)
returns public.claims language plpgsql security definer as $$
declare
  v_lost public.reports;
  v_found public.reports;
  v_claim public.claims;
  v_existing_rejected boolean;
  v_caller_pending_count int;
  v_detail text;
begin
  v_detail := trim(p_ownership_detail);
  if length(v_detail) < 10 or length(v_detail) > 500 then
    raise exception 'Ownership detail must be between 10 and 500 characters';
  end if;

  -- 1. Validate Lost report
  select * into v_lost from public.reports where id = p_lost_report_id;
  if not found then
    raise exception 'Lost report not found';
  end if;

  if v_lost.owner_id is distinct from auth.uid() then
    raise exception 'Unauthorized: You can only submit a claim using your own Lost report';
  end if;

  if v_lost.report_type != 'lost' or v_lost.status != 'active' or v_lost.moderation_state != 'visible' then
    raise exception 'Your Lost report must be active and visible to file a claim';
  end if;

  -- 2. Validate Found report
  select * into v_found from public.reports where id = p_found_report_id;
  if not found then
    raise exception 'Found report not found';
  end if;

  if v_found.report_type != 'found' or v_found.status != 'active' or v_found.moderation_state != 'visible' then
    raise exception 'Target Found item must be active and visible';
  end if;

  if v_found.owner_id = auth.uid() then
    raise exception 'You cannot claim your own Found report';
  end if;

  if v_found.campus_id != v_lost.campus_id then
    raise exception 'Lost and Found reports must belong to the same campus';
  end if;

  -- 3. Verify permanent rejection block (CLM-UNIT-03, I-CLM-05)
  select exists (
    select 1 from public.claims
    where lost_report_id = p_lost_report_id
      and found_report_id = p_found_report_id
      and status = 'rejected'
  ) into v_existing_rejected;

  if v_existing_rejected then
    raise exception 'This claim was previously rejected by the finder and is permanently blocked';
  end if;

  -- 4. Enforce claim_max_pending (5) guardrails
  if v_found.pending_claim_count >= 5 then
    raise exception 'This found item has reached the maximum pending claims limit (5)';
  end if;

  select count(*) into v_caller_pending_count
  from public.claims
  where claimant_id = auth.uid() and status = 'pending';

  if v_caller_pending_count >= 5 then
    raise exception 'You have reached your maximum pending claims limit (5)';
  end if;

  -- 5. Insert claim
  insert into public.claims (
    lost_report_id, found_report_id, claimant_id, finder_id, match_id, status
  ) values (
    p_lost_report_id, p_found_report_id, auth.uid(), v_found.owner_id, p_match_id, 'pending'
  ) returning * into v_claim;

  -- 6. Insert private claim details
  insert into public.claim_details (
    claim_id, ownership_detail
  ) values (
    v_claim.id, v_detail
  );

  -- 7. Update pending claim count on Found report
  update public.reports
  set pending_claim_count = pending_claim_count + 1, updated_at = now()
  where id = p_found_report_id;

  -- 8. Notify Finder (never put ownership_detail in notification!)
  insert into public.notifications (
    user_id, type, report_id, claim_id, idempotency_key, title, body
  ) values (
    v_found.owner_id,
    'claim_received',
    p_found_report_id,
    v_claim.id,
    'claim:received:' || v_claim.id || ':' || v_found.owner_id,
    'New Claim Received',
    'A student submitted an ownership claim for your found item "' || v_found.title || '". Please review the private ownership detail.'
  ) on conflict (idempotency_key) do nothing;

  -- 9. Log safe timeline events on both reports
  insert into public.report_events (
    report_id, actor_id, event_type, safe_public_metadata
  ) values (
    p_found_report_id, auth.uid(), 'claim_submitted',
    jsonb_build_object('claim_id', v_claim.id)
  );

  insert into public.report_events (
    report_id, actor_id, event_type, safe_public_metadata
  ) values (
    p_lost_report_id, auth.uid(), 'claim_submitted',
    jsonb_build_object('claim_id', v_claim.id, 'found_report_id', p_found_report_id)
  );

  return v_claim;
end;
$$;

-- 5. Patch accept_claim RPC (with explicit title and body on notifications)
create or replace function public.accept_claim(
  p_claim_id uuid
)
returns public.claims language plpgsql security definer as $$
declare
  v_claim public.claims;
  v_other_claim record;
begin
  select * into v_claim from public.claims where id = p_claim_id;
  if not found then
    raise exception 'Claim not found';
  end if;

  if v_claim.finder_id is distinct from auth.uid() then
    raise exception 'Unauthorized: Only the finder can accept this claim';
  end if;

  if v_claim.status != 'pending' then
    raise exception 'Claim is not in pending status';
  end if;

  -- 1. Transition claim to accepted
  update public.claims set
    status = 'accepted',
    decided_at = now(),
    updated_at = now()
  where id = p_claim_id
  returning * into v_claim;

  -- 2. Transition both reports to claim_accepted
  update public.reports set
    status = 'claim_accepted',
    pending_claim_count = 0,
    updated_at = now()
  where id in (v_claim.lost_report_id, v_claim.found_report_id);

  -- 3. Supersede all other pending claims on either the Lost report or the Found report (CLM-UNIT-05, I-CLM-07)
  for v_other_claim in
    select id, claimant_id, lost_report_id, found_report_id
    from public.claims
    where id != p_claim_id
      and (lost_report_id = v_claim.lost_report_id or found_report_id = v_claim.found_report_id)
      and status = 'pending'
  loop
    update public.claims set
      status = 'superseded',
      updated_at = now()
    where id = v_other_claim.id;

    -- Notify superseded claimant
    insert into public.notifications (
      user_id, type, report_id, claim_id, idempotency_key, title, body
    ) values (
      v_other_claim.claimant_id,
      'claim_superseded',
      v_other_claim.lost_report_id,
      v_other_claim.id,
      'claim:superseded:' || v_other_claim.id || ':' || v_other_claim.claimant_id,
      'Claim Update',
      'Another claim was accepted for this found listing. Your claim has been superseded.'
    ) on conflict (idempotency_key) do nothing;
  end loop;

  -- 4. Create 1-to-1 conversation row once (status = 'open')
  insert into public.conversations (
    claim_id, status
  ) values (
    p_claim_id, 'open'
  ) on conflict (claim_id) do nothing;

  -- 5. Notify Claimant
  insert into public.notifications (
    user_id, type, report_id, claim_id, idempotency_key, title, body
  ) values (
    v_claim.claimant_id,
    'claim_accepted',
    v_claim.lost_report_id,
    p_claim_id,
    'claim:accepted:' || p_claim_id || ':' || v_claim.claimant_id,
    'Claim Accepted',
    'Your claim was accepted by the finder! You can now chat directly to coordinate handover.'
  ) on conflict (idempotency_key) do nothing;

  -- 6. Log timeline events
  insert into public.report_events (
    report_id, actor_id, event_type, safe_public_metadata
  ) values (
    v_claim.lost_report_id, auth.uid(), 'claim_accepted',
    jsonb_build_object('claim_id', p_claim_id)
  );

  insert into public.report_events (
    report_id, actor_id, event_type, safe_public_metadata
  ) values (
    v_claim.found_report_id, auth.uid(), 'claim_accepted',
    jsonb_build_object('claim_id', p_claim_id)
  );

  return v_claim;
end;
$$;

-- 6. Patch reject_claim RPC (with explicit title and body on notifications)
create or replace function public.reject_claim(
  p_claim_id uuid,
  p_decision_note text default null
)
returns public.claims language plpgsql security definer as $$
declare
  v_claim public.claims;
  v_note text;
begin
  select * into v_claim from public.claims where id = p_claim_id;
  if not found then
    raise exception 'Claim not found';
  end if;

  if v_claim.finder_id is distinct from auth.uid() then
    raise exception 'Unauthorized: Only the finder can reject this claim';
  end if;

  if v_claim.status != 'pending' then
    raise exception 'Claim is not in pending status';
  end if;

  v_note := nullif(trim(p_decision_note), '');
  if length(v_note) > 200 then
    raise exception 'Decision note must not exceed 200 characters';
  end if;

  -- 1. Update claim to rejected (permanently blocked by partial unique index)
  update public.claims set
    status = 'rejected',
    decision_note = v_note,
    decided_at = now(),
    updated_at = now()
  where id = p_claim_id
  returning * into v_claim;

  -- 2. Decrement pending_claim_count on Found report
  update public.reports set
    pending_claim_count = greatest(0, pending_claim_count - 1),
    updated_at = now()
  where id = v_claim.found_report_id;

  -- 3. Notify Claimant
  insert into public.notifications (
    user_id, type, report_id, claim_id, idempotency_key, title, body
  ) values (
    v_claim.claimant_id,
    'claim_rejected',
    v_claim.lost_report_id,
    p_claim_id,
    'claim:rejected:' || p_claim_id || ':' || v_claim.claimant_id,
    'Claim Update',
    'Your claim was not accepted by the finder.' || case when v_note is not null then ' Reason: ' || v_note else '' end
  ) on conflict (idempotency_key) do nothing;

  -- 4. Log timeline event (safe metadata only)
  insert into public.report_events (
    report_id, actor_id, event_type, safe_public_metadata
  ) values (
    v_claim.found_report_id, auth.uid(), 'claim_rejected',
    jsonb_build_object('claim_id', p_claim_id)
  );

  return v_claim;
end;
$$;

-- 7. Patch withdraw_claim RPC
create or replace function public.withdraw_claim(
  p_claim_id uuid
)
returns public.claims language plpgsql security definer as $$
declare
  v_claim public.claims;
begin
  select * into v_claim from public.claims where id = p_claim_id;
  if not found then
    raise exception 'Claim not found';
  end if;

  if v_claim.claimant_id is distinct from auth.uid() then
    raise exception 'Unauthorized: Only the claimant can withdraw this claim';
  end if;

  if v_claim.status != 'pending' then
    raise exception 'Only pending claims can be withdrawn';
  end if;

  update public.claims set
    status = 'withdrawn',
    updated_at = now()
  where id = p_claim_id
  returning * into v_claim;

  update public.reports set
    pending_claim_count = greatest(0, pending_claim_count - 1),
    updated_at = now()
  where id = v_claim.found_report_id;

  -- Log timeline event
  insert into public.report_events (
    report_id, actor_id, event_type, safe_public_metadata
  ) values (
    v_claim.lost_report_id, auth.uid(), 'claim_withdrawn',
    jsonb_build_object('claim_id', p_claim_id)
  );

  -- Notify Finder
  insert into public.notifications (
    user_id, type, report_id, claim_id, idempotency_key, title, body
  ) values (
    v_claim.finder_id,
    'claim_superseded',
    v_claim.found_report_id,
    p_claim_id,
    'claim:withdrawn:' || p_claim_id || ':' || v_claim.finder_id,
    'Claim Withdrawn',
    'A pending claim on your found item was withdrawn by the claimant.'
  ) on conflict (idempotency_key) do nothing;

  return v_claim;
end;
$$;

-- 8. Patch cancel_handover RPC (with explicit title and body on notifications)
create or replace function public.cancel_handover(
  p_claim_id uuid
)
returns public.claims language plpgsql security definer as $$
declare
  v_claim public.claims;
  v_counterpart_id uuid;
begin
  select * into v_claim from public.claims where id = p_claim_id;
  if not found then
    raise exception 'Claim not found';
  end if;

  if auth.uid() is distinct from v_claim.claimant_id and auth.uid() is distinct from v_claim.finder_id then
    raise exception 'Unauthorized: Only claim participants can cancel handover';
  end if;

  if v_claim.status != 'accepted' or v_claim.completed_at is not null then
    raise exception 'Only accepted claims before completion can be cancelled';
  end if;

  v_counterpart_id := case when v_claim.claimant_id = auth.uid() then v_claim.finder_id else v_claim.claimant_id end;

  -- 1. Cancel claim & clear live confirmation timestamps (CLM-UNIT-07)
  update public.claims set
    status = 'cancelled',
    cancelled_at = now(),
    cancelled_by = auth.uid(),
    finder_confirmed_at = null,
    claimant_confirmed_at = null,
    updated_at = now()
  where id = p_claim_id
  returning * into v_claim;

  -- 2. Reopen both reports to active (CLM-UNIT-08)
  update public.reports set
    status = 'active',
    updated_at = now()
  where id in (v_claim.lost_report_id, v_claim.found_report_id);

  -- 3. Lock conversation to read_only (I-CHT-05)
  update public.conversations set
    status = 'read_only',
    updated_at = now()
  where claim_id = p_claim_id;

  -- 4. Notify counterpart
  insert into public.notifications (
    user_id, type, report_id, claim_id, idempotency_key, title, body
  ) values (
    v_counterpart_id,
    'handover_cancelled',
    v_claim.found_report_id,
    p_claim_id,
    'handover:cancelled:' || p_claim_id || ':' || v_counterpart_id,
    'Handover Cancelled',
    'The accepted claim handover was cancelled. Both reports have been restored to active status on campus.'
  ) on conflict (idempotency_key) do nothing;

  -- 5. Log timeline events
  insert into public.report_events (
    report_id, actor_id, event_type, safe_public_metadata
  ) values (
    v_claim.lost_report_id, auth.uid(), 'handover_cancelled',
    jsonb_build_object('claim_id', p_claim_id)
  );

  insert into public.report_events (
    report_id, actor_id, event_type, safe_public_metadata
  ) values (
    v_claim.found_report_id, auth.uid(), 'handover_cancelled',
    jsonb_build_object('claim_id', p_claim_id)
  );

  return v_claim;
end;
$$;

-- 9. Patch confirm_handover RPC (with explicit title and body on notifications)
create or replace function public.confirm_handover(
  p_claim_id uuid
)
returns public.claims language plpgsql security definer as $$
declare
  v_claim public.claims;
  v_is_finder boolean;
  v_is_claimant boolean;
  v_both_confirmed boolean;
begin
  select * into v_claim from public.claims where id = p_claim_id;
  if not found then
    raise exception 'Claim not found';
  end if;

  v_is_finder := (v_claim.finder_id = auth.uid());
  v_is_claimant := (v_claim.claimant_id = auth.uid());

  if not v_is_finder and not v_is_claimant then
    raise exception 'Unauthorized: Only claim participants can confirm handover';
  end if;

  if v_claim.status != 'accepted' or v_claim.completed_at is not null then
    raise exception 'Handover can only be confirmed on an accepted, incomplete claim';
  end if;

  -- 1. Record caller's confirmation timestamp
  if v_is_finder then
    update public.claims set
      finder_confirmed_at = coalesce(finder_confirmed_at, now()),
      updated_at = now()
    where id = p_claim_id
    returning * into v_claim;
  elsif v_is_claimant then
    update public.claims set
      claimant_confirmed_at = coalesce(claimant_confirmed_at, now()),
      updated_at = now()
    where id = p_claim_id
    returning * into v_claim;
  end if;

  -- 2. Check if both sides have confirmed (CLM-UNIT-06, I-HND-01 to I-HND-03)
  v_both_confirmed := (v_claim.finder_confirmed_at is not null and v_claim.claimant_confirmed_at is not null);

  if v_both_confirmed then
    -- Complete claim
    update public.claims set
      status = 'completed',
      completed_at = now(),
      updated_at = now()
    where id = p_claim_id
    returning * into v_claim;

    -- Resolve both reports
    update public.reports set
      status = 'resolved',
      resolved_at = now(),
      updated_at = now()
    where id in (v_claim.lost_report_id, v_claim.found_report_id);

    -- Lock conversation to read_only
    update public.conversations set
      status = 'read_only',
      updated_at = now()
    where claim_id = p_claim_id;

    -- Notify both participants
    insert into public.notifications (user_id, type, report_id, claim_id, idempotency_key, title, body)
    values
      (
        v_claim.claimant_id,
        'handover_completed',
        v_claim.lost_report_id,
        p_claim_id,
        'handover:complete:' || p_claim_id || ':' || v_claim.claimant_id,
        'Handover Confirmed',
        'Both parties confirmed item handover. Your report has been marked resolved.'
      ),
      (
        v_claim.finder_id,
        'handover_completed',
        v_claim.found_report_id,
        p_claim_id,
        'handover:complete:' || p_claim_id || ':' || v_claim.finder_id,
        'Handover Confirmed',
        'Both parties confirmed item handover. Thank you for returning this campus item!'
      )
    on conflict (idempotency_key) do nothing;

    -- Log resolution timeline events
    insert into public.report_events (report_id, actor_id, event_type, safe_public_metadata)
    values
      (v_claim.lost_report_id, auth.uid(), 'resolved', jsonb_build_object('claim_id', p_claim_id)),
      (v_claim.found_report_id, auth.uid(), 'resolved', jsonb_build_object('claim_id', p_claim_id));
  else
    -- One confirmation recorded: notify counterpart awaiting confirmation
    insert into public.notifications (
      user_id, type, report_id, claim_id, idempotency_key, title, body
    ) values (
      case when v_is_finder then v_claim.claimant_id else v_claim.finder_id end,
      'handover_confirmed_one_side',
      v_claim.found_report_id,
      p_claim_id,
      'handover:pending_other:' || p_claim_id || ':' || (case when v_is_finder then v_claim.claimant_id else v_claim.finder_id end),
      'Handover Confirmation Pending',
      'The other party has confirmed physical item handover. Please confirm from your claims page once received.'
    ) on conflict (idempotency_key) do nothing;
  end if;

  return v_claim;
end;
$$;

-- 10. Patch send_message RPC (with explicit title and body on notifications)
create or replace function public.send_message(
  p_conversation_id uuid,
  p_body text,
  p_client_message_id uuid
)
returns public.messages language plpgsql security definer as $$
declare
  v_conv public.conversations;
  v_claim public.claims;
  v_msg public.messages;
  v_counterpart_id uuid;
  v_trimmed text;
begin
  v_trimmed := trim(p_body);
  if length(v_trimmed) < 1 or length(v_trimmed) > 1000 then
    raise exception 'Message body must be between 1 and 1000 characters';
  end if;

  select * into v_conv from public.conversations where id = p_conversation_id;
  if not found then
    raise exception 'Conversation not found';
  end if;

  if v_conv.status != 'open' then
    raise exception 'Conversation is read-only';
  end if;

  select * into v_claim from public.claims where id = v_conv.claim_id;
  if not found then
    raise exception 'Claim not found';
  end if;

  if v_claim.status != 'accepted' then
    raise exception 'Conversation messages are only allowed for accepted claims';
  end if;

  if auth.uid() is distinct from v_claim.claimant_id and auth.uid() is distinct from v_claim.finder_id then
    raise exception 'Unauthorized: Only claim participants can send messages';
  end if;

  v_counterpart_id := case when v_claim.claimant_id = auth.uid() then v_claim.finder_id else v_claim.claimant_id end;

  -- Insert message idempotently
  insert into public.messages (
    conversation_id, sender_id, body, client_message_id
  ) values (
    p_conversation_id, auth.uid(), v_trimmed, p_client_message_id
  ) on conflict (sender_id, client_message_id) do update set
    body = excluded.body
  returning * into v_msg;

  -- Update conversation timestamp
  update public.conversations set updated_at = now() where id = p_conversation_id;

  -- Notify recipient
  insert into public.notifications (
    user_id, type, report_id, claim_id, idempotency_key, title, body
  ) values (
    v_counterpart_id,
    'new_message',
    v_claim.found_report_id,
    v_claim.id,
    'msg:' || v_msg.id || ':' || v_counterpart_id,
    'New Chat Message',
    'You received a new message regarding your claim handover chat.'
  ) on conflict (idempotency_key) do nothing;

  return v_msg;
end;
$$;

-- 11. Patch close_report RPC (with explicit title and body on notifications)
create or replace function public.close_report(
  p_report_id uuid,
  p_reason text
)
returns public.reports language plpgsql security definer as $$
declare
  v_report public.reports;
  v_superseded_claim record;
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

  -- 1. Supersede all pending claims linked to this report
  for v_superseded_claim in
    select id, claimant_id, finder_id, lost_report_id, found_report_id
    from public.claims
    where (lost_report_id = p_report_id or found_report_id = p_report_id)
      and status = 'pending'
  loop
    update public.claims
    set status = 'superseded', updated_at = now()
    where id = v_superseded_claim.id;

    -- Notify the other participant
    insert into public.notifications (
      user_id, type, report_id, claim_id, idempotency_key, title, body
    ) values (
      case when v_superseded_claim.claimant_id = auth.uid() then v_superseded_claim.finder_id else v_superseded_claim.claimant_id end,
      'claim_superseded',
      p_report_id,
      v_superseded_claim.id,
      'claim:superseded:' || v_superseded_claim.id || ':' || auth.uid(),
      'Listing Closed',
      'A report linked to your pending claim was closed. The claim has been superseded.'
    ) on conflict (idempotency_key) do nothing;
  end loop;

  -- 2. Close report
  update public.reports set
    status = 'closed',
    closed_at = now(),
    closed_reason = nullif(trim(p_reason), ''),
    pending_claim_count = 0,
    updated_at = now()
  where id = p_report_id
  returning * into v_report;

  -- 3. Log event
  insert into public.report_events (
    report_id, actor_id, event_type, safe_public_metadata
  ) values (
    p_report_id, auth.uid(), 'closed',
    jsonb_build_object('reason', v_report.closed_reason)
  );

  return v_report;
end;
$$;
