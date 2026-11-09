import express, { Express } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { IDbStore } from '../db/dbStore.js';
import { ConsentService } from '../services/consentService.js';
import { ContextService } from '../services/contextService.js';
import { OmnidimClient } from '../services/omnidimClient.js';
import { WebhookProcessor } from '../services/webhookProcessor.js';
import { ReconciliationService } from '../services/reconciliationService.js';
import { createVoiceDispatchRouter } from '../routes/voiceDispatch.js';
import { createVoiceToolsRouter } from '../routes/voiceTools.js';
import { createVoiceWebhookRouter } from '../routes/voiceWebhook.js';
import { createAdminRouter } from '../routes/adminApi.js';
import { createQaLabRouter } from '../routes/qaLabApi.js';

export function createApp(db: IDbStore): Express {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // Instantiate core services
  const consentService = new ConsentService(db);
  const contextService = new ContextService(db);
  const omnidimClient = new OmnidimClient();
  const webhookProcessor = new WebhookProcessor(db);
  const reconciliationService = new ReconciliationService(db, omnidimClient, webhookProcessor);

  // Health check endpoint (Blueprint Page 23: contains no private data)
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'voice-agent-crm',
      version: '1.0.0',
    });
  });

  // Mount API routes
  app.use(
    '/api/v1/voice/dispatch',
    createVoiceDispatchRouter(db, consentService, contextService, omnidimClient)
  );
  app.use('/api/v1/voice/tools', createVoiceToolsRouter(db, contextService));
  app.use('/api/v1/voice/webhook', createVoiceWebhookRouter(webhookProcessor));
  app.use('/api/v1/admin', createAdminRouter(db, reconciliationService));
  app.use(
    '/api/v1/qa-lab',
    createQaLabRouter(db, consentService, contextService, webhookProcessor, omnidimClient)
  );

  // Serve compiled React admin frontend if dist folder exists
  const distDir = path.resolve(process.cwd(), 'dist');
  if (fs.existsSync(distDir)) {
    app.use(express.static(distDir));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) return next();
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  return app;
}
