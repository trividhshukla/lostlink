import React from 'react';
import {
  Clock,
  PlusCircle,
  Edit3,
  Sparkles,
  CheckCircle2,
  XCircle,
  FileText,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { formatDateTime } from '@/lib/utils';

export interface TimelineEventItem {
  id: string;
  eventType: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

interface ReportTimelineProps {
  events: TimelineEventItem[];
}

export function ReportTimeline({ events }: ReportTimelineProps) {
  if (!events || events.length === 0) {
    return null;
  }

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'created':
        return <PlusCircle className="w-3.5 h-3.5 text-emerald-600" />;
      case 'matched':
        return <Sparkles className="w-3.5 h-3.5 text-teal-600" />;
      case 'edited':
        return <Edit3 className="w-3.5 h-3.5 text-amber-600" />;
      case 'closed':
        return <XCircle className="w-3.5 h-3.5 text-stone-500" />;
      case 'resolved':
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />;
      case 'reopened':
        return <RotateCcw className="w-3.5 h-3.5 text-sky-600" />;
      case 'claim_submitted':
        return <FileText className="w-3.5 h-3.5 text-indigo-600" />;
      case 'claim_accepted':
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />;
      case 'claim_rejected':
      case 'claim_withdrawn':
        return <XCircle className="w-3.5 h-3.5 text-rose-500" />;
      case 'handover_confirmed':
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />;
      case 'handover_cancelled':
        return <AlertCircle className="w-3.5 h-3.5 text-amber-500" />;
      case 'moderation_hidden':
        return <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />;
      case 'moderation_restored':
        return <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />;
      default:
        return <Clock className="w-3.5 h-3.5 text-stone-400" />;
    }
  };

  const getEventTitle = (type: string, meta: Record<string, unknown>) => {
    switch (type) {
      case 'created':
        return `Report created as ${meta?.report_type === 'found' ? 'Found' : 'Lost'}`;
      case 'matched':
        return `Matching evaluation completed (${meta?.matches_count ?? 0} suggested pairs)`;
      case 'edited':
        return 'Listing details updated';
      case 'closed':
        return `Report closed${meta?.reason ? ` (${meta.reason})` : ''}`;
      case 'resolved':
        return 'Item verified and handed over';
      case 'reopened':
        return 'Listing reopened for campus recovery';
      case 'claim_submitted':
        return 'Ownership claim submitted by campus member';
      case 'claim_accepted':
        return 'Ownership claim accepted by finder';
      case 'claim_rejected':
        return 'Ownership claim declined';
      case 'claim_withdrawn':
        return 'Ownership claim withdrawn';
      case 'handover_confirmed':
        return 'Item handover confirmed';
      case 'handover_cancelled':
        return 'Item handover cancelled';
      case 'moderation_hidden':
        return 'Report hidden by campus moderation';
      case 'moderation_restored':
        return 'Report restored by campus moderation';
      default:
        return type
          ? type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
          : 'Activity recorded';
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Clock className="w-4 h-4 text-stone-500" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">
          Report Activity Timeline
        </h3>
      </div>

      <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-stone-200">
        {events.map((evt) => (
          <div key={evt.id} className="relative flex items-start gap-3 text-xs">
            <span className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-white border border-stone-300 flex items-center justify-center">
              {getEventIcon(evt.eventType)}
            </span>
            <div className="flex-1 min-w-0">
              <span className="font-semibold text-stone-900 block">
                {getEventTitle(evt.eventType, evt.metadata)}
              </span>
              <span suppressHydrationWarning className="text-[11px] text-stone-400">
                {formatDateTime(evt.createdAt)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
