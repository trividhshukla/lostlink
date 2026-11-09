'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  markNotificationReadAction,
  markAllNotificationsReadAction,
} from '@/lib/server/reports/actions';
import {
  Bell,
  Sparkles,
  Clock,
  ArrowRight,
  CheckCheck,
} from 'lucide-react';
import { formatDateTime } from '@/lib/utils';

export interface NotificationItem {
  id: string;
  type: string;
  reportId: string | null;
  matchId: string | null;
  claimId?: string | null;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
}

interface NotificationsViewProps {
  notifications: NotificationItem[];
}

export function NotificationsView({ notifications }: NotificationsViewProps) {
  const router = useRouter();
  const [list, setList] = useState(notifications);
  const [loading, setLoading] = useState(false);

  const unreadCount = list.filter((n) => !n.readAt).length;

  const handleMarkAsRead = async (id: string, reportId: string | null, claimId?: string | null) => {
    // Optimistic update
    setList((prev) =>
      prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n))
    );

    await markNotificationReadAction(id);
    if (claimId) {
      router.push(`/claims/${claimId}`);
    } else if (reportId) {
      router.push(`/report/${reportId}`);
    } else {
      router.refresh();
    }
  };

  const handleMarkAllRead = async () => {
    setLoading(true);
    setList((prev) => prev.map((n) => ({ ...n, readAt: new Date().toISOString() })));
    await markAllNotificationsReadAction();
    setLoading(false);
    router.refresh();
  };

  return (
    <div className="space-y-6">
      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">
            Campus Notifications
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Real-time alerts for suggested report matches, claim reviews, and verified handovers.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={handleMarkAllRead}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-800 transition disabled:opacity-50 self-start sm:self-auto cursor-pointer"
          >
            <CheckCheck className="w-3.5 h-3.5 text-emerald-700" />
            <span>Mark all as read ({unreadCount})</span>
          </button>
        )}
      </div>

      {/* Notification List */}
      {list.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-stone-200/90 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center text-stone-400 mx-auto mb-3">
            <Bell className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-stone-900">No notifications yet</h3>
          <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1 mb-6">
            When a new item matches your lost or found listings, you will receive an instant notification here.
          </p>
          <Link
            href="/explore"
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#0C1512] text-stone-100 hover:bg-[#182420] transition shadow-xs"
          >
            Explore Campus Listings
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((item) => {
            const isUnread = !item.readAt;
            return (
              <div
                key={item.id}
                onClick={() => handleMarkAsRead(item.id, item.reportId, item.claimId)}
                className={`p-5 rounded-2xl border transition-all cursor-pointer flex items-start gap-4 ${
                  isUnread
                    ? 'bg-emerald-50/40 border-emerald-200/90 hover:bg-emerald-50/70 shadow-xs'
                    : 'bg-white border-stone-200/90 hover:border-stone-300'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    isUnread
                      ? 'bg-emerald-900 text-emerald-300'
                      : 'bg-stone-100 text-stone-500'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4
                      className={`text-sm font-bold truncate ${
                        isUnread ? 'text-stone-950 font-extrabold' : 'text-stone-800'
                      }`}
                    >
                      {item.title}
                    </h4>
                    {isUnread && (
                      <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />
                    )}
                  </div>

                  <p className="text-xs text-stone-600 mt-0.5 leading-relaxed">
                    {item.body}
                  </p>

                  <div className="flex items-center gap-3 mt-2 text-[11px] text-stone-400">
                    <span suppressHydrationWarning className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDateTime(item.createdAt)}
                    </span>
                    {item.reportId && (
                      <span className="text-emerald-800 font-semibold flex items-center gap-0.5">
                        <span>View Report & Matches</span>
                        <ArrowRight className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
