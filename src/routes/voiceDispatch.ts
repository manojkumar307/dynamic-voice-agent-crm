import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { IDbStore } from '../db/dbStore.js';
import { ConsentService } from '../services/consentService.js';
import { ContextService } from '../services/contextService.js';
import { OmnidimClient } from '../services/omnidimClient.js';
import { env } from '../config/env.js';

export function createVoiceDispatchRouter(
  db: IDbStore,
  consentService: ConsentService,
  contextService: ContextService,
  omnidimClient: OmnidimClient
): Router {
  const router = Router();

  const dispatchSchema = z.object({
    contact_id: z.number().int().positive(),
    purpose: z.string().default('program_enquiry'),
    reason_for_call: z.string().default('Requested program details'),
    agent_id: z.number().optional(),
    from_number_id: z.number().optional().nullable(),
  });

  router.post('/', async (req: Request, res: Response) => {
    const parseResult = dispatchSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ ok: false, error: 'invalid_dispatch_parameters', details: parseResult.error.format() });
    }

    const { contact_id, purpose, reason_for_call, agent_id, from_number_id } = parseResult.data;

    // 1. Consent & Suppression Verification Gate
    const eligibility = await consentService.checkEligibility(contact_id, purpose);
    if (!eligibility.allowed || !eligibility.contact) {
      return res.status(403).json({
        ok: false,
        error: 'dispatch_rejected_consent',
        reason: eligibility.reason || 'Contact is suppressed or consent is missing.',
      });
    }

    const contact = eligibility.contact;

    // 2. Generate short-lived opaque context token
    const contextRef = await contextService.createDispatchContext(contact.id, purpose, {
      first_name: contact.first_name,
      segment: contact.segment,
    });

    // 3. Create initial pending attempt in CRM
    const attempt = await db.createCallAttempt({
      contact_id: contact.id,
      status: 'pending',
      request_id: null,
      call_log_id: null,
      provider_call_id: null,
      error_message: null,
    });

    // 4. Construct payload adhering strictly to Blueprint Page 11
    const fromNumberId = from_number_id ?? env.OMNIDIM_FROM_NUMBER_ID;
    const payload: any = {
      agent_id: agent_id || env.OMNIDIM_AGENT_ID,
      to_number: contact.phone_e164,
      call_context: {
        first_name: contact.first_name,
        reason_for_call: reason_for_call,
        context_ref: contextRef,
        preferred_language: contact.language,
      },
      metadata: {
        crm_contact_id: String(contact.id),
        call_attempt_id: String(attempt.id),
      },
    };
    if (fromNumberId) {
      payload.from_number_id = fromNumberId;
    }

    try {
      const response = await omnidimClient.dispatch(payload);

      // 5. Correlate provider request ID
      await db.updateCallAttempt(attempt.id, {
        request_id: response.requestId,
        status: 'dispatched',
      });

      await db.recordAuditEvent({
        actor_id: 'voice_dispatcher',
        action: 'call_dispatched',
        object_type: 'call_attempt',
        object_id: String(attempt.id),
        details_json: { request_id: response.requestId, contact_id: contact.id },
      });

      return res.status(200).json({
        ok: true,
        attempt_id: attempt.id,
        request_id: response.requestId,
        status: 'dispatched',
        context_ref: contextRef,
      });
    } catch (err: any) {
      await db.updateCallAttempt(attempt.id, {
        status: 'failed',
        error_message: err.message,
      });

      return res.status(502).json({
        ok: false,
        error: 'provider_dispatch_failed',
        attempt_id: attempt.id,
        message: err.message,
      });
    }
  });

  return router;
}
