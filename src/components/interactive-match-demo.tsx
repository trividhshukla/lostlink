"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Sparkles, Shield, PackageSearch, ArrowRight } from "lucide-react";

const MATCH_DEMO_ITEMS = [
  {
    id: "earbuds",
    tabLabel: "Wireless Earbuds",
    category: "Electronics",
    found: {
      title: "Sony WH-1000XM4 Headphones",
      area: "Library, 2nd Floor Study",
      description: "Found on study table in black zip case with aux cord inside.",
      photo: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&q=80",
      badge: "FOUND ITEM",
      isRestricted: false,
    },
    lost: {
      title: "Over-ear Wireless ANC headset",
      area: "Library Main Reading Hall",
      description: "Left behind near reading tables. Black hard case, minor scuff on left cup.",
      badge: "LOST ITEM",
    },
    reasons: [
      "Same Campus Area: Library (within same building)",
      "Brand & Finish Matched: Sony dark ANC case",
      "Semantic Match: Over-ear headset aligns with WH-1000XM4",
    ],
  },
  {
    id: "calculator",
    tabLabel: "Casio Calculator",
    category: "Study & Lab",
    found: {
      title: "Casio FX-991CW Scientific Calculator",
      area: "BLOCK B, Electronics Lab 204",
      description: "Left on lab bench 4 after circuit practical. Slide cover attached.",
      photo: "https://images.unsplash.com/photo-1757256137041-0aab889db199?w=300&q=80",
      badge: "FOUND ITEM",
      isRestricted: false,
    },
    lost: {
      title: "Scientific Calculator with slide cover",
      area: "BLOCK B, 2nd Floor Corridor",
      description: "Casio engineering calculator with battery cover scratch and initials on lid.",
      badge: "LOST ITEM",
    },
    reasons: [
      "Same Campus Area: BLOCK B",
      "Model Aligned: Casio Scientific / ClassWiz series",
      "Incident Timeline: Reported within 90 minutes of lab session",
    ],
  },
  {
    id: "idcard",
    tabLabel: "Student ID Card",
    category: "Identity & Cards",
    found: {
      title: "Student ID Card & Campus Lanyard",
      area: "Canteen, Billing Counter 2",
      description: "Computer Science enrollment pass in transparent acrylic holder.",
      photo: "",
      badge: "FOUND ITEM · RESTRICTED",
      isRestricted: true,
    },
    lost: {
      title: "Campus Student ID Badge (CS Dept)",
      area: "Canteen Food Court Seating",
      description: "Lost during lunch rush. CS badge inside clip sleeve with blue ribbon.",
      badge: "LOST ITEM",
    },
    reasons: [
      "Same Campus Area: Central Canteen",
      "Restricted Document Privacy: Photo automatically masked for safety",
      "Department & Lanyard Match: Computer Science department pass",
    ],
  },
];

export function InteractiveMatchDemo() {
  const [activeDemoTab, setActiveDemoTab] = useState(0);
  const currentDemo = MATCH_DEMO_ITEMS[activeDemoTab];

  return (
    <div className="relative mx-auto w-full max-w-md rounded-2xl bg-[#0C1512] text-stone-100 p-5 sm:p-6 shadow-2xl border border-stone-800/90 transition-all">
      {/* Header with Live Match badge */}
      <div className="flex items-center justify-between pb-4 border-b border-stone-800">
        <div className="flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-wider text-stone-200">
            Interactive Match Demo
          </span>
        </div>
        <span className="text-[11px] font-medium text-emerald-400/90 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full">
          Grounded Matching
        </span>
      </div>

      {/* 3 Clickable Demo Tabs */}
      <div className="mt-4 flex rounded-xl border border-stone-800 bg-stone-900/90 p-1 gap-1">
        {MATCH_DEMO_ITEMS.map((item, index) => {
          const isActive = activeDemoTab === index;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveDemoTab(index)}
              className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-lg transition-all duration-150 truncate ${
                isActive
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-stone-400 hover:text-stone-200 hover:bg-stone-800/60"
              }`}
            >
              {item.tabLabel}
            </button>
          );
        })}
      </div>

      {/* Dynamic Pair Preview */}
      <div className="mt-4 space-y-3">
        {/* Found Item Card */}
        <div className="rounded-xl border border-stone-800/80 bg-stone-900/60 p-3.5 flex gap-3 items-center">
          {currentDemo.found.isRestricted ? (
            <div className="h-14 w-14 shrink-0 rounded-lg bg-purple-950/70 border border-purple-500/40 flex flex-col items-center justify-center text-purple-300">
              <Shield className="h-5 w-5 mb-0.5" />
              <span className="text-[8px] font-bold uppercase">Masked</span>
            </div>
          ) : (
            <div className="relative h-14 w-14 shrink-0 rounded-lg overflow-hidden bg-stone-800 border border-stone-700">
              <Image
                src={currentDemo.found.photo}
                alt={currentDemo.found.title}
                fill
                className="object-cover"
              />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase text-emerald-300 bg-emerald-500/20 border border-emerald-500/30 px-1.5 py-0.2 rounded">
                {currentDemo.found.badge}
              </span>
              <span className="text-[11px] text-stone-400 truncate">
                {currentDemo.found.area}
              </span>
            </div>
            <p className="text-xs font-bold text-white truncate mt-1">
              {currentDemo.found.title}
            </p>
            <p className="text-[11px] text-stone-400 truncate">
              {currentDemo.found.description}
            </p>
          </div>
        </div>

        {/* Grounded Matching Connector Callout */}
        <div className="rounded-xl bg-emerald-950/70 border border-emerald-500/30 p-3 space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-300">
            <Sparkles className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
            <span>Smart Description Matching Reasons:</span>
          </div>
          <ul className="space-y-1 text-[11px] text-stone-300 pl-4 list-disc">
            {currentDemo.reasons.map((reason, idx) => (
              <li key={idx} className="leading-tight">
                {reason}
              </li>
            ))}
          </ul>
        </div>

        {/* Corresponding Lost Item Card */}
        <div className="rounded-xl border border-stone-800/80 bg-stone-900/60 p-3.5 flex gap-3 items-center">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-center p-1">
            <PackageSearch className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase text-amber-300 bg-amber-500/20 border border-amber-500/30 px-1.5 py-0.2 rounded">
                {currentDemo.lost.badge}
              </span>
              <span className="text-[11px] text-stone-400 truncate">
                {currentDemo.lost.area}
              </span>
            </div>
            <p className="text-xs font-bold text-white truncate mt-1">
              {currentDemo.lost.title}
            </p>
            <p className="text-[11px] text-stone-400 truncate">
              {currentDemo.lost.description}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-stone-800/80 text-center">
        <Link
          href="/explore"
          className="text-xs font-bold text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1.5 transition-colors"
        >
          Browse all active campus listings <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
