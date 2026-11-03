import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getAdminFlagsAction } from '@/lib/server/admin/actions';
import { AdminFlagsView } from '@/components/admin-flags-view';
import { ShieldCheck } from 'lucide-react';

export const metadata = {
  title: 'Moderation Queue | LostLink Admin',
  description: 'Review campus flags, investigate suspicious activity, and moderate reports.',
};

export default async function AdminModerationPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/admin/moderation');
  }

  // Check if admin
  const { data: isAdmin } = await supabase.rpc('is_admin', { p_user_id: user.id });
  if (!isAdmin) {
    redirect('/');
  }

  const { flags } = await getAdminFlagsAction();

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-stone-800">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-800/50 text-[11px] font-semibold text-emerald-400 mb-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Campus Administration</span>
            </div>
            <h1 className="text-3xl font-black text-stone-100 tracking-tight">
              Moderation & Flags Queue
            </h1>
            <p className="text-sm text-stone-400 mt-1">
              Review flagged items, investigate potential claim fraud, and maintain campus safety.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/admin/audit"
              className="px-4 py-2 bg-stone-900 hover:bg-stone-800 border border-stone-800 text-stone-200 text-xs font-semibold rounded-xl transition-all"
            >
              View Audit Trail &rarr;
            </Link>
          </div>
        </div>

        {/* Flags View */}
        <AdminFlagsView initialFlags={flags} />
      </div>
    </div>
  );
}
