'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { editReportAction, closeReportAction } from '@/lib/server/reports/actions';
import { Edit3, XCircle, Check, Loader2, AlertCircle } from 'lucide-react';
import { CATEGORIES, CAMPUS_AREAS, REPORT_COLOURS } from '@/lib/constants';

interface ReportActionsProps {
  report: {
    id: string;
    title: string;
    description: string;
    category_id: number;
    primary_color: string | null;
    brand: string | null;
    distinctive_features: string | null;
    campus_area_id: string;
    location_note: string | null;
    occurred_at: string;
    status: string;
  };
}

function safeFormatDateOnly(dateString?: string | null): string {
  if (!dateString) return '';
  if (typeof dateString === 'string') {
    const match = dateString.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) return match[0];
  }
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return '';
  try {
    return d.toISOString().slice(0, 10);
  } catch {
    return '';
  }
}

export function ReportActions({ report }: ReportActionsProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [closeReason, setCloseReason] = useState('Item recovered on campus');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Edit form state
  const [title, setTitle] = useState(report.title);
  const [description, setDescription] = useState(report.description);
  const [categoryId, setCategoryId] = useState(report.category_id);
  const [primaryColor, setPrimaryColor] = useState(report.primary_color || '');
  const [brand, setBrand] = useState(report.brand || '');
  const [distinctiveFeatures, setDistinctiveFeatures] = useState(report.distinctive_features || '');
  const [campusAreaId, setCampusAreaId] = useState(report.campus_area_id);
  const [locationNote, setLocationNote] = useState(report.location_note || '');
  const [occurredAt, setOccurredAt] = useState(
    safeFormatDateOnly(report.occurred_at)
  );

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('report_id', report.id);
    formData.append('title', title);
    formData.append('description', description);
    formData.append('category_id', categoryId.toString());
    formData.append('primary_color', primaryColor);
    formData.append('brand', brand);
    formData.append('distinctive_features', distinctiveFeatures);
    formData.append('campus_area_id', campusAreaId);
    formData.append('location_note', locationNote);
    formData.append('occurred_at', occurredAt);

    const res = await editReportAction(formData);
    setLoading(false);

    if (res.success) {
      setIsEditing(false);
      router.refresh();
    } else {
      setError(res.error || 'Failed to update report');
    }
  };

  const handleCloseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await closeReportAction(report.id, closeReason);
    setLoading(false);

    if (res.success) {
      setIsClosing(false);
      router.refresh();
    } else {
      setError(res.error || 'Failed to close report');
    }
  };

  if (report.status !== 'active') {
    return (
      <div className="p-4 rounded-xl bg-stone-100/90 border border-stone-200 text-xs text-stone-600">
        This report is marked as <strong className="capitalize text-stone-900">{report.status}</strong> and can no longer be edited.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Buttons */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => {
            setIsEditing(!isEditing);
            setIsClosing(false);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-stone-900 text-stone-100 hover:bg-stone-800 transition shadow-sm"
        >
          <Edit3 className="w-3.5 h-3.5 text-emerald-400" />
          <span>{isEditing ? 'Cancel Edit' : 'Edit Listing'}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setIsClosing(!isClosing);
            setIsEditing(false);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition shadow-sm"
        >
          <XCircle className="w-3.5 h-3.5 text-red-600" />
          <span>{isClosing ? 'Cancel Close' : 'Close Report'}</span>
        </button>
      </div>

      {/* Close Confirmation Modal Box */}
      {isClosing && (
        <form onSubmit={handleCloseSubmit} className="p-5 bg-stone-50 rounded-2xl border border-stone-300 space-y-3">
          <h4 className="text-sm font-bold text-stone-900">Close this report</h4>
          <p className="text-xs text-stone-600">
            Closing this report will remove it from active search and cancel pending claims.
          </p>
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Reason for closing:</label>
            <input
              type="text"
              required
              value={closeReason}
              onChange={(e) => setCloseReason(e.target.value)}
              placeholder="e.g. Found on my own, Handed over outside app"
              className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 bg-white"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsClosing(false)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg text-stone-600 hover:bg-stone-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
            >
              {loading ? 'Closing...' : 'Confirm Closure'}
            </button>
          </div>
        </form>
      )}

      {/* Edit Form */}
      {isEditing && (
        <form onSubmit={handleEditSubmit} className="p-6 bg-white rounded-2xl border border-stone-300 shadow-sm space-y-4">
          <h4 className="text-sm font-bold text-stone-900">Edit Report Details</h4>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              minLength={3}
              maxLength={100}
              className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Description</label>
            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              minLength={10}
              maxLength={1500}
              className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Category</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 bg-white"
              >
                {CATEGORIES.map((cat, idx) => (
                  <option key={cat.label} value={idx + 1}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Primary Colour</label>
              <select
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 bg-white"
              >
                <option value="">Not sure / Any</option>
                {REPORT_COLOURS.map((col: string) => (
                  <option key={col} value={col.toLowerCase()}>
                    {col}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Brand/Model (optional)</label>
              <input
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                maxLength={60}
                className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Campus Area</label>
              <select
                value={campusAreaId}
                onChange={(e) => setCampusAreaId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 bg-white"
              >
                {CAMPUS_AREAS.map((area) => (
                  <option key={area} value={area}>
                    {area}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Location Note (optional)</label>
            <input
              type="text"
              value={locationNote}
              onChange={(e) => setLocationNote(e.target.value)}
              placeholder="e.g. Block B, 2nd floor lab"
              maxLength={120}
              className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Distinctive Features (optional)</label>
            <input
              type="text"
              value={distinctiveFeatures}
              onChange={(e) => setDistinctiveFeatures(e.target.value)}
              placeholder="e.g. Scratch on top corner, blue sticker"
              maxLength={300}
              className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Incident Date</label>
            <input
              type="date"
              required
              value={occurredAt}
              onChange={(e) => setOccurredAt(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 bg-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-3.5 py-2 text-xs font-medium rounded-xl text-stone-600 hover:bg-stone-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
