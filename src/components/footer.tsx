import React from "react";
import Link from "next/link";
import { ShieldCheck, Eye, Sparkles, CheckCircle2 } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-stone-800 bg-[#0C1512] text-stone-300">
      {/* Guiding Principles Strip */}
      <div className="border-b border-stone-800/80 bg-black/30 py-7">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400 shrink-0 mt-0.5 border border-emerald-500/20">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <p className="font-semibold text-white">Smart Description Matching</p>
                <p className="text-xs text-stone-400 mt-1 leading-relaxed">
                  Connects reports accurately even when descriptions use different words.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/15 text-amber-300 shrink-0 mt-0.5 border border-amber-500/20">
                <Eye className="h-4 w-4" />
              </div>
              <div>
                <p className="font-semibold text-white">Visual Identification</p>
                <p className="text-xs text-stone-400 mt-1 leading-relaxed">
                  Clear photos on found items, with automatic privacy protection for identity documents.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/15 text-purple-300 shrink-0 mt-0.5 border border-purple-500/20">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div>
                <p className="font-semibold text-white">Verified Handover</p>
                <p className="text-xs text-stone-400 mt-1 leading-relaxed">
                  Private communication unlocks only after secret ownership proof is verified.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/15 text-sky-300 shrink-0 mt-0.5 border border-sky-500/20">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <div>
                <p className="font-semibold text-white">Two-Sided Confirmation</p>
                <p className="text-xs text-stone-400 mt-1 leading-relaxed">
                  Item return is completed only when both owner and finder confirm handover.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-600 text-white font-bold text-sm shadow-xs">
                LL
              </div>
              <span className="text-lg font-bold text-white tracking-tight">LostLink</span>
            </div>
            <p className="text-sm text-stone-400 max-w-md leading-relaxed">
              An intentional campus Lost & Found system connecting honest finders and rightful owners
              through structured reporting and semantic text matching.
            </p>
            <p className="text-xs text-emerald-400 font-medium pt-1">
              Central Campus Network · Connected Student Community
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
          <p>© 2026 LostLink. Dedicated to campus community recovery.</p>
          <p className="text-[11px] text-stone-400">
            Member-verified handovers · Privacy-focused campus network
          </p>
        </div>
      </div>
    </footer>
  );
}
