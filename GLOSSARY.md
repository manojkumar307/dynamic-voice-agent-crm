# Domain Glossary: Dynamic Voice Agent & CRM

This glossary defines standard domain terms used across the Voice Agent and CRM integration system, based on the dynamic context blueprint and operational guidelines.

---

### Core Entities

- **Contact (`Contact`)**: A verified person record possessing an E.164 phone number, communication channel preferences, and language preferences.
- **Consent Record (`ConsentRecord`)**: An explicit, verifiable permission entry linking a Contact to a specific calling purpose and channel, tracking consent status (`granted`, `withdrawn`, `expired`), timestamp, and evidence source.
- **Program (`Program`)**: An educational or business product/offering (e.g. *Founder Labs Premium*) with current public status (`open`, `waitlist`, `closed`, `contact_team`), fee information, and session dates.
- **Enrollment (`Enrollment`)**: A member-specific relationship linking a Contact to a Program, indicating participation state (`registered`, `waitlisted`, `completed`).
- **Voice Context (`VoiceContext`)**: A short-lived (e.g. 15-minute TTL), opaque reference handle (`ctx_<hash>`) generated at dispatch time to securely allow live API lookups without transmitting raw PII or database IDs over the voice channel.
- **Call Attempt (`CallAttempt`)**: A single outbound dispatch lifecycle entry tracking provider correlation (`request_id`, `provider_call_id`), dispatch status (`pending`, `dispatched`, `completed`, `failed`), and timestamps.
- **Call Outcome (`CallOutcome`)**: Structured post-call intelligence extracted after call conclusion (intent, `interest_level`, `callback_datetime`, `do_not_call` opt-out flags, and raw call summary).
- **Audit Event (`AuditEvent`)**: Immutable audit trail logging actor actions, tool executions, consent updates, and suppression events for regulatory compliance.

---

### Context Layers

- **L1 (At Dispatch)**: Minimal spoken snapshot injected into the agent when dialing (`first_name`, `reason_for_call`, `context_ref`). No sensitive payment details, tokens, or private history.
- **L2 (During Conversation - Live Tools)**: Authenticated, narrowly-scoped HTTP tool calls invoked by the voice agent during live audio turns to fetch up-to-date facts (e.g., live program availability, session dates).
- **L3 (After Call - Webhook)**: Structured JSON payload posted back to the application server when the call ends, processed idempotently to update CRM states, trigger follow-ups, or immediately enforce opt-outs.

---

### Security & Privacy Concepts

- **Do-Not-Call (DNC) / Suppression List**: A zero-tolerance suppression state. When a caller requests to stop calls or opts out, the system immediately marks their consent as withdrawn, suppresses future queued calls, and blocks subsequent dispatch.
- **Shared Header Authentication (`X-Voice-Tool-Token`)**: Constant-time cryptographically verified bearer token separating live voice tools from public Internet scraping.
- **Idempotency Key**: Cryptographic payload hash and provider call ID pair ensuring repeated webhook deliveries never create duplicate callbacks or conflicting records.
