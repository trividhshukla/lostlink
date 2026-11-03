import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { NotificationsView, NotificationItem } from '@/components/notifications-view';

export default async function NotificationsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/notifications');
  }

  // Fetch notifications
  const { data: dbNotifications } = await supabase
    .from('notifications')
    .select('id, type, report_id, match_id, claim_id, title, body, read_at, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  const notifications: NotificationItem[] = (dbNotifications || []).map((n) => ({
    id: n.id,
    type: n.type,
    reportId: n.report_id,
    matchId: n.match_id,
    claimId: n.claim_id,
    title: n.title,
    body: n.body,
    readAt: n.read_at,
    createdAt: n.created_at,
  }));

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
      <NotificationsView notifications={notifications} />
    </div>
  );
}
