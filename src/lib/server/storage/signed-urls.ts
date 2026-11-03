import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { PhotoVisibility } from '@/types/database';

/**
 * Generates a short-lived signed URL for a private report image.
 * Uses the server-side admin client to sign access tokens for private bucket storage,
 * with graceful fallback to session client.
 * Default expiration: 3600 seconds (1 hour).
 */
export async function getSignedImageUrl(
  objectPath: string | null | undefined,
  expiresInSeconds = 3600
): Promise<string | null> {
  if (!objectPath || objectPath.trim().length === 0) {
    return null;
  }

  try {
    let supabase;
    try {
      supabase = createAdminClient();
    } catch {
      supabase = await createClient();
    }

    const { data, error } = await supabase.storage
      .from('report-images')
      .createSignedUrl(objectPath, expiresInSeconds);

    if (error || !data?.signedUrl) {
      console.warn(`[Storage Signed URL Warning]: Could not sign path "${objectPath}":`, error?.message);
      return null;
    }

    return data.signedUrl;
  } catch (err) {
    console.error('[Storage Signed URL Exception]:', err);
    return null;
  }
}

/**
 * Returns a signed URL for a report image with strict category-level authorization:
 * - Public categories: readable by any authenticated member.
 * - Restricted categories (ID cards / documents): readable strictly by the report owner,
 *   admins, or participants of an accepted/completed claim on that report (PRD.md Section 5).
 */
export async function getAuthorizedReportImageUrl(
  reportId: string,
  objectPath: string | null | undefined,
  photoVisibility: PhotoVisibility = 'public',
  reportOwnerId: string,
  expiresInSeconds = 3600
): Promise<string | null> {
  if (!objectPath || objectPath.trim().length === 0) {
    return null;
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Public category photos are viewable by authenticated users
    if (photoVisibility === 'public') {
      return getSignedImageUrl(objectPath, expiresInSeconds);
    }

    // Restricted photo: unauthenticated access denied
    if (!user) {
      return null;
    }

    // Report owner has direct authorization
    if (user.id === reportOwnerId) {
      return getSignedImageUrl(objectPath, expiresInSeconds);
    }

    // Admins have authorization
    const { data: isAdmin } = await supabase.rpc('is_admin', { p_user_id: user.id });
    if (isAdmin) {
      return getSignedImageUrl(objectPath, expiresInSeconds);
    }

    // Accepted or completed claim participants have authorization (PRD.md Section 5)
    const { data: authorizedClaim } = await supabase
      .from('claims')
      .select('id')
      .or(`found_report_id.eq.${reportId},lost_report_id.eq.${reportId}`)
      .or(`claimant_id.eq.${user.id},finder_id.eq.${user.id}`)
      .in('status', ['accepted', 'completed'])
      .limit(1)
      .maybeSingle();

    if (authorizedClaim) {
      return getSignedImageUrl(objectPath, expiresInSeconds);
    }

    // Otherwise, photo is masked
    return null;
  } catch (err) {
    console.error('[Authorized Image URL Exception]:', err);
    return null;
  }
}
