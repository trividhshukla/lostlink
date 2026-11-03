import { describe, it, expect } from 'vitest';
import { ClaimStatus, ConversationStatus, ReportStatus } from '@/types/database';

interface SimulatedReport {
  id: string;
  owner_id: string;
  report_type: 'lost' | 'found';
  status: ReportStatus;
  campus_id?: string;
  title: string;
}

interface SimulatedClaim {
  id: string;
  lost_report_id: string;
  found_report_id: string;
  claimant_id: string;
  finder_id: string;
  status: ClaimStatus;
  finder_confirmed_at: string | null;
  claimant_confirmed_at: string | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
  completed_at: string | null;
}

interface SimulatedConversation {
  id: string;
  claim_id: string;
  status: ConversationStatus;
}

// Pure state machine logic matching PostgreSQL RPCs in 20261102_phase5_claims_schema.sql
class ClaimsLifecycleEngine {
  // CLM-UNIT-01, CLM-UNIT-02, CLM-UNIT-03, CLM-UNIT-04
  static submitClaim({
    userId,
    lostReport,
    foundReport,
    existingClaims,
  }: {
    userId: string;
    lostReport: SimulatedReport;
    foundReport: SimulatedReport;
    existingClaims: SimulatedClaim[];
  }): { success: boolean; claim?: SimulatedClaim; error?: string } {
    // CLM-UNIT-01: Only Active Lost owner can submit
    if (lostReport.owner_id !== userId) {
      return { success: false, error: 'You can only claim items using a Lost report that you created.' };
    }
    if (lostReport.report_type !== 'lost' || lostReport.status !== 'active') {
      return { success: false, error: 'Your Lost report must be active to submit a claim.' };
    }

    // CLM-UNIT-02: User cannot claim own Found report
    if (foundReport.owner_id === userId) {
      return { success: false, error: 'You cannot submit a claim on an item you reported found.' };
    }
    if (foundReport.report_type !== 'found' || foundReport.status !== 'active') {
      return { success: false, error: 'Found report is no longer available for claims.' };
    }

    // CLM-UNIT-03: Rejected pair remains blocked
    const wasRejected = existingClaims.some(
      (c) =>
        c.lost_report_id === lostReport.id &&
        c.found_report_id === foundReport.id &&
        c.status === 'rejected'
    );
    if (wasRejected) {
      return { success: false, error: 'A claim between this Lost report and Found report was previously rejected.' };
    }

    // Active claim block (pending or accepted)
    const hasActiveClaim = existingClaims.some(
      (c) =>
        c.lost_report_id === lostReport.id &&
        c.found_report_id === foundReport.id &&
        (c.status === 'pending' || c.status === 'accepted' || c.status === 'completed')
    );
    if (hasActiveClaim) {
      return { success: false, error: 'An active claim is already in progress for this item.' };
    }

    // CLM-UNIT-04: Withdrawn / cancelled / superseded allows creating new claim
    const newClaim: SimulatedClaim = {
      id: 'claim-' + Math.random().toString(36).slice(2, 9),
      lost_report_id: lostReport.id,
      found_report_id: foundReport.id,
      claimant_id: userId,
      finder_id: foundReport.owner_id,
      status: 'pending',
      finder_confirmed_at: null,
      claimant_confirmed_at: null,
      cancelled_at: null,
      cancelled_by: null,
      completed_at: null,
    };

    return { success: true, claim: newClaim };
  }

  // CLM-UNIT-05: Accepted claim supersedes other pending claims
  static acceptClaim({
    finderId,
    claimToAccept,
    allClaims,
    lostReport,
    foundReport,
  }: {
    finderId: string;
    claimToAccept: SimulatedClaim;
    allClaims: SimulatedClaim[];
    lostReport: SimulatedReport;
    foundReport: SimulatedReport;
  }): { success: boolean; error?: string } {
    if (claimToAccept.finder_id !== finderId) {
      return { success: false, error: 'Only the finder can accept this claim.' };
    }
    if (claimToAccept.status !== 'pending') {
      return { success: false, error: 'Claim is not in pending status.' };
    }

    // Accept target claim
    claimToAccept.status = 'accepted';

    // Lock reports to claim_accepted
    lostReport.status = 'claim_accepted';
    foundReport.status = 'claim_accepted';

    // CLM-UNIT-05: Supersede other pending claims for either report
    for (const c of allClaims) {
      if (
        c.id !== claimToAccept.id &&
        c.status === 'pending' &&
        (c.lost_report_id === claimToAccept.lost_report_id ||
          c.found_report_id === claimToAccept.found_report_id)
      ) {
        c.status = 'superseded';
      }
    }

    return { success: true };
  }

  // CLM-UNIT-06: Completed requires both confirmations
  static confirmHandover({
    userId,
    claim,
    lostReport,
    foundReport,
    conversation,
  }: {
    userId: string;
    claim: SimulatedClaim;
    lostReport: SimulatedReport;
    foundReport: SimulatedReport;
    conversation: SimulatedConversation;
  }): { success: boolean; bothConfirmed: boolean; error?: string } {
    if (claim.status !== 'accepted') {
      return { success: false, bothConfirmed: false, error: 'Only accepted claims can confirm handover.' };
    }
    if (claim.claimant_id !== userId && claim.finder_id !== userId) {
      return { success: false, bothConfirmed: false, error: 'Only claim participants can confirm.' };
    }

    const timestamp = new Date().toISOString();
    if (userId === claim.finder_id) {
      claim.finder_confirmed_at = timestamp;
    }
    if (userId === claim.claimant_id) {
      claim.claimant_confirmed_at = timestamp;
    }

    // Check if both sides have confirmed
    const bothConfirmed = claim.finder_confirmed_at !== null && claim.claimant_confirmed_at !== null;
    if (bothConfirmed) {
      claim.status = 'completed';
      claim.completed_at = timestamp;
      lostReport.status = 'resolved';
      foundReport.status = 'resolved';
      conversation.status = 'read_only';
    }

    return { success: true, bothConfirmed };
  }

  // CLM-UNIT-07 & CLM-UNIT-08: Cancel handover clears timestamps, reopens reports, and locks chat
  static cancelHandover({
    userId,
    claim,
    lostReport,
    foundReport,
    conversation,
  }: {
    userId: string;
    claim: SimulatedClaim;
    lostReport: SimulatedReport;
    foundReport: SimulatedReport;
    conversation: SimulatedConversation;
  }): { success: boolean; error?: string } {
    if (claim.status !== 'accepted') {
      return { success: false, error: 'Handover can only be cancelled while in accepted status.' };
    }
    if (claim.claimant_id !== userId && claim.finder_id !== userId) {
      return { success: false, error: 'Only participants can cancel handover.' };
    }

    const now = new Date().toISOString();

    // CLM-UNIT-07: Cancel clears both confirmation timestamps
    claim.status = 'cancelled';
    claim.cancelled_at = now;
    claim.cancelled_by = userId;
    claim.finder_confirmed_at = null;
    claim.claimant_confirmed_at = null;

    // CLM-UNIT-08: Cancel reopens both reports to active and locks chat to read_only
    lostReport.status = 'active';
    foundReport.status = 'active';
    conversation.status = 'read_only';

    return { success: true };
  }
}

describe('Claims Lifecycle Unit Tests (CLM-UNIT)', () => {
  const userA = 'user-claimant-1111';
  const userB = 'user-finder-2222';
  const userC = 'user-other-3333';

  const baseLostReport: SimulatedReport = {
    id: 'report-lost-1',
    owner_id: userA,
    report_type: 'lost',
    status: 'active',
    title: 'Lost Dell Laptop',
  };

  const baseFoundReport: SimulatedReport = {
    id: 'report-found-1',
    owner_id: userB,
    report_type: 'found',
    status: 'active',
    title: 'Found Dell XPS',
  };

  // CLM-UNIT-01: Only Active Lost owner can submit
  it('CLM-UNIT-01: allows only the active Lost report owner to submit a claim', () => {
    // Non-owner attempt
    const resUnauthorized = ClaimsLifecycleEngine.submitClaim({
      userId: userC,
      lostReport: baseLostReport,
      foundReport: baseFoundReport,
      existingClaims: [],
    });
    expect(resUnauthorized.success).toBe(false);
    expect(resUnauthorized.error).toContain('Lost report that you created');

    // Inactive lost report attempt
    const inactiveLostReport: SimulatedReport = { ...baseLostReport, status: 'resolved' };
    const resInactive = ClaimsLifecycleEngine.submitClaim({
      userId: userA,
      lostReport: inactiveLostReport,
      foundReport: baseFoundReport,
      existingClaims: [],
    });
    expect(resInactive.success).toBe(false);
    expect(resInactive.error).toContain('must be active');

    // Valid owner with active report
    const resValid = ClaimsLifecycleEngine.submitClaim({
      userId: userA,
      lostReport: baseLostReport,
      foundReport: baseFoundReport,
      existingClaims: [],
    });
    expect(resValid.success).toBe(true);
    expect(resValid.claim?.status).toBe('pending');
  });

  // CLM-UNIT-02: User cannot claim own Found report
  it('CLM-UNIT-02: strictly blocks a user from claiming their own Found report', () => {
    const ownFoundReport: SimulatedReport = {
      ...baseFoundReport,
      owner_id: userA, // same as claimant
    };

    const res = ClaimsLifecycleEngine.submitClaim({
      userId: userA,
      lostReport: baseLostReport,
      foundReport: ownFoundReport,
      existingClaims: [],
    });

    expect(res.success).toBe(false);
    expect(res.error).toContain('cannot submit a claim on an item you reported found');
  });

  // CLM-UNIT-03: Rejected pair remains blocked
  it('CLM-UNIT-03: permanently blocks subsequent claims between a previously rejected report pair', () => {
    const rejectedClaim: SimulatedClaim = {
      id: 'claim-old-rejected',
      lost_report_id: baseLostReport.id,
      found_report_id: baseFoundReport.id,
      claimant_id: userA,
      finder_id: userB,
      status: 'rejected',
      finder_confirmed_at: null,
      claimant_confirmed_at: null,
      cancelled_at: null,
      cancelled_by: null,
      completed_at: null,
    };

    const res = ClaimsLifecycleEngine.submitClaim({
      userId: userA,
      lostReport: baseLostReport,
      foundReport: baseFoundReport,
      existingClaims: [rejectedClaim],
    });

    expect(res.success).toBe(false);
    expect(res.error).toContain('previously rejected');
  });

  // CLM-UNIT-04: Withdrawn/cancelled/superseded pair can be claimed again when eligible
  it('CLM-UNIT-04: allows creating a new claim if previous claim was withdrawn or cancelled', () => {
    const withdrawnClaim: SimulatedClaim = {
      id: 'claim-withdrawn-1',
      lost_report_id: baseLostReport.id,
      found_report_id: baseFoundReport.id,
      claimant_id: userA,
      finder_id: userB,
      status: 'withdrawn',
      finder_confirmed_at: null,
      claimant_confirmed_at: null,
      cancelled_at: null,
      cancelled_by: null,
      completed_at: null,
    };

    const res = ClaimsLifecycleEngine.submitClaim({
      userId: userA,
      lostReport: baseLostReport,
      foundReport: baseFoundReport,
      existingClaims: [withdrawnClaim],
    });

    expect(res.success).toBe(true);
    expect(res.claim?.status).toBe('pending');
  });

  // CLM-UNIT-05: Accepted claim supersedes other pending claims for either report
  it('CLM-UNIT-05: automatically supersedes competing pending claims when one claim is accepted', () => {
    const targetClaim: SimulatedClaim = {
      id: 'claim-accepted-target',
      lost_report_id: baseLostReport.id,
      found_report_id: baseFoundReport.id,
      claimant_id: userA,
      finder_id: userB,
      status: 'pending',
      finder_confirmed_at: null,
      claimant_confirmed_at: null,
      cancelled_at: null,
      cancelled_by: null,
      completed_at: null,
    };

    const competingClaim: SimulatedClaim = {
      id: 'claim-competing-pending',
      lost_report_id: 'report-lost-competing-2',
      found_report_id: baseFoundReport.id, // competing for same found report
      claimant_id: userC,
      finder_id: userB,
      status: 'pending',
      finder_confirmed_at: null,
      claimant_confirmed_at: null,
      cancelled_at: null,
      cancelled_by: null,
      completed_at: null,
    };

    const allClaims = [targetClaim, competingClaim];
    const lostRep = { ...baseLostReport };
    const foundRep = { ...baseFoundReport };

    const res = ClaimsLifecycleEngine.acceptClaim({
      finderId: userB,
      claimToAccept: targetClaim,
      allClaims,
      lostReport: lostRep,
      foundReport: foundRep,
    });

    expect(res.success).toBe(true);
    expect(targetClaim.status).toBe('accepted');
    expect(competingClaim.status).toBe('superseded');
    expect(lostRep.status).toBe('claim_accepted');
    expect(foundRep.status).toBe('claim_accepted');
  });

  // CLM-UNIT-06: Completed requires both confirmations
  it('CLM-UNIT-06: requires both claimant and finder confirmations before transitioning to completed and resolving reports', () => {
    const claim: SimulatedClaim = {
      id: 'claim-handover-test',
      lost_report_id: baseLostReport.id,
      found_report_id: baseFoundReport.id,
      claimant_id: userA,
      finder_id: userB,
      status: 'accepted',
      finder_confirmed_at: null,
      claimant_confirmed_at: null,
      cancelled_at: null,
      cancelled_by: null,
      completed_at: null,
    };

    const lostRep = { ...baseLostReport, status: 'claim_accepted' as ReportStatus };
    const foundRep = { ...baseFoundReport, status: 'claim_accepted' as ReportStatus };
    const conv: SimulatedConversation = { id: 'conv-1', claim_id: claim.id, status: 'open' };

    // Step 1: Only Finder confirms
    const step1 = ClaimsLifecycleEngine.confirmHandover({
      userId: userB,
      claim,
      lostReport: lostRep,
      foundReport: foundRep,
      conversation: conv,
    });

    expect(step1.success).toBe(true);
    expect(step1.bothConfirmed).toBe(false);
    expect(claim.status).toBe('accepted'); // Still accepted, not completed
    expect(lostRep.status).toBe('claim_accepted');
    expect(claim.finder_confirmed_at).not.toBeNull();
    expect(claim.claimant_confirmed_at).toBeNull();

    // Step 2: Claimant confirms -> transitions to completed
    const step2 = ClaimsLifecycleEngine.confirmHandover({
      userId: userA,
      claim,
      lostReport: lostRep,
      foundReport: foundRep,
      conversation: conv,
    });

    expect(step2.success).toBe(true);
    expect(step2.bothConfirmed).toBe(true);
    expect(claim.status).toBe('completed');
    expect(claim.completed_at).not.toBeNull();
    expect(lostRep.status).toBe('resolved');
    expect(foundRep.status).toBe('resolved');
    expect(conv.status).toBe('read_only');
  });

  // CLM-UNIT-07: Cancel clears both confirmation timestamps
  it('CLM-UNIT-07: clears live confirmation timestamps upon handover cancellation', () => {
    const claim: SimulatedClaim = {
      id: 'claim-cancel-ts-test',
      lost_report_id: baseLostReport.id,
      found_report_id: baseFoundReport.id,
      claimant_id: userA,
      finder_id: userB,
      status: 'accepted',
      finder_confirmed_at: '2026-11-01T12:00:00Z', // Finder had confirmed
      claimant_confirmed_at: null,
      cancelled_at: null,
      cancelled_by: null,
      completed_at: null,
    };

    const lostRep = { ...baseLostReport, status: 'claim_accepted' as ReportStatus };
    const foundRep = { ...baseFoundReport, status: 'claim_accepted' as ReportStatus };
    const conv: SimulatedConversation = { id: 'conv-2', claim_id: claim.id, status: 'open' };

    const res = ClaimsLifecycleEngine.cancelHandover({
      userId: userA,
      claim,
      lostReport: lostRep,
      foundReport: foundRep,
      conversation: conv,
    });

    expect(res.success).toBe(true);
    expect(claim.status).toBe('cancelled');
    expect(claim.cancelled_by).toBe(userA);
    expect(claim.finder_confirmed_at).toBeNull();
    expect(claim.claimant_confirmed_at).toBeNull();
  });

  // CLM-UNIT-08: Cancel reopens both reports to Active and makes chat read-only
  it('CLM-UNIT-08: reopens both reports to active and marks conversation read-only on cancellation', () => {
    const claim: SimulatedClaim = {
      id: 'claim-reopen-test',
      lost_report_id: baseLostReport.id,
      found_report_id: baseFoundReport.id,
      claimant_id: userA,
      finder_id: userB,
      status: 'accepted',
      finder_confirmed_at: null,
      claimant_confirmed_at: null,
      cancelled_at: null,
      cancelled_by: null,
      completed_at: null,
    };

    const lostRep = { ...baseLostReport, status: 'claim_accepted' as ReportStatus };
    const foundRep = { ...baseFoundReport, status: 'claim_accepted' as ReportStatus };
    const conv: SimulatedConversation = { id: 'conv-3', claim_id: claim.id, status: 'open' };

    const res = ClaimsLifecycleEngine.cancelHandover({
      userId: userB,
      claim,
      lostReport: lostRep,
      foundReport: foundRep,
      conversation: conv,
    });

    expect(res.success).toBe(true);
    expect(lostRep.status).toBe('active');
    expect(foundRep.status).toBe('active');
    expect(conv.status).toBe('read_only');
  });
});
