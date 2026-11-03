"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  Search,
  X,
  Compass,
  PlusCircle,
  RotateCcw,
  Sparkles,
  PackageSearch,
} from "lucide-react";
import { ReportItem } from "@/lib/mock-data";
import { CAMPUS_AREAS, CATEGORIES } from "@/lib/constants";
import { ReportCard } from "@/components/report-card";
import { getExploreReportsAction } from "@/lib/server/reports/actions";

export default function ExplorePage() {
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<"all" | "lost" | "found">("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedArea, setSelectedArea] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  useEffect(() => {
    async function fetchLiveReports() {
      try {
        const res = await getExploreReportsAction();
        setReports(res.reports || []);
      } catch {
        setReports([]);
      } finally {
        setLoading(false);
      }
    }

    fetchLiveReports();
  }, []);

  // Filter items based on criteria
  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      // Type filter
      if (selectedType !== "all" && report.type !== selectedType) {
        return false;
      }
      // Category filter
      if (selectedCategory !== "all" && report.categorySlug !== selectedCategory) {
        return false;
      }
      // Campus area filter
      if (selectedArea !== "all" && report.campusArea !== selectedArea) {
        return false;
      }
      // Status filter
      if (selectedStatus !== "all" && report.status !== selectedStatus) {
        return false;
      }
      // Keyword search
      if (searchTerm.trim() !== "") {
        const query = searchTerm.toLowerCase();
        const matchesTitle = report.title.toLowerCase().includes(query);
        const matchesDesc = report.description.toLowerCase().includes(query);
        const matchesBrand = report.brand?.toLowerCase().includes(query) || false;
        const matchesFeatures = report.distinctiveFeatures?.toLowerCase().includes(query) || false;
        const matchesArea = report.campusArea.toLowerCase().includes(query);
        const matchesLocationNote = report.exactLocationNote?.toLowerCase().includes(query) || false;

        if (
          !matchesTitle &&
          !matchesDesc &&
          !matchesBrand &&
          !matchesFeatures &&
          !matchesArea &&
          !matchesLocationNote
        ) {
          return false;
        }
      }
      return true;
    });
  }, [reports, searchTerm, selectedType, selectedCategory, selectedArea, selectedStatus]);

  const hasActiveFilters =
    searchTerm !== "" ||
    selectedType !== "all" ||
    selectedCategory !== "all" ||
    selectedArea !== "all" ||
    selectedStatus !== "all";

  const resetFilters = () => {
    setSearchTerm("");
    setSelectedType("all");
    setSelectedCategory("all");
    setSelectedArea("all");
    setSelectedStatus("all");
  };

  const foundCount = reports.filter((r) => r.type === "found").length;
  const lostCount = reports.filter((r) => r.type === "lost").length;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-stone-200/90">
        <div>
          <div className="flex items-center gap-2">
            <Compass className="h-5 w-5 text-emerald-800" />
            <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
              Campus Explore
            </h1>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-stone-600">
            Browse active lost &amp; found items across all 12 monitored campus zones.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <Link
            href="/report/new?type=lost"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-amber-950 bg-amber-500/15 border border-amber-500/30 hover:bg-amber-500/25 transition-colors shadow-xs"
          >
            Report Lost
          </Link>
          <Link
            href="/report/new?type=found"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 transition-colors shadow-xs"
          >
            <PlusCircle className="h-4 w-4" />
            Report Found
          </Link>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="mt-6 rounded-2xl border border-stone-200/90 bg-white/95 p-4 sm:p-5 shadow-xs space-y-4">
        {/* Search Input and Type Toggle */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Keyword Search */}
          <div className="relative md:col-span-7 lg:col-span-8">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by keywords, brand, colour, or feature (e.g. 'Sony', 'Hydro Flask', 'sticker')..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-300 text-sm placeholder:text-stone-400 focus:border-emerald-700 focus:outline-none bg-stone-50/50 focus:bg-white transition-colors"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Type Segmented Buttons */}
          <div className="md:col-span-5 lg:col-span-4 flex rounded-xl border border-stone-200/90 p-1 bg-stone-100">
            <button
              type="button"
              onClick={() => setSelectedType("all")}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                selectedType === "all"
                  ? "bg-[#0C1512] text-white shadow-xs"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              All ({reports.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedType("found")}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                selectedType === "found"
                  ? "bg-emerald-700 text-white shadow-xs"
                  : "text-stone-600 hover:text-emerald-800"
              }`}
            >
              Found ({foundCount})
            </button>
            <button
              type="button"
              onClick={() => setSelectedType("lost")}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                selectedType === "lost"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "text-stone-600 hover:text-amber-800"
              }`}
            >
              Lost ({lostCount})
            </button>
          </div>
        </div>

        {/* Secondary Dropdown Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-stone-100">
          {/* Category Dropdown */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-600 mb-1">
              Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs font-medium text-stone-800 bg-stone-50/50 focus:bg-white focus:border-emerald-700 focus:outline-none transition-colors"
            >
              <option value="all">All Categories</option>
              {CATEGORIES.map((cat) => (
                <option key={cat.slug} value={cat.slug}>
                  {cat.label} {cat.photoVisibility === "restricted" ? "🔒 (Restricted)" : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Campus Area Dropdown */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-600 mb-1">
              Campus Area
            </label>
            <select
              value={selectedArea}
              onChange={(e) => setSelectedArea(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs font-medium text-stone-800 bg-stone-50/50 focus:bg-white focus:border-emerald-700 focus:outline-none transition-colors"
            >
              <option value="all">All Campus Areas</option>
              {CAMPUS_AREAS.map((area) => (
                <option key={area} value={area}>
                  {area}
                </option>
              ))}
            </select>
          </div>

          {/* Status Dropdown */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-600 mb-1">
              Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs font-medium text-stone-800 bg-stone-50/50 focus:bg-white focus:border-emerald-700 focus:outline-none transition-colors"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active (Awaiting match/claim)</option>
              <option value="claim_accepted">Handover in Progress</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>
        </div>

        {/* Filter State Bar */}
        {hasActiveFilters && (
          <div className="flex items-center justify-between pt-2 border-t border-stone-100 text-xs text-stone-600">
            <span>
              Showing <strong>{filteredReports.length}</strong> matching results
            </span>
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1 font-semibold text-rose-600 hover:text-rose-700 transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset all filters
            </button>
          </div>
        )}
      </div>

      {/* Results Count & Policy Reminder Strip */}
      <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-stone-500">
        <p>
          Listing <strong>{filteredReports.length}</strong> verified reports across campus.
        </p>
        <div className="flex items-center gap-1.5 text-[11px] text-emerald-950 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
          <Sparkles className="h-3.5 w-3.5 shrink-0 text-emerald-700" />
          <span>Instant keyword search across all reports. Smart description matching runs whenever a new report is posted.</span>
        </div>
      </div>

      {/* Grid of Reports / Loading / Empty States */}
      {loading ? (
        <div className="mt-12 rounded-2xl border border-stone-200/90 bg-white/95 p-12 text-center max-w-lg mx-auto shadow-xs">
          <div className="inline-block h-7 w-7 animate-spin rounded-full border-2 border-emerald-700 border-t-transparent mb-3" />
          <p className="text-xs font-semibold text-stone-600">Loading campus listings...</p>
        </div>
      ) : filteredReports.length > 0 ? (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredReports.map((report) => (
            <ReportCard key={report.id} report={report} />
          ))}
        </div>
      ) : hasActiveFilters ? (
        /* Empty State with Active Filters */
        <div className="mt-12 rounded-2xl border border-stone-200/90 bg-white/95 p-12 text-center max-w-lg mx-auto shadow-xs">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-stone-100 text-stone-400 mx-auto mb-3">
            <Search className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-stone-900">No matching items found</h3>
          <p className="mt-1.5 text-xs text-stone-500 leading-relaxed">
            We couldn&apos;t find any active reports matching your search or filters. Try adjusting your keywords or clearing the area/category filters.
          </p>
          <div className="mt-5 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={resetFilters}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 transition-colors"
            >
              Reset Filters
            </button>
            <Link
              href="/report/new?type=lost"
              className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 transition-colors"
            >
              Report a Lost Item
            </Link>
          </div>
        </div>
      ) : (
        /* Empty State for Zero Campus Reports */
        <div className="mt-12 rounded-2xl border border-dashed border-stone-300 bg-white/95 p-12 text-center max-w-lg mx-auto shadow-xs">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-800 mx-auto mb-3">
            <PackageSearch className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-stone-900">No items reported on campus yet</h3>
          <p className="mt-1.5 text-xs text-stone-600 leading-relaxed">
            There are currently no active lost or found listings. Be the first to report an item and help reunite lost belongings across campus.
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
  );
}
