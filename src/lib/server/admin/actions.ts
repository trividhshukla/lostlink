'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { FlagReason, FlagStatus, FlagTargetType } from '@/types/database';

export interface AdminFlagItem {
  id: string;
  reporter_id: string;
  reporter_name?: string;
  target_type: FlagTargetType;
  target_id: string;
  reason: FlagReason;
  details: string | null;
  status: FlagStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  resolution_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminAuditLogRow {
  id: string;
  admin_id: string;
  admin_name: string;
  flag_id: string | null;
  target_type: string;
  target_id: string;
  action: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

// 1. Submit Flag Action (Member or Reporter)
const submitFlagSchema = z.object({
  targetType: z.enum(['report', 'claim', 'conversation', 'message', 'profile']),
  targetId: z.string().uuid(),
  reason: z.enum(['spam', 'inappropriate', 'suspicious_claim', 'harassment', 'personal_info', 'other']),
  details: z.string().max(1000).optional().nullable(),
});

export async function submitFlagAction(formData: FormData): Promise<{
  success: boolean;
  flagId?: string;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'You must be signed in to submit a report.' };
    }

    const parsed = submitFlagSchema.safeParse({
      targetType: formData.get('targetType'),
      targetId: formData.get('targetId'),
      reason: formData.get('reason'),
      details: formData.get('details') || null,
    });

    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || 'Validation failed.' };
    }

    const { data: flag, error } = (await supabase.rpc('submit_flag', {
      p_target_type: parsed.data.targetType,
      p_target_id: parsed.data.targetId,
      p_reason: parsed.data.reason,
      p_details: parsed.data.details || null,
    })) as unknown as { data: { id: string } | null; error: Error | null };

    if (error || !flag) {
      return { success: false, error: error?.message || 'Failed to submit flag.' };
    }

    return { success: true, flagId: flag.id };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// 2. Fetch Admin Flags Queue (Admins Only)
export async function getAdminFlagsAction(
  statusFilter?: FlagStatus
): Promise<{ flags: AdminFlagItem[]; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { flags: [], error: 'Unauthorized' };

    let query = supabase
      .from('flags')
      .select(`
        id,
        reporter_id,
        target_type,
        target_id,
        reason,
        details,
        status,
        reviewed_by,
        reviewed_at,
        resolution_notes,
        created_at,
        updated_at,
        reporter:profiles!reporter_id (display_name)
      `)
      .order('created_at', { ascending: false });

    if (statusFilter) {
      query = query.eq('status', statusFilter);
    }

    interface DbAdminFlagRow {
      id: string;
      reporter_id: string;
      target_type: FlagTargetType;
      target_id: string;
      reason: FlagReason;
      details: string | null;
      status: FlagStatus;
      reviewed_by: string | null;
      reviewed_at: string | null;
      resolution_notes: string | null;
      created_at: string;
      updated_at: string;
      reporter?: { display_name: string } | null;
    }

    const { data: rawFlags, error } = (await query) as unknown as {
      data: DbAdminFlagRow[] | null;
      error: Error | null;
    };

    if (error || !rawFlags) {
      return { flags: [], error: error?.message || 'Failed to fetch flags' };
    }

    const flags: AdminFlagItem[] = rawFlags.map((f) => ({
      id: f.id,
      reporter_id: f.reporter_id,
      reporter_name: f.reporter?.display_name || 'Member',
      target_type: f.target_type,
      target_id: f.target_id,
      reason: f.reason,
      details: f.details,
      status: f.status,
      reviewed_by: f.reviewed_by,
      reviewed_at: f.reviewed_at,
      resolution_notes: f.resolution_notes,
      created_at: f.created_at,
      updated_at: f.updated_at,
    }));

    return { flags };
  } catch (err) {
    return { flags: [], error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// 3. Audited Admin Read: Flagged Claim (I-ADM-02, I-ADM-04, I-ADM-05)
export async function adminReadFlaggedClaimAction(flagId: string): Promise<{
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc('admin_read_flagged_claim', {
      p_flag_id: flagId,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/admin/moderation');
    revalidatePath('/admin/audit');
    return { success: true, data: (data as Record<string, unknown>) || undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// 4. Audited Admin Read: Flagged Conversation (I-ADM-03, I-ADM-04, I-ADM-05)
export async function adminReadFlaggedConversationAction(flagId: string): Promise<{
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc('admin_read_flagged_conversation', {
      p_flag_id: flagId,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/admin/moderation');
    revalidatePath('/admin/audit');
    return { success: true, data: (data as Record<string, unknown>) || undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// 5. Admin Moderate Report (Hide / Unhide)
export async function adminModerateReportAction(
  flagId: string,
  reportId: string,
  action: 'hide' | 'unhide',
  reason: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc('admin_moderate_report', {
      p_flag_id: flagId,
      p_report_id: reportId,
      p_action: action,
      p_reason: reason,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath(`/report/${reportId}`);
    revalidatePath('/admin/moderation');
    revalidatePath('/admin/audit');
    revalidatePath('/explore');
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// 6. Admin Resolve Flag (Actioned or Dismissed)
export async function adminResolveFlagAction(
  flagId: string,
  status: 'actioned' | 'dismissed',
  resolutionNotes?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc('admin_resolve_flag', {
      p_flag_id: flagId,
      p_status: status,
      p_resolution_notes: resolutionNotes || null,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/admin/moderation');
    revalidatePath('/admin/audit');
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// 7. Get Audit Logs (Admins Only)
export async function getAdminAuditLogsAction(
  limit = 50
): Promise<{ logs: AdminAuditLogRow[]; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: logs, error } = await supabase.rpc('get_admin_audit_logs', {
      p_limit: limit,
    });

    if (error || !logs) {
      return { logs: [], error: error?.message || 'Failed to fetch audit logs' };
    }

    return {
      logs: logs.map((l) => ({
        id: l.id,
        admin_id: l.admin_id,
        admin_name: l.admin_name,
        flag_id: l.flag_id,
        target_type: l.target_type,
        target_id: l.target_id,
        action: l.action,
        metadata: (l.metadata as Record<string, unknown>) || {},
        created_at: l.created_at,
      })),
    };
  } catch (err) {
    return { logs: [], error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
