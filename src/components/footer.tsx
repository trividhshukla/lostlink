import React from "react";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-stone-800 bg-[#0C1512] text-stone-300">
      {/* Main Footer Links */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2 space-y-3">
            <Link href="/" className="inline-flex items-center gap-2.5 group">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-950/80 border border-emerald-500/30 text-white font-bold tracking-tight shadow-sm group-hover:border-emerald-400/60 transition-colors">
                <span className="text-lg text-stone-100">L</span>
                <span className="text-emerald-400 text-sm -ml-0.5 font-black">L</span>
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold tracking-tight text-white leading-tight">
                  LostLink
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400/90">
                  Campus Recovery
                </span>
              </div>
            </Link>
            <p className="text-sm text-stone-400 max-w-md leading-relaxed">
              An intentional campus Lost & Found system connecting honest finders and rightful owners
              through structured reporting and semantic text matching.
            </p>
            <p className="text-xs text-emerald-400 font-medium pt-1">
              Verified Campus Lost &amp; Found · Connected Student Community
            </p>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-200">Campus Access</h3>
            <ul className="mt-3 space-y-2 text-sm text-stone-400">
              <li>
                <Link href="/explore" className="hover:text-emerald-400 transition-colors">
                  Explore Active Items
                </Link>
              </li>
              <li>
                <Link href="/report/new?type=lost" className="hover:text-amber-300 transition-colors">
                  Report a Lost Item
                </Link>
              </li>
              <li>
                <Link href="/report/new?type=found" className="hover:text-emerald-400 transition-colors">
                  Report a Found Item
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-200">Key Campus Zones</h3>
            <p className="mt-3 text-xs text-stone-400 leading-relaxed">
              BLOCK A–E · Main Library · Sports Complex · Central Canteen · Main Gate · CDE Ground · Fountain Area
            </p>
            <div className="mt-4 pt-3 border-t border-stone-800 text-[11px] text-stone-400">
              Built with Next.js, TypeScript & Tailwind CSS.
            </div>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-400">
          <p>© 2026 LostLink. Dedicated to campus community.</p>
          <p className="text-[11px] text-stone-400">
            Member-verified handovers · Privacy-focused campus network
          </p>
        </div>
      </div>
    </footer>
  );
}
