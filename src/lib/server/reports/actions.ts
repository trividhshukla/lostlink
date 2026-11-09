'use server';

import { revalidatePath } from 'next/cache';
import crypto from 'crypto';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { processReportImage } from '@/lib/server/storage/process-image';
import { deleteReportImages } from '@/lib/server/storage/delete-report-images';
import { getSignedImageUrl } from '@/lib/server/storage/signed-urls';
import { executeMatching } from '@/lib/server/matching/orchestrator';
import { ReportType } from '@/types/database';
import { ReportItem } from '@/lib/mock-data';

const reportFormSchema = z.object({
  report_type: z.enum(['lost', 'found']),
  title: z.string().min(3, 'Title must be at least 3 characters').max(100),
  description: z.string().min(10, 'Description must be at least 10 characters').max(1500),
  category_id: z.coerce.number().int().positive('Please select a valid category'),
  primary_color: z.string().nullable().optional(),
  brand: z.string().max(60).optional().nullable(),
  distinctive_features: z.string().max(300).optional().nullable(),
  campus_area_id: z.string().min(1, 'Please select an approved campus area'),
  location_note: z.string().max(120).optional().nullable(),
  occurred_at: z.string().min(1, 'Date and time of incident is required'),
});

export async function createReportAction(formData: FormData) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'You must be signed in to submit a report.' };
    }

    // Fetch single campus ID
    const { data: campus, error: campusError } = await supabase
      .from('campuses')
      .select('id')
      .limit(1)
      .single();

    if (campusError || !campus) {
      return { success: false, error: 'Campus reference record not found. Please ensure database seed is applied.' };
    }

    const rawData = {
      report_type: formData.get('report_type') as ReportType,
      title: formData.get('title'),
      description: formData.get('description'),
      category_id: formData.get('category_id'),
      primary_color: formData.get('primary_color') || null,
      brand: formData.get('brand') || null,
      distinctive_features: formData.get('distinctive_features') || null,
      campus_area_id: formData.get('campus_area_id'),
      location_note: formData.get('location_note') || null,
      occurred_at: formData.get('occurred_at'),
    };

    const validated = reportFormSchema.safeParse(rawData);
    if (!validated.success) {
      const errorMsg = validated.error.issues.map((i) => i.message).join('. ');
      return { success: false, error: errorMsg };
    }

    const data = validated.data;
    const clientRequestId = (formData.get('client_request_id') as string) || crypto.randomUUID();

    // Resolve campus_area_id if passed as label
    let resolvedAreaId = data.campus_area_id;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(resolvedAreaId);
    if (!isUuid) {
      const { data: areaRecord } = await supabase
        .from('campus_areas')
        .select('id')
        .ilike('label', resolvedAreaId)
        .limit(1)
        .single();
      if (areaRecord) {
        resolvedAreaId = areaRecord.id;
      }
    }

    // Found photo handling
    const photoFile = formData.get('photo') as File | null;
    let uploadedObjectPath: string | null = null;
    let imageMetadata: {
      sha256: string;
      bytes: number;
      width: number;
      height: number;
    } | null = null;

    if (data.report_type === 'found') {
      if (!photoFile || photoFile.size === 0) {
        return { success: false, error: 'Found items require exactly one photo for visual identification.' };
      }

      // Convert File to Buffer
      const arrayBuffer = await photoFile.arrayBuffer();
      const inputBuffer = Buffer.from(arrayBuffer);

      // Process through Sharp (EXIF stripped, resized, normalized)
      const processed = await processReportImage(inputBuffer);

      // Deterministic storage path: {owner_id}/{clientRequestId}.webp
      uploadedObjectPath = `${user.id}/${clientRequestId}.${processed.extension}`;

      // Upload to private bucket
      const { error: uploadError } = await supabase.storage
        .from('report-images')
        .upload(uploadedObjectPath, processed.buffer, {
          contentType: processed.mimeType,
          upsert: true,
        });

      if (uploadError) {
        return { success: false, error: `Failed to upload photo: ${uploadError.message}` };
      }

      imageMetadata = {
        sha256: processed.sha256,
        bytes: processed.bytes,
        width: processed.width,
        height: processed.height,
      };
    } else {
      // Lost report: rule ensures zero photo
      if (photoFile && photoFile.size > 0) {
        return { success: false, error: 'Lost reports cannot have a photo.' };
      }
    }

    // Fingerprint for idempotency
    const fingerprintContent = `${user.id}|${data.report_type}|${data.title}|${data.category_id}|${resolvedAreaId}|${data.occurred_at}|${imageMetadata?.sha256 || ''}`;
    const requestFingerprint = crypto.createHash('sha256').update(fingerprintContent).digest('hex');

    // Call create_report SQL function
    const { data: newReport, error: rpcError } = await supabase.rpc('create_report', {
      p_owner_id: user.id,
      p_campus_id: campus.id,
      p_report_type: data.report_type,
      p_title: data.title,
      p_description: data.description,
      p_category_id: data.category_id,
      p_primary_color: data.primary_color || null,
      p_brand: data.brand || null,
      p_distinctive_features: data.distinctive_features || null,
      p_campus_area_id: resolvedAreaId,
      p_location_note: data.location_note || null,
      p_occurred_at: new Date(data.occurred_at).toISOString(),
      p_client_request_id: clientRequestId,
      p_request_fingerprint: requestFingerprint,
      p_image_object_path: uploadedObjectPath,
      p_image_sha256: imageMetadata?.sha256 || null,
      p_image_bytes: imageMetadata?.bytes || null,
      p_image_width: imageMetadata?.width || null,
      p_image_height: imageMetadata?.height || null,
    });

    if (rpcError) {
      // Cleanup orphan image if database transaction failed
      if (uploadedObjectPath) {
        await deleteReportImages([uploadedObjectPath]);
      }
      return { success: false, error: `Database error: ${rpcError.message}` };
    }

    const savedReportId = (newReport as { id: string })?.id || clientRequestId;

    // Trigger Bidirectional Text Matching in the same server request
    await executeMatching(savedReportId, user.id);

    revalidatePath('/explore');
    revalidatePath('/dashboard');
    revalidatePath('/notifications');

    return {
      success: true,
      reportId: savedReportId,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error during report submission';
    return { success: false, error: message };
  }
}

export async function editReportAction(formData: FormData) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'You must be signed in to edit a report.' };
    }

    const reportId = formData.get('report_id') as string;
    if (!reportId) {
      return { success: false, error: 'Report ID is required.' };
    }

    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const categoryId = parseInt(formData.get('category_id') as string, 10);
    const primaryColor = (formData.get('primary_color') as string) || null;
    const brand = (formData.get('brand') as string) || null;
    const distinctiveFeatures = (formData.get('distinctive_features') as string) || null;
    let campusAreaId = formData.get('campus_area_id') as string;
    const locationNote = (formData.get('location_note') as string) || null;
    const occurredAt = formData.get('occurred_at') as string;

    // Resolve campus_area_id if passed as label
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(campusAreaId);
    if (!isUuid) {
      const { data: areaRecord } = await supabase
        .from('campus_areas')
        .select('id')
        .ilike('label', campusAreaId)
        .limit(1)
        .single();
      if (areaRecord) {
        campusAreaId = areaRecord.id;
      }
    }

    const { error: rpcError } = await supabase.rpc('edit_report', {
      p_report_id: reportId,
      p_title: title,
      p_description: description,
      p_category_id: categoryId,
      p_primary_color: primaryColor,
      p_brand: brand,
      p_distinctive_features: distinctiveFeatures,
      p_campus_area_id: campusAreaId,
      p_location_note: locationNote,
      p_occurred_at: new Date(occurredAt).toISOString(),
    });

    if (rpcError) {
      return { success: false, error: rpcError.message };
    }

    // Meaningful edit: Re-trigger bidirectional matching per I-REP-15
    await executeMatching(reportId, user.id);

    revalidatePath(`/report/${reportId}`);
    revalidatePath('/explore');
    revalidatePath('/dashboard');
    revalidatePath('/notifications');

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error during report update';
    return { success: false, error: message };
  }
}

export async function checkPotentialDuplicateReportAction(
  reportType: 'lost' | 'found',
  categoryId: number,
  title: string
): Promise<{
  hasDuplicate: boolean;
  duplicateTitle?: string;
  duplicateId?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !title || title.trim().length < 3) {
      return { hasDuplicate: false };
    }

    const { data: userReports } = await supabase
      .from('reports')
      .select('id, title, category_id, report_type, status')
      .eq('owner_id', user.id)
      .eq('report_type', reportType)
      .eq('status', 'active');

    if (!userReports || userReports.length === 0) {
      return { hasDuplicate: false };
    }

    const cleanInputTitle = title.toLowerCase().trim();
    const inputWords = cleanInputTitle.split(/\s+/).filter((w) => w.length > 2);

    for (const r of userReports) {
      const cleanRTitle = r.title.toLowerCase().trim();
      if (cleanInputTitle === cleanRTitle) {
        return { hasDuplicate: true, duplicateTitle: r.title, duplicateId: r.id };
      }

      if (r.category_id === categoryId) {
        const rWords = cleanRTitle.split(/\s+/).filter((w) => w.length > 2);
        const overlap = inputWords.filter((w) => rWords.includes(w));
        if (overlap.length >= 2 || (inputWords.length === 1 && overlap.length === 1)) {
          return { hasDuplicate: true, duplicateTitle: r.title, duplicateId: r.id };
        }
      }
    }

    return { hasDuplicate: false };
  } catch {
    return { hasDuplicate: false };
  }
}

export async function closeReportAction(reportId: string, reason: string) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'You must be signed in to close a report.' };
    }

    const { error: rpcError } = await supabase.rpc('close_report', {
      p_report_id: reportId,
      p_reason: reason || 'Closed by owner',
    });

    if (rpcError) {
      return { success: false, error: rpcError.message };
    }

    revalidatePath(`/report/${reportId}`);
    revalidatePath('/explore');
    revalidatePath('/dashboard');
    revalidatePath('/notifications');

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error during report closure';
    return { success: false, error: message };
  }
}

/**
 * Explicit owner retry action (MAT-UNIT-10)
 * Enabled when matching_status is failed, degraded, or stuck in pending/running for > 5 minutes.
 * Atomically reserves a new quota unit and re-runs matching.
 */
export async function retryMatchingAction(reportId: string) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'You must be signed in to re-run matching.' };
    }

    const { data: report, error: reportError } = await supabase
      .from('reports')
      .select('id, owner_id, status, matching_status, matching_started_at, created_at')
      .eq('id', reportId)
      .single();

    if (reportError || !report) {
      return { success: false, error: 'Report not found.' };
    }

    if (report.owner_id !== user.id) {
      return { success: false, error: 'Only the report owner can re-run matching.' };
    }

    if (report.status !== 'active') {
      return { success: false, error: 'Cannot re-run matching on an inactive report.' };
    }

    // Check if retry is allowed: failed, degraded, or stale (> 5 minutes in pending/running)
    const startedAt = new Date(report.matching_started_at || report.created_at).getTime();
    const isStale = Date.now() - startedAt > 5 * 60 * 1000;
    const isAllowed = ['failed', 'degraded'].includes(report.matching_status) || isStale;

    if (!isAllowed) {
      return {
        success: false,
        error: 'Matching is still fresh. Please wait at least 5 minutes before retrying.',
      };
    }

    // Trigger matching orchestrator (reserves new quota unit per I-MAT-10)
    const result = await executeMatching(reportId, user.id);

    revalidatePath(`/report/${reportId}`);
    revalidatePath('/dashboard');
    revalidatePath('/notifications');

    return {
      success: true,
      matchCount: result.matchCount,
      usedGroq: result.usedGroq,
      status: result.status,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to re-run matching';
    return { success: false, error: message };
  }
}

export async function markNotificationReadAction(notificationId: string) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Unauthorized' };
    }

    await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', notificationId)
      .eq('user_id', user.id);

    revalidatePath('/notifications');
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Error' };
  }
}

export async function markAllNotificationsReadAction() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Unauthorized' };
    }

    await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .is('read_at', null);

    revalidatePath('/notifications');
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Error' };
  }
}

/**
 * Fetches all visible reports for the explore campus feed with server-signed image URLs.
 * Private bucket images are signed for found listings; restricted categories remain masked.
 */
export async function getExploreReportsAction(): Promise<{ reports: ReportItem[]; isSamplePreview: boolean }> {
  try {
    let supabase;
    try {
      supabase = createAdminClient();
    } catch {
      supabase = await createClient();
    }

    const { data, error } = await supabase
      .from('reports')
      .select(`
        id,
        title,
        description,
        report_type,
        status,
        primary_color,
        brand,
        distinctive_features,
        location_note,
        occurred_at,
        created_at,
        campus_areas (label),
        categories (label, slug, photo_visibility),
        report_images (object_path)
      `)
      .eq('moderation_state', 'visible')
      .in('status', ['active', 'claim_accepted', 'resolved'])
      .order('occurred_at', { ascending: false });

    if (error || !data || data.length === 0) {
      return { reports: [], isSamplePreview: false };
    }

    const reports: ReportItem[] = await Promise.all(
      (data as unknown as Array<{
        id: string;
        report_type: 'lost' | 'found';
        title: string;
        description: string;
        status: string;
        primary_color: string | null;
        brand: string | null;
        distinctive_features: string | null;
        location_note: string | null;
        occurred_at: string;
        created_at: string;
        campus_areas?: { label: string } | null;
        categories?: { label: string; slug: string; photo_visibility: string } | null;
        report_images?: { object_path: string } | Array<{ object_path: string }> | null;
      }>).map(async (r) => {
        const isRestricted = r.categories?.photo_visibility === 'restricted';
        const imagePath = Array.isArray(r.report_images)
          ? r.report_images[0]?.object_path
          : r.report_images?.object_path;

        let photoUrl: string | undefined = undefined;
        if (imagePath && !isRestricted && r.report_type === 'found') {
          const signed = await getSignedImageUrl(imagePath);
          photoUrl = signed || undefined;
        }

        return {
          id: r.id,
          type: r.report_type,
          title: r.title,
          description: r.description,
          category: r.categories?.label || 'General',
          categorySlug: r.categories?.slug || 'other',
          colour: r.primary_color || 'Other',
          brand: r.brand || undefined,
          distinctiveFeatures: r.distinctive_features || undefined,
          campusArea: (r.campus_areas?.label || 'Other') as ReportItem['campusArea'],
          exactLocationNote: r.location_note || undefined,
          incidentDate: r.occurred_at || new Date().toISOString(),
          status: r.status as 'active' | 'claim_accepted' | 'resolved' | 'closed',
          isRestrictedCategory: isRestricted,
          photoUrl,
        };
      })
    );

    return { reports, isSamplePreview: false };
  } catch (err) {
    console.error('getExploreReportsAction error:', err);
    return { reports: [], isSamplePreview: false };
  }
}
