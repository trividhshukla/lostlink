'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { MatchLabel, MatchReason } from '@/types/database';
import { retryMatchingAction } from '@/lib/server/reports/actions';
import { Badge } from '@/components/badge';
import {
  Sparkles,
  RotateCcw,
  Loader2,
  Tag,
  MapPin,
  ArrowRight,
  Shield,
  CheckCircle2,
} from 'lucide-react';

export interface DisplayMatch {
  id: string;
  matchedReportId: string;
  matchedReportTitle: string;
  matchedReportType: 'lost' | 'found';
  matchedCampusArea: string;
  matchedCategory: string;
  matchedPhotoUrl?: string | null;
  matchedIsRestricted?: boolean;
  label: MatchLabel;
  reasons: MatchReason[];
  createdAt: string;
}

interface PotentialMatchesProps {
  reportId: string;
  isOwner: boolean;
  matchingStatus: string;
  canRetry: boolean;
  matches: DisplayMatch[];
}

export function PotentialMatches({
  reportId,
  isOwner,
  matchingStatus,
  canRetry,
  matches,
}: PotentialMatchesProps) {
  const [retrying, setRetrying] = useState(false);
  const [retryResult, setRetryResult] = useState<string | null>(null);

  const handleRetry = async () => {
    setRetrying(true);
    setRetryResult(null);

    const res = await retryMatchingAction(reportId);
    setRetrying(false);

    if (res.success) {
      const count = res.matchCount ?? 0;
      setRetryResult(
        count > 0
          ? `Found ${count} potential match${count > 1 ? 'es' : ''}!`
          : 'Matching finished. No new matches found at this time.'
      );
      setTimeout(() => setRetryResult(null), 5000);
    } else {
      setRetryResult(res.error || 'Failed to re-run matching');
    }
  };

  const getLabelBadge = (label: MatchLabel) => {
    switch (label) {
      case 'strong':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
            <Sparkles className="w-3 h-3 text-emerald-700" />
            <span>Strong similarity</span>
          </span>
        );
      case 'good':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-100 text-teal-900 border border-teal-300">
            <Sparkles className="w-3 h-3 text-teal-700" />
            <span>Good similarity</span>
          </span>
        );
      case 'possible':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
            <Sparkles className="w-3 h-3 text-amber-700" />
            <span>Possible similarity</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Header & Retry Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-950 flex items-center justify-center text-emerald-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-stone-900">
              Potential Campus Matches ({matches.length})
            </h3>
            <p className="text-xs text-stone-500">
              Automatic text-only suggestions based on description and physical attributes.
            </p>
          </div>
        </div>

        {isOwner && canRetry && (
          <button
            type="button"
            onClick={handleRetry}
            disabled={retrying}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-stone-100 text-stone-800 hover:bg-stone-200 transition shadow-xs disabled:opacity-50 cursor-pointer self-start sm:self-auto"
            title="Re-run text-only matching"
          >
            {retrying ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-700" />
                <span>Checking...</span>
              </>
            ) : (
              <>
                <RotateCcw className="w-3.5 h-3.5 text-stone-600" />
                <span>Re-run Matching</span>
              </>
            )}
          </button>
        )}
      </div>

      {retryResult && (
        <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>{retryResult}</span>
        </div>
      )}

      {/* Matches List */}
      {matches.length === 0 ? (
        <div className="p-6 bg-stone-50 rounded-2xl border border-stone-200 text-center text-xs text-stone-500 space-y-1">
          <p className="font-semibold text-stone-700">No matching suggestions yet</p>
          <p>
            When a corresponding {matchingStatus === 'lost' ? 'found' : 'lost'} item with overlapping attributes is reported, it will appear here automatically.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {matches.map((match) => (
            <div
              key={match.id}
              className="p-5 bg-white rounded-2xl border border-stone-200/90 shadow-xs hover:border-stone-300 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              {/* Thumbnail or placeholder if found */}
              <div className="flex items-start gap-4 flex-1">
                {match.matchedReportType === 'found' && match.matchedPhotoUrl && !match.matchedIsRestricted ? (
                  <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-stone-100 border border-stone-200 shrink-0">
                    <Image
                      src={match.matchedPhotoUrl}
                      alt={match.matchedReportTitle}
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : match.matchedIsRestricted ? (
                  <div className="w-16 h-16 rounded-xl bg-purple-50 border border-purple-200 flex flex-col items-center justify-center text-purple-800 shrink-0">
                    <Shield className="w-5 h-5 mb-0.5" />
                    <span className="text-[9px] font-bold">Shielded</span>
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-amber-50 border border-amber-200 flex flex-col items-center justify-center text-amber-800 shrink-0">
                    <span className="text-xs font-bold uppercase">{match.matchedReportType}</span>
                  </div>
                )}

                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {getLabelBadge(match.label)}
                    <Badge variant={match.matchedReportType === 'found' ? 'found' : 'lost'}>
                      {match.matchedReportType === 'found' ? 'Found Listing' : 'Lost Listing'}
                    </Badge>
                  </div>

                  <h4 className="text-sm font-bold text-stone-900 truncate">
                    {match.matchedReportTitle}
                  </h4>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-stone-500">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-emerald-700" />
                      {match.matchedCampusArea}
                    </span>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1">
                      <Tag className="w-3.5 h-3.5 text-stone-400" />
                      {match.matchedCategory}
                    </span>
                  </div>

                  {/* Grounded Reason Pills */}
                  <div className="flex flex-wrap gap-1.5 pt-1.5">
                    {match.reasons.map((reason, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-stone-100 text-stone-700 border border-stone-200"
                      >
                        {reason.text}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* View/Claim Action */}
              <div className="shrink-0 flex items-center gap-2">
                <Link
                  href={`/report/${match.matchedReportId}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[#0C1512] text-stone-100 hover:bg-[#182420] transition shadow-xs"
                >
                  <span>Inspect Match</span>
                  <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
