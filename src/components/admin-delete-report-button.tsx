'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { permanentlyDeleteReportAdminAction } from '@/lib/server/admin/actions';

interface AdminDeleteReportButtonProps {
  reportId: string;
  reportTitle: string;
  redirectTo?: string;
  onDeleted?: () => void;
}

export function AdminDeleteReportButton({
  reportId,
  reportTitle,
  redirectTo = '/explore',
  onDeleted,
}: AdminDeleteReportButtonProps) {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleDelete = () => {
    setError(null);
    startTransition(async () => {
      const res = await permanentlyDeleteReportAdminAction(reportId);
      if (res.success) {
        setShowConfirm(false);
        if (onDeleted) {
          onDeleted();
        } else if (redirectTo) {
          router.push(redirectTo);
          router.refresh();
        }
      } else {
        setError(res.error || 'Failed to permanently delete report.');
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setShowConfirm(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-300 bg-rose-950/40 border border-rose-800/60 hover:bg-rose-900/60 hover:text-rose-100 transition-all shadow-xs cursor-pointer"
        title="Admin: Permanently purge this report across entire system"
      >
        <Trash2 className="w-3.5 h-3.5" />
        <span>Delete Report Permanently</span>
      </button>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-stone-900 border border-rose-800/80 rounded-2xl p-6 shadow-2xl text-stone-100 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-rose-950/80 border border-rose-700/80 text-rose-400 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">
                  Permanently Delete Report?
                </h3>
                <p className="text-xs text-stone-300 leading-relaxed">
                  You are about to hard-delete <strong className="text-white">&ldquo;{reportTitle}&rdquo;</strong>.
                </p>
              </div>
            </div>

            <div className="p-3 bg-stone-950 border border-stone-800 rounded-xl text-xs text-stone-400 space-y-1.5">
              <p className="font-semibold text-rose-300">
                Cascade Purge Warning:
              </p>
              <ul className="list-disc pl-4 space-y-1 text-[11px] text-stone-400">
                <li>Uploaded photo will be removed from Supabase storage</li>
                <li>All linked ownership claims, proof details, and chat messages will be deleted</li>
                <li>All suggested matches, bookmarks, and activity logs will be purged</li>
                <li>This action is immediate, irreversible, and audited</li>
              </ul>
            </div>

            {error && (
              <div className="p-2.5 bg-rose-950/60 border border-rose-800 rounded-lg text-xs text-rose-200">
                {error}
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-stone-800">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                disabled={isPending}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-300 hover:bg-stone-800 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 transition shadow-sm disabled:opacity-50"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Purging Everywhere...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirm Hard Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
