'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { submitClaimAction } from '@/lib/server/claims/actions';

interface ActiveLostReport {
  id: string;
  title: string;
  category_id: number;
}

interface ClaimModalProps {
  foundReportId: string;
  foundReportTitle: string;
  userActiveLostReports: ActiveLostReport[];
  isOpen: boolean;
  onClose: () => void;
  matchId?: string | null;
}

export function ClaimModal({
  foundReportId,
  foundReportTitle,
  userActiveLostReports,
  isOpen,
  onClose,
  matchId,
}: ClaimModalProps) {
  const router = useRouter();
  const [selectedLostId, setSelectedLostId] = useState(
    userActiveLostReports[0]?.id || ''
  );
  const [ownershipDetail, setOwnershipDetail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!isOpen) return null;

  const charCount = ownershipDetail.trim().length;
  const isLengthValid = charCount >= 10 && charCount <= 500;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLostId) {
      setError('Please select an active Lost report to link to this claim.');
      return;
    }
    if (!isLengthValid) {
      setError('Ownership detail must be between 10 and 500 characters.');
      return;
    }

    setError(null);
    const formData = new FormData();
    formData.append('lostReportId', selectedLostId);
    formData.append('foundReportId', foundReportId);
    formData.append('ownershipDetail', ownershipDetail.trim());
    if (matchId) {
      formData.append('matchId', matchId);
    }

    startTransition(async () => {
      const res = await submitClaimAction(formData);
      if (res.success) {
        onClose();
        router.refresh();
      } else {
        setError(res.error || 'Failed to submit claim.');
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-stone-900 border border-stone-800 text-stone-100 rounded-2xl w-full max-w-lg shadow-2xl p-6 sm:p-7 relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between pb-4 border-b border-stone-800">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
              Claim Verification
            </span>
            <h2 className="text-xl font-bold text-stone-100 mt-0.5">
              Claim This Found Item
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-200 transition-colors p-1.5 rounded-lg hover:bg-stone-800"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {userActiveLostReports.length === 0 ? (
          <div className="py-6 text-center">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-stone-200">Active Lost Report Required</h3>
            <p className="text-sm text-stone-400 mt-1 max-w-sm mx-auto">
              To prevent fraudulent claims, you must have an active Lost report on this campus before claiming a found item.
            </p>
            <div className="mt-5 flex justify-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm text-stone-400 hover:text-stone-200 bg-stone-800/80 rounded-xl"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => router.push('/report/new?type=lost')}
                className="px-4 py-2 text-sm font-medium text-stone-900 bg-emerald-400 hover:bg-emerald-300 rounded-xl shadow-sm transition-all"
              >
                Create Lost Report
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            {error && (
              <div className="p-3 bg-red-950/50 border border-red-800/50 rounded-xl text-xs text-red-300">
                {error}
              </div>
            )}

            {/* Found Item Context */}
            <div className="p-3 bg-stone-800/50 border border-stone-800 rounded-xl text-xs text-stone-300">
              <span className="text-stone-400">Claiming Found Item: </span>
              <strong className="text-stone-200 font-semibold">{foundReportTitle}</strong>
            </div>

            {/* Step 1: Select Active Lost Report */}
            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                Select your matching Lost Report <span className="text-emerald-400">*</span>
              </label>
              <select
                value={selectedLostId}
                onChange={(e) => setSelectedLostId(e.target.value)}
                className="w-full bg-stone-800 border border-stone-700/80 rounded-xl px-3.5 py-2.5 text-sm text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                required
              >
                {userActiveLostReports.map((report) => (
                  <option key={report.id} value={report.id}>
                    {report.title}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-stone-400 mt-1">
                Only your active Lost reports are eligible.
              </p>
            </div>

            {/* Step 2: Private Ownership Secret */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-semibold text-stone-300">
                  Private Ownership Secret <span className="text-emerald-400">*</span>
                </label>
                <span
                  className={`text-[11px] ${
                    isLengthValid ? 'text-stone-400' : 'text-amber-400'
                  }`}
                >
                  {charCount}/500 chars (min 10)
                </span>
              </div>
              <textarea
                value={ownershipDetail}
                onChange={(e) => setOwnershipDetail(e.target.value)}
                rows={4}
                placeholder="Describe a detail known only to the true owner that is not in the public photo or description (e.g., lock screen wallpaper, sticker underneath, serial number snippet, or pouch contents)..."
                className="w-full bg-stone-800 border border-stone-700/80 rounded-xl px-3.5 py-2.5 text-sm text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none"
                required
              />
              <div className="flex items-start gap-2 mt-1.5 text-[11px] text-stone-400">
                <svg className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span>
                  This secret is strictly private. Only the Finder can read it. It is never exposed in public listings, notifications, or AI searches.
                </span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-3 flex items-center justify-end gap-3 border-t border-stone-800">
              <button
                type="button"
                onClick={onClose}
                disabled={isPending}
                className="px-4 py-2 text-sm text-stone-300 hover:text-stone-100 hover:bg-stone-800 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending || !isLengthValid}
                className="px-5 py-2 text-sm font-medium text-stone-900 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-md transition-all flex items-center gap-2"
              >
                {isPending ? (
                  <>
                    <svg className="w-4 h-4 animate-spin text-stone-900" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Submitting Claim...
                  </>
                ) : (
                  'Submit Private Claim'
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
