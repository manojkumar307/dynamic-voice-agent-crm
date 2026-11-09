import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryDbStore } from '../src/db/dbStore.js';
import { ConsentService } from '../src/services/consentService.js';
import { ContextService } from '../src/services/contextService.js';
import { OmnidimClient } from '../src/services/omnidimClient.js';
import { WebhookProcessor } from '../src/services/webhookProcessor.js';
import { ReconciliationService } from '../src/services/reconciliationService.js';
import { createVoiceToolsRouter } from '../src/routes/voiceTools.js';
import { createVoiceDispatchRouter } from '../src/routes/voiceDispatch.js';
import { createVoiceWebhookRouter } from '../src/routes/voiceWebhook.js';
import { createQaLabRouter } from '../src/routes/qaLabApi.js';
import { createMockContext } from './testHelper.js';
import { env } from '../src/config/env.js';

describe('Voice Agent & CRM Clean-Room Integration Suite', () => {
  let db: InMemoryDbStore;
  let consentService: ConsentService;
  let contextService: ContextService;
  let omnidimClient: OmnidimClient;
  let webhookProcessor: WebhookProcessor;
  let reconciliationService: ReconciliationService;

  beforeEach(async () => {
    db = new InMemoryDbStore();
    await db.init();
    consentService = new ConsentService(db);
    contextService = new ContextService(db);
    omnidimClient = new OmnidimClient({ enableRealCalling: false });
    webhookProcessor = new WebhookProcessor(db);
    reconciliationService = new ReconciliationService(db, omnidimClient, webhookProcessor);
  });

  describe('1. Consent & Suppression Verification', () => {
    it('allows permitted contacts with active consent', async () => {
      const contacts = await db.listContacts();
      const aarav = contacts.find((c) => c.first_name === 'Aarav')!;
      const check = await consentService.checkEligibility(aarav.id, 'program_enquiry');

      expect(check.allowed).toBe(true);
      expect(check.contact?.first_name).toBe('Aarav');
    });

    it('immediately blocks suppressed contacts from outbound calls', async () => {
      const contacts = await db.listContacts();
      const suppressed = contacts.find((c) => c.is_suppressed)!;
      const check = await consentService.checkEligibility(suppressed.id, 'program_enquiry');

      expect(check.allowed).toBe(false);
      expect(check.reason).toBe('contact_suppressed_dnc');
    });

    it('withdraws consent and marks contact suppressed when opt-out is recorded', async () => {
      const contacts = await db.listContacts();
      const aarav = contacts.find((c) => c.first_name === 'Aarav')!;

      await consentService.processOptOut(aarav.id, 'voice_test_opt_out');

      const updated = await db.getContact(aarav.id);
      expect(updated?.is_suppressed).toBe(true);

      const check = await consentService.checkEligibility(aarav.id);
      expect(check.allowed).toBe(false);

      const auditEvents = await db.listAuditEvents();
      expect(auditEvents.some((e) => e.action === 'opt_out_enforced')).toBe(true);
    });
  });

  describe('2. L1/L2 Context Lifecycle & Opaque Handles', () => {
    it('generates an opaque short-lived context handle without exposing PII', async () => {
      const handle = await contextService.createDispatchContext(1, 'program_enquiry', {
        first_name: 'Aarav',
      });

      expect(handle).toMatch(/^ctx_[a-f0-9]{12}$/);
      expect(handle).not.toContain('Aarav');
      expect(handle).not.toContain('phone');
    });

    it('resolves live context with strict field allowlist during in-call requests', async () => {
      const contacts = await db.listContacts();
      const aarav = contacts.find((c) => c.first_name === 'Aarav')!;

      const handle = await contextService.createDispatchContext(aarav.id, 'program_enquiry');
      const resolved = await contextService.resolveContext(handle);

      expect(resolved.ok).toBe(true);
      if (resolved.ok) {
        expect(resolved.contact?.first_name).toBe('Aarav');
        expect(resolved.membership?.status).toBe('active');
        expect(resolved.allowed_topics).toEqual(['programs', 'community_resources']);
        expect(resolved.as_of).toBeDefined();
      }
    });

    it('rejects unknown or invalid context handles', async () => {
      const resolved = await contextService.resolveContext('ctx_invalid_fake_handle');
      expect(resolved.ok).toBe(false);
      expect(resolved.error).toBe('invalid_context_ref');
    });
  });

  describe('3. Live Custom API Tool Seam (Program Status & Context)', () => {
    it('rejects tool request when X-Voice-Tool-Token is missing or invalid', async () => {
      const router = createVoiceToolsRouter(db, contextService);

      // Missing header
      const { req: req1, res: res1, getResult: getRes1 } = createMockContext({
        method: 'POST',
        url: '/program-status',
        body: { program_slug: 'founder-labs-premium' },
      });
      router(req1, res1, () => {});
      expect(getRes1().status).toBe(401);

      // Bad header
      const { req: req2, res: res2, getResult: getRes2 } = createMockContext({
        method: 'POST',
        url: '/program-status',
        headers: { 'x-voice-tool-token': 'wrong_token' },
        body: { program_slug: 'founder-labs-premium' },
      });
      router(req2, res2, () => {});
      expect(getRes2().status).toBe(401);
    });

    it('returns verified program facts for known public programs', async () => {
      const router = createVoiceToolsRouter(db, contextService);

      const { req, res, waitDone } = createMockContext({
        method: 'POST',
        url: '/program-status',
        headers: { 'x-voice-tool-token': env.VOICE_TOOL_TOKEN },
        body: { program_slug: 'founder-labs-premium' },
      });

      router(req, res, () => {});
      const result = await waitDone();

      expect(result.status).toBe(200);
      expect(result.body.ok).toBe(true);
      expect(result.body.program).toBe('Founder Labs Premium');
      expect(result.body.registration_status).toBe('contact_team');
    });

    it('returns 404 for unknown program slug without hallucinating', async () => {
      const router = createVoiceToolsRouter(db, contextService);

      const { req, res, waitDone } = createMockContext({
        method: 'POST',
        url: '/program-status',
        headers: { 'x-voice-tool-token': env.VOICE_TOOL_TOKEN },
        body: { program_slug: 'non_existent_accelerator' },
      });

      router(req, res, () => {});
      const result = await waitDone();

      expect(result.status).toBe(404);
      expect(result.body.ok).toBe(false);
      expect(result.body.error).toBe('unknown_program');
    });
  });

  describe('4. Outbound Dispatch Seam', () => {
    it('blocks dispatch to unconsented/suppressed contacts', async () => {
      const router = createVoiceDispatchRouter(db, consentService, contextService, omnidimClient);
      const contacts = await db.listContacts();
      const suppressed = contacts.find((c) => c.is_suppressed)!;

      const { req, res, getResult } = createMockContext({
        method: 'POST',
        url: '/',
        body: { contact_id: suppressed.id },
      });

      await new Promise<void>((resolve) => {
        router(req, res, () => resolve());
        setTimeout(resolve, 50);
      });

      const result = getResult();
      expect(result.status).toBe(403);
      expect(result.body.error).toBe('dispatch_rejected_consent');
    });

    it('successfully dispatches consented contact and correlates requestId', async () => {
      const router = createVoiceDispatchRouter(db, consentService, contextService, omnidimClient);
      const contacts = await db.listContacts();
      const permitted = contacts.find((c) => !c.is_suppressed)!;

      const { req, res, getResult } = createMockContext({
        method: 'POST',
        url: '/',
        body: { contact_id: permitted.id, reason_for_call: 'Program enquiry follow up' },
      });

      await new Promise<void>((resolve) => {
        router(req, res, () => resolve());
        setTimeout(resolve, 50);
      });

      const result = getResult();
      expect(result.status).toBe(200);
      expect(result.body.ok).toBe(true);
      expect(result.body.status).toBe('dispatched');
      expect(result.body.request_id).toMatch(/^sim_req_/);
      expect(result.body.context_ref).toMatch(/^ctx_/);

      const attempt = await db.findCallAttemptById(result.body.attempt_id);
      expect(attempt?.status).toBe('dispatched');
      expect(attempt?.request_id).toBe(result.body.request_id);
    });
  });

  describe('5. Post-Call Webhook Seam & Idempotency', () => {
    it('rejects unauthorized webhook route tokens', async () => {
      const router = createVoiceWebhookRouter(webhookProcessor);

      const { req, res, getResult } = createMockContext({
        method: 'POST',
        url: '/wrong_secret_token_here',
        params: { token: 'wrong_secret_token_here' },
        body: { call_id: 'call_123', call_status: 'completed' },
      });

      router(req, res, () => {});
      const result = getResult();

      expect(result.status).toBe(401);
      expect(result.body.ok).toBe(false);
    });

    it('processes webhook payload and handles duplicates idempotently', async () => {
      const testCallId = `call_test_idemp_${Date.now()}`;
      const payload: any = {
        call_id: testCallId,
        call_status: 'completed',
        call_report: {
          summary: 'Interested in AI builders cohort.',
          extracted_variables: {
            interest_level: 'high',
            interested_program: 'AI Builders Cohort',
            callback_requested: true,
          },
        },
      };

      // 1. Initial delivery
      const res1 = await webhookProcessor.process(payload);
      expect(res1.success).toBe(true);
      expect(res1.isDuplicate).toBe(false);

      // 2. Duplicate delivery
      const res2 = await webhookProcessor.process(payload);
      expect(res2.success).toBe(true);
      expect(res2.isDuplicate).toBe(true);

      const outcomes = await db.listCallOutcomes();
      const matches = outcomes.filter((o) => o.call_log_id === testCallId);
      expect(matches.length).toBe(1);
    });

    it('automatically suppresses contact when caller explicitly requests do_not_call', async () => {
      const contacts = await db.listContacts();
      const aarav = contacts.find((c) => c.first_name === 'Aarav')!;

      const attempt = await db.createCallAttempt({
        contact_id: aarav.id,
        status: 'dispatched',
      });

      const optOutCallId = `call_optout_${Date.now()}`;
      const res = await webhookProcessor.process({
        call_id: optOutCallId,
        call_status: 'completed',
        metadata: { call_attempt_id: String(attempt.id) },
        call_report: {
          extracted_variables: {
            do_not_call: true,
          },
        },
      });

      expect(res.suppressed).toBe(true);

      const updated = await db.getContact(aarav.id);
      expect(updated?.is_suppressed).toBe(true);

      const eligibility = await consentService.checkEligibility(aarav.id);
      expect(eligibility.allowed).toBe(false);
    });
  });

  describe('6. Background Call Reconciliation', () => {
    it('identifies in-flight pending attempts and reconciles them from provider logs', async () => {
      const contacts = await db.listContacts();
      const aarav = contacts.find((c) => c.first_name === 'Aarav')!;

      const attempt = await db.createCallAttempt({
        contact_id: aarav.id,
        status: 'pending',
      });

      // Advance attempt time artificially
      attempt.created_at = new Date(Date.now() - 10 * 60 * 1000);

      const report = await reconciliationService.reconcileInFlightCalls(5);
      expect(report.checkedCount).toBe(1);
    });
  });

  describe('7. QA Lab 15-Scenario Functional Verification Matrix', () => {
    it('passes 100% of the Blueprint functional verification matrix', async () => {
      const router = createQaLabRouter(db, consentService, contextService, webhookProcessor, omnidimClient);

      const { req, res, getResult } = createMockContext({
        method: 'POST',
        url: '/run-all',
      });

      await new Promise<void>((resolve) => {
        router(req, res, () => resolve());
        setTimeout(resolve, 300);
      });

      const result = getResult();
      expect(result.status).toBe(200);
      expect(result.body.ok).toBe(true);
      expect(result.body.totalCount).toBe(15);
      expect(result.body.passedCount).toBe(15);
      expect(result.body.score).toBe(100);
    });
  });
});
