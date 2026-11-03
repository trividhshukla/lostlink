import crypto from 'crypto';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { CandidateReport, MatchingStatus } from '@/types/database';
import { SourceReportInput, runDeterministicMatcher } from './deterministic-matcher';
import { matchWithGroqOrFallback } from './groq-text-matcher';

export interface OrchestrationResult {
  success: boolean;
  matchCount: number;
  usedGroq: boolean;
  status: MatchingStatus;
  error?: string;
}

/**
 * Executes bidirectional text-only matching for a newly saved or updated report.
 * Strictly runs in the server action request without external workers or queues.
 * Persists matches, reserves quota, and generates idempotent notifications.
 */
interface SourceReportDbRow {
  id: string;
  owner_id: string;
  campus_id: string;
  report_type: 'lost' | 'found';
  status: string;
  title: string;
  description: string;
  category_id: number;
  primary_color: string | null;
  brand: string | null;
  distinctive_features: string | null;
  campus_area_id: string;
  location_note: string | null;
  occurred_at: string;
  categories?: { label: string; group_slug: string; photo_visibility: string } | null;
  campus_areas?: { label: string } | null;
}

export async function executeMatching(
  reportId: string,
  userId: string
): Promise<OrchestrationResult> {
  try {
    const supabase = await createClient();

    // 1. Fetch source report details
    const { data: sourceReport, error: fetchError } = (await supabase
      .from('reports')
      .select(`
        id,
        owner_id,
        campus_id,
        report_type,
        status,
        title,
        description,
        category_id,
        primary_color,
        brand,
        distinctive_features,
        campus_area_id,
        location_note,
        occurred_at,
        categories (label, group_slug, photo_visibility),
        campus_areas (label)
      `)
      .eq('id', reportId)
      .single()) as unknown as { data: SourceReportDbRow | null; error: Error | null };

    if (fetchError || !sourceReport) {
      return {
        success: false,
        matchCount: 0,
        usedGroq: false,
        status: 'failed',
        error: `Could not fetch report for matching: ${fetchError?.message}`,
      };
    }

    // Exclude restricted category from AI matching per PRD.md Section 9 and MAT-UNIT-11
    const isRestrictedCategory =
      sourceReport.categories?.photo_visibility === 'restricted' ||
      sourceReport.categories?.group_slug === 'documents-cards' ||
      Boolean(sourceReport.categories?.label?.toLowerCase().includes('id card'));

    const sourceInput: SourceReportInput = {
      id: sourceReport.id,
      report_type: sourceReport.report_type,
      title: sourceReport.title,
      description: sourceReport.description,
      category_id: sourceReport.category_id,
      category_label: sourceReport.categories?.label,
      category_group: sourceReport.categories?.group_slug,
      primary_color: sourceReport.primary_color,
      brand: sourceReport.brand,
      distinctive_features: sourceReport.distinctive_features,
      campus_area_id: sourceReport.campus_area_id,
      campus_area_label: sourceReport.campus_areas?.label,
      location_note: sourceReport.location_note,
      occurred_at: sourceReport.occurred_at,
    };

    // 2. Fetch up to 15 candidates
    let candidateList: CandidateReport[] = [];
    const { data: candidates, error: candidateError } = (await supabase.rpc(
      'get_matching_candidates',
      { p_report_id: reportId }
    )) as unknown as { data: CandidateReport[] | null; error: Error | null };

    if (!candidateError && candidates && candidates.length > 0) {
      candidateList = candidates;
    } else {
      if (candidateError) {
        console.warn('[Matching Orchestrator]: Candidate RPC failed, falling back to direct query:', candidateError.message);
      }
      // Direct query fallback for candidate retrieval
      const { data: directCandidates } = await supabase
        .from('reports')
        .select(`
          id,
          report_type,
          title,
          description,
          category_id,
          primary_color,
          brand,
          distinctive_features,
          campus_area_id,
          location_note,
          occurred_at,
          categories (label, group_slug),
          campus_areas (label)
        `)
        .eq('campus_id', sourceReport.campus_id)
        .neq('report_type', sourceReport.report_type)
        .eq('status', 'active')
        .eq('moderation_state', 'visible')
        .neq('owner_id', sourceReport.owner_id)
        .gte('occurred_at', new Date(Date.now() - 90 * 86400000).toISOString())
        .limit(15);

      if (directCandidates && directCandidates.length > 0) {
        candidateList = (directCandidates as unknown as Array<{
          id: string;
          report_type: 'lost' | 'found';
          title: string;
          description: string;
          category_id: number;
          primary_color: string | null;
          brand: string | null;
          distinctive_features: string | null;
          campus_area_id: string;
          location_note: string | null;
          occurred_at: string;
          categories?: { label: string; group_slug: string } | null;
          campus_areas?: { label: string } | null;
        }>).map((c) => ({
          id: c.id,
          report_type: c.report_type,
          title: c.title,
          description: c.description,
          category_id: c.category_id,
          category_label: c.categories?.label || 'General',
          category_group: c.categories?.group_slug || 'other',
          primary_color: c.primary_color,
          brand: c.brand,
          distinctive_features: c.distinctive_features,
          campus_area_id: c.campus_area_id,
          campus_area_label: c.campus_areas?.label || 'Campus',
          location_note: c.location_note,
          occurred_at: c.occurred_at,
        }));
      }
    }

    // If no candidate available, mark complete with 0 matches
    if (candidateList.length === 0) {
      await supabase.rpc('finish_matching', {
        p_report_id: reportId,
        p_matches: [],
        p_matching_status: 'complete',
      });

      return {
        success: true,
        matchCount: 0,
        usedGroq: false,
        status: 'complete',
      };
    }

    let suggestions = [];
    let usedGroq = false;
    let finalStatus: MatchingStatus = 'complete';

    const hasGroqConfig = Boolean(
      process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.startsWith('gsk_')
    );

    // 3. Attempt Groq AI ranking if eligible
    if (hasGroqConfig && !isRestrictedCategory) {
      const requestKey = crypto.randomUUID();

      // Reserve quota atomically
      const { data: quotaGranted } = await supabase.rpc('reserve_ai_match_quota', {
        p_user_id: userId,
        p_report_id: reportId,
        p_request_key: requestKey,
      });

      if (quotaGranted) {
        const groqResult = await matchWithGroqOrFallback(sourceInput, candidateList);
        suggestions = groqResult.suggestions;
        usedGroq = groqResult.usedGroq;

        // Record usage outcome
        await supabase.rpc('record_ai_match_usage', {
          p_request_key: requestKey,
          p_outcome: groqResult.outcome,
        });

        if (!usedGroq) {
          finalStatus = 'degraded'; // Fallback was used
        }
      } else {
        // Quota limit reached -> run deterministic matcher
        suggestions = runDeterministicMatcher(sourceInput, candidateList);
        finalStatus = 'degraded';
      }
    } else {
      // Deterministic matcher directly (no Groq key or restricted category)
      suggestions = runDeterministicMatcher(sourceInput, candidateList);
    }

    // 4. Save matches and trigger idempotent notifications
    const { error: finishError } = await supabase.rpc('finish_matching', {
      p_report_id: reportId,
      p_matches: suggestions as unknown as import('@/types/database').Json,
      p_matching_status: finalStatus,
    });

    if (finishError) {
      console.warn('[Matching Orchestrator]: finish_matching RPC error, using direct admin fallback:', finishError.message);
      try {
        const adminSupabase = createAdminClient();
        if (suggestions.length > 0) {
          for (const s of suggestions) {
            const { data: upsertedMatch } = await adminSupabase
              .from('matches')
              .upsert({
                lost_report_id: s.lost_report_id,
                found_report_id: s.found_report_id,
                label: s.label,
                reasons: s.reasons as unknown as import('@/types/database').Json,
                updated_at: new Date().toISOString(),
              }, { onConflict: 'lost_report_id,found_report_id' })
              .select('id')
              .single();

            const matchId = upsertedMatch?.id;
            if (matchId) {
              const { data: lostRow } = await adminSupabase.from('reports').select('owner_id, title').eq('id', s.lost_report_id).single();
              const { data: foundRow } = await adminSupabase.from('reports').select('owner_id, title').eq('id', s.found_report_id).single();

              if (lostRow?.owner_id) {
                await adminSupabase.from('notifications').upsert({
                  user_id: lostRow.owner_id,
                  type: 'new_match',
                  report_id: s.lost_report_id,
                  match_id: matchId,
                  idempotency_key: `match:${matchId}:user:${lostRow.owner_id}`,
                  title: 'Potential match found for your lost item',
                  body: `A campus listing "${foundRow?.title || 'Found item'}" may match your lost report "${lostRow.title}".`,
                }, { onConflict: 'idempotency_key' });
              }

              if (foundRow?.owner_id) {
                await adminSupabase.from('notifications').upsert({
                  user_id: foundRow.owner_id,
                  type: 'new_match',
                  report_id: s.found_report_id,
                  match_id: matchId,
                  idempotency_key: `match:${matchId}:user:${foundRow.owner_id}`,
                  title: 'Your found item has a potential match',
                  body: `A member reported losing "${lostRow?.title || 'Lost item'}", which may correspond to your found listing.`,
                }, { onConflict: 'idempotency_key' });
              }
            }
          }
        }
        await adminSupabase.from('reports').update({
          matching_status: finalStatus,
          matching_finished_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq('id', reportId);
      } catch (fallbackErr) {
        console.error('[Matching Orchestrator]: Admin direct fallback failed:', fallbackErr);
      }
    }

    return {
      success: true,
      matchCount: suggestions.length,
      usedGroq,
      status: finalStatus,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error during matching orchestration';
    console.error('[Matching Orchestration Error]:', errorMsg);
    return {
      success: false,
      matchCount: 0,
      usedGroq: false,
      status: 'failed',
      error: errorMsg,
    };
  }
}
