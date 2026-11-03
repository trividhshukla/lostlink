import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getAdminAuditLogsAction } from '@/lib/server/admin/actions';
import { ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Admin Audit Log | LostLink Admin',
  description: 'Immutable record of privileged administrative inspections and actions.',
};

export default async function AdminAuditPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/admin/audit');
  }

  const { data: isAdmin } = await supabase.rpc('is_admin', { p_user_id: user.id });
  if (!isAdmin) {
    redirect('/');
  }

  const { logs } = await getAdminAuditLogsAction(100);

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-stone-800">
          <div>
            <Link
              href="/admin/moderation"
              className="inline-flex items-center gap-1.5 text-xs text-stone-400 hover:text-stone-200 mb-2 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Moderation Queue</span>
            </Link>
            <h1 className="text-3xl font-black text-stone-100 tracking-tight">
              Immutable Admin Audit Log
            </h1>
            <p className="text-sm text-stone-400 mt-1">
              Every privileged private-content read and report modification writes an immutable audit record (I-ADM-05).
            </p>
          </div>
        </div>

        <div className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-stone-300">
              <thead className="bg-stone-950/80 text-[11px] uppercase tracking-wider text-stone-400 border-b border-stone-800">
                <tr>
                  <th className="px-5 py-3">Timestamp</th>
                  <th className="px-5 py-3">Administrator</th>
                  <th className="px-5 py-3">Action</th>
                  <th className="px-5 py-3">Target</th>
                  <th className="px-5 py-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/60">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-stone-500">
                      No administrative actions logged yet.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-stone-800/40 transition-colors">
                      <td className="px-5 py-3.5 whitespace-nowrap text-stone-400 font-mono">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="px-5 py-3.5 font-medium text-stone-200">
                        {log.admin_name}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30 text-[10px] font-bold uppercase">
                          {log.action.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-[11px] text-stone-400">
                        {log.target_type}: {log.target_id.slice(0, 8)}...
                      </td>
                      <td className="px-5 py-3.5 text-stone-400 max-w-xs truncate">
                        {JSON.stringify(log.metadata)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
