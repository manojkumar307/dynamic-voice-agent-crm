import crypto from 'crypto';
import { IDbStore } from '../db/dbStore.js';
import { VoiceContext } from '../db/types.js';

export class ContextService {
  constructor(private db: IDbStore) {}

  /**
   * Generates a short-lived opaque context reference for L1 dispatch.
   * TTL is default 15 minutes.
   */
  async createDispatchContext(
    contactId: number,
    purpose: string,
    payload: Record<string, any> = {},
    ttlMinutes = 15
  ): Promise<string> {
    const randomBytes = crypto.randomBytes(16).toString('hex');
    const refHash = `ctx_${randomBytes.substring(0, 12)}`;
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

    const voiceCtx: VoiceContext = {
      ref_hash: refHash,
      contact_id: contactId,
      purpose,
      expires_at: expiresAt,
      used_at: null,
      payload_json: payload,
      created_at: new Date(),
    };

    await this.db.createVoiceContext(voiceCtx);
    return refHash;
  }

  /**
   * Resolves L2 live context for an authenticated in-call tool request.
   * Verifies TTL and applies field-level allowlisting.
   */
  async resolveContext(refHash: string, intent = 'member_summary') {
    const ctx = await this.db.getVoiceContext(refHash);
    if (!ctx) {
      return { ok: false, error: 'invalid_context_ref' };
    }

    if (new Date(ctx.expires_at).getTime() < Date.now()) {
      return { ok: false, error: 'context_expired' };
    }

    const contact = await this.db.getContact(ctx.contact_id);
    if (!contact) {
      return { ok: false, error: 'contact_not_found' };
    }

    // Mark as used
    await this.db.markVoiceContextUsed(refHash);

    // Return strict allowlisted projection per Blueprint Page 9
    return {
      ok: true,
      contact: {
        first_name: contact.first_name,
      },
      membership: {
        status: contact.is_suppressed ? 'suppressed' : 'active',
      },
      allowed_topics: ['programs', 'community_resources'],
      as_of: new Date().toISOString(),
    };
  }
}
