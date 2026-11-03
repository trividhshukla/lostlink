import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getClaimWithDetailsAction } from '@/lib/server/claims/actions';
import { ClaimChatView } from '@/components/claim-chat-view';

interface ClaimPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: ClaimPageProps) {
  const { id } = await params;
  return {
    title: `Handover Coordination | LostLink`,
    description: `Private handover chat and two-sided verification for claim ${id}.`,
  };
}

export default async function ClaimDetailPage({ params }: ClaimPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/claims/${id}`);
  }

  const { claim, messages, currentUserId, error } = await getClaimWithDetailsAction(id);

  if (error || !claim || !currentUserId) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <ClaimChatView
          claim={claim}
          initialMessages={messages}
          currentUserId={currentUserId}
        />
      </div>
    </div>
  );
}
