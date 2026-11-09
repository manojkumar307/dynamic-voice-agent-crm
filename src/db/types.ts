export type ConsentState = 'granted' | 'withdrawn' | 'expired';
export type InterestLevel = 'high' | 'medium' | 'low' | 'unknown';
export type CallAttemptStatus = 'pending' | 'dispatched' | 'completed' | 'failed' | 'suppressed' | 'canceled';

export interface Contact {
  id: number;
  first_name: string;
  phone_e164: string;
  email?: string | null;
  segment: string;
  language: string;
  is_suppressed: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface ConsentRecord {
  id: number;
  contact_id: number;
  purpose: string;
  channel: string;
  state: ConsentState;
  source: string;
  occurred_at: Date;
}

export interface Program {
  id: number;
  slug: string;
  title: string;
  status: string;
  description?: string | null;
  public_fee_inr?: number | null;
  is_public: boolean;
  next_session_date?: string | null;
  last_verified_at: Date;
}

export interface Enrollment {
  id: number;
  contact_id: number;
  program_id: number;
  state: string;
  verified_at: Date;
}

export interface VoiceContext {
  ref_hash: string;
  contact_id: number;
  purpose: string;
  expires_at: Date;
  used_at?: Date | null;
  payload_json?: Record<string, any> | null;
  created_at: Date;
}

export interface CallAttempt {
  id: number;
  contact_id: number;
  request_id?: string | null;
  call_log_id?: string | null;
  provider_call_id?: string | null;
  status: CallAttemptStatus;
  error_message?: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CallOutcome {
  id: number;
  call_log_id: string;
  call_attempt_id?: number | null;
  summary?: string | null;
  interest_level: InterestLevel;
  interested_program?: string | null;
  callback_requested: boolean;
  callback_datetime?: string | null;
  do_not_call: boolean;
  handoff_needed: boolean;
  payload_hash: string;
  raw_report_json?: Record<string, any> | null;
  created_at: Date;
}

export interface AuditEvent {
  id: number;
  actor_id: string;
  action: string;
  object_type: string;
  object_id: string;
  details_json?: Record<string, any> | null;
  occurred_at: Date;
}

export interface DispatchCallParams {
  contact_id: number;
  purpose?: string;
  reason_for_call?: string;
  agent_id?: number;
  from_number_id?: number | null;
}
