import { getDbStore } from '../db/dbStore.js';
import { OmnidimClient } from '../services/omnidimClient.js';
import { WebhookProcessor } from '../services/webhookProcessor.js';
import { ReconciliationService } from '../services/reconciliationService.js';

async function run() {
  console.log('[Reconciler] Starting in-flight call reconciliation job...');
  const db = await getDbStore();
  const omnidim = new OmnidimClient();
  const processor = new WebhookProcessor(db);
  const service = new ReconciliationService(db, omnidim, processor);

  const report = await service.reconcileInFlightCalls(5);
  console.log(`[Reconciler] Finished. Checked: ${report.checkedCount}, Reconciled: ${report.reconciledCount}`);
  if (report.errors.length > 0) {
    console.error('[Reconciler] Errors encountered:', report.errors);
  }
  await db.close();
  process.exit(0);
}

run().catch((err) => {
  console.error('[Reconciler] Fatal error:', err);
  process.exit(1);
});
