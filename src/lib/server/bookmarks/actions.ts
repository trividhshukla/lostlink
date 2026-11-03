'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export interface BookmarkedReportItem {
  id: string;
  report_id: string;
  created_at: string;
  report?: {
    id: string;
    title: string;
    report_type: 'lost' | 'found';
    status: string;
    campus_area_id: string;
    campus_areas?: { label: string } | null;
    categories?: { label: string; photo_visibility: string } | null;
    report_images?: { object_path: string }[] | null;
    occurred_at: string;
  } | null;
}

export async function toggleBookmarkAction(
  reportId: string
): Promise<{ isBookmarked: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { isBookmarked: false, error: 'You must be signed in to bookmark reports.' };
    }

    // Check if already bookmarked
    const { data: existing } = await supabase
      .from('bookmarks')
      .select('id')
      .eq('user_id', user.id)
      .eq('report_id', reportId)
      .maybeSingle();

    if (existing) {
      // Remove bookmark
      await supabase.from('bookmarks').delete().eq('id', existing.id);
      revalidatePath(`/report/${reportId}`);
      revalidatePath('/explore');
      revalidatePath('/dashboard');
      return { isBookmarked: false };
    } else {
      // Add bookmark
      await supabase.from('bookmarks').insert({
        user_id: user.id,
        report_id: reportId,
      });
      revalidatePath(`/report/${reportId}`);
      revalidatePath('/explore');
      revalidatePath('/dashboard');
      return { isBookmarked: true };
    }
  } catch (err) {
    return { isBookmarked: false, error: err instanceof Error ? err.message : 'Error toggling bookmark' };
  }
}

export async function isReportBookmarkedAction(
  reportId: string
): Promise<boolean> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return false;

    const { data } = await supabase
      .from('bookmarks')
      .select('id')
      .eq('user_id', user.id)
      .eq('report_id', reportId)
      .maybeSingle();

    return Boolean(data);
  } catch {
    return false;
  }
}

interface DbBookmarkQueryRow {
  id: string;
  report_id: string;
  created_at: string;
  report?: {
    id: string;
    title: string;
    report_type: 'lost' | 'found';
    status: string;
    campus_area_id: string;
    campus_areas?: { label: string } | null;
    categories?: { label: string; photo_visibility: string } | null;
    report_images?: { object_path: string }[] | null;
    occurred_at: string;
  } | null;
}

export async function getUserBookmarksAction(): Promise<BookmarkedReportItem[]> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return [];

    const { data: rawBookmarks, error } = (await supabase
      .from('bookmarks')
      .select(`
        id,
        report_id,
        created_at,
        report:reports!report_id (
          id,
          title,
          report_type,
          status,
          campus_area_id,
          occurred_at,
          campus_areas (label),
          categories (label, photo_visibility),
          report_images (object_path)
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })) as unknown as {
      data: DbBookmarkQueryRow[] | null;
      error: Error | null;
    };

    if (error || !rawBookmarks) return [];

    return rawBookmarks.map((b) => ({
      id: b.id,
      report_id: b.report_id,
      created_at: b.created_at,
      report: b.report || null,
    }));
  } catch (err) {
    console.error('getUserBookmarksAction error:', err);
    return [];
  }
}
