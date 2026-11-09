'use client';

import { useState } from 'react';
import { ClaimModal } from './claim-modal';

interface ActiveLostReport {
  id: string;
  title: string;
  category_id: number;
}

interface ClaimActionAreaProps {
  foundReportId: string;
  foundReportTitle: string;
  userActiveLostReports: ActiveLostReport[];
  userHasExistingClaim: boolean;
  existingClaimStatus?: string | null;
  isAuthenticated?: boolean;
  isReportResolved?: boolean;
}

export function ClaimActionArea({
  foundReportId,
  foundReportTitle,
  userActiveLostReports,
  userHasExistingClaim,
  existingClaimStatus,
  isAuthenticated,
  isReportResolved = false,
}: ClaimActionAreaProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleClaimClick = () => {
    if (isAuthenticated === false) {
      window.location.href = `/login?redirect=/report/${foundReportId}`;
      return;
    }
    setIsModalOpen(true);
  };

  // If user has an existing claim (regardless of whether report is active or resolved)
  if (userHasExistingClaim) {
    return (
      <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-900 block">
            Claim Status: {existingClaimStatus ? existingClaimStatus.toUpperCase() : 'SUBMITTED'}
          </span>
          <p className="text-xs text-emerald-950 font-medium mt-0.5">
            You have already filed an ownership claim for this found item.
          </p>
        </div>
      </div>
    );
  }

  // If report is resolved and visitor is guest or not the claimant: read-only banner
  if (isReportResolved) {
    return (
      <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl flex items-center gap-3 shadow-xs">
        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-800 shrink-0">
          <svg className="w-4 h-4 text-emerald-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <span className="text-xs font-bold text-emerald-900 block">
            Item Verified &amp; Returned
          </span>
          <p className="text-xs text-stone-700 mt-0.5">
            This found item has been verified and safely returned to its rightful owner. No new claims can be filed.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="p-5 bg-stone-900 border border-stone-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
            Ownership Claim
          </span>
          <h3 className="text-sm font-bold text-stone-100 mt-0.5">
            Is this your lost item?
          </h3>
          <p className="text-xs text-stone-400 mt-0.5">
            Submit your private ownership proof to verify identity and unlock private chat with the finder.
          </p>
        </div>

        <button
          type="button"
          onClick={handleClaimClick}
          className="shrink-0 px-5 py-2.5 bg-emerald-400 hover:bg-emerald-300 text-stone-900 font-semibold rounded-xl text-xs transition-all shadow-md flex items-center gap-2"
        >
          <svg className="w-4 h-4 text-stone-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          Claim This Item
        </button>
      </div>

      <ClaimModal
        foundReportId={foundReportId}
        foundReportTitle={foundReportTitle}
        userActiveLostReports={userActiveLostReports}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
