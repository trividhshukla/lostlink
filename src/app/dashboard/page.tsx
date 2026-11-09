import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Badge } from '@/components/badge';
import {
  Clock,
  MapPin,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  FileText,
  Bookmark,
} from 'lucide-react';
import { getUserBookmarksAction } from '@/lib/server/bookmarks/actions';
import { BookmarkButton } from '@/components/bookmark-button';
import { formatDate } from '@/lib/utils';

interface DashboardReportItem {
  id: string;
  title: string;
  type: string;
  status: string;
  campusArea: string;
  category: string;
  occurredAt: string;
  pendingClaims: number;
}

interface DbReportRow {
  id: string;
  title: string;
  report_type: string;
  status: string;
  occurred_at: string;
  pending_claim_count: number;
  campus_areas?: { label: string } | null;
  categories?: { label: string } | null;
}

interface DashboardPageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const { status: statusFilter } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // If not signed in and using Supabase, redirect to login
    // If in dev environment without Supabase keys set up, render dev preview
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      redirect('/login?next=/dashboard');
    }
  }

  const userId = user?.id || 'mock-user-id';

  // Fetch user profile
  let displayName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Campus Member';

  if (user) {
    const { data: profile } = (await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .single()) as { data: { display_name?: string } | null };

    if (profile?.display_name) {
      displayName = profile.display_name;
    }
  }

  // Fetch user's reports from Supabase
  let reports: DashboardReportItem[] = [];
  const { data: dbReports } = (await supabase
    .from('reports')
    .select(`
      id,
      title,
      description,
      report_type,
      status,
      occurred_at,
      created_at,
      pending_claim_count,
      campus_areas (label),
      categories (label)
    `)
    .eq('owner_id', userId)
    .order('created_at', { ascending: false })) as unknown as { data: DbReportRow[] | null };

  if (dbReports && dbReports.length > 0) {
    reports = dbReports.map((r) => ({
      id: r.id,
      title: r.title,
      type: r.report_type,
      status: r.status,
      campusArea: r.campus_areas?.label || 'Campus',
      category: r.categories?.label || 'General',
      occurredAt: r.occurred_at,
      pendingClaims: r.pending_claim_count || 0,
    }));
  }

  // Fetch bookmarks
  const bookmarks = await getUserBookmarksAction();
  const bookmarksCount = bookmarks.length;

  const filteredReports = statusFilter && statusFilter !== 'saved'
    ? reports.filter((r) => r.status.toLowerCase() === statusFilter.toLowerCase())
    : reports;

  const totalCount = reports.length;
  const activeCount = reports.filter((r) => r.status === 'active').length;
  const resolvedCount = reports.filter((r) => r.status === 'resolved').length;
  const closedCount = reports.filter((r) => r.status === 'closed').length;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 sm:py-12">
      {/* Top Banner / User Welcome */}
      <div className="bg-[#0C1512] text-stone-100 rounded-3xl p-6 sm:p-8 mb-8 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-900/60 border border-emerald-700/50 text-[11px] font-semibold text-emerald-300 mb-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Verified Campus Member</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Welcome back, {displayName}
            </h1>
            <p className="text-xs text-stone-400 mt-1">
              Manage your lost and found listings, track claims, and oversee handovers.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/claims"
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-stone-800 text-stone-200 border border-stone-700 hover:bg-stone-700 transition shadow-sm"
            >
              Claims & Handovers &rarr;
            </Link>
            <Link
              href="/report/new?type=lost"
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 transition shadow-sm"
            >
              + Report Lost
            </Link>
            <Link
              href="/report/new?type=found"
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-700 text-stone-100 hover:bg-emerald-600 transition shadow-sm"
            >
              + Report Found
            </Link>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-stone-800">
          <div className="bg-[#182420] p-3.5 rounded-2xl border border-stone-800">
            <span className="text-[11px] text-stone-400 block">Total Reports</span>
            <span className="text-xl font-bold text-stone-100">{totalCount}</span>
          </div>

          <div className="bg-[#182420] p-3.5 rounded-2xl border border-stone-800">
            <span className="text-[11px] text-emerald-400 block">Active Listings</span>
            <span className="text-xl font-bold text-emerald-300">{activeCount}</span>
          </div>

          <div className="bg-[#182420] p-3.5 rounded-2xl border border-stone-800">
            <span className="text-[11px] text-stone-400 block">Resolved / Handed Over</span>
            <span className="text-xl font-bold text-stone-100">{resolvedCount}</span>
          </div>

          <div className="bg-[#182420] p-3.5 rounded-2xl border border-stone-800">
            <span className="text-[11px] text-stone-400 block">Closed</span>
            <span className="text-xl font-bold text-stone-100">{closedCount}</span>
          </div>
        </div>
      </div>

      {/* Main Content: Reports Management */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-lg font-bold text-stone-900">Your Campus Submissions</h2>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-stone-200/70 rounded-xl w-fit">
            <Link
              href="/dashboard"
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                !statusFilter ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              All ({totalCount})
            </Link>
            <Link
              href="/dashboard?status=active"
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                statusFilter === 'active' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Active ({activeCount})
            </Link>
            <Link
              href="/dashboard?status=resolved"
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                statusFilter === 'resolved' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Resolved ({resolvedCount})
            </Link>
            <Link
              href="/dashboard?status=closed"
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                statusFilter === 'closed' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Closed ({closedCount})
            </Link>
            <Link
              href="/dashboard?status=saved"
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                statusFilter === 'saved' ? 'bg-white text-emerald-700 shadow-sm' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>Saved ({bookmarksCount})</span>
            </Link>
          </div>
        </div>

        {/* Content: Saved Bookmarks View vs Reports Management */}
        {statusFilter === 'saved' ? (
          bookmarks.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-stone-200/90 shadow-sm">
              <Bookmark className="w-12 h-12 text-stone-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-stone-900">No saved reports</h3>
              <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1 mb-6">
                When you see an item on campus you want to follow, click the bookmark icon on its detail page.
              </p>
              <Link
                href="/explore"
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#0C1512] text-stone-100 hover:bg-[#182420] transition shadow"
              >
                Browse Explore Feed
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {bookmarks.map((b) => (
                <div
                  key={b.id}
                  className="bg-white rounded-2xl border border-stone-200/90 p-5 shadow-sm hover:shadow-md hover:border-stone-300 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={b.report?.report_type === 'found' ? 'found' : 'lost'}>
                        {b.report?.report_type === 'found' ? 'Found' : 'Lost'}
                      </Badge>
                      <Badge variant="outline" className="capitalize">
                        {b.report?.status || 'active'}
                      </Badge>
                    </div>

                    <h3 className="text-base font-bold text-stone-900 truncate">
                      {b.report?.title || 'Campus Item'}
                    </h3>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-stone-500">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-emerald-700" />
                        {b.report?.campus_areas?.label || 'Campus Area'}
                      </span>
                      <span>•</span>
                      <span suppressHydrationWarning className="inline-flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-stone-400" />
                        {b.report?.occurred_at ? formatDate(b.report.occurred_at) : 'Recent'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <BookmarkButton reportId={b.report_id} initialBookmarked={true} />
                    <Link
                      href={`/report/${b.report_id}`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-900 transition"
                    >
                      <span>View Report</span>
                      <ArrowRight className="w-3.5 h-3.5 text-emerald-700" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : filteredReports.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-stone-200/90 shadow-sm">
            <FileText className="w-12 h-12 text-stone-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-stone-900">
              {statusFilter ? `No ${statusFilter} reports found` : 'No campus submissions yet'}
            </h3>
            <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1 mb-6">
              {statusFilter
                ? `You don't have any reports matching the "${statusFilter}" status filter.`
                : 'You haven\'t posted any lost or found listings yet. Submit a report to begin automated campus matching.'}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/report/new?type=lost"
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 transition shadow-sm"
              >
                + Report Lost
              </Link>
              <Link
                href="/report/new?type=found"
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-700 text-stone-100 hover:bg-emerald-600 transition shadow-sm"
              >
                + Report Found
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {filteredReports.map((report) => (
              <div
                key={report.id}
                className="bg-white rounded-2xl border border-stone-200/90 p-5 shadow-sm hover:shadow-md hover:border-stone-300 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={report.type === 'found' ? 'found' : 'lost'}>
                      {report.type === 'found' ? 'Found' : 'Lost'}
                    </Badge>
                    <Badge variant="outline" className="capitalize">
                      {report.status}
                    </Badge>
                    {report.pendingClaims > 0 && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                        <AlertTriangle className="w-3 h-3 text-amber-600" />
                        <span>{report.pendingClaims} pending claim</span>
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-stone-900 truncate">
                    {report.title}
                  </h3>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-stone-500">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-emerald-700" />
                      {report.campusArea}
                    </span>
                    <span>•</span>
                    <span suppressHydrationWarning className="inline-flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-stone-400" />
                      {report.occurredAt ? formatDate(report.occurredAt) : 'Recent'}
                    </span>
                    <span>•</span>
                    <span>{report.category}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href={`/report/${report.id}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-900 transition"
                  >
                    <span>View & Manage</span>
                    <ArrowRight className="w-3.5 h-3.5 text-emerald-700" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
