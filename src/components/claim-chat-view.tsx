'use client';

import { useState, useTransition, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ClaimWithDetails,
  ChatMessageItem,
  confirmHandoverAction,
  cancelHandoverAction,
  sendMessageAction,
} from '@/lib/server/claims/actions';

interface ClaimChatViewProps {
  claim: ClaimWithDetails;
  initialMessages: ChatMessageItem[];
  currentUserId: string;
}

export function ClaimChatView({
  claim,
  initialMessages,
  currentUserId,
}: ClaimChatViewProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessageItem[]>(initialMessages);
  const [inputBody, setInputBody] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isFinder = currentUserId === claim.finder_id;
  const isClaimant = currentUserId === claim.claimant_id;
  const isAccepted = claim.status === 'accepted';
  const isCompleted = claim.status === 'completed';
  const isCancelled = claim.status === 'cancelled';
  const isReadOnly = claim.conversation_status === 'read_only' || !isAccepted;

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Periodic poll to refresh messages (3 seconds while chat is open)
  useEffect(() => {
    if (isReadOnly) return;
    const interval = setInterval(() => {
      router.refresh();
    }, 4000);
    return () => clearInterval(interval);
  }, [isReadOnly, router]);

  // Update local messages when initialMessages prop updates via server refresh
  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!claim.conversation_id || !inputBody.trim() || isPending || isReadOnly) return;

    const trimmed = inputBody.trim();
    setInputBody('');
    setErrorMsg(null);

    // Optimistic message append
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: ChatMessageItem = {
      id: tempId,
      conversation_id: claim.conversation_id,
      sender_id: currentUserId,
      sender_name: 'You',
      body: trimmed,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMessage]);

    startTransition(async () => {
      const res = await sendMessageAction(claim.conversation_id!, trimmed);
      if (!res.success) {
        setErrorMsg(res.error || 'Failed to deliver message.');
        // Revert optimistic message
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
      } else {
        router.refresh();
      }
    });
  };

  const handleConfirmHandover = () => {
    setErrorMsg(null);
    startTransition(async () => {
      const res = await confirmHandoverAction(claim.id);
      if (res.success) {
        router.refresh();
      } else {
        setErrorMsg(res.error || 'Failed to record handover confirmation.');
      }
    });
  };

  const handleCancelHandover = () => {
    setErrorMsg(null);
    startTransition(async () => {
      const res = await cancelHandoverAction(claim.id);
      if (res.success) {
        setShowCancelModal(false);
        router.refresh();
      } else {
        setErrorMsg(res.error || 'Failed to cancel handover.');
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header breadcrumb & summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-stone-400">
            <Link href="/claims" className="hover:text-stone-200 transition-colors">
              Claims
            </Link>
            <span>/</span>
            <span className="text-emerald-400">Handover Coordination</span>
          </div>
          <h1 className="text-2xl font-black text-stone-100 tracking-tight mt-1">
            {claim.found_report?.title || 'Found Item'}
          </h1>
          <p className="text-xs text-stone-400 mt-0.5">
            Claimant: <strong className="text-stone-200">{claim.claimant_name}</strong> &bull; Finder: <strong className="text-stone-200">{claim.finder_name}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2">
          {claim.found_report?.id && (
            <Link
              href={`/report/${claim.found_report.id}`}
              className="px-3.5 py-1.5 text-xs font-medium text-stone-300 hover:text-stone-100 bg-stone-800 hover:bg-stone-700/80 rounded-xl transition-all border border-stone-700/60"
            >
              View Found Report &rarr;
            </Link>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="p-3.5 bg-red-950/60 border border-red-800 rounded-xl text-xs text-red-200">
          {errorMsg}
        </div>
      )}

      {/* TWO-SIDED HANDOVER STEPPER BANNER */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 sm:p-6 shadow-sm overflow-hidden relative">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isCompleted ? 'bg-emerald-400' : isAccepted ? 'bg-amber-400 animate-pulse' : 'bg-stone-500'}`} />
            <h2 className="text-base font-bold text-stone-100">
              Two-Sided Handover Verification
            </h2>
          </div>

          {isAccepted && !isCompleted && (
            <button
              onClick={() => setShowCancelModal(true)}
              disabled={isPending}
              className="text-xs text-red-400 hover:text-red-300 hover:underline transition-colors"
            >
              Cancel Handover
            </button>
          )}
        </div>

        {/* Stepper Progress Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {/* Step 1: Claim Acceptance */}
          <div className="p-3.5 bg-stone-950/60 border border-stone-800/80 rounded-xl">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center justify-center">
                ✓
              </div>
              <span className="text-xs font-semibold text-stone-200">1. Claim Accepted</span>
            </div>
            <p className="text-[11px] text-stone-400">
              Finder reviewed ownership detail and unlocked 1-to-1 chat.
            </p>
          </div>

          {/* Step 2: Finder Handover Status */}
          <div
            className={`p-3.5 rounded-xl border ${
              claim.finder_confirmed_at
                ? 'bg-emerald-950/20 border-emerald-800/60'
                : 'bg-stone-950/60 border-stone-800/80'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <div
                className={`w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center ${
                  claim.finder_confirmed_at
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-stone-800 text-stone-400'
                }`}
              >
                {claim.finder_confirmed_at ? '✓' : '2'}
              </div>
              <span className="text-xs font-semibold text-stone-200">
                2. Finder Handover
              </span>
            </div>
            <p className="text-[11px] text-stone-400">
              {claim.finder_confirmed_at
                ? `Confirmed by finder on ${new Date(claim.finder_confirmed_at).toLocaleDateString()}`
                : 'Awaiting finder to hand over the item physically.'}
            </p>
          </div>

          {/* Step 3: Claimant Received Status */}
          <div
            className={`p-3.5 rounded-xl border ${
              claim.claimant_confirmed_at
                ? 'bg-emerald-950/20 border-emerald-800/60'
                : 'bg-stone-950/60 border-stone-800/80'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <div
                className={`w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center ${
                  claim.claimant_confirmed_at
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-stone-800 text-stone-400'
                }`}
              >
                {claim.claimant_confirmed_at ? '✓' : '3'}
              </div>
              <span className="text-xs font-semibold text-stone-200">
                3. Claimant Receipt
              </span>
            </div>
            <p className="text-[11px] text-stone-400">
              {claim.claimant_confirmed_at
                ? `Confirmed by owner on ${new Date(claim.claimant_confirmed_at).toLocaleDateString()}`
                : 'Awaiting owner to confirm safe receipt of item.'}
            </p>
          </div>
        </div>

        {/* Handover Action Controls */}
        {isAccepted && !isCompleted && (
          <div className="mt-4 pt-4 border-t border-stone-800 flex flex-wrap items-center justify-between gap-3 bg-stone-950/40 p-3.5 rounded-xl">
            <div className="text-xs text-stone-300">
              {isFinder && !claim.finder_confirmed_at && (
                <span>Have you returned the item in person? Click below to confirm.</span>
              )}
              {isFinder && claim.finder_confirmed_at && (
                <span className="text-emerald-400">
                  You confirmed handover. Waiting for claimant to confirm receipt.
                </span>
              )}
              {isClaimant && !claim.claimant_confirmed_at && (
                <span>Have you received your item in person? Click below to confirm receipt.</span>
              )}
              {isClaimant && claim.claimant_confirmed_at && (
                <span className="text-emerald-400">
                  You confirmed receipt. Waiting for finder to confirm handover.
                </span>
              )}
            </div>

            <div>
              {isFinder && !claim.finder_confirmed_at && (
                <button
                  type="button"
                  onClick={handleConfirmHandover}
                  disabled={isPending}
                  className="px-4 py-2 text-xs font-semibold text-stone-900 bg-emerald-400 hover:bg-emerald-300 rounded-xl shadow-md transition-all flex items-center gap-2"
                >
                  <svg className="w-4 h-4 text-stone-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {isPending ? 'Confirming...' : 'I Handed Over the Item'}
                </button>
              )}

              {isClaimant && !claim.claimant_confirmed_at && (
                <button
                  type="button"
                  onClick={handleConfirmHandover}
                  disabled={isPending}
                  className="px-4 py-2 text-xs font-semibold text-stone-900 bg-emerald-400 hover:bg-emerald-300 rounded-xl shadow-md transition-all flex items-center gap-2"
                >
                  <svg className="w-4 h-4 text-stone-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {isPending ? 'Confirming...' : 'I Received My Item'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Handover Completed Banner */}
        {isCompleted && (
          <div className="mt-4 p-4 bg-emerald-950/40 border border-emerald-800/80 rounded-xl text-center">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-300 uppercase tracking-wider mb-1">
              <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Handover Completed & Verified
            </span>
            <p className="text-xs text-stone-300 mt-0.5">
              Both parties confirmed safe physical handover. Both reports have been resolved and this chat is now archived in read-only mode.
            </p>
          </div>
        )}

        {/* Cancelled Banner */}
        {isCancelled && (
          <div className="mt-4 p-4 bg-stone-950 border border-stone-800 rounded-xl text-center">
            <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">
              Handover Cancelled
            </span>
            <p className="text-xs text-stone-400 mt-0.5">
              This handover was cancelled before completion. Both Lost and Found reports were returned to Active status.
            </p>
          </div>
        )}
      </div>

      {/* PRIVATE OWNERSHIP PROOF CARD */}
      {claim.ownership_detail && (
        <div className="bg-stone-900/80 border border-stone-800/90 rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1.5">
            <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-300">
              Private Ownership Proof (Verified by Finder)
            </h3>
          </div>
          <p className="text-xs text-stone-300 italic font-mono bg-stone-950/60 p-3 rounded-xl border border-stone-800 leading-relaxed">
            &quot;{claim.ownership_detail}&quot;
          </p>
        </div>
      )}

      {/* 1-TO-1 PRIVATE CHAT WINDOW */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col h-[520px]">
        {/* Chat Header */}
        <div className="pb-3 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${isReadOnly ? 'bg-stone-500' : 'bg-emerald-400'}`} />
            <h3 className="text-sm font-bold text-stone-100">Private Handover Chat</h3>
          </div>
          <span className="text-[11px] text-stone-400">
            {isReadOnly ? 'Read-only archive' : 'Active conversation'}
          </span>
        </div>

        {/* Voluntary Contact Info Notice (R-UNIT-07, I-CHT-03) */}
        <div className="my-2.5 p-2.5 bg-emerald-950/20 border border-emerald-900/40 rounded-xl text-[11px] text-emerald-300/90 flex items-center gap-2">
          <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>
            You may voluntarily share phone numbers, emails, or meet-up locations in this private chat for handover coordination.
          </span>
        </div>

        {/* Message Feed */}
        <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 py-2">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-stone-400">
              <svg className="w-8 h-8 text-stone-600 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p className="text-xs font-semibold text-stone-300">No messages yet</p>
              <p className="text-[11px] mt-0.5">
                Say hello and coordinate a safe, public campus location for the handover.
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMine = msg.sender_id === currentUserId;
              const isMsgFinder = msg.sender_id === claim.finder_id;

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-center gap-1.5 mb-1 px-1">
                    <span className="text-[10px] font-medium text-stone-400">
                      {isMine ? 'You' : msg.sender_name}
                    </span>
                    <span
                      className={`text-[9px] font-semibold px-1.5 py-0.2 rounded-full ${
                        isMsgFinder
                          ? 'bg-teal-500/10 text-teal-300 border border-teal-500/30'
                          : 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      {isMsgFinder ? 'Finder' : 'Claimant'}
                    </span>
                    <span className="text-[10px] text-stone-400">
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed break-words shadow-sm ${
                      isMine
                        ? 'bg-emerald-600 text-white rounded-tr-none'
                        : 'bg-stone-800 text-stone-100 rounded-tl-none border border-stone-700/60'
                    }`}
                  >
                    {msg.body}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input Composer */}
        <div className="pt-3 border-t border-stone-800">
          {isReadOnly ? (
            <div className="p-3 bg-stone-950 border border-stone-800 rounded-xl text-center text-xs text-stone-400">
              This conversation is closed and archived in read-only mode.
            </div>
          ) : (
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input
                type="text"
                value={inputBody}
                onChange={(e) => setInputBody(e.target.value)}
                placeholder="Type a message to coordinate handover..."
                maxLength={1000}
                disabled={isPending}
                className="flex-1 bg-stone-800 border border-stone-700/80 rounded-xl px-4 py-2.5 text-xs text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
              <button
                type="submit"
                disabled={isPending || !inputBody.trim()}
                className="px-5 py-2.5 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-40 disabled:cursor-not-allowed text-stone-900 font-semibold rounded-xl text-xs transition-all shadow-sm"
              >
                Send
              </button>
            </form>
          )}
        </div>
      </div>

      {/* CANCEL HANDOVER CONFIRMATION MODAL */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-stone-900 border border-stone-800 text-stone-100 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-red-400 mb-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-stone-100">Cancel Handover?</h3>
            </div>
            <p className="text-xs text-stone-300 leading-relaxed">
              Cancelling the handover will:
            </p>
            <ul className="text-xs text-stone-400 mt-2 space-y-1 list-disc list-inside">
              <li>Clear any live confirmation timestamps (CLM-UNIT-07)</li>
              <li>Reopen both the Lost and Found reports to Active status (CLM-UNIT-08)</li>
              <li>Lock this chat to read-only</li>
              <li>Log the cancellation event in both reports&apos; activity timelines</li>
            </ul>
            <p className="text-xs text-stone-400 mt-2">
              Note: Unlike rejected claims, a cancelled pair may be claimed again if eligible.
            </p>

            <div className="mt-5 flex items-center justify-end gap-3 pt-3 border-t border-stone-800">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                disabled={isPending}
                className="px-4 py-2 text-xs text-stone-300 hover:text-stone-100 hover:bg-stone-800 rounded-xl transition-colors"
              >
                Go Back
              </button>
              <button
                type="button"
                onClick={handleCancelHandover}
                disabled={isPending}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-500 rounded-xl shadow-md transition-colors"
              >
                {isPending ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
