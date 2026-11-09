import { env } from '../config/env.js';

export interface DispatchCallRequest {
  agent_id: number;
  to_number: string;
  call_context: {
    first_name: string;
    reason_for_call: string;
    context_ref?: string;
    current_program?: string;
    preferred_language?: string;
  };
  metadata: {
    crm_contact_id: string;
    call_attempt_id: string;
  };
  from_number_id?: number | null;
  __post_call_actions?: {
    webhook?: {
      enabled: boolean;
      url: string;
      include: string[];
      extracted_variables: Array<{ key: string; prompt: string }>;
    };
  };
}

export interface DispatchCallResponse {
  success: boolean;
  status: string;
  requestId: string;
  message?: string;
}

export interface CallLogItem {
  call_id: string;
  call_log_id: string;
  agent_id: number;
  to_number: string;
  status: 'completed' | 'in_progress' | 'failed' | 'no_answer' | 'busy';
  duration_seconds?: number;
  metadata?: Record<string, string>;
  call_report?: {
    summary?: string;
    extracted_variables?: Record<string, any>;
  };
  created_at: string;
}

export class OmnidimClient {
  private baseUrl: string;
  private apiKey: string;
  private enableRealCalling: boolean;

  constructor(options?: { baseUrl?: string; apiKey?: string; enableRealCalling?: boolean }) {
    this.baseUrl = options?.baseUrl || env.OMNIDIM_BASE_URL;
    this.apiKey = options?.apiKey || env.OMNIDIM_API_KEY;
    this.enableRealCalling = options?.enableRealCalling ?? env.ENABLE_REAL_CALLING;
  }

  async dispatch(payload: DispatchCallRequest): Promise<DispatchCallResponse> {
    if (!this.enableRealCalling) {
      // Deterministic simulation mode when live credentials or real calling is disabled
      return {
        success: true,
        status: 'dispatched',
        requestId: `sim_req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      };
    }

    const response = await fetch(`${this.baseUrl.replace(/\/+$/, '')}/calls/dispatch`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OmniDimension dispatch failed (${response.status}): ${errText}`);
    }

    return (await response.json()) as DispatchCallResponse;
  }

  async listCallLogs(limit = 20): Promise<CallLogItem[]> {
    if (!this.enableRealCalling) {
      return [];
    }

    const response = await fetch(`${this.baseUrl.replace(/\/+$/, '')}/calls/logs?limit=${limit}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OmniDimension listCallLogs failed (${response.status}): ${errText}`);
    }

    const data = await response.json();
    return (data.logs || data) as CallLogItem[];
  }

  async getCallLog(callLogId: string): Promise<CallLogItem | null> {
    if (!this.enableRealCalling) {
      return null;
    }

    const response = await fetch(`${this.baseUrl.replace(/\/+$/, '')}/calls/logs/${callLogId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) return null;
      const errText = await response.text();
      throw new Error(`OmniDimension getCallLog failed (${response.status}): ${errText}`);
    }

    return (await response.json()) as CallLogItem;
  }

  async createWebVoiceSession(params: {
    agent_id: number;
    custom_variables: Record<string, any>;
    metadata: Record<string, string>;
  }): Promise<{ ws_url: string }> {
    if (!this.enableRealCalling) {
      return {
        ws_url: `wss://simulated.omnidim.io/session/${Date.now()}`,
      };
    }

    const response = await fetch(`${this.baseUrl.replace(/\/+$/, '')}/sessions/create`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        agent_id: params.agent_id,
        type: 'voice',
        custom_variables: params.custom_variables,
        metadata: params.metadata,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OmniDimension web session create failed (${response.status}): ${errText}`);
    }

    return (await response.json()) as { ws_url: string };
  }
}
