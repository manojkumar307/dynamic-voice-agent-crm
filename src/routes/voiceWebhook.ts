import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { WebhookProcessor, PostCallWebhookPayload } from '../services/webhookProcessor.js';
import { env } from '../config/env.js';

export function createVoiceWebhookRouter(processor: WebhookProcessor): Router {
  const router = Router();

  router.post('/:token', async (req: Request, res: Response) => {
    const rawToken = Array.isArray(req.params.token) ? req.params.token[0] : req.params.token;
    const sentToken = rawToken || '';
    const expectedToken = env.VOICE_WEBHOOK_TOKEN;

    if (!sentToken || !expectedToken) {
      return res.status(401).json({ ok: false, error: 'unauthorized_missing_token' });
    }

    const sentBuf = Buffer.from(sentToken);
    const expectedBuf = Buffer.from(expectedToken);

    if (sentBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sentBuf, expectedBuf)) {
      return res.status(401).json({ ok: false, error: 'unauthorized_invalid_token' });
    }

    try {
      const payload = req.body as PostCallWebhookPayload;
      const result = await processor.process(payload);

      return res.status(200).json({
        ok: true,
        status: result.isDuplicate ? 'duplicate_acknowledged' : 'processed',
        outcome_id: result.outcome?.id,
        suppressed: result.suppressed,
      });
    } catch (err: any) {
      console.error('[Webhook] Ingestion error:', err);
      return res.status(400).json({ ok: false, error: err.message });
    }
  });

  return router;
}
