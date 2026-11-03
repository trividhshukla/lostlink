'use client';

import { useState, useTransition } from 'react';
import { Flag, X, AlertCircle } from 'lucide-react';
import { submitFlagAction } from '@/lib/server/admin/actions';
import { FlagReason, FlagTargetType } from '@/types/database';

interface FlagModalProps {
  targetType: FlagTargetType;
  targetId: string;
  targetTitle?: string;
  isOpen: boolean;
  onClose: () => void;
}

const FLAG_REASONS: { value: FlagReason; label: string; description: string }[] = [
  { value: 'spam', label: 'Spam or Advertisement', description: 'Commercial promotion, repeated gibberish, or promotional links.' },
  { value: 'suspicious_claim', label: 'Fraudulent / Suspicious Claim', description: 'Suspected false ownership assertion or extortion attempt.' },
  { value: 'harassment', label: 'Harassment or Abuse', description: 'Threatening language, bullying, or abusive behavior.' },
  { value: 'personal_info', label: 'Privacy Violation', description: 'Sensitive personal identification or private data leaked in public fields.' },
  { value: 'inappropriate', label: 'Inappropriate Content', description: 'Obscene photography or offensive text.' },
  { value: 'other', label: 'Other Campus Concern', description: 'Any other safety or university policy violation.' },
];

export function FlagModal({
  targetType,
  targetId,
  targetTitle,
  isOpen,
  onClose,
}: FlagModalProps) {
  const [reason, setReason] = useState<FlagReason>('spam');
  const [details, setDetails] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const formData = new FormData();
    formData.append('targetType', targetType);
    formData.append('targetId', targetId);
    formData.append('reason', reason);
    if (details.trim()) {
      formData.append('details', details.trim());
    }

    startTransition(async () => {
      const res = await submitFlagAction(formData);
      if (res.success) {
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          onClose();
        }, 1500);
      } else {
        setError(res.error || 'Failed to submit report flag.');
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-stone-900 border border-stone-800 text-stone-100 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative">
        <div className="flex items-center justify-between pb-3.5 border-b border-stone-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center">
              <Flag className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-100">Report Content or Behavior</h3>
              <p className="text-[11px] text-stone-400">Campus Trust & Safety</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-200 p-1.5 rounded-lg hover:bg-stone-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {success ? (
          <div className="py-8 text-center text-emerald-400 space-y-2">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
              ✓
            </div>
            <h4 className="text-sm font-bold text-stone-100">Report Submitted</h4>
            <p className="text-xs text-stone-400 max-w-xs mx-auto">
              Thank you for keeping campus safe. An administrator will review this report in the moderation queue.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            {error && (
              <div className="p-3 bg-red-950/60 border border-red-800/80 rounded-xl text-xs text-red-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {targetTitle && (
              <div className="p-2.5 bg-stone-950/70 border border-stone-800 rounded-xl text-xs text-stone-300">
                Reporting: <strong className="text-stone-100">{targetTitle}</strong>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                Reason for report
              </label>
              <div className="space-y-2">
                {FLAG_REASONS.map((r) => (
                  <label
                    key={r.value}
                    className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                      reason === r.value
                        ? 'bg-red-950/20 border-red-800/70 text-stone-100'
                        : 'bg-stone-950/40 border-stone-800 text-stone-400 hover:border-stone-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="flag_reason"
                      value={r.value}
                      checked={reason === r.value}
                      onChange={() => setReason(r.value)}
                      className="mt-0.5 text-red-600 focus:ring-0"
                    />
                    <div>
                      <span className="text-xs font-semibold block text-stone-200">
                        {r.label}
                      </span>
                      <span className="text-[11px] text-stone-400 block leading-tight">
                        {r.description}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1">
                Additional Details (Optional)
              </label>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                rows={3}
                placeholder="Provide any context that will help campus moderators investigate..."
                maxLength={1000}
                className="w-full bg-stone-800 border border-stone-700/80 rounded-xl px-3 py-2 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>

            <div className="pt-3 border-t border-stone-800 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                disabled={isPending}
                className="px-3.5 py-1.5 text-xs text-stone-400 hover:text-stone-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-xl text-xs shadow-md transition-all"
              >
                {isPending ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
