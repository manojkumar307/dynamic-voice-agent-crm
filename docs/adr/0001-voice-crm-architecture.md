# ADR 0001: Dynamic Voice Agent & CRM Architecture

## Status
Accepted

## Context
We need to implement a production-ready, context-aware AI calling system integrating with OmniDimension voice telephony, live CRM data, and an administrative dashboard. The system must strictly prevent copyright infringement by using clean-room engineering, standard data contracts, and parameterizable business logic.

Key requirements:
1. **TypeScript / Node.js Engine**: Immediate developer velocity on Windows environment with existing Node 26 LTS runtime.
2. **MySQL Database Storage**: Native integration with the user's local MySQL Server 8.0, with clean relational schema, indexes, and transactions.
3. **Strict Privacy & Consent Enforcement**: Zero-tolerance suppression of DNC contacts, L1 dispatch data minimisation, authenticated L2 tool endpoints (`X-Voice-Tool-Token`), and L3 idempotent post-call webhook ingestion.
4. **Resilience & Reconciliation**: Automated background reconciliation worker polling `/calls/logs` to recover in-flight calls without redialing.
5. **Interactive Operations**: Single-page administrative UI providing Call Control, Agent Config, Live Programs, Calls & Outcomes, Compliance/DNC, and a QA Lab verification test runner.

## Decisions

### 1. Backend Stack: TypeScript + Express
- Express + TypeScript provides lightweight, deterministic HTTP route handling, strict typing for OmniDimension request/response schemas, and seamless testing with Supertest and Vitest.
- `zod` for request validation and environment parameterization.

### 2. Relational Storage & Schema
- Table entities:
  - `contacts`
  - `consent_records`
  - `programs`
  - `enrollments`
  - `voice_contexts`
  - `call_attempts`
  - `call_outcomes`
  - `audit_events`
- `mysql2/promise` connection pool with parameterized queries and transaction support.
- Comprehensive database migration script (`schema.sql`) and dynamic repository layer allowing both live MySQL operations and fast in-memory storage for test runners.

### 3. Trust Boundaries & Seams
- **Dispatch Seam (`POST /api/v1/voice/dispatch`)**: Requires administrative authorization. Enforces active consent, non-suppression, generates an opaque short-lived `context_ref`, and dispatches payload to OmniDimension.
- **Tool Seam (`POST /api/v1/voice/tools/program-status`, `POST /api/v1/voice/tools/context`)**: Protected via constant-time token comparison (`timingSafeEqual`) on `X-Voice-Tool-Token`. Returns only allowlisted fields. Never exposes raw database IDs or unrestricted endpoints.
- **Webhook Seam (`POST /api/v1/voice/webhook/:token`)**: Validates webhook route token. Enforces idempotency via `call_id` and payload hash. Executes database transactions to record outcomes, update attempt status, and automatically execute immediate suppression if `do_not_call` is true.

## Consequences
- Clean separation between telephony provider orchestration and CRM business rules.
- Complete independence from third-party vendor proprietary code while satisfying all functional specifications.
- Safe local execution and automated verification of all 15 QA matrix scenarios.
