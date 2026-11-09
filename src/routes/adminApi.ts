import { Router, Request, Response } from 'express';
import { IDbStore } from '../db/dbStore.js';
import { ReconciliationService } from '../services/reconciliationService.js';
import { buildAgentContextBreakdown, defaultPromptConfig } from '../prompts/agentPrompts.js';
import { env } from '../config/env.js';

export function createAdminRouter(db: IDbStore, reconciliationService: ReconciliationService): Router {
  const router = Router();

  // Overview Stats
  router.get('/overview', async (_req: Request, res: Response) => {
    const contacts = await db.listContacts();
    const attempts = await db.listCallAttempts();
    const outcomes = await db.listCallOutcomes();

    const totalContacts = contacts.length;
    const suppressedContacts = contacts.filter((c) => c.is_suppressed).length;
    const permittedContacts = totalContacts - suppressedContacts;
    const completedCalls = attempts.filter((a) => a.status === 'completed').length;
    const highInterest = outcomes.filter((o) => o.interest_level === 'high').length;
    const callbacksPending = outcomes.filter((o) => o.callback_requested).length;
    const optOutCount = outcomes.filter((o) => o.do_not_call).length;

    res.json({
      ok: true,
      stats: {
        totalContacts,
        permittedContacts,
        suppressedContacts,
        totalCalls: attempts.length,
        completedCalls,
        highInterest,
        callbacksPending,
        optOutCount,
      },
      agentInfo: {
        agentId: env.OMNIDIM_AGENT_ID,
        fromNumberId: env.OMNIDIM_FROM_NUMBER_ID,
        baseUrl: env.OMNIDIM_BASE_URL,
        realCallingEnabled: env.ENABLE_REAL_CALLING,
      },
    });
  });

  // Contacts
  router.get('/contacts', async (_req: Request, res: Response) => {
    const contacts = await db.listContacts();
    res.json({ ok: true, contacts });
  });

  router.post('/contacts', async (req: Request, res: Response) => {
    const { first_name, phone_e164, email, segment, language } = req.body;
    if (!first_name || !phone_e164) {
      return res.status(400).json({ ok: false, error: 'first_name and phone_e164 are required' });
    }

    const contact = await db.createContact({
      first_name,
      phone_e164,
      email: email || null,
      segment: segment || 'working_professional',
      language: language || 'English',
      is_suppressed: false,
    });

    // Grant default consent
    await db.recordConsent({
      contact_id: contact.id,
      purpose: 'program_enquiry',
      channel: 'voice_ai',
      state: 'granted',
      source: 'admin_dashboard',
    });

    await db.recordAuditEvent({
      actor_id: 'admin_user',
      action: 'create_contact',
      object_type: 'contact',
      object_id: String(contact.id),
      details_json: { first_name, phone_e164 },
    });

    res.status(201).json({ ok: true, contact });
  });

  // Toggle Contact Opt-Out
  router.post('/contacts/:id/toggle-suppression', async (req: Request, res: Response) => {
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const contactId = parseInt(rawId || '0', 10);
    const contact = await db.getContact(contactId);
    if (!contact) return res.status(404).json({ ok: false, error: 'Contact not found' });

    const newSuppressedState = !contact.is_suppressed;
    await db.updateContactSuppression(contactId, newSuppressedState);

    if (newSuppressedState) {
      await db.withdrawConsent(contactId);
    } else {
      await db.recordConsent({
        contact_id: contactId,
        purpose: 'program_enquiry',
        channel: 'voice_ai',
        state: 'granted',
        source: 'admin_unsuppress',
      });
    }

    await db.recordAuditEvent({
      actor_id: 'admin_user',
      action: newSuppressedState ? 'suppress_contact' : 'unsuppress_contact',
      object_type: 'contact',
      object_id: String(contactId),
      details_json: { new_state: newSuppressedState },
    });

    res.json({ ok: true, is_suppressed: newSuppressedState });
  });

  // Programs Live Inventory
  router.get('/programs', async (_req: Request, res: Response) => {
    const programs = await db.listPrograms();
    res.json({ ok: true, programs });
  });

  router.post('/programs', async (req: Request, res: Response) => {
    const { slug, title, status, description, public_fee_inr, is_public, next_session_date } = req.body;
    if (!slug || !title) {
      return res.status(400).json({ ok: false, error: 'slug and title are required' });
    }

    const program = await db.saveProgram({
      slug,
      title,
      status: status || 'contact_team',
      description: description || null,
      public_fee_inr: public_fee_inr !== undefined && public_fee_inr !== '' ? parseInt(public_fee_inr, 10) : null,
      is_public: is_public !== undefined ? Boolean(is_public) : true,
      next_session_date: next_session_date || null,
    });

    await db.recordAuditEvent({
      actor_id: 'admin_user',
      action: 'update_program',
      object_type: 'program',
      object_id: slug,
      details_json: { status, public_fee_inr },
    });

    res.json({ ok: true, program });
  });

  // Call Attempts & Outcomes
  router.get('/call-attempts', async (_req: Request, res: Response) => {
    const attempts = await db.listCallAttempts();
    res.json({ ok: true, attempts });
  });

  router.get('/outcomes', async (_req: Request, res: Response) => {
    const outcomes = await db.listCallOutcomes();
    res.json({ ok: true, outcomes });
  });

  // Audit Logs
  router.get('/audit-logs', async (_req: Request, res: Response) => {
    const events = await db.listAuditEvents(50);
    res.json({ ok: true, events });
  });

  // Reconcile in-flight calls
  router.post('/reconcile', async (_req: Request, res: Response) => {
    const report = await reconciliationService.reconcileInFlightCalls(0);
    res.json({ ok: true, report });
  });

  // Prompt configuration & Context Breakdown
  router.get('/prompt-config', (_req: Request, res: Response) => {
    res.json({
      ok: true,
      config: defaultPromptConfig,
      breakdown: buildAgentContextBreakdown(defaultPromptConfig),
    });
  });

  return router;
}
