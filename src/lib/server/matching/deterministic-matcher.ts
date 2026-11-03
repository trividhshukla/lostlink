import { CandidateReport, MatchLabel, MatchReason } from '@/types/database';

export interface MatchSuggestion {
  lost_report_id: string;
  found_report_id: string;
  label: MatchLabel;
  reasons: MatchReason[];
}

export interface SourceReportInput {
  id: string;
  report_type: 'lost' | 'found';
  title: string;
  description: string;
  category_id: number;
  category_label?: string;
  category_group?: string;
  primary_color: string | null;
  brand: string | null;
  distinctive_features: string | null;
  campus_area_id: string;
  campus_area_label?: string;
  location_note: string | null;
  occurred_at: string;
}

// Tokenize text into normalized unique keywords (length >= 3, skipping common stop words)
function tokenize(text: string): Set<string> {
  const STOP_WORDS = new Set([
    'the', 'and', 'with', 'for', 'this', 'that', 'near', 'from', 'have',
    'has', 'been', 'lost', 'found', 'item', 'side', 'some', 'what', 'when',
    'where', 'about', 'black', 'white', 'blue', 'very', 'just', 'more'
  ]);

  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w));

  return new Set(words);
}

/**
 * Deterministic Text Matcher
 * Strictly returns conservative label 'possible' only (per ARCHITECTURE.md Section 6 and TEST_PLAN.md MAT-UNIT-13).
 * Evaluates concrete field signals: category, category group, campus area, colour, brand, and description tokens.
 */
export function runDeterministicMatcher(
  source: SourceReportInput,
  candidates: CandidateReport[]
): MatchSuggestion[] {
  if (!candidates || candidates.length === 0) {
    return [];
  }

  const sourceTokens = tokenize(`${source.title} ${source.description} ${source.distinctive_features || ''}`);
  const scoredCandidates: { candidate: CandidateReport; score: number; reasons: MatchReason[] }[] = [];

  for (const candidate of candidates) {
    const reasons: MatchReason[] = [];
    let signalScore = 0;

    // 1. Category & Category Group
    if (source.category_id === candidate.category_id) {
      signalScore += 4;
      reasons.push({
        code: 'same_category',
        text: `Same category: ${candidate.category_label}`,
      });
    } else if (source.category_group && candidate.category_group && source.category_group === candidate.category_group) {
      signalScore += 2;
      reasons.push({
        code: 'same_category_group',
        text: `Related category group (${candidate.category_group})`,
      });
    }

    // 2. Campus Area
    if (
      source.campus_area_id === candidate.campus_area_id ||
      (source.campus_area_label && candidate.campus_area_label && source.campus_area_label === candidate.campus_area_label)
    ) {
      signalScore += 3;
      reasons.push({
        code: 'same_campus_area',
        text: `Same campus area: ${candidate.campus_area_label}`,
      });
    }

    // 3. Primary Colour
    if (
      source.primary_color &&
      candidate.primary_color &&
      source.primary_color.toLowerCase() === candidate.primary_color.toLowerCase() &&
      source.primary_color.toLowerCase() !== 'other'
    ) {
      signalScore += 2;
      reasons.push({
        code: 'same_colour',
        text: `Same colour: ${candidate.primary_color.charAt(0).toUpperCase() + candidate.primary_color.slice(1)}`,
      });
    }

    // 4. Brand / Model
    if (
      source.brand &&
      candidate.brand &&
      source.brand.trim().length > 1 &&
      candidate.brand.trim().length > 1
    ) {
      if (
        source.brand.toLowerCase().includes(candidate.brand.toLowerCase()) ||
        candidate.brand.toLowerCase().includes(source.brand.toLowerCase())
      ) {
        signalScore += 3;
        reasons.push({
          code: 'same_brand',
          text: `Same brand / model: ${candidate.brand}`,
        });
      } else {
        // MAT-UNIT-05: Different brand conflict is reflected in a caution reason
        reasons.push({
          code: 'brand_mismatch',
          text: `Different brand reported: "${source.brand}" vs "${candidate.brand}" (check details carefully)`,
        });
      }
    }

    // 5. Keyword Overlap in Title / Description
    const candTokens = tokenize(`${candidate.title} ${candidate.description} ${candidate.distinctive_features || ''}`);
    const overlap: string[] = [];
    for (const token of sourceTokens) {
      if (candTokens.has(token)) {
        overlap.push(token);
      }
    }

    if (overlap.length >= 2) {
      signalScore += 2;
      const sampleWords = overlap.slice(0, 3).join(', ');
      reasons.push({
        code: 'description_keywords',
        text: `Shared description keywords: ${sampleWords}`,
      });
    }

    // 6. Time Proximity (within 48 hours)
    const sourceTime = new Date(source.occurred_at).getTime();
    const candTime = new Date(candidate.occurred_at).getTime();
    const diffHours = Math.abs(sourceTime - candTime) / (1000 * 60 * 60);

    if (diffHours <= 48) {
      signalScore += 1;
      reasons.push({
        code: 'time_proximity',
        text: diffHours <= 24 ? 'Reported within 24 hours of each other' : 'Reported close in time',
      });
    }

    // MAT-UNIT-06: Same area/time are supporting signals, not sole proof.
    // At least one core attribute (category, category group, brand, colour, or description keywords) must match.
    const hasCoreSignal = reasons.some((r) =>
      ['same_category', 'same_category_group', 'same_brand', 'same_colour', 'description_keywords'].includes(r.code)
    );

    // Require at least 2 distinct concrete signals, at least one core signal, and score >= 3
    if (hasCoreSignal && reasons.length >= 2 && signalScore >= 3) {
      scoredCandidates.push({
        candidate,
        score: signalScore,
        reasons,
      });
    }
  }

  // Sort by highest signal score descending and take top 5
  scoredCandidates.sort((a, b) => b.score - a.score);
  const topCandidates = scoredCandidates.slice(0, 5);

  return topCandidates.map(({ candidate, reasons }) => {
    const isSourceLost = source.report_type === 'lost';
    return {
      lost_report_id: isSourceLost ? source.id : candidate.id,
      found_report_id: isSourceLost ? candidate.id : source.id,
      // Rule 2: strictly 'possible' only (never 'good' or 'strong')
      label: 'possible',
      reasons,
    };
  });
}
