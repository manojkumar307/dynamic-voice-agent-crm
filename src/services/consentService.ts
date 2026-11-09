import { IDbStore } from '../db/dbStore.js';
import { Contact, ConsentRecord } from '../db/types.js';

export interface ConsentCheckResult {
  allowed: boolean;
  reason?: string;
  contact?: Contact;
  consent?: ConsentRecord;
}

export class ConsentService {
  constructor(private db: IDbStore) {}

  async checkEligibility(contactId: number, purpose = 'program_enquiry'): Promise<ConsentCheckResult> {
    const contact = await this.db.getContact(contactId);
    if (!contact) {
      return { allowed: false, reason: 'contact_not_found' };
    }

    if (contact.is_suppressed) {
      return { allowed: false, reason: 'contact_suppressed_dnc', contact };
    }

    const consent = await this.db.getConsent(contactId, purpose);
    if (!consent) {
      return { allowed: false, reason: 'no_consent_record', contact };
    }

    if (consent.state !== 'granted') {
      return { allowed: false, reason: `consent_${consent.state}`, contact, consent };
    }

    return { allowed: true, contact, consent };
  }

  async processOptOut(contactId: number, source = 'voice_request', callLogId?: string): Promise<void> {
    await this.db.withdrawConsent(contactId);
    await this.db.recordAuditEvent({
      actor_id: 'consent_engine',
      action: 'opt_out_enforced',
      object_type: 'contact',
      object_id: String(contactId),
      details_json: { source, call_log_id: callLogId, timestamp: new Date().toISOString() },
    });
  }
}
