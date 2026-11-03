import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getUserClaimsAction } from '@/lib/server/claims/actions';

export const metadata = {
  title: 'Claims & Handovers | LostLink',
  description: 'Manage item claims, verify ownership, and coordinate handovers on campus.',
};

export default async function ClaimsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/claims');
  }

  const { asClaimant, asFinder } = await getUserClaimsAction();

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-stone-800">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
              Ownership Verification
            </span>
            <h1 className="text-3xl font-black text-stone-100 tracking-tight mt-1">
              Claims & Handovers
            </h1>
            <p className="text-sm text-stone-400 mt-1 max-w-xl">
              Track the status of items you claimed or review incoming claims for items you found.
            </p>
          </div>
          <Link
            href="/explore"
            className="inline-flex items-center gap-2 px-4 py-2 bg-stone-900 hover:bg-stone-800 text-stone-200 border border-stone-800 rounded-xl text-xs font-semibold transition-all shadow-sm"
          >
            Explore Reports &rarr;
          </Link>
        </div>

        {/* Section 1: Incoming Claims for Items You Found (Finder) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-teal-400" />
              <h2 className="text-lg font-bold text-stone-100">
                Incoming Claims on Your Found Items
              </h2>
            </div>
            <span className="text-xs text-stone-400 bg-stone-900 border border-stone-800 px-2.5 py-0.5 rounded-full">
              {asFinder.length}
            </span>
          </div>

          {asFinder.length === 0 ? (
            <div className="bg-stone-900/40 border border-stone-800/80 rounded-2xl p-6 text-center text-stone-400 text-xs">
              No incoming claims on items you found yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {asFinder.map((c) => {
                const isAccepted = c.status === 'accepted';
                const isPending = c.status === 'pending';
                const isCompleted = c.status === 'completed';

                return (
                  <div
                    key={c.id}
                    className={`p-5 rounded-2xl border transition-all ${
                      isAccepted
                        ? 'bg-emerald-950/20 border-emerald-800/60'
                        : isPending
                        ? 'bg-stone-900/90 border-stone-800'
                        : 'bg-stone-900/40 border-stone-800/60 opacity-80'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-xs font-bold text-stone-200 truncate">
                        {c.found_report?.title || 'Found Item'}
                      </span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          isAccepted
                            ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                            : isPending
                            ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                            : isCompleted
                            ? 'bg-teal-500/10 text-teal-300 border border-teal-500/30'
                            : 'bg-stone-800 text-stone-400'
                        }`}
                      >
                        {c.status.toUpperCase()}
                      </span>
                    </div>

                    <p className="text-xs text-stone-400 mb-3">
                      Claimant: <strong className="text-stone-300">{c.claimant_name}</strong>
                    </p>

                    {c.ownership_detail && (
                      <div className="p-2.5 bg-stone-950/70 border border-stone-800/80 rounded-xl mb-3 text-[11px] text-stone-300 italic font-mono truncate">
                        &quot;{c.ownership_detail}&quot;
                      </div>
                    )}

                    <div className="pt-2 border-t border-stone-800/80 flex items-center justify-between">
                      <span suppressHydrationWarning className="text-[10px] text-stone-400">
                        {new Intl.DateTimeFormat('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          timeZone: 'Asia/Kolkata',
                        }).format(new Date(c.created_at))}
                      </span>
                      {isAccepted ? (
                        <Link
                          href={`/claims/${c.id}`}
                          className="px-3 py-1 bg-emerald-400 hover:bg-emerald-300 text-stone-900 text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center gap-1"
                        >
                          Open Chat &rarr;
                        </Link>
                      ) : (
                        <Link
                          href={`/report/${c.found_report_id}`}
                          className="px-3 py-1 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium rounded-lg transition-all"
                        >
                          Review Claim &rarr;
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Section 2: Claims You Submitted (Claimant) */}
        <div className="space-y-4 pt-4 border-t border-stone-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <h2 className="text-lg font-bold text-stone-100">
                Claims You Submitted for Lost Items
              </h2>
            </div>
            <span className="text-xs text-stone-400 bg-stone-900 border border-stone-800 px-2.5 py-0.5 rounded-full">
              {asClaimant.length}
            </span>
          </div>

          {asClaimant.length === 0 ? (
            <div className="bg-stone-900/40 border border-stone-800/80 rounded-2xl p-6 text-center text-stone-400 text-xs">
              You haven&apos;t submitted any claims yet. When you spot a matching found item, submit a claim with your private ownership proof.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {asClaimant.map((c) => {
                const isAccepted = c.status === 'accepted';
                const isPending = c.status === 'pending';
                const isCompleted = c.status === 'completed';
                const isRejected = c.status === 'rejected';

                return (
                  <div
                    key={c.id}
                    className={`p-5 rounded-2xl border transition-all ${
                      isAccepted
                        ? 'bg-emerald-950/20 border-emerald-800/60'
                        : isPending
                        ? 'bg-stone-900/90 border-stone-800'
                        : 'bg-stone-900/40 border-stone-800/60 opacity-80'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-xs font-bold text-stone-200 truncate">
                        Claim on: {c.found_report?.title || 'Found Item'}
                      </span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          isAccepted
                            ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                            : isPending
                            ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                            : isCompleted
                            ? 'bg-teal-500/10 text-teal-300 border border-teal-500/30'
                            : isRejected
                            ? 'bg-red-500/10 text-red-300 border border-red-500/30'
                            : 'bg-stone-800 text-stone-400'
                        }`}
                      >
                        {c.status.toUpperCase()}
                      </span>
                    </div>

                    <p className="text-xs text-stone-400 mb-1">
                      Your Lost Report: <strong className="text-stone-300">{c.lost_report?.title}</strong>
                    </p>
                    <p className="text-xs text-stone-400 mb-3">
                      Finder: <strong className="text-stone-300">{c.finder_name}</strong>
                    </p>

                    {c.decision_note && (
                      <div className="p-2.5 bg-red-950/40 border border-red-900/50 rounded-xl mb-3 text-[11px] text-red-300">
                        Finder note: {c.decision_note}
                      </div>
                    )}

                    <div className="pt-2 border-t border-stone-800/80 flex items-center justify-between">
                      <span suppressHydrationWarning className="text-[10px] text-stone-400">
                        {new Intl.DateTimeFormat('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          timeZone: 'Asia/Kolkata',
                        }).format(new Date(c.created_at))}
                      </span>
                      {isAccepted ? (
                        <Link
                          href={`/claims/${c.id}`}
                          className="px-3 py-1 bg-emerald-400 hover:bg-emerald-300 text-stone-900 text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center gap-1"
                        >
                          Open Handover Chat &rarr;
                        </Link>
                      ) : (
                        <Link
                          href={`/report/${c.found_report_id}`}
                          className="px-3 py-1 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium rounded-lg transition-all"
                        >
                          View Found Item &rarr;
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
