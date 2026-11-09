import { IDbStore } from '../db/dbStore.js';
import { OmnidimClient } from './omnidimClient.js';
import { WebhookProcessor } from './webhookProcessor.js';

export class ReconciliationService {
  constructor(
    private db: IDbStore,
    private omnidimClient: OmnidimClient,
    private webhookProcessor: WebhookProcessor
  ) {}

  /**
   * Scans for in-flight/pending call attempts older than gracePeriodMinutes,
   * queries provider logs, and updates CRM status idempotently.
   */
  async reconcileInFlightCalls(gracePeriodMinutes = 5): Promise<{
    checkedCount: number;
    reconciledCount: number;
    errors: string[];
  }> {
    const pendingAttempts = await this.db.listPendingCallAttempts();
    const cutoff = Date.now() - gracePeriodMinutes * 60 * 1000;
    const oldPending = pendingAttempts.filter((a) => new Date(a.created_at).getTime() < cutoff);

    let reconciledCount = 0;
    const errors: string[] = [];

    if (oldPending.length === 0) {
      return { checkedCount: 0, reconciledCount: 0, errors };
    }

    // Fetch recent logs from provider
    try {
      const logs = await this.omnidimClient.listCallLogs(50);
      for (const attempt of oldPending) {
        // Match log by metadata or request_id
        const matchedLog = logs.find(
          (l) =>
            l.metadata?.call_attempt_id === String(attempt.id) ||
            l.call_log_id === attempt.call_log_id ||
            l.call_id === attempt.provider_call_id
        );

        if (matchedLog && matchedLog.status !== 'in_progress') {
          await this.webhookProcessor.process({
            call_id: matchedLog.call_id,
            call_log_id: matchedLog.call_log_id,
            call_status: matchedLog.status,
            metadata: matchedLog.metadata,
            call_report: matchedLog.call_report,
            duration_seconds: matchedLog.duration_seconds,
          });
          reconciledCount++;
        }
      }
    } catch (err: any) {
      errors.push(`Reconciliation log fetch error: ${err.message}`);
    }

    return {
      checkedCount: oldPending.length,
      reconciledCount,
      errors,
    };
  }
}
