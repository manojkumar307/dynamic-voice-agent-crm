import crypto from 'crypto';
import { IDbStore } from '../db/dbStore.js';
import { CallOutcome, InterestLevel } from '../db/types.js';

export interface PostCallWebhookPayload {
  call_id: string;
  call_log_id?: string;
  call_status: 'completed' | 'failed' | 'no_answer' | 'busy' | 'canceled';
  metadata?: {
    crm_contact_id?: string;
    call_attempt_id?: string;
    [key: string]: any;
  };
  call_report?: {
    summary?: string;
    transcript?: string;
    extracted_variables?: {
      interest_level?: InterestLevel;
      interested_program?: string;
      callback_requested?: boolean | string;
      callback_datetime?: string;
      do_not_call?: boolean | string;
      handoff_needed?: boolean | string;
      [key: string]: any;
    };
  };
  duration_seconds?: number;
}

export class WebhookProcessor {
  constructor(private db: IDbStore) {}

  async process(payload: PostCallWebhookPayload): Promise<{
    success: boolean;
    isDuplicate: boolean;
    outcome?: CallOutcome;
    suppressed?: boolean;
  }> {
    const callLogId = payload.call_log_id || payload.call_id;
    if (!callLogId) {
      throw new Error('Missing call identifier in webhook payload');
    }

    // Compute deterministic payload hash for idempotency checking
    const payloadString = JSON.stringify(payload);
    const payloadHash = crypto.createHash('sha256').update(payloadString).digest('hex');

    // Resolve call attempt
    const attemptIdStr = payload.metadata?.call_attempt_id;
    const attemptId = attemptIdStr ? parseInt(attemptIdStr, 10) : undefined;
    const attempt = attemptId ? await this.db.findCallAttemptById(attemptId) : null;

    // Parse extracted variables
    const vars = payload.call_report?.extracted_variables || {};
    const doNotCall = vars.do_not_call === true || vars.do_not_call === 'true';
    const callbackRequested = vars.callback_requested === true || vars.callback_requested === 'true';
    const handoffNeeded = vars.handoff_needed === true || vars.handoff_needed === 'true';
    const interestLevel: InterestLevel = ['high', 'medium', 'low', 'unknown'].includes(
      vars.interest_level as any
    )
      ? (vars.interest_level as InterestLevel)
      : 'unknown';

    const outcomeData = {
      call_log_id: callLogId,
      call_attempt_id: attempt ? attempt.id : null,
      summary: payload.call_report?.summary || null,
      interest_level: interestLevel,
      interested_program: vars.interested_program || null,
      callback_requested: callbackRequested,
      callback_datetime: vars.callback_datetime || null,
      do_not_call: doNotCall,
      handoff_needed: handoffNeeded,
      payload_hash: payloadHash,
      raw_report_json: payload as any,
    };

    const { outcome, isDuplicate } = await this.db.saveCallOutcome(outcomeData);

    // If duplicate delivery, return immediately without re-executing side effects
    if (isDuplicate) {
      return { success: true, isDuplicate: true, outcome };
    }

    // Update call attempt status
    if (attempt) {
      await this.db.updateCallAttempt(attempt.id, {
        call_log_id: callLogId,
        provider_call_id: payload.call_id,
        status: payload.call_status === 'completed' ? 'completed' : 'failed',
      });
    }

    // Log audit event
    await this.db.recordAuditEvent({
      actor_id: 'webhook_processor',
      action: 'outcome_ingested',
      object_type: 'call_outcome',
      object_id: callLogId,
      details_json: {
        interest_level: interestLevel,
        do_not_call: doNotCall,
        callback_requested: callbackRequested,
        attempt_id: attempt?.id,
      },
    });

    return {
      success: true,
      isDuplicate: false,
      outcome,
      suppressed: doNotCall,
    };
  }
}
