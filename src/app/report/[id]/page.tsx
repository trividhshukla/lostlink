import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getSignedImageUrl, getAuthorizedReportImageUrl } from '@/lib/server/storage/signed-urls';
import { PhotoVisibility } from '@/types/database';
import {
  getClaimsForReportAction,
  getUserActiveLostReportsAction,
  ClaimWithDetails,
} from '@/lib/server/claims/actions';
import { ReportActions } from '@/components/report-actions';
import { PotentialMatches, DisplayMatch } from '@/components/potential-matches';
import { ReportTimeline, TimelineEventItem } from '@/components/report-timeline';
import { ClaimsList } from '@/components/claims-list';
import { ClaimActionArea } from '@/components/claim-action-area';
import { ReportDetailToolbar } from '@/components/report-detail-toolbar';
import { isReportBookmarkedAction } from '@/lib/server/bookmarks/actions';
import { Badge } from '@/components/badge';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Tag,
  ShieldAlert,
  User,
  Clock,
} from 'lucide-react';

function safeFormatDate(dateStr?: string | null): string {
  if (!dateStr) return 'Recently';
  const d = new Date(dateStr);
  return Number.isNaN(d.getTime())
    ? dateStr
    : new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'Asia/Kolkata',
      }).format(d);
}

function safeFormatDateTime(dateStr?: string | null): string {
  if (!dateStr) return 'Recently';
  const d = new Date(dateStr);
  return Number.isNaN(d.getTime())
    ? dateStr
    : new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Kolkata',
      }).format(d);
}

interface ReportWithRelations {
  id: string;
  owner_id: string;
  campus_id: string;
  report_type: 'lost' | 'found';
  status: string;
  moderation_state: string;
  title: string;
  description: string;
  category_id: number;
  primary_color: string | null;
  brand: string | null;
  distinctive_features: string | null;
  campus_area_id: string;
  location_note: string | null;
  occurred_at: string;
  matching_status?: string;
  matching_started_at?: string | null;
  created_at?: string;
  categories?: { id: number; label: string; photo_visibility: string } | null;
  campus_areas?: { id: string; label: string } | null;
  profiles?: { id: string; display_name: string } | null;
  report_images?: { object_path: string; width?: number; height?: number } | Array<{ object_path: string; width?: number; height?: number }> | null;
}

interface OppositeReportView {
  id: string;
  title: string;
  report_type: 'lost' | 'found';
  campus_areas?: { label: string } | null;
  categories?: { label: string; photo_visibility: string } | null;
  report_images?: { object_path: string } | Array<{ object_path: string }> | null;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ReportDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 1. Fetch main report from Supabase
  let reportData: ReportWithRelations | null = null;
  let imageUrl: string | null = null;
  let isRestrictedDoc = false;

  const { data: dbReport } = (await supabase
    .from('reports')
    .select(`
      *,
      categories (id, label, photo_visibility),
      campus_areas (id, label),
      profiles!owner_id (id, display_name),
      report_images (object_path, width, height)
    `)
    .eq('id', id)
    .single()) as unknown as { data: ReportWithRelations | null };

  if (dbReport) {
    reportData = dbReport;
    isRestrictedDoc = dbReport.categories?.photo_visibility === 'restricted';

    const imagePath = Array.isArray(dbReport.report_images)
      ? dbReport.report_images[0]?.object_path
      : dbReport.report_images?.object_path;

    // Sign image URL if Found photo exists with category-level authorization
    if (imagePath) {
      imageUrl = await getAuthorizedReportImageUrl(
        dbReport.id,
        imagePath,
        (dbReport.categories?.photo_visibility as PhotoVisibility) || 'public',
        dbReport.owner_id
      );
    }
  }

  if (!reportData) {
    notFound();
  }

  const isOwner = user?.id === reportData.owner_id;
  const isFound = reportData.report_type === 'found';

  // 1.5 Fetch claims for this report
  let reportClaims: ClaimWithDetails[] = [];
  let userActiveLostReports: { id: string; title: string; category_id: number }[] = [];
  let userHasExistingClaim = false;
  let existingClaimStatus: string | null = null;

  if (user && isFound) {
    if (isOwner) {
      reportClaims = await getClaimsForReportAction(id);
    } else {
      userActiveLostReports = await getUserActiveLostReportsAction();
      const allClaims = await getClaimsForReportAction(id);
      reportClaims = allClaims.filter((c) => c.claimant_id === user.id);
      if (reportClaims.length > 0) {
        userHasExistingClaim = true;
        existingClaimStatus = reportClaims[0].status;
      }
    }
  }

  // 2. Fetch matches for this report
  const formattedMatches: DisplayMatch[] = [];

  const { data: dbMatches } = await supabase
    .from('matches')
    .select(`
      id,
      lost_report_id,
      found_report_id,
      label,
      reasons,
      created_at
    `)
    .or(`lost_report_id.eq.${id},found_report_id.eq.${id}`)
    .order('created_at', { ascending: false });

  if (dbMatches && dbMatches.length > 0) {
    for (const m of dbMatches) {
      const oppositeReportId = m.lost_report_id === id ? m.found_report_id : m.lost_report_id;
      const { data: oppositeReport } = (await supabase
        .from('reports')
        .select(`
          id,
          title,
          report_type,
          campus_areas (label),
          categories (label, photo_visibility),
          report_images (object_path)
        `)
        .eq('id', oppositeReportId)
        .single()) as unknown as { data: OppositeReportView | null };

      if (oppositeReport) {
        const isOppositeRestricted = oppositeReport.categories?.photo_visibility === 'restricted';
        let matchPhotoUrl: string | null = null;

        const oppImagePath = Array.isArray(oppositeReport.report_images)
          ? oppositeReport.report_images[0]?.object_path
          : oppositeReport.report_images?.object_path;

        if (oppImagePath && !isOppositeRestricted) {
          matchPhotoUrl = await getSignedImageUrl(oppImagePath);
        }

        formattedMatches.push({
          id: m.id,
          matchedReportId: oppositeReport.id,
          matchedReportTitle: oppositeReport.title,
          matchedReportType: oppositeReport.report_type,
          matchedCampusArea: oppositeReport.campus_areas?.label || 'Campus',
          matchedCategory: oppositeReport.categories?.label || 'General',
          matchedPhotoUrl: matchPhotoUrl,
          matchedIsRestricted: isOppositeRestricted,
          label: m.label,
          reasons: (m.reasons as unknown as Array<{ code: string; text: string }>) || [],
          createdAt: m.created_at,
        });
      }
    }
  }

  // 3. Fetch report timeline events
  let timelineEvents: TimelineEventItem[] = [];
  const { data: dbEvents } = await supabase
    .from('report_events')
    .select('id, event_type, safe_public_metadata, created_at')
    .eq('report_id', id)
    .order('created_at', { ascending: true });

  if (dbEvents && dbEvents.length > 0) {
    timelineEvents = dbEvents.map((e) => ({
      id: e.id,
      eventType: e.event_type,
      metadata: (e.safe_public_metadata as Record<string, unknown>) || {},
      createdAt: e.created_at,
    }));
  } else {
    // Default initial event
    timelineEvents = [
      {
        id: 'initial',
        eventType: 'created',
        metadata: { report_type: reportData.report_type },
        createdAt: reportData.occurred_at || new Date().toISOString(),
      },
    ];
  }

  // 4. Stale retry calculation (> 5 minutes in pending/running or failed/degraded)
  const startedAt = new Date(reportData.matching_started_at || reportData.created_at || Date.now()).getTime();
  const isStale = Date.now() - startedAt > 5 * 60 * 1000;
  const canRetry = isOwner && reportData.status === 'active' && (['failed', 'degraded'].includes(reportData.matching_status || '') || isStale);

  // 5. Check bookmark status for current user
  const isBookmarked = user ? await isReportBookmarkedAction(reportData.id) : false;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Navigation Breadcrumb */}
      <div className="mb-6">
        <Link
          href="/explore"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600 hover:text-stone-900 transition"
        >
          <ArrowLeft className="w-4 h-4 text-emerald-700" />
          <span>Back to Explore</span>
        </Link>
      </div>

      <div className="bg-white rounded-3xl border border-stone-200/90 shadow-sm overflow-hidden">
        {/* Header Ribbon */}
        <div className="p-6 sm:p-8 border-b border-stone-100 bg-stone-50/50">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <Badge variant={isFound ? 'found' : 'lost'}>
                {isFound ? 'Found Item Listing' : 'Lost Item Listing'}
              </Badge>
              <Badge variant="outline" className="capitalize">
                {reportData.status}
              </Badge>
              {isRestrictedDoc && (
                <Badge variant="restricted">Restricted Document</Badge>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="text-xs text-stone-500 hidden sm:flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-stone-400" />
                <span suppressHydrationWarning>Reported on {safeFormatDate(reportData.occurred_at)}</span>
              </div>
              <ReportDetailToolbar
                reportId={reportData.id}
                reportTitle={reportData.title}
                initialBookmarked={isBookmarked}
              />
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900">
            {reportData.title}
          </h1>

          <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-stone-600">
            <span className="inline-flex items-center gap-1 font-medium text-stone-900">
              <MapPin className="w-3.5 h-3.5 text-emerald-700" />
              {reportData.campus_areas?.label || reportData.campus_area_id}
              {reportData.location_note && (
                <span className="text-stone-500 font-normal">({reportData.location_note})</span>
              )}
            </span>
            <span>•</span>
            <span className="inline-flex items-center gap-1">
              <Tag className="w-3.5 h-3.5 text-stone-400" />
              {reportData.categories?.label || 'General Category'}
            </span>
            <span>•</span>
            <span className="inline-flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-stone-400" />
              Posted by {reportData.profiles?.display_name || 'Campus Member'}
            </span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 space-y-8">
          {/* Visual Display */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-3">
              Visual Identification
            </h2>

            {isFound ? (
              imageUrl ? (
                <div className="relative aspect-video max-h-[420px] rounded-2xl overflow-hidden border border-stone-200 bg-stone-100">
                  <Image
                    src={imageUrl}
                    alt={reportData.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 800px"
                    className="object-contain"
                  />
                </div>
              ) : isRestrictedDoc ? (
                <div className="p-8 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-center">
                  <ShieldAlert className="w-8 h-8 text-amber-700 mx-auto mb-2" />
                  <h3 className="text-sm font-bold text-amber-900">Protected Identity Document</h3>
                  <p className="text-xs text-amber-700 max-w-md mx-auto mt-1">
                    To prevent impersonation and identity misuse, photos of student ID cards and official documents are shielded. Verified owners and accepted claim participants can view the photo during claim review.
                  </p>
                </div>
              ) : (
                <div className="p-8 rounded-2xl bg-stone-100 border border-stone-200 text-center text-xs text-stone-500">
                  Visual photo is stored in private campus storage.
                </div>
              )
            ) : (
              <div className="p-6 rounded-2xl bg-stone-50 border border-stone-200 text-stone-600 text-xs">
                <span className="font-semibold text-stone-800 block mb-1">Text-Described Lost Report</span>
                LostLink strictly enforces zero photo uploads for lost reports so that claimants cannot use public photos to falsely claim items. True ownership is proven through secret physical details.
              </div>
            )}
          </div>

          {/* Description & Item Attributes */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-4">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-2">
                  Item Description
                </h3>
                <p className="text-sm text-stone-700 leading-relaxed whitespace-pre-line bg-stone-50/80 p-4 rounded-2xl border border-stone-200/80">
                  {reportData.description}
                </p>
              </div>

              {reportData.distinctive_features && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-2">
                    Distinctive Markings
                  </h3>
                  <p className="text-xs text-stone-700 bg-stone-50 p-3.5 rounded-xl border border-stone-200">
                    {reportData.distinctive_features}
                  </p>
                </div>
              )}
            </div>

            {/* Sidebar Meta Attributes */}
            <div className="space-y-4 bg-stone-50/60 p-5 rounded-2xl border border-stone-200/80 h-fit">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-1">
                Item Attributes
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-stone-400 block text-[11px]">Primary Colour</span>
                  <span className="font-semibold text-stone-800 capitalize">
                    {reportData.primary_color || 'Not specified'}
                  </span>
                </div>

                <div>
                  <span className="text-stone-400 block text-[11px]">Brand / Model</span>
                  <span className="font-semibold text-stone-800">
                    {reportData.brand || 'Unbranded / Not specified'}
                  </span>
                </div>

                <div>
                  <span className="text-stone-400 block text-[11px]">Incident Date</span>
                  <span className="font-semibold text-stone-800 flex items-center gap-1 mt-0.5">
                    <Calendar className="w-3.5 h-3.5 text-stone-500" />
                    {safeFormatDateTime(reportData.occurred_at)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Potential Matches Panel */}
          <div className="pt-6 border-t border-stone-100">
            <PotentialMatches
              reportId={reportData.id}
              isOwner={isOwner}
              matchingStatus={reportData.report_type}
              canRetry={canRetry}
              matches={formattedMatches}
            />
          </div>

          {/* Owner Management or Member Claim Action Section */}
          <div className="pt-6 border-t border-stone-100">
            {isOwner ? (
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                  Owner Management Actions
                </h3>
                <ReportActions
                  report={{
                    id: reportData.id,
                    title: reportData.title,
                    description: reportData.description,
                    category_id: reportData.category_id,
                    primary_color: reportData.primary_color,
                    brand: reportData.brand,
                    distinctive_features: reportData.distinctive_features,
                    campus_area_id: reportData.campus_area_id,
                    location_note: reportData.location_note,
                    occurred_at: reportData.occurred_at,
                    status: reportData.status,
                  }}
                />
              </div>
            ) : isFound ? (
              <ClaimActionArea
                foundReportId={reportData.id}
                foundReportTitle={reportData.title}
                userActiveLostReports={userActiveLostReports}
                userHasExistingClaim={userHasExistingClaim}
                existingClaimStatus={existingClaimStatus}
              />
            ) : (
              <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold text-stone-900 block">
                    Did you find this item?
                  </span>
                  <span className="text-xs text-stone-500">
                    Post a found report with a photo to trigger automated matching.
                  </span>
                </div>

                <Link
                  href="/report/new?type=found"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#0C1512] text-stone-100 hover:bg-[#182420] transition shadow shrink-0"
                >
                  I Found this Item
                </Link>
              </div>
            )}

            {/* Claims Management List (Finder or Claimant) */}
            {reportClaims.length > 0 && user && (
              <div className="pt-2">
                <ClaimsList
                  claims={reportClaims}
                  currentUserId={user.id}
                  isFinder={isOwner && isFound}
                />
              </div>
            )}
          </div>

          {/* Activity Timeline */}
          <div className="pt-6 border-t border-stone-100">
            <ReportTimeline events={timelineEvents} />
          </div>
        </div>
      </div>
    </div>
  );
}
