import Link from 'next/link';
import { ArrowLeft, CheckCircle, AlertTriangle, ShieldCheck, UserCheck } from 'lucide-react';

export const metadata = {
  title: 'Terms of Service | LostLink',
  description: 'Campus community rules, honest ownership verification, and handover etiquette.',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#F4F3EF] text-stone-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600 hover:text-stone-900 transition"
        >
          <ArrowLeft className="w-4 h-4 text-emerald-700" />
          <span>Back to Home</span>
        </Link>

        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Campus Community Guidelines</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-stone-950">
            Terms of Service & Handover Etiquette
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Last updated: November 2026 &bull; University Campus Standards
          </p>
        </div>

        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200/90 shadow-sm space-y-6 text-xs text-stone-700 leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-sm font-bold text-stone-950 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-700" />
              1. Community Responsibility & Genuine Reporting
            </h2>
            <p>
              LostLink is a campus utility built on mutual trust. Members agree to list only genuine lost and found items. Commercial advertising, prank listings, and intentional false reporting are strictly prohibited and result in permanent account suspension.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-stone-950 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-700" />
              2. Strict False Claim Rules & Permanent Blocking
            </h2>
            <p>
              To protect finders from fraudulent attempts to claim property, a claim requires an active Lost report and a secret physical ownership proof (10–500 characters). If a finder inspects the item and rejects a claim, that exact Lost/Found pair is <strong>permanently blocked</strong> from being claimed again.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-stone-950 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-700" />
              3. Safe Campus Handovers
            </h2>
            <p>
              All physical handovers must take place in well-lit, public campus locations (e.g., student centre, faculty reception, university library entrance). Neither party should ever agree to meet in isolated areas or off-campus private residences.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-stone-950 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              4. Two-Sided Completion Standard
            </h2>
            <p>
              A handover is only marked resolved when <strong>both</strong> parties click confirmation: the finder confirms &quot;Item handed over&quot; and the claimant confirms &quot;Item received&quot;. Either party may cancel an incomplete handover before both confirmations are submitted.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
