import { createAdminClient } from '@/lib/supabase/admin';

export interface DeleteResult {
  success: boolean;
  deletedPaths: string[];
  error?: string;
}

/**
 * Dedicated server-only storage deletion module.
 * Only call this module with exact object paths authorized by a database query or RPC.
 * Never pass unchecked user-submitted paths.
 */
export async function deleteReportImages(objectPaths: string[]): Promise<DeleteResult> {
  const validPaths = objectPaths.filter(
    (path) => typeof path === 'string' && path.trim().length > 0 && !path.includes('..')
  );

  if (validPaths.length === 0) {
    return { success: true, deletedPaths: [] };
  }

  try {
    const adminSupabase = createAdminClient();
    const { data, error } = await adminSupabase.storage
      .from('report-images')
      .remove(validPaths);

    if (error) {
      console.error('[Storage Cleanup Error]: Failed to delete report images:', error.message);
      return { success: false, deletedPaths: [], error: error.message };
    }

    const removedPaths = data ? data.map((item) => item.name) : validPaths;
    return { success: true, deletedPaths: removedPaths };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown storage deletion error';
    console.error('[Storage Cleanup Exception]:', message);
    return { success: false, deletedPaths: [], error: message };
  }
}
