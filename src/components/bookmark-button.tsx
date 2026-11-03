'use client';

import { useState, useTransition } from 'react';
import { Bookmark } from 'lucide-react';
import { toggleBookmarkAction } from '@/lib/server/bookmarks/actions';

interface BookmarkButtonProps {
  reportId: string;
  initialBookmarked?: boolean;
  className?: string;
}

export function BookmarkButton({
  reportId,
  initialBookmarked = false,
  className = '',
}: BookmarkButtonProps) {
  const [isBookmarked, setIsBookmarked] = useState(initialBookmarked);
  const [isPending, startTransition] = useTransition();

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setIsBookmarked(!isBookmarked);
    startTransition(async () => {
      const res = await toggleBookmarkAction(reportId);
      if (res.error) {
        // revert on error
        setIsBookmarked(isBookmarked);
      } else {
        setIsBookmarked(res.isBookmarked);
      }
    });
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isPending}
      title={isBookmarked ? 'Remove bookmark' : 'Bookmark this report'}
      className={`p-2 rounded-xl transition-all flex items-center justify-center ${
        isBookmarked
          ? 'bg-emerald-500/15 text-emerald-600 border border-emerald-500/30'
          : 'bg-stone-100 text-stone-500 hover:text-stone-900 hover:bg-stone-200 border border-stone-200'
      } ${className}`}
    >
      <Bookmark
        className={`w-4 h-4 transition-transform ${isBookmarked ? 'fill-emerald-600 scale-105' : ''}`}
      />
    </button>
  );
}
