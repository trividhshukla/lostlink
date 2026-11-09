'use client';

import { useState } from 'react';
import { Flag } from 'lucide-react';
import { BookmarkButton } from './bookmark-button';
import { FlagModal } from './flag-modal';

interface ReportDetailToolbarProps {
  reportId: string;
  reportTitle: string;
  initialBookmarked?: boolean;
  isAuthenticated?: boolean;
}

export function ReportDetailToolbar({
  reportId,
  reportTitle,
  initialBookmarked = false,
  isAuthenticated,
}: ReportDetailToolbarProps) {
  const [isFlagOpen, setIsFlagOpen] = useState(false);

  const handleFlagClick = () => {
    if (isAuthenticated === false) {
      window.location.href = `/login?next=/report/${reportId}`;
      return;
    }
    setIsFlagOpen(true);
  };

  return (
    <div className="flex items-center gap-2">
      <BookmarkButton
        reportId={reportId}
        initialBookmarked={initialBookmarked}
        isAuthenticated={isAuthenticated}
      />
      <button
        type="button"
        onClick={handleFlagClick}
        title="Report item concern to campus moderation"
        className="px-3 py-2 rounded-xl bg-stone-100 text-stone-500 hover:text-red-600 hover:bg-red-50 border border-stone-200 hover:border-red-200 transition-all flex items-center justify-center text-xs font-medium gap-1.5"
      >
        <Flag className="w-4 h-4" />
        <span className="hidden sm:inline">Report Flag</span>
      </button>

      <FlagModal
        isOpen={isFlagOpen}
        onClose={() => setIsFlagOpen(false)}
        targetType="report"
        targetId={reportId}
        targetTitle={reportTitle}
      />
    </div>
  );
}
