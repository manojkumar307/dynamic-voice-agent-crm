import mysql from 'mysql2/promise';
import {
  Contact,
  ConsentRecord,
  Program,
  Enrollment,
  VoiceContext,
  CallAttempt,
  CallOutcome,
  AuditEvent,
} from './types.js';
import { env } from '../config/env.js';

export interface IDbStore {
  // Contacts
  getContact(id: number): Promise<Contact | null>;
  getContactByPhone(phone: string): Promise<Contact | null>;
  createContact(data: Omit<Contact, 'id' | 'created_at' | 'updated_at'>): Promise<Contact>;
  updateContactSuppression(id: number, suppressed: boolean): Promise<void>;
  listContacts(): Promise<Contact[]>;

  // Consent
  getConsent(contactId: number, purpose: string): Promise<ConsentRecord | null>;
  recordConsent(data: Omit<ConsentRecord, 'id' | 'occurred_at'>): Promise<ConsentRecord>;
  withdrawConsent(contactId: number, purpose?: string): Promise<void>;

  // Programs
  getProgramBySlug(slug: string): Promise<Program | null>;
  listPrograms(): Promise<Program[]>;
  saveProgram(program: Omit<Program, 'id' | 'last_verified_at'> & { id?: number }): Promise<Program>;

  // Voice Contexts
  createVoiceContext(ctx: VoiceContext): Promise<VoiceContext>;
  getVoiceContext(refHash: string): Promise<VoiceContext | null>;
  markVoiceContextUsed(refHash: string): Promise<void>;

  // Call Attempts
  createCallAttempt(attempt: Omit<CallAttempt, 'id' | 'created_at' | 'updated_at'>): Promise<CallAttempt>;
  updateCallAttempt(id: number, update: Partial<CallAttempt>): Promise<CallAttempt>;
  findCallAttemptById(id: number): Promise<CallAttempt | null>;
  findCallAttemptByRequestId(requestId: string): Promise<CallAttempt | null>;
  findCallAttemptByProviderCallId(providerCallId: string): Promise<CallAttempt | null>;
  listPendingCallAttempts(): Promise<CallAttempt[]>;
  listCallAttempts(): Promise<(CallAttempt & { contact_name?: string; phone?: string })[]>;

  // Call Outcomes
  saveCallOutcome(
    outcome: Omit<CallOutcome, 'id' | 'created_at'>
  ): Promise<{ outcome: CallOutcome; isDuplicate: boolean }>;
  listCallOutcomes(): Promise<CallOutcome[]>;

  // Audit Events
  recordAuditEvent(event: Omit<AuditEvent, 'id' | 'occurred_at'>): Promise<AuditEvent>;
  listAuditEvents(limit?: number): Promise<AuditEvent[]>;

  // Lifecycle
  init(): Promise<void>;
  close(): Promise<void>;
  resetTestData?(): Promise<void>;
}

export class InMemoryDbStore implements IDbStore {
  contacts: Map<number, Contact> = new Map();
  consentRecords: ConsentRecord[] = [];
  programs: Map<string, Program> = new Map();
  voiceContexts: Map<string, VoiceContext> = new Map();
  callAttempts: Map<number, CallAttempt> = new Map();
  callOutcomes: Map<string, CallOutcome> = new Map(); // keyed by call_log_id
  payloadHashes: Set<string> = new Set();
  auditEvents: AuditEvent[] = [];

  private nextContactId = 1;
  private nextConsentId = 1;
  private nextProgramId = 1;
  private nextAttemptId = 1;
  private nextOutcomeId = 1;
  private nextAuditId = 1;

  async init(): Promise<void> {
    await this.resetTestData();
  }

  async resetTestData(): Promise<void> {
    this.contacts.clear();
    this.consentRecords = [];
    this.programs.clear();
    this.voiceContexts.clear();
    this.callAttempts.clear();
    this.callOutcomes.clear();
    this.payloadHashes.clear();
    this.auditEvents = [];

    // Seed default programs matching blueprint
    this.saveProgram({
      slug: 'founder-labs-premium',
      title: 'Founder Labs Premium',
      status: 'contact_team',
      description: 'Selective intensive accelerator and mentorship program for high-growth tech founders.',
      public_fee_inr: null,
      is_public: true,
      next_session_date: null,
    });

    this.saveProgram({
      slug: 'ai-builders-cohort',
      title: 'AI Builders Cohort',
      status: 'open',
      description: 'Hands-on practical engineering cohort building modern AI agents and LLM production systems.',
      public_fee_inr: 24999,
      is_public: true,
      next_session_date: '2026-11-20',
    });

    // Seed default test contacts
    const aarav = await this.createContact({
      first_name: 'Aarav',
      phone_e164: '+919876543210',
      email: 'aarav@example.com',
      segment: 'working_professional',
      language: 'English',
      is_suppressed: false,
    });

    await this.recordConsent({
      contact_id: aarav.id,
      purpose: 'program_enquiry',
      channel: 'voice_ai',
      state: 'granted',
      source: 'web_form_inquiry',
    });

    const suppressedUser = await this.createContact({
      first_name: 'Dev',
      phone_e164: '+919999999999',
      email: 'dev@example.com',
      segment: 'founder',
      language: 'English',
      is_suppressed: true,
    });

    await this.recordConsent({
      contact_id: suppressedUser.id,
      purpose: 'program_enquiry',
      channel: 'voice_ai',
      state: 'withdrawn',
      source: 'opt_out_request',
    });
  }

  async close(): Promise<void> {}

  async getContact(id: number): Promise<Contact | null> {
    return this.contacts.get(id) || null;
  }

  async getContactByPhone(phone: string): Promise<Contact | null> {
    for (const c of this.contacts.values()) {
      if (c.phone_e164 === phone) return c;
    }
    return null;
  }

  async createContact(data: Omit<Contact, 'id' | 'created_at' | 'updated_at'>): Promise<Contact> {
    const id = this.nextContactId++;
    const now = new Date();
    const contact: Contact = { ...data, id, created_at: now, updated_at: now };
    this.contacts.set(id, contact);
    return contact;
  }

  async updateContactSuppression(id: number, suppressed: boolean): Promise<void> {
    const c = this.contacts.get(id);
    if (c) {
      c.is_suppressed = suppressed;
      c.updated_at = new Date();
    }
  }

  async listContacts(): Promise<Contact[]> {
    return Array.from(this.contacts.values());
  }

  async getConsent(contactId: number, purpose: string): Promise<ConsentRecord | null> {
    const records = this.consentRecords
      .filter((r) => r.contact_id === contactId && r.purpose === purpose)
      .sort((a, b) => b.occurred_at.getTime() - a.occurred_at.getTime());
    return records[0] || null;
  }

  async recordConsent(data: Omit<ConsentRecord, 'id' | 'occurred_at'>): Promise<ConsentRecord> {
    const id = this.nextConsentId++;
    const record: ConsentRecord = { ...data, id, occurred_at: new Date() };
    this.consentRecords.push(record);
    return record;
  }

  async withdrawConsent(contactId: number, purpose?: string): Promise<void> {
    for (const r of this.consentRecords) {
      if (r.contact_id === contactId && (!purpose || r.purpose === purpose)) {
        r.state = 'withdrawn';
      }
    }
    await this.updateContactSuppression(contactId, true);
  }

  async getProgramBySlug(slug: string): Promise<Program | null> {
    return this.programs.get(slug) || null;
  }

  async listPrograms(): Promise<Program[]> {
    return Array.from(this.programs.values());
  }

  async saveProgram(program: Omit<Program, 'id' | 'last_verified_at'> & { id?: number }): Promise<Program> {
    const id = program.id || this.nextProgramId++;
    const p: Program = {
      ...program,
      id,
      last_verified_at: new Date(),
    };
    this.programs.set(p.slug, p);
    return p;
  }

  async createVoiceContext(ctx: VoiceContext): Promise<VoiceContext> {
    this.voiceContexts.set(ctx.ref_hash, ctx);
    return ctx;
  }

  async getVoiceContext(refHash: string): Promise<VoiceContext | null> {
    return this.voiceContexts.get(refHash) || null;
  }

  async markVoiceContextUsed(refHash: string): Promise<void> {
    const ctx = this.voiceContexts.get(refHash);
    if (ctx) {
      ctx.used_at = new Date();
    }
  }

  async createCallAttempt(attempt: Omit<CallAttempt, 'id' | 'created_at' | 'updated_at'>): Promise<CallAttempt> {
    const id = this.nextAttemptId++;
    const now = new Date();
    const fullAttempt: CallAttempt = { ...attempt, id, created_at: now, updated_at: now };
    this.callAttempts.set(id, fullAttempt);
    return fullAttempt;
  }

  async updateCallAttempt(id: number, update: Partial<CallAttempt>): Promise<CallAttempt> {
    const existing = this.callAttempts.get(id);
    if (!existing) throw new Error(`Call attempt ${id} not found`);
    const updated = { ...existing, ...update, updated_at: new Date() };
    this.callAttempts.set(id, updated);
    return updated;
  }

  async findCallAttemptById(id: number): Promise<CallAttempt | null> {
    return this.callAttempts.get(id) || null;
  }

  async findCallAttemptByRequestId(requestId: string): Promise<CallAttempt | null> {
    for (const a of this.callAttempts.values()) {
      if (a.request_id === requestId) return a;
    }
    return null;
  }

  async findCallAttemptByProviderCallId(providerCallId: string): Promise<CallAttempt | null> {
    for (const a of this.callAttempts.values()) {
      if (a.provider_call_id === providerCallId) return a;
    }
    return null;
  }

  async listPendingCallAttempts(): Promise<CallAttempt[]> {
    return Array.from(this.callAttempts.values()).filter(
      (a) => a.status === 'pending' || a.status === 'dispatched'
    );
  }

  async listCallAttempts(): Promise<(CallAttempt & { contact_name?: string; phone?: string })[]> {
    return Array.from(this.callAttempts.values()).map((a) => {
      const contact = this.contacts.get(a.contact_id);
      return {
        ...a,
        contact_name: contact ? contact.first_name : undefined,
        phone: contact ? contact.phone_e164 : undefined,
      };
    });
  }

  async saveCallOutcome(
    outcome: Omit<CallOutcome, 'id' | 'created_at'>
  ): Promise<{ outcome: CallOutcome; isDuplicate: boolean }> {
    // Check idempotency by call_log_id or payload_hash
    if (this.callOutcomes.has(outcome.call_log_id) || this.payloadHashes.has(outcome.payload_hash)) {
      const existing =
        this.callOutcomes.get(outcome.call_log_id) ||
        Array.from(this.callOutcomes.values()).find((o) => o.payload_hash === outcome.payload_hash);
      return { outcome: existing!, isDuplicate: true };
    }

    const id = this.nextOutcomeId++;
    const saved: CallOutcome = { ...outcome, id, created_at: new Date() };
    this.callOutcomes.set(outcome.call_log_id, saved);
    this.payloadHashes.add(outcome.payload_hash);

    // Auto-suppression if caller requested opt out
    if (outcome.do_not_call && outcome.call_attempt_id) {
      const attempt = this.callAttempts.get(outcome.call_attempt_id);
      if (attempt) {
        await this.withdrawConsent(attempt.contact_id);
        await this.recordAuditEvent({
          actor_id: 'voice_webhook',
          action: 'suppress_opt_out',
          object_type: 'contact',
          object_id: String(attempt.contact_id),
          details_json: { call_log_id: outcome.call_log_id, reason: 'caller_opt_out' },
        });
      }
    }

    return { outcome: saved, isDuplicate: false };
  }

  async listCallOutcomes(): Promise<CallOutcome[]> {
    return Array.from(this.callOutcomes.values());
  }

  async recordAuditEvent(event: Omit<AuditEvent, 'id' | 'occurred_at'>): Promise<AuditEvent> {
    const id = this.nextAuditId++;
    const item: AuditEvent = { ...event, id, occurred_at: new Date() };
    this.auditEvents.push(item);
    return item;
  }

  async listAuditEvents(limit = 100): Promise<AuditEvent[]> {
    return [...this.auditEvents].reverse().slice(0, limit);
  }
}

export class MySqlDbStore implements IDbStore {
  private pool!: mysql.Pool;

  constructor() {
    this.pool = mysql.createPool({
      host: env.DB_HOST,
      port: env.DB_PORT,
      user: env.DB_USER,
      password: env.DB_PASSWORD,
      database: env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
  }

  async init(): Promise<void> {
    // Test connectivity
    const conn = await this.pool.getConnection();
    conn.release();
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  async getContact(id: number): Promise<Contact | null> {
    const [rows] = await this.pool.query<mysql.RowDataPacket[]>('SELECT * FROM contacts WHERE id = ?', [id]);
    return (rows[0] as Contact) || null;
  }

  async getContactByPhone(phone: string): Promise<Contact | null> {
    const [rows] = await this.pool.query<mysql.RowDataPacket[]>(
      'SELECT * FROM contacts WHERE phone_e164 = ?',
      [phone]
    );
    return (rows[0] as Contact) || null;
  }

  async createContact(data: Omit<Contact, 'id' | 'created_at' | 'updated_at'>): Promise<Contact> {
    const [result] = await this.pool.query<mysql.ResultSetHeader>(
      'INSERT INTO contacts (first_name, phone_e164, email, segment, language, is_suppressed) VALUES (?, ?, ?, ?, ?, ?)',
      [data.first_name, data.phone_e164, data.email || null, data.segment, data.language, data.is_suppressed]
    );
    return (await this.getContact(result.insertId))!;
  }

  async updateContactSuppression(id: number, suppressed: boolean): Promise<void> {
    await this.pool.query('UPDATE contacts SET is_suppressed = ? WHERE id = ?', [suppressed, id]);
  }

  async listContacts(): Promise<Contact[]> {
    const [rows] = await this.pool.query<mysql.RowDataPacket[]>('SELECT * FROM contacts ORDER BY id DESC');
    return rows as Contact[];
  }

  async getConsent(contactId: number, purpose: string): Promise<ConsentRecord | null> {
    const [rows] = await this.pool.query<mysql.RowDataPacket[]>(
      'SELECT * FROM consent_records WHERE contact_id = ? AND purpose = ? ORDER BY occurred_at DESC LIMIT 1',
      [contactId, purpose]
    );
    return (rows[0] as ConsentRecord) || null;
  }

  async recordConsent(data: Omit<ConsentRecord, 'id' | 'occurred_at'>): Promise<ConsentRecord> {
    const [result] = await this.pool.query<mysql.ResultSetHeader>(
      'INSERT INTO consent_records (contact_id, purpose, channel, state, source) VALUES (?, ?, ?, ?, ?)',
      [data.contact_id, data.purpose, data.channel, data.state, data.source]
    );
    const [rows] = await this.pool.query<mysql.RowDataPacket[]>('SELECT * FROM consent_records WHERE id = ?', [
      result.insertId,
    ]);
    return rows[0] as ConsentRecord;
  }

  async withdrawConsent(contactId: number, purpose?: string): Promise<void> {
    if (purpose) {
      await this.pool.query(
        "UPDATE consent_records SET state = 'withdrawn' WHERE contact_id = ? AND purpose = ?",
        [contactId, purpose]
      );
    } else {
      await this.pool.query("UPDATE consent_records SET state = 'withdrawn' WHERE contact_id = ?", [
        contactId,
      ]);
    }
    await this.updateContactSuppression(contactId, true);
  }

  async getProgramBySlug(slug: string): Promise<Program | null> {
    const [rows] = await this.pool.query<mysql.RowDataPacket[]>('SELECT * FROM programs WHERE slug = ?', [slug]);
    return (rows[0] as Program) || null;
  }

  async listPrograms(): Promise<Program[]> {
    const [rows] = await this.pool.query<mysql.RowDataPacket[]>('SELECT * FROM programs ORDER BY id ASC');
    return rows as Program[];
  }

  async saveProgram(program: Omit<Program, 'id' | 'last_verified_at'> & { id?: number }): Promise<Program> {
    await this.pool.query(
      `INSERT INTO programs (slug, title, status, description, public_fee_inr, is_public, next_session_date)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
       title = VALUES(title),
       status = VALUES(status),
       description = VALUES(description),
       public_fee_inr = VALUES(public_fee_inr),
       is_public = VALUES(is_public),
       next_session_date = VALUES(next_session_date)`,
      [
        program.slug,
        program.title,
        program.status,
        program.description || null,
        program.public_fee_inr || null,
        program.is_public,
        program.next_session_date || null,
      ]
    );
    return (await this.getProgramBySlug(program.slug))!;
  }

  async createVoiceContext(ctx: VoiceContext): Promise<VoiceContext> {
    await this.pool.query(
      'INSERT INTO voice_contexts (ref_hash, contact_id, purpose, expires_at, payload_json) VALUES (?, ?, ?, ?, ?)',
      [ctx.ref_hash, ctx.contact_id, ctx.purpose, ctx.expires_at, JSON.stringify(ctx.payload_json || {})]
    );
    return ctx;
  }

  async getVoiceContext(refHash: string): Promise<VoiceContext | null> {
    const [rows] = await this.pool.query<mysql.RowDataPacket[]>(
      'SELECT * FROM voice_contexts WHERE ref_hash = ?',
      [refHash]
    );
    return (rows[0] as VoiceContext) || null;
  }

  async markVoiceContextUsed(refHash: string): Promise<void> {
    await this.pool.query('UPDATE voice_contexts SET used_at = NOW() WHERE ref_hash = ?', [refHash]);
  }

  async createCallAttempt(attempt: Omit<CallAttempt, 'id' | 'created_at' | 'updated_at'>): Promise<CallAttempt> {
    const [result] = await this.pool.query<mysql.ResultSetHeader>(
      'INSERT INTO call_attempts (contact_id, request_id, call_log_id, provider_call_id, status, error_message) VALUES (?, ?, ?, ?, ?, ?)',
      [
        attempt.contact_id,
        attempt.request_id || null,
        attempt.call_log_id || null,
        attempt.provider_call_id || null,
        attempt.status,
        attempt.error_message || null,
      ]
    );
    return (await this.findCallAttemptById(result.insertId))!;
  }

  async updateCallAttempt(id: number, update: Partial<CallAttempt>): Promise<CallAttempt> {
    const fields: string[] = [];
    const values: any[] = [];
    for (const [k, v] of Object.entries(update)) {
      fields.push(`\`${k}\` = ?`);
      values.push(v);
    }
    values.push(id);
    await this.pool.query(`UPDATE call_attempts SET ${fields.join(', ')} WHERE id = ?`, values);
    return (await this.findCallAttemptById(id))!;
  }

  async findCallAttemptById(id: number): Promise<CallAttempt | null> {
    const [rows] = await this.pool.query<mysql.RowDataPacket[]>('SELECT * FROM call_attempts WHERE id = ?', [
      id,
    ]);
    return (rows[0] as CallAttempt) || null;
  }

  async findCallAttemptByRequestId(requestId: string): Promise<CallAttempt | null> {
    const [rows] = await this.pool.query<mysql.RowDataPacket[]>(
      'SELECT * FROM call_attempts WHERE request_id = ?',
      [requestId]
    );
    return (rows[0] as CallAttempt) || null;
  }

  async findCallAttemptByProviderCallId(providerCallId: string): Promise<CallAttempt | null> {
    const [rows] = await this.pool.query<mysql.RowDataPacket[]>(
      'SELECT * FROM call_attempts WHERE provider_call_id = ?',
      [providerCallId]
    );
    return (rows[0] as CallAttempt) || null;
  }

  async listPendingCallAttempts(): Promise<CallAttempt[]> {
    const [rows] = await this.pool.query<mysql.RowDataPacket[]>(
      "SELECT * FROM call_attempts WHERE status IN ('pending', 'dispatched') ORDER BY id ASC"
    );
    return rows as CallAttempt[];
  }

  async listCallAttempts(): Promise<(CallAttempt & { contact_name?: string; phone?: string })[]> {
    const [rows] = await this.pool.query<mysql.RowDataPacket[]>(
      `SELECT a.*, c.first_name AS contact_name, c.phone_e164 AS phone
       FROM call_attempts a
       JOIN contacts c ON a.contact_id = c.id
       ORDER BY a.id DESC`
    );
    return rows as any[];
  }

  async saveCallOutcome(
    outcome: Omit<CallOutcome, 'id' | 'created_at'>
  ): Promise<{ outcome: CallOutcome; isDuplicate: boolean }> {
    const [existing] = await this.pool.query<mysql.RowDataPacket[]>(
      'SELECT * FROM call_outcomes WHERE call_log_id = ? OR payload_hash = ?',
      [outcome.call_log_id, outcome.payload_hash]
    );
    if (existing.length > 0) {
      return { outcome: existing[0] as CallOutcome, isDuplicate: true };
    }

    const [result] = await this.pool.query<mysql.ResultSetHeader>(
      `INSERT INTO call_outcomes 
       (call_log_id, call_attempt_id, summary, interest_level, interested_program, callback_requested, callback_datetime, do_not_call, handoff_needed, payload_hash, raw_report_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        outcome.call_log_id,
        outcome.call_attempt_id || null,
        outcome.summary || null,
        outcome.interest_level,
        outcome.interested_program || null,
        outcome.callback_requested,
        outcome.callback_datetime || null,
        outcome.do_not_call,
        outcome.handoff_needed,
        outcome.payload_hash,
        JSON.stringify(outcome.raw_report_json || {}),
      ]
    );

    if (outcome.do_not_call && outcome.call_attempt_id) {
      const attempt = await this.findCallAttemptById(outcome.call_attempt_id);
      if (attempt) {
        await this.withdrawConsent(attempt.contact_id);
        await this.recordAuditEvent({
          actor_id: 'voice_webhook',
          action: 'suppress_opt_out',
          object_type: 'contact',
          object_id: String(attempt.contact_id),
          details_json: { call_log_id: outcome.call_log_id, reason: 'caller_opt_out' },
        });
      }
    }

    const [saved] = await this.pool.query<mysql.RowDataPacket[]>('SELECT * FROM call_outcomes WHERE id = ?', [
      result.insertId,
    ]);
    return { outcome: saved[0] as CallOutcome, isDuplicate: false };
  }

  async listCallOutcomes(): Promise<CallOutcome[]> {
    const [rows] = await this.pool.query<mysql.RowDataPacket[]>(
      'SELECT * FROM call_outcomes ORDER BY id DESC'
    );
    return rows as CallOutcome[];
  }

  async recordAuditEvent(event: Omit<AuditEvent, 'id' | 'occurred_at'>): Promise<AuditEvent> {
    const [result] = await this.pool.query<mysql.ResultSetHeader>(
      'INSERT INTO audit_events (actor_id, action, object_type, object_id, details_json) VALUES (?, ?, ?, ?, ?)',
      [event.actor_id, event.action, event.object_type, event.object_id, JSON.stringify(event.details_json || {})]
    );
    const [rows] = await this.pool.query<mysql.RowDataPacket[]>('SELECT * FROM audit_events WHERE id = ?', [
      result.insertId,
    ]);
    return rows[0] as AuditEvent;
  }

  async listAuditEvents(limit = 100): Promise<AuditEvent[]> {
    const [rows] = await this.pool.query<mysql.RowDataPacket[]>(
      'SELECT * FROM audit_events ORDER BY id DESC LIMIT ?',
      [limit]
    );
    return rows as AuditEvent[];
  }
}

// Global active store instance
let activeStore: IDbStore | null = null;

export async function getDbStore(): Promise<IDbStore> {
  if (activeStore) return activeStore;

  // Try initializing MySQL store first
  try {
    const mysqlStore = new MySqlDbStore();
    await mysqlStore.init();
    activeStore = mysqlStore;
    console.log('[DB] Connected to MySQL database successfully.');
    return activeStore;
  } catch (err: any) {
    console.warn(`[DB] MySQL connection not established (${err.message}). Using InMemoryDbStore.`);
    const memoryStore = new InMemoryDbStore();
    await memoryStore.init();
    activeStore = memoryStore;
    return activeStore;
  }
}

export function setTestDbStore(store: IDbStore): void {
  activeStore = store;
}
