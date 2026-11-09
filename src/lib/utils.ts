import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a date-only calendar value (e.g. incident date occurred_at) in Asia/Kolkata timezone.
 * Returns ONLY the calendar date (e.g. "Nov 3, 2026") without clock time.
 * Prevents UTC day-shifting by pinning YYYY-MM-DD input components safely.
 */
export function formatDate(dateInput?: string | Date | null): string {
  if (!dateInput) return '';

  if (typeof dateInput === 'string') {
    const match = dateInput.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const [, year, month, day] = match;
      const utcDate = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 12, 0, 0));
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'Asia/Kolkata',
      }).format(utcDate);
    }
  }

  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (!d || Number.isNaN(d.getTime())) return typeof dateInput === 'string' ? dateInput : '';

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  }).format(d);
}

/**
 * Alias for formatDate specifically for incident dates across report cards and listings.
 */
export function formatIncidentDate(dateInput?: string | Date | null): string {
  if (!dateInput) return 'Recently';
  return formatDate(dateInput);
}

/**
 * Formats a full timestamp in IST (Asia/Kolkata) with date and 12-hour clock time (e.g. "Nov 3, 2026, 10:36 PM").
 */
export function formatDateTime(dateInput?: string | Date | null): string {
  if (!dateInput) return '';
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (!d || Number.isNaN(d.getTime())) return typeof dateInput === 'string' ? dateInput : '';

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  }).format(d);
}

/**
 * Formats only the clock time in IST (Asia/Kolkata) with 12-hour clock (e.g. "10:36 PM").
 */
export function formatTime(dateInput?: string | Date | null): string {
  if (!dateInput) return '';
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (!d || Number.isNaN(d.getTime())) return typeof dateInput === 'string' ? dateInput : '';

  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  }).format(d);
}
