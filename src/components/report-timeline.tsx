import React from 'react';
import { Clock, PlusCircle, Edit3, Sparkles, CheckCircle2, XCircle } from 'lucide-react';

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
      default:
        return 'Timeline event recorded';
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
                {new Intl.DateTimeFormat('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true,
                  timeZone: 'Asia/Kolkata',
                }).format(new Date(evt.createdAt))}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
