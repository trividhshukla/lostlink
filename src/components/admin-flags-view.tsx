'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  AdminFlagItem,
  adminReadFlaggedClaimAction,
  adminReadFlaggedConversationAction,
  adminModerateReportAction,
  adminResolveFlagAction,
} from '@/lib/server/admin/actions';
import {
  ShieldAlert,
  Lock,
} from 'lucide-react';
import { formatDateTime } from '@/lib/utils';
import { AdminDeleteReportButton } from '@/components/admin-delete-report-button';

interface AuditedInspectionData {
  claim_id?: string;
  ownership_detail?: string;
  conversation_id?: string;
  messages?: Array<{
    id: string;
    sender_id: string;
    body: string;
    created_at: string;
  }>;
}

interface AdminFlagsViewProps {
  initialFlags: AdminFlagItem[];
}

export function AdminFlagsView({ initialFlags }: AdminFlagsViewProps) {
  const router = useRouter();
  const flags = initialFlags;
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedFlag, setSelectedFlag] = useState<AdminFlagItem | null>(null);
  const [auditedData, setAuditedData] = useState<AuditedInspectionData | null>(null);
  const [hideReason, setHideReason] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredFlags =
    statusFilter === 'all'
      ? flags
      : flags.filter((f) => f.status === statusFilter);

  const handleAuditedRead = (flag: AdminFlagItem) => {
    setSelectedFlag(flag);
    setAuditedData(null);
    setErrorMsg(null);

    startTransition(async () => {
      let res;
      if (flag.target_type === 'claim') {
        res = await adminReadFlaggedClaimAction(flag.id);
      } else if (flag.target_type === 'conversation' || flag.target_type === 'message') {
        res = await adminReadFlaggedConversationAction(flag.id);
      }

      if (res && res.success && res.data) {
        setAuditedData(res.data as unknown as AuditedInspectionData);
      } else {
        setErrorMsg(res?.error || 'Failed to perform audited read.');
      }
    });
  };

  const handleModerateReport = (flagId: string, reportId: string, action: 'hide' | 'unhide') => {
    if (action === 'hide' && !hideReason.trim()) {
      setErrorMsg('Please specify a reason to hide this report.');
      return;
    }

    setErrorMsg(null);
    startTransition(async () => {
      const res = await adminModerateReportAction(flagId, reportId, action, hideReason);
      if (res.success) {
        setHideReason('');
        router.refresh();
      } else {
        setErrorMsg(res.error || 'Failed to moderate report.');
      }
    });
  };

  const handleResolveFlag = (flagId: string, status: 'actioned' | 'dismissed') => {
    setErrorMsg(null);
    startTransition(async () => {
      const res = await adminResolveFlagAction(flagId, status, resolutionNotes);
      if (res.success) {
        setResolutionNotes('');
        setSelectedFlag(null);
        setAuditedData(null);
        router.refresh();
      } else {
        setErrorMsg(res.error || 'Failed to resolve flag.');
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-stone-800">
        <div className="flex items-center gap-2">
          {['all', 'open', 'reviewing', 'actioned', 'dismissed'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all ${
                statusFilter === status
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-stone-900 text-stone-400 hover:text-stone-200 border border-stone-800'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        <span className="text-xs text-stone-400">
          Showing {filteredFlags.length} flags
        </span>
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-950/60 border border-red-800 rounded-xl text-xs text-red-200">
          {errorMsg}
        </div>
      )}

      {/* Flags List */}
      <div className="space-y-3.5">
        {filteredFlags.length === 0 ? (
          <div className="p-12 text-center bg-stone-900/40 border border-stone-800 rounded-2xl text-stone-400 text-xs">
            No flags match the selected filter.
          </div>
        ) : (
          filteredFlags.map((flag) => {
            const isOpen = flag.status === 'open';
            const isReviewing = flag.status === 'reviewing';
            const canAuditRead = (flag.target_type === 'claim' || flag.target_type === 'conversation' || flag.target_type === 'message') && (isOpen || isReviewing);

            return (
              <div
                key={flag.id}
                className="p-5 bg-stone-900 border border-stone-800 rounded-2xl space-y-3 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/30">
                      {flag.reason.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-stone-300 font-semibold">
                      Target: {flag.target_type.toUpperCase()}
                    </span>
                  </div>

                  <span
                    className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                      flag.status === 'open'
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                        : flag.status === 'reviewing'
                        ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                        : flag.status === 'actioned'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : 'bg-stone-800 text-stone-400'
                    }`}
                  >
                    {flag.status}
                  </span>
                </div>

                <div className="text-xs text-stone-300">
                  <span className="text-stone-400">Reporter: </span>
                  <strong className="text-stone-200">{flag.reporter_name}</strong> &bull; Target ID:{' '}
                  <code className="text-stone-400 font-mono text-[11px]">{flag.target_id}</code>
                </div>

                {flag.details && (
                  <p className="text-xs text-stone-300 bg-stone-950/60 p-3 rounded-xl border border-stone-800 italic">
                    &quot;{flag.details}&quot;
                  </p>
                )}

                {/* Action Toolbar */}
                <div className="pt-3 border-t border-stone-800/80 flex flex-wrap items-center justify-between gap-2">
                  <div suppressHydrationWarning className="text-[11px] text-stone-400">
                    Flagged on {formatDateTime(flag.created_at)}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Audited Read Button for Private Claims or Chats */}
                    {canAuditRead && (
                      <button
                        type="button"
                        onClick={() => handleAuditedRead(flag)}
                        disabled={isPending}
                        className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        Audited Read
                      </button>
                    )}

                    {/* Report Moderation Action */}
                    {flag.target_type === 'report' && (isOpen || isReviewing) && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleModerateReport(flag.id, flag.target_id, 'hide')}
                          disabled={isPending}
                          className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold transition-all"
                        >
                          Hide Report
                        </button>
                        <AdminDeleteReportButton
                          reportId={flag.target_id}
                          reportTitle="Flagged Report"
                          redirectTo="/admin/moderation"
                          onDeleted={() => router.refresh()}
                        />
                      </>
                    )}

                    {/* Resolve / Dismiss Controls */}
                    {(isOpen || isReviewing) && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleResolveFlag(flag.id, 'dismissed')}
                          disabled={isPending}
                          className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-xs font-medium transition-all"
                        >
                          Dismiss
                        </button>
                        <button
                          type="button"
                          onClick={() => handleResolveFlag(flag.id, 'actioned')}
                          disabled={isPending}
                          className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-stone-950 rounded-xl text-xs font-semibold transition-all"
                        >
                          Mark Actioned
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* AUDITED PRIVATE CONTENT DRAWER */}
      {selectedFlag && auditedData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/80 backdrop-blur-sm">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-stone-100">
                  Audited Content Inspection
                </h3>
              </div>
              <button
                onClick={() => {
                  setSelectedFlag(null);
                  setAuditedData(null);
                }}
                className="text-stone-400 hover:text-stone-200 text-xs px-2.5 py-1 rounded-lg bg-stone-800"
              >
                Close
              </button>
            </div>

            <div className="p-3 bg-amber-950/40 border border-amber-800/60 rounded-xl text-xs text-amber-300">
              <strong className="block font-semibold">Audit Notice (I-ADM-05):</strong>
              Your administrator identity and timestamp have been permanently recorded to the immutable admin audit log for this review.
            </div>

            {/* Display Flagged Claim Secret */}
            {selectedFlag.target_type === 'claim' && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400">
                  Private Ownership Proof
                </h4>
                <div className="p-4 bg-stone-950 border border-stone-800 rounded-xl font-mono text-xs text-stone-200 italic">
                  &quot;{auditedData.ownership_detail || 'No detail recorded'}&quot;
                </div>
              </div>
            )}

            {/* Display Flagged Conversation Messages */}
            {(selectedFlag.target_type === 'conversation' || selectedFlag.target_type === 'message') && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400">
                  Conversation Message History
                </h4>
                <div className="max-h-64 overflow-y-auto space-y-2 p-3 bg-stone-950 border border-stone-800 rounded-xl">
                  {auditedData.messages?.map((m) => (
                    <div key={m.id} className="text-xs p-2 bg-stone-900 rounded-lg">
                      <span suppressHydrationWarning className="text-[10px] text-stone-500 font-mono block">
                        Sender: {m.sender_id} &bull; {formatDateTime(m.created_at)}
                      </span>
                      <p className="text-stone-200 mt-0.5">{m.body}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-stone-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => handleResolveFlag(selectedFlag.id, 'dismissed')}
                disabled={isPending}
                className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-xs font-medium"
              >
                Dismiss Flag
              </button>
              <button
                type="button"
                onClick={() => handleResolveFlag(selectedFlag.id, 'actioned')}
                disabled={isPending}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-stone-950 rounded-xl text-xs font-bold"
              >
                Resolve & Close Flag
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
