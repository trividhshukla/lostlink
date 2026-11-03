'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  acceptClaimAction,
  rejectClaimAction,
  ClaimWithDetails,
} from '@/lib/server/claims/actions';

interface ClaimsListProps {
  claims: ClaimWithDetails[];
  currentUserId?: string;
  isFinder: boolean;
}

export function ClaimsList({ claims, currentUserId: _currentUserId, isFinder }: ClaimsListProps) {
  const router = useRouter();
  const [rejectingClaimId, setRejectingClaimId] = useState<string | null>(null);
  const [decisionNote, setDecisionNote] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (claims.length === 0) {
    return null;
  }

  const handleAccept = (claimId: string) => {
    setActionError(null);
    startTransition(async () => {
      const res = await acceptClaimAction(claimId);
      if (res.success) {
        router.refresh();
      } else {
        setActionError(res.error || 'Failed to accept claim.');
      }
    });
  };

  const handleRejectConfirm = (claimId: string) => {
    setActionError(null);
    startTransition(async () => {
      const res = await rejectClaimAction(claimId, decisionNote);
      if (res.success) {
        setRejectingClaimId(null);
        setDecisionNote('');
        router.refresh();
      } else {
        setActionError(res.error || 'Failed to reject claim.');
      }
    });
  };

  return (
    <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 sm:p-6 shadow-sm">
      <div className="flex items-center justify-between pb-3.5 border-b border-stone-800">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <h3 className="text-base font-bold text-stone-100">
            {isFinder ? 'Ownership Claims' : 'Your Claim on this Item'}
          </h3>
        </div>
        <span className="text-xs font-medium text-stone-400 bg-stone-800 px-2.5 py-1 rounded-full">
          {claims.length} {claims.length === 1 ? 'record' : 'records'}
        </span>
      </div>

      {actionError && (
        <div className="mt-4 p-3 bg-red-950/50 border border-red-800/60 rounded-xl text-xs text-red-300">
          {actionError}
        </div>
      )}

      <div className="mt-4 space-y-3.5">
        {claims.map((claim) => {
          const isPendingClaim = claim.status === 'pending';
          const isAccepted = claim.status === 'accepted';
          const isCompleted = claim.status === 'completed';
          const isRejected = claim.status === 'rejected';
          const isSuperseded = claim.status === 'superseded';
          const isCancelled = claim.status === 'cancelled';

          return (
            <div
              key={claim.id}
              className={`p-4 rounded-xl border transition-all ${
                isAccepted
                  ? 'bg-emerald-950/20 border-emerald-800/60'
                  : isPendingClaim
                  ? 'bg-stone-800/60 border-stone-700/70'
                  : 'bg-stone-900/50 border-stone-800/80 opacity-80'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-stone-200">
                    {isFinder ? claim.claimant_name : 'Your Lost Report'}:
                  </span>
                  <span className="text-xs text-stone-300 font-medium">
                    {claim.lost_report?.title || 'Lost Item'}
                  </span>
                </div>

                {/* Status Badges */}
                {isAccepted && (
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                    Accepted — Chat Unlocked
                  </span>
                )}
                {isPendingClaim && (
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30">
                    Pending Finder Review
                  </span>
                )}
                {isCompleted && (
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/30">
                    Handover Completed
                  </span>
                )}
                {isRejected && (
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-300 border border-red-500/30">
                    Permanently Rejected
                  </span>
                )}
                {isSuperseded && (
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-stone-700/50 text-stone-400 border border-stone-700">
                    Superseded
                  </span>
                )}
                {isCancelled && (
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-stone-700/50 text-stone-400 border border-stone-700">
                    Cancelled Handover
                  </span>
                )}
              </div>

              {/* Private Ownership Detail (Visible to Claimant and Finder only) */}
              {claim.ownership_detail && (
                <div className="mt-2.5 p-3 bg-stone-950/60 border border-stone-800 rounded-lg">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-stone-400 uppercase tracking-wider mb-1">
                    <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Private Ownership Proof:
                  </div>
                  <p className="text-xs text-stone-300 italic font-mono leading-relaxed">
                    &quot;{claim.ownership_detail}&quot;
                  </p>
                </div>
              )}

              {/* Rejection Note if present */}
              {claim.decision_note && (
                <div className="mt-2 text-xs text-red-300 bg-red-950/30 border border-red-900/40 rounded-lg p-2.5">
                  <span className="font-semibold text-red-200">Finder note: </span>
                  {claim.decision_note}
                </div>
              )}

              {/* Action Buttons for Finder on Pending Claims */}
              {isFinder && isPendingClaim && (
                <div className="mt-3.5 pt-3 border-t border-stone-800/80">
                  {rejectingClaimId === claim.id ? (
                    <div className="space-y-2.5 bg-stone-950/80 p-3 rounded-xl border border-red-900/40">
                      <p className="text-xs font-semibold text-red-300">
                        Reject Claim & Permanently Block Pair?
                      </p>
                      <p className="text-[11px] text-stone-400 leading-normal">
                        Per LostLink rules, rejecting this claim will permanently prevent this exact Lost and Found pair from being reclaimed.
                      </p>
                      <input
                        type="text"
                        value={decisionNote}
                        onChange={(e) => setDecisionNote(e.target.value)}
                        placeholder="Optional reason for claimant (max 200 chars)..."
                        maxLength={200}
                        className="w-full bg-stone-900 border border-stone-800 text-xs text-stone-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-red-500"
                      />
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setRejectingClaimId(null);
                            setDecisionNote('');
                          }}
                          disabled={isPending}
                          className="px-3 py-1 text-xs text-stone-400 hover:text-stone-200"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRejectConfirm(claim.id)}
                          disabled={isPending}
                          className="px-3 py-1 text-xs font-medium text-white bg-red-600 hover:bg-red-500 rounded-lg transition-colors"
                        >
                          {isPending ? 'Rejecting...' : 'Confirm Permanent Reject'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-end gap-2.5">
                      <button
                        type="button"
                        onClick={() => setRejectingClaimId(claim.id)}
                        disabled={isPending}
                        className="px-3.5 py-1.5 text-xs font-medium text-stone-400 hover:text-red-300 hover:bg-red-950/30 border border-stone-800 hover:border-red-900/50 rounded-xl transition-all"
                      >
                        Reject Claim
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAccept(claim.id)}
                        disabled={isPending}
                        className="px-4 py-1.5 text-xs font-medium text-stone-900 bg-emerald-400 hover:bg-emerald-300 rounded-xl shadow-sm transition-all flex items-center gap-1.5"
                      >
                        <svg className="w-3.5 h-3.5 text-stone-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {isPending ? 'Accepting...' : 'Accept & Unlock Chat'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Direct Link to Handover Chat if Accepted */}
              {isAccepted && (
                <div className="mt-3 pt-3 border-t border-emerald-900/40 flex items-center justify-between">
                  <span className="text-[11px] text-emerald-400">
                    Handover in progress — coordinate safe return:
                  </span>
                  <Link
                    href={`/claims/${claim.id}`}
                    className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold text-emerald-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg shadow-sm transition-all"
                  >
                    Open Handover Chat
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
