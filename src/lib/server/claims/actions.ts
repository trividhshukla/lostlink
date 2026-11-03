'use server';

import crypto from 'crypto';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { ClaimStatus, ConversationStatus } from '@/types/database';

export interface ClaimWithDetails {
  id: string;
  lost_report_id: string;
  found_report_id: string;
  claimant_id: string;
  finder_id: string;
  match_id: string | null;
  status: ClaimStatus;
  decision_note: string | null;
  decided_at: string | null;
  finder_confirmed_at: string | null;
  claimant_confirmed_at: string | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  ownership_detail?: string | null;
  conversation_id?: string | null;
  conversation_status?: ConversationStatus | null;
  claimant_name?: string;
  finder_name?: string;
  lost_report?: {
    id: string;
    title: string;
    status: string;
    campus_area_id: string;
  } | null;
  found_report?: {
    id: string;
    title: string;
    status: string;
    campus_area_id: string;
    image?: { object_path: string } | null;
    category?: { label: string; photo_visibility: string } | null;
  } | null;
}

export interface ChatMessageItem {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_name?: string;
  body: string;
  created_at: string;
}

interface DbClaimQueryRow {
  id: string;
  lost_report_id: string;
  found_report_id: string;
  claimant_id: string;
  finder_id: string;
  match_id: string | null;
  status: ClaimStatus;
  decision_note: string | null;
  decided_at: string | null;
  finder_confirmed_at: string | null;
  claimant_confirmed_at: string | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  claim_details?: { ownership_detail: string } | null;
  claimant?: { display_name: string } | null;
  finder?: { display_name: string } | null;
  lost_report?: {
    id: string;
    title: string;
    status: string;
    campus_area_id: string;
    category_id?: number;
    categories?: { label: string; photo_visibility: string } | null;
  } | null;
  found_report?: {
    id: string;
    title: string;
    status: string;
    campus_area_id: string;
    category_id?: number;
    categories?: { label: string; photo_visibility: string } | null;
    report_images?: { object_path: string }[] | null;
  } | null;
}

interface DbMessageQueryRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  sender?: { display_name: string } | null;
}

// 1. Submit Claim Action
const submitClaimSchema = z.object({
  lostReportId: z.string().uuid('Please select a valid Lost report'),
  foundReportId: z.string().uuid('Invalid found report ID'),
  ownershipDetail: z
    .string()
    .min(10, 'Ownership detail must be at least 10 characters')
    .max(500, 'Ownership detail cannot exceed 500 characters'),
  matchId: z.string().uuid().optional().nullable(),
});

export async function submitClaimAction(
  formData: FormData
): Promise<{ success: boolean; claimId?: string; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'You must be signed in to submit a claim.' };
    }

    const parsed = submitClaimSchema.safeParse({
      lostReportId: formData.get('lostReportId'),
      foundReportId: formData.get('foundReportId'),
      ownershipDetail: formData.get('ownershipDetail'),
      matchId: formData.get('matchId') || null,
    });

    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || 'Validation failed.' };
    }

    const { data: claim, error } = (await supabase.rpc('submit_claim', {
      p_lost_report_id: parsed.data.lostReportId,
      p_found_report_id: parsed.data.foundReportId,
      p_ownership_detail: parsed.data.ownershipDetail,
      p_match_id: parsed.data.matchId || null,
    })) as unknown as { data: { id: string } | null; error: Error | null };

    if (error || !claim) {
      return { success: false, error: error?.message || 'Failed to submit claim.' };
    }

    revalidatePath(`/report/${parsed.data.foundReportId}`);
    revalidatePath(`/report/${parsed.data.lostReportId}`);
    revalidatePath('/claims');
    revalidatePath('/dashboard');

    return { success: true, claimId: claim.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
    return { success: false, error: message };
  }
}

// 2. Accept Claim Action (Finder Only)
export async function acceptClaimAction(
  claimId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    const { error } = await supabase.rpc('accept_claim', {
      p_claim_id: claimId,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath(`/claims/${claimId}`);
    revalidatePath('/claims');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Error accepting claim' };
  }
}

// 3. Reject Claim Action (Finder Only)
export async function rejectClaimAction(
  claimId: string,
  decisionNote?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    const note = decisionNote ? decisionNote.slice(0, 200) : null;

    const { error } = await supabase.rpc('reject_claim', {
      p_claim_id: claimId,
      p_decision_note: note,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath(`/claims/${claimId}`);
    revalidatePath('/claims');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Error rejecting claim' };
  }
}

// 4. Withdraw Claim Action (Claimant Only)
export async function withdrawClaimAction(
  claimId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc('withdraw_claim', {
      p_claim_id: claimId,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath(`/claims/${claimId}`);
    revalidatePath('/claims');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Error withdrawing claim' };
  }
}

// 5. Confirm Handover Action (Claimant or Finder)
export async function confirmHandoverAction(
  claimId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc('confirm_handover', {
      p_claim_id: claimId,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath(`/claims/${claimId}`);
    revalidatePath('/claims');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Error confirming handover' };
  }
}

// 6. Cancel Handover Action (Claimant or Finder before completion)
export async function cancelHandoverAction(
  claimId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc('cancel_handover', {
      p_claim_id: claimId,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath(`/claims/${claimId}`);
    revalidatePath('/claims');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Error cancelling handover' };
  }
}

// 7. Send Message Action (Claim Participants Only)
// Voluntary phone numbers & emails are explicitly ALLOWED in private chat (R-UNIT-07, I-CHT-03)
export async function sendMessageAction(
  conversationId: string,
  body: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    const trimmed = body.trim();
    if (trimmed.length < 1 || trimmed.length > 1000) {
      return { success: false, error: 'Message must be between 1 and 1000 characters.' };
    }

    const clientMessageId = crypto.randomUUID();

    const { data, error } = (await supabase.rpc('send_message', {
      p_conversation_id: conversationId,
      p_body: trimmed,
      p_client_message_id: clientMessageId,
    })) as unknown as { data: { id: string } | null; error: Error | null };

    if (error || !data) {
      return { success: false, error: error?.message || 'Failed to send message.' };
    }

    return { success: true, messageId: data.id };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Error sending message' };
  }
}

// 8. Fetch User Active Lost Reports (Eligible to file a claim)
export async function getUserActiveLostReportsAction(): Promise<{
  id: string;
  title: string;
  category_id: number;
  campus_id: string;
  campus_area_id: string;
}[]> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return [];

    const { data } = await supabase
      .from('reports')
      .select('id, title, category_id, campus_id, campus_area_id')
      .eq('owner_id', user.id)
      .eq('report_type', 'lost')
      .eq('status', 'active')
      .eq('moderation_state', 'visible')
      .order('created_at', { ascending: false });

    return data || [];
  } catch {
    return [];
  }
}

// 9. Fetch Claims for a Specific Found Report (For Finder to review)
export async function getClaimsForReportAction(
  reportId: string
): Promise<ClaimWithDetails[]> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return [];

    const { data: claims, error } = (await supabase
      .from('claims')
      .select(`
        id,
        lost_report_id,
        found_report_id,
        claimant_id,
        finder_id,
        match_id,
        status,
        decision_note,
        decided_at,
        finder_confirmed_at,
        claimant_confirmed_at,
        cancelled_at,
        cancelled_by,
        completed_at,
        created_at,
        updated_at,
        claim_details (ownership_detail),
        claimant:profiles!claimant_id (display_name),
        finder:profiles!finder_id (display_name),
        lost_report:reports!lost_report_id (id, title, status, campus_area_id)
      `)
      .eq('found_report_id', reportId)
      .order('created_at', { ascending: false })) as unknown as {
      data: DbClaimQueryRow[] | null;
      error: Error | null;
    };

    if (error || !claims) return [];

    return claims.map((c) => ({
      id: c.id,
      lost_report_id: c.lost_report_id,
      found_report_id: c.found_report_id,
      claimant_id: c.claimant_id,
      finder_id: c.finder_id,
      match_id: c.match_id,
      status: c.status,
      decision_note: c.decision_note,
      decided_at: c.decided_at,
      finder_confirmed_at: c.finder_confirmed_at,
      claimant_confirmed_at: c.claimant_confirmed_at,
      cancelled_at: c.cancelled_at,
      cancelled_by: c.cancelled_by,
      completed_at: c.completed_at,
      created_at: c.created_at,
      updated_at: c.updated_at,
      ownership_detail: c.claim_details?.ownership_detail || null,
      claimant_name: c.claimant?.display_name || 'Lost Item Owner',
      finder_name: c.finder?.display_name || 'Found Item Lister',
      lost_report: c.lost_report || null,
    }));
  } catch (err) {
    console.error('getClaimsForReportAction error:', err);
    return [];
  }
}

// 10. Fetch All Claims for Authenticated User (As Claimant or Finder)
export async function getUserClaimsAction(): Promise<{
  asClaimant: ClaimWithDetails[];
  asFinder: ClaimWithDetails[];
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { asClaimant: [], asFinder: [] };

    const { data: claims, error } = (await supabase
      .from('claims')
      .select(`
        id,
        lost_report_id,
        found_report_id,
        claimant_id,
        finder_id,
        match_id,
        status,
        decision_note,
        decided_at,
        finder_confirmed_at,
        claimant_confirmed_at,
        cancelled_at,
        cancelled_by,
        completed_at,
        created_at,
        updated_at,
        claim_details (ownership_detail),
        claimant:profiles!claimant_id (display_name),
        finder:profiles!finder_id (display_name),
        lost_report:reports!lost_report_id (id, title, status, campus_area_id),
        found_report:reports!found_report_id (id, title, status, campus_area_id)
      `)
      .or(`claimant_id.eq.${user.id},finder_id.eq.${user.id}`)
      .order('updated_at', { ascending: false })) as unknown as {
      data: DbClaimQueryRow[] | null;
      error: Error | null;
    };

    if (error || !claims) return { asClaimant: [], asFinder: [] };

    const formatted: ClaimWithDetails[] = claims.map((c) => ({
      id: c.id,
      lost_report_id: c.lost_report_id,
      found_report_id: c.found_report_id,
      claimant_id: c.claimant_id,
      finder_id: c.finder_id,
      match_id: c.match_id,
      status: c.status,
      decision_note: c.decision_note,
      decided_at: c.decided_at,
      finder_confirmed_at: c.finder_confirmed_at,
      claimant_confirmed_at: c.claimant_confirmed_at,
      cancelled_at: c.cancelled_at,
      cancelled_by: c.cancelled_by,
      completed_at: c.completed_at,
      created_at: c.created_at,
      updated_at: c.updated_at,
      ownership_detail: c.claim_details?.ownership_detail || null,
      claimant_name: c.claimant?.display_name || 'Lost Item Owner',
      finder_name: c.finder?.display_name || 'Found Item Lister',
      lost_report: c.lost_report || null,
      found_report: c.found_report || null,
    }));

    return {
      asClaimant: formatted.filter((c) => c.claimant_id === user.id),
      asFinder: formatted.filter((c) => c.finder_id === user.id),
    };
  } catch (err) {
    console.error('getUserClaimsAction error:', err);
    return { asClaimant: [], asFinder: [] };
  }
}

// 11. Fetch Single Claim with Full Conversation & Participant Info
export async function getClaimWithDetailsAction(
  claimId: string
): Promise<{
  claim: ClaimWithDetails | null;
  messages: ChatMessageItem[];
  currentUserId: string | null;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { claim: null, messages: [], currentUserId: null, error: 'Unauthorized' };
    }

    // 1. Fetch Claim
    const { data: claim, error: claimErr } = (await supabase
      .from('claims')
      .select(`
        id,
        lost_report_id,
        found_report_id,
        claimant_id,
        finder_id,
        match_id,
        status,
        decision_note,
        decided_at,
        finder_confirmed_at,
        claimant_confirmed_at,
        cancelled_at,
        cancelled_by,
        completed_at,
        created_at,
        updated_at,
        claim_details (ownership_detail),
        claimant:profiles!claimant_id (display_name),
        finder:profiles!finder_id (display_name),
        lost_report:reports!lost_report_id (
          id, title, status, campus_area_id, category_id,
          categories (label, photo_visibility)
        ),
        found_report:reports!found_report_id (
          id, title, status, campus_area_id, category_id,
          categories (label, photo_visibility),
          report_images (object_path)
        )
      `)
      .eq('id', claimId)
      .single()) as unknown as { data: DbClaimQueryRow | null; error: Error | null };

    if (claimErr || !claim) {
      return { claim: null, messages: [], currentUserId: user.id, error: 'Claim not found or access denied.' };
    }

    // 2. Fetch Conversation
    const { data: conversation } = (await supabase
      .from('conversations')
      .select('id, status')
      .eq('claim_id', claimId)
      .maybeSingle()) as unknown as { data: { id: string; status: ConversationStatus } | null };

    let messages: ChatMessageItem[] = [];

    if (conversation) {
      const { data: rawMessages } = (await supabase
        .from('messages')
        .select(`
          id,
          conversation_id,
          sender_id,
          body,
          created_at,
          sender:profiles!sender_id (display_name)
        `)
        .eq('conversation_id', conversation.id)
        .order('created_at', { ascending: true })) as unknown as { data: DbMessageQueryRow[] | null };

      if (rawMessages) {
        messages = rawMessages.map((m) => ({
          id: m.id,
          conversation_id: m.conversation_id,
          sender_id: m.sender_id,
          sender_name: m.sender?.display_name || 'Member',
          body: m.body,
          created_at: m.created_at,
        }));
      }
    }

    const formattedClaim: ClaimWithDetails = {
      id: claim.id,
      lost_report_id: claim.lost_report_id,
      found_report_id: claim.found_report_id,
      claimant_id: claim.claimant_id,
      finder_id: claim.finder_id,
      match_id: claim.match_id,
      status: claim.status,
      decision_note: claim.decision_note,
      decided_at: claim.decided_at,
      finder_confirmed_at: claim.finder_confirmed_at,
      claimant_confirmed_at: claim.claimant_confirmed_at,
      cancelled_at: claim.cancelled_at,
      cancelled_by: claim.cancelled_by,
      completed_at: claim.completed_at,
      created_at: claim.created_at,
      updated_at: claim.updated_at,
      ownership_detail: claim.claim_details?.ownership_detail || null,
      conversation_id: conversation?.id || null,
      conversation_status: conversation?.status || null,
      claimant_name: claim.claimant?.display_name || 'Lost Item Owner',
      finder_name: claim.finder?.display_name || 'Found Item Lister',
      lost_report: claim.lost_report || null,
      found_report: claim.found_report
        ? {
            id: claim.found_report.id,
            title: claim.found_report.title,
            status: claim.found_report.status,
            campus_area_id: claim.found_report.campus_area_id,
            image: claim.found_report.report_images?.[0] || null,
            category: claim.found_report.categories || null,
          }
        : null,
    };

    return {
      claim: formattedClaim,
      messages,
      currentUserId: user.id,
    };
  } catch (err) {
    return {
      claim: null,
      messages: [],
      currentUserId: null,
      error: err instanceof Error ? err.message : 'Error fetching claim.',
    };
  }
}
