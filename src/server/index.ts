import { createApp } from './app.js';
import { getDbStore } from '../db/dbStore.js';
import { env } from '../config/env.js';

async function bootstrap() {
  const db = await getDbStore();
  const app = createApp(db);

  app.listen(env.PORT, () => {
    console.log(`=======================================================`);
    console.log(`🚀 Voice Agent & CRM Server active on port ${env.PORT}`);
    console.log(`📡 OmniDimension Base URL: ${env.OMNIDIM_BASE_URL}`);
    console.log(`🔑 Tool Auth: Header 'X-Voice-Tool-Token' required`);
    console.log(`🌐 Webhook Path: /api/v1/voice/webhook/:token`);
    console.log(`🧪 QA Lab API: /api/v1/qa-lab/run-all`);
    console.log(`=======================================================`);
  });
}

bootstrap().catch((err) => {
  console.error('Fatal bootstrap error:', err);
  process.exit(1);
});
