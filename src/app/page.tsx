import React from "react";
import Link from "next/link";
import {
  Search,
  PlusCircle,
  Sparkles,
  ArrowRight,
  Building2,
  Eye,
  CheckCircle2,
  PackageSearch,
  Layers,
  Check,
} from "lucide-react";
import { ReportCard } from "@/components/report-card";
import { InteractiveMatchDemo } from "@/components/interactive-match-demo";
import { CAMPUS_AREAS } from "@/lib/constants";
import { getExploreReportsAction } from "@/lib/server/reports/actions";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const { reports: liveReports } = await getExploreReportsAction();
  const previewItems = liveReports.slice(0, 3);
  const totalCount = liveReports.length;

  return (
    <div className="flex flex-col bg-[#F4F3EF]">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 sm:pt-20 lg:pt-24 pb-16 sm:pb-24 border-b border-stone-200/90">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left Hero Content */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-emerald-950/10 text-emerald-900 border border-emerald-700/20 shadow-xs">
                <span className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse" />
                Central Campus Network · Active Recovery
              </div>

              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-stone-900 leading-[1.12]">
                Reuniting lost items with their rightful owners across campus.
              </h1>

              <p className="text-base sm:text-lg text-stone-600 max-w-2xl leading-relaxed mx-auto lg:mx-0">
                A purpose-built campus Lost &amp; Found. Honest finders report with a clear photo,
                while owners describe what they lost. Smart description matching connects reports
                even when written in completely different words.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 pt-2">
                <Link
                  href="/report/new?type=found"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-sm font-bold text-white bg-emerald-700 hover:bg-emerald-800 shadow-sm hover:shadow transition-all duration-200"
                >
                  <PlusCircle className="h-4 w-4" />
                  Report a Found Item
                </Link>

                <Link
                  href="/report/new?type=lost"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-sm font-bold text-amber-950 bg-amber-500/15 border border-amber-500/30 hover:bg-amber-500/25 transition-all duration-200 shadow-xs"
                >
                  <Search className="h-4 w-4 text-amber-800" />
                  I Lost Something
                </Link>

                <Link
                  href="/explore"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl text-sm font-semibold text-stone-800 bg-white/90 border border-stone-300 hover:bg-white hover:border-stone-400 transition-all duration-200 shadow-xs"
                >
                  Explore Listings
                  <ArrowRight className="h-4 w-4 text-stone-500" />
                </Link>
              </div>

              {/* Core Positive Value Pillars */}
              <div className="pt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-stone-200 text-left">
                <div className="bg-white/80 p-3 rounded-xl border border-stone-200/80 shadow-xs">
                  <p className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                    Smart Matching
                  </p>
                  <p className="text-[11px] text-stone-600 mt-0.5">
                    Connects varying descriptions
                  </p>
                </div>
                <div className="bg-white/80 p-3 rounded-xl border border-stone-200/80 shadow-xs">
                  <p className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                    <Eye className="h-3.5 w-3.5 text-amber-600" />
                    Visual Clarity
                  </p>
                  <p className="text-[11px] text-stone-600 mt-0.5">
                    Clear photos &amp; ID privacy
                  </p>
                </div>
                <div className="bg-white/80 p-3 rounded-xl border border-stone-200/80 shadow-xs">
                  <p className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-sky-600" />
                    Verified Handover
                  </p>
                  <p className="text-[11px] text-stone-600 mt-0.5">
                    True owner proof verification
                  </p>
                </div>
              </div>
            </div>

            {/* Right Hero Visual: Dark Interactive Match Demo */}
            <div className="lg:col-span-5 relative w-full">
              <InteractiveMatchDemo />
            </div>
          </div>
        </div>
      </section>

      {/* Dark High-Contrast Bento: How Matching Works */}
      <section id="how-it-works" className="py-16 sm:py-24 bg-[#0C1512] text-stone-200 border-b border-stone-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 mb-3">
              <Layers className="h-3.5 w-3.5" />
              How Matching Works
            </div>
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              Honest Reporting. Verified Handovers.
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-stone-400">
              Three clear stages designed for student integrity and genuine item recovery.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Bento Step 1 */}
            <div className="rounded-2xl border border-stone-800/90 bg-stone-900/60 p-6 sm:p-7 flex flex-col justify-between hover:border-emerald-500/40 transition-colors">
              <div>
                <div className="h-10 w-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mb-5 font-bold text-sm">
                  01
                </div>
                <h3 className="text-lg font-bold text-white">Visual Identification</h3>
                <p className="mt-2.5 text-xs text-stone-400 leading-relaxed">
                  Finders capture 1 clear photo of the found object for visual recognition.
                  Owners describe their item in detail, keeping secret proof for the claim stage.
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-stone-800 text-[11px] font-semibold text-emerald-400 flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5" />
                Automatic privacy protection on student ID cards
              </div>
            </div>

            {/* Bento Step 2 */}
            <div className="rounded-2xl border border-stone-800/90 bg-stone-900/60 p-6 sm:p-7 flex flex-col justify-between hover:border-emerald-500/40 transition-colors">
              <div>
                <div className="h-10 w-10 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center mb-5 font-bold text-sm">
                  02
                </div>
                <h3 className="text-lg font-bold text-white">Smart Description Matching</h3>
                <p className="mt-2.5 text-xs text-stone-400 leading-relaxed">
                  LostLink compares item details, colours, campus zones, and timing to connect
                  reports even when people describe the exact same item with different vocabulary.
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-stone-800 text-[11px] font-semibold text-amber-300 flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5" />
                Understands synonyms and campus slang
              </div>
            </div>

            {/* Bento Step 3 */}
            <div className="rounded-2xl border border-stone-800/90 bg-stone-900/60 p-6 sm:p-7 flex flex-col justify-between hover:border-emerald-500/40 transition-colors">
              <div>
                <div className="h-10 w-10 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-400 flex items-center justify-center mb-5 font-bold text-sm">
                  03
                </div>
                <h3 className="text-lg font-bold text-white">Verified Handover</h3>
                <p className="mt-2.5 text-xs text-stone-400 leading-relaxed">
                  Claimants submit a private identifying detail (like inside engraving or lock screen).
                  Once the finder verifies, private chat unlocks for a coordinated campus meetup.
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-stone-800 text-[11px] font-semibold text-sky-400 flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5" />
                Two-sided confirmation to mark item returned
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Items Preview (Warm Alabaster Canvas) */}
      <section className="py-16 sm:py-20 border-b border-stone-200/90">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 mb-8">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                Live Campus Activity
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-900 mt-0.5">
                Recently Reported on Campus
              </h2>
            </div>
            <Link
              href="/explore"
              className="text-xs sm:text-sm font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1 transition-colors"
            >
              View all listings ({totalCount}) <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {previewItems.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {previewItems.map((item) => (
                <ReportCard key={item.id} report={item} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-stone-300 bg-white/70 p-12 text-center max-w-lg mx-auto shadow-xs">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-800 mx-auto mb-3">
                <PackageSearch className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-stone-900">No items reported on campus yet</h3>
              <p className="mt-1.5 text-xs text-stone-600 leading-relaxed">
                Be the first to report a lost or found item! Help reunite campus belongings quickly and safely.
              </p>
              <div className="mt-5 flex items-center justify-center gap-3">
                <Link
                  href="/report/new?type=lost"
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-amber-950 bg-amber-500/15 border border-amber-500/30 hover:bg-amber-500/25 transition-colors"
                >
                  + Report Lost
                </Link>
                <Link
                  href="/report/new?type=found"
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 transition-colors"
                >
                  + Report Found
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Campus Areas Strip */}
      <section className="py-14 bg-white/70">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="h-4 w-4 text-emerald-800" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700">
              Approved Campus Recovery Zones
            </h3>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {CAMPUS_AREAS.map((area) => (
              <Link
                key={area}
                href={`/explore?area=${encodeURIComponent(area)}`}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-stone-100 hover:bg-emerald-100/70 hover:text-emerald-950 text-stone-700 border border-stone-200 transition-colors shadow-xs"
              >
                {area}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
