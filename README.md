# Dynamic Voice Agent & CRM Integration System

A production-ready, context-aware AI voice calling system integrating with OmniDimension telephony, live CRM data, and an administrative control dashboard.

Built using **clean-room software engineering** adhering strictly to the architecture specifications in the Engineering Playbook while avoiding any proprietary copyright infringement.

---

## 🌟 Key Architecture Capabilities

1. **Strict Consent & Privacy Gate**:
   - Zero-tolerance Do-Not-Call (DNC) suppression list.
   - Rejects unconsented or suppressed contacts before telephony dispatch.
   - Automatic immediate suppression when post-call webhooks detect `do_not_call: true`.

2. **L1 / L2 / L3 Context Decoupling**:
   - **L1 (At Dispatch)**: Generates short-lived, opaque context handles (`ctx_...`) with TTL. Never sends sensitive payments, passwords, or raw database IDs over voice prompts.
   - **L2 (During Live Call)**: Authenticated live Custom API tools (`/api/v1/voice/tools/program-status` and `/api/v1/voice/tools/context`) protected by `X-Voice-Tool-Token` constant-time verification. Always queries live database facts so the agent never hallucinates prices or dates.
   - **L3 (Post-Call Feedback)**: Authenticated webhook endpoint (`/api/v1/voice/webhook/:token`) with SHA-256 idempotency deduplication to record structured outcomes (`interest_level`, `interested_program`, `callback_datetime`, `handoff_needed`).

3. **Background Reconciliation**:
   - Resilient worker (`npm run reconcile`) scanning in-flight calls against `/calls/logs` to recover dropped webhooks without re-dialing.

4. **15-Scenario QA Lab & Verification Matrix**:
   - Built-in synthetic test runner evaluating all 15 release gates from Chapter 12 of the blueprint with 100% test coverage.

5. **MySQL 8.0 Support**:
   - Complete relational schema (`schema.sql`) with indices, foreign keys, and connection pooling.
   - Includes graceful zero-config memory store fallback for immediate offline local testing.

---

## 📁 Repository Structure

```
voice-agent-crm/
├── GLOSSARY.md                  # Standardized domain terminology
├── README.md                    # System documentation
├── schema.sql                   # MySQL 8.0+ production DDL schema
├── .env.example                 # Environment configuration template
├── package.json                 # Node.js dependencies & scripts
├── tsconfig.json                # TypeScript compiler configuration
├── vite.config.ts               # Vite bundler configuration
├── docs/
│   └── adr/
│       └── 0001-voice-crm-architecture.md  # Architectural Decision Record
├── src/
│   ├── config/
│   │   └── env.ts               # Zod typed environment validation
│   ├── db/
│   │   ├── types.ts             # Domain interfaces
│   │   └── dbStore.ts           # MySQL connection pool & store implementation
│   ├── prompts/
│   │   └── agentPrompts.ts      # Modular 5-block system prompt definitions
│   ├── services/
│   │   ├── omnidimClient.ts     # OmniDimension API client
│   │   ├── consentService.ts    # DNC suppression and consent verifier
│   │   ├── contextService.ts    # L1/L2 context generator and resolver
│   │   ├── webhookProcessor.ts  # Idempotent webhook processor
│   │   └── reconciliationService.ts # In-flight call reconciler
│   ├── routes/
│   │   ├── voiceDispatch.ts     # POST /api/v1/voice/dispatch
│   │   ├── voiceTools.ts        # POST /api/v1/voice/tools/*
│   │   ├── voiceWebhook.ts      # POST /api/v1/voice/webhook/:token
│   │   ├── adminApi.ts          # Admin endpoints for React dashboard
│   │   └── qaLabApi.ts          # QA release gate test runner
│   ├── server/
│   │   ├── app.ts               # Express application factory
│   │   ├── index.ts             # Server entry point
│   │   └── reconcileCli.ts      # Background reconciliation CLI
│   └── client/                  # React Admin Dashboard
│       ├── App.tsx              # Main dashboard shell
│       ├── index.css            # Custom theme styles
│       └── components/          # 6 Admin tabs
└── tests/
    ├── testHelper.ts            # In-memory request/response test runner
    └── voiceAgentIntegration.test.ts # Complete test suite
```

---

## 🚀 Quickstart & Setup

### 1. Database Setup (MySQL)
If you wish to run MySQL locally or on a server, run the schema script:
```bash
mysql -u root -p < schema.sql
```
*(If MySQL is not running, the application automatically uses the in-memory test store with default seed records).*

### 2. Configure Environment Variables
Copy `.env.example` to `.env` and fill in your details:
```bash
cp .env.example .env
```

### 3. Run Automated Tests
Execute the 16 integration tests and the 15 functional release gates:
```bash
npm test
```

### 4. Start the Application
Start the backend server on `http://localhost:3000`:
```bash
npm run dev:server
```

In a separate terminal, start the React Admin Dashboard on `http://localhost:5173`:
```bash
npm run dev:client
```

---

## 🛡️ Going Live with OmniDimension Telephony

When you obtain your OmniDimension account and phone number:
1. Set `ENABLE_REAL_CALLING=true` in `.env`.
2. Set `OMNIDIM_API_KEY` to your production OmniDimension API key.
3. Set `OMNIDIM_AGENT_ID` to your configured voice agent ID.
4. Set `OMNIDIM_FROM_NUMBER_ID` to your purchased/verified phone number ID.
5. In OmniDimension dashboard, configure your Custom API live tool pointing to:
   - Endpoint: `https://your-domain.com/api/v1/voice/tools/program-status`
   - Header: `X-Voice-Tool-Token: <YOUR_VOICE_TOOL_TOKEN>`
6. Configure post-call webhook callback in OmniDimension pointing to:
   - Webhook URL: `https://your-domain.com/api/v1/voice/webhook/<YOUR_VOICE_WEBHOOK_TOKEN>`
