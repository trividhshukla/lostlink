"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ReportItem } from "@/lib/mock-data";
import { Badge } from "@/components/badge";
import { formatIncidentDate } from "@/lib/utils";
import {
  MapPin,
  Calendar,
  Shield,
  EyeOff,
  PackageSearch,
  Sparkles,
  Info,
  Tag,
  ArrowUpRight,
} from "lucide-react";

interface ReportCardProps {
  report: ReportItem;
}

export function ReportCard({ report }: ReportCardProps) {
  const [showDetail, setShowDetail] = useState(false);
  const isFound = report.type === "found";
  const isLost = report.type === "lost";

  return (
    <article className="group flex flex-col rounded-xl border border-stone-200/90 bg-white/95 shadow-xs hover:-translate-y-0.5 hover:border-stone-300 hover:shadow-lg transition-all duration-200 overflow-hidden">
      {/* Media / Visual Placeholder Area */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-stone-100">
        {isFound && report.photoUrl && !report.isRestrictedCategory ? (
          <Image
            src={report.photoUrl}
            alt={report.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover group-hover:scale-102 transition-transform duration-300"
          />
        ) : isFound && report.isRestrictedCategory ? (
          /* Privacy Masked Placeholder for ID Cards and Documents */
          <div className="h-full w-full flex flex-col items-center justify-center p-6 text-center bg-purple-50/80 border-b border-purple-100">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 text-purple-800 mb-2 shadow-xs">
              <Shield className="h-6 w-6" />
            </div>
            <p className="text-xs font-bold uppercase tracking-wider text-purple-950">
              Protected Identity Document
            </p>
            <p className="text-[11px] text-purple-800 max-w-[220px] mt-1 leading-snug">
              Photo masked automatically for campus privacy. Visible to verified owner upon accepted claim.
            </p>
          </div>
        ) : (
          /* Lost Report: Clear visual representation */
          <div className="h-full w-full flex flex-col items-center justify-center p-6 text-center bg-amber-50/60 border-b border-amber-100/70">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100/90 text-amber-900 mb-2 shadow-xs">
              <PackageSearch className="h-6 w-6" />
            </div>
            <p className="text-xs font-bold uppercase tracking-wider text-amber-950">
              Lost Item Listing
            </p>
            <p className="text-[11px] text-amber-800 max-w-[210px] mt-1 leading-snug">
              Described by owner. Key identifying details verified during physical handover.
            </p>
          </div>
        )}

        {/* Floating Badges */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 z-10">
          <Badge variant={isFound ? "found" : "lost"}>
            {isFound ? "FOUND ITEM" : "LOST ITEM"}
          </Badge>
          {report.isRestrictedCategory && (
            <Badge variant="restricted">
              <EyeOff className="h-3 w-3 inline" /> Protected
            </Badge>
          )}
        </div>

        <div className="absolute top-3 right-3 z-10">
          {report.status === "active" && (
            <Badge variant="active" className="bg-white/95 backdrop-blur-sm shadow-xs">
              Active
            </Badge>
          )}
          {report.status === "claim_accepted" && (
            <Badge variant="accepted" className="bg-white/95 backdrop-blur-sm shadow-xs">
              Handover in Progress
            </Badge>
          )}
          {report.status === "resolved" && (
            <Badge variant="resolved" className="bg-white/95 backdrop-blur-sm shadow-xs">
              Resolved
            </Badge>
          )}
        </div>
      </div>

      {/* Card Content */}
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <div className="flex items-center gap-1.5 text-xs text-stone-500 mb-1.5">
          <Tag className="h-3.5 w-3.5 text-stone-400" />
          <span className="font-semibold text-stone-700">{report.category}</span>
          <span>•</span>
          <span>{report.colour}</span>
          {report.brand && (
            <>
              <span>•</span>
              <span className="text-stone-700 font-semibold">{report.brand}</span>
            </>
          )}
        </div>

        <h3 className="text-base font-bold text-stone-900 line-clamp-2 leading-snug group-hover:text-emerald-800 transition-colors">
          {report.title}
        </h3>

        <p className="mt-2 text-xs text-stone-600 line-clamp-2 leading-relaxed">
          {report.description}
        </p>

        {report.distinctiveFeatures && (
          <div className="mt-2.5 rounded-lg bg-stone-50 p-2.5 text-[11px] text-stone-700 border border-stone-200/70 flex items-start gap-1.5">
            <Info className="h-3.5 w-3.5 text-stone-400 shrink-0 mt-0.5" />
            <span className="line-clamp-1">
              <strong className="font-semibold text-stone-800">Features:</strong> {report.distinctiveFeatures}
            </span>
          </div>
        )}

        {/* Location & Time Footer */}
        <div className="mt-4 pt-3 border-t border-stone-100 flex flex-col gap-1.5 text-xs text-stone-600">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-stone-800 font-medium">
              <MapPin className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
              <span>{report.campusArea}</span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-stone-500">
              <Calendar className="h-3 w-3 shrink-0" />
              <span suppressHydrationWarning>{formatIncidentDate(report.incidentDate)}</span>
            </div>
          </div>

          {report.exactLocationNote && (
            <p className="text-[11px] text-stone-500 italic truncate pl-4">
              Note: &ldquo;{report.exactLocationNote}&rdquo;
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowDetail(!showDetail)}
              className="text-xs font-semibold text-stone-600 hover:text-stone-900 transition-colors"
            >
              {showDetail ? "Hide" : "Preview"}
            </button>
            <Link
              href={`/report/${report.id}`}
              className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 flex items-center gap-0.5 transition-colors"
            >
              <span>Full Details</span>
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>

          {isFound && report.status === "active" && (
            <Link
              href={`/report/${report.id}`}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#0C1512] text-white hover:bg-stone-800 transition-colors shadow-xs"
            >
              Claim Item
            </Link>
          )}

          {isLost && report.status === "active" && (
            <span className="text-[11px] font-semibold text-amber-900 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
              Active Lost Listing
            </span>
          )}

          {report.status === "claim_accepted" && (
            <span className="text-[11px] font-semibold text-sky-900 bg-sky-50 px-2.5 py-1 rounded-md border border-sky-200">
              In Handover
            </span>
          )}

          {report.status === "resolved" && (
            <span className="text-[11px] font-semibold text-stone-700 bg-stone-100 px-2.5 py-1 rounded-md border border-stone-200">
              Resolved &bull; Returned
            </span>
          )}
        </div>

        {/* Expandable Details Drawer */}
        {showDetail && (
          <div className="mt-3 p-3.5 rounded-lg bg-stone-50 border border-stone-200 text-xs space-y-2 animate-in fade-in-50 duration-150">
            <div>
              <span className="font-semibold text-stone-900">Full Description:</span>
              <p className="mt-0.5 text-stone-700 leading-relaxed">{report.description}</p>
            </div>
            {report.exactLocationNote && (
              <div>
                <span className="font-semibold text-stone-900">Exact Location Spot:</span>
                <p className="text-stone-700">{report.exactLocationNote}</p>
              </div>
            )}
            <div className="pt-2 border-t border-stone-200/80 flex items-center gap-1.5 text-[11px] text-emerald-900 font-medium">
              <Sparkles className="h-3 w-3 shrink-0 text-emerald-700" />
              <span>Smart Description Matching: Evaluates report text to surface corresponding campus items.</span>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
