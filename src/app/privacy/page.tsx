import Link from 'next/link';
import { ArrowLeft, Shield, Lock, EyeOff, FileText, CheckCircle2 } from 'lucide-react';

export const metadata = {
  title: 'Privacy Policy | LostLink',
  description: 'How LostLink protects campus student identity, ownership secrets, and private chats.',
};

export default function PrivacyPage() {
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
            <Shield className="w-3.5 h-3.5" />
            <span>Campus Privacy Charter</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-stone-950">
            Privacy Policy & Identity Protection
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Effective: November 2026 &bull; LostLink Campus Trust & Safety Standard
          </p>
        </div>

        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200/90 shadow-sm space-y-6 text-xs text-stone-700 leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-sm font-bold text-stone-950 flex items-center gap-2">
              <EyeOff className="w-4 h-4 text-emerald-700" />
              1. Zero Image Scraping & No Biometric/Vector AI
            </h2>
            <p>
              LostLink never performs facial recognition, image embeddings, or vector database storage on user photos. Found item images are used strictly for human visual verification. Lost reports strictly forbid photo uploads so fraudulent claimants cannot fabricate visual proof.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-stone-950 flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-700" />
              2. EXIF & Geolocation Metadata Stripping
            </h2>
            <p>
              When a finder uploads a photo of an item, our server pipeline automatically strips all EXIF metadata, GPS latitude/longitude coordinates, and device identifiers before storing the re-encoded image in private campus storage.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-stone-950 flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-700" />
              3. Protection for Student ID Cards and Official Documents
            </h2>
            <p>
              Photographs of student ID cards, passports, and official identity documents are classified as <strong>Restricted Documents</strong>. They are shielded from public Explore listings and search crawlers. Only the finder, verified owner, or participants of an accepted claim can view the photo.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-stone-950 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
              4. Public Protection vs. Voluntary Chat Sharing
            </h2>
            <p>
              Public report listings (titles, descriptions, location notes) strictly block telephone numbers and email addresses to protect members from public harassment and off-platform scams. Once a finder verifies an ownership claim, a private 1-to-1 conversation unlocks where participants may voluntarily exchange phone numbers or email addresses to coordinate meetups.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-stone-950 flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-700" />
              5. Audited Administrative Access
            </h2>
            <p>
              Administrators have zero blanket access to private claim secrets or conversations. An administrator can only read a private claim or chat message when an open user flag specifically targets that record. Every privileged read automatically writes an immutable record to the admin audit log.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
