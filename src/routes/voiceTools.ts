import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { IDbStore } from '../db/dbStore.js';
import { ContextService } from '../services/contextService.js';
import { env } from '../config/env.js';

export function createVoiceToolsRouter(db: IDbStore, contextService: ContextService): Router {
  const router = Router();

  // Timing-safe verification of shared header token
  function verifyToolToken(req: Request, res: Response, next: () => void) {
    const sentToken = req.header('X-Voice-Tool-Token') || '';
    const expectedToken = env.VOICE_TOOL_TOKEN;

    if (!sentToken || !expectedToken) {
      return res.status(401).json({ ok: false, error: 'unauthorized_missing_token' });
    }

    const sentBuf = Buffer.from(sentToken);
    const expectedBuf = Buffer.from(expectedToken);

    if (sentBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sentBuf, expectedBuf)) {
      return res.status(401).json({ ok: false, error: 'unauthorized_invalid_token' });
    }

    next();
  }

  router.use(verifyToolToken);

  // 1. Program Status Live Tool (Blueprint Page 12-13)
  const programStatusSchema = z.object({
    program_slug: z.string().min(1).max(80),
  });

  router.post('/program-status', async (req: Request, res: Response) => {
    const parseResult = programStatusSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ ok: false, error: 'invalid_parameters', details: parseResult.error.format() });
    }

    const { program_slug } = parseResult.data;
    const program = await db.getProgramBySlug(program_slug);

    if (!program || !program.is_public) {
      return res.status(404).json({
        ok: false,
        error: 'unknown_program',
        answer: 'I do not have verified information on that program right now. I can connect you with the team.',
      });
    }

    // Strict allowlisted output matching Blueprint Page 13
    return res.json({
      ok: true,
      program: program.title,
      registration_status: program.status,
      fee_inr: program.public_fee_inr ?? null,
      next_session_date: program.next_session_date ?? null,
      answer:
        program.status === 'open'
          ? `Registration is currently open for ${program.title}.`
          : `Current registration for ${program.title} is ${program.status}. The team will confirm details.`,
      as_of: new Date().toISOString(),
    });
  });

  // 2. Member Context Live Tool (Blueprint Page 9)
  const contextSchema = z.object({
    context_ref: z.string().min(4).max(64),
    intent: z.string().default('member_summary'),
  });

  router.post('/context', async (req: Request, res: Response) => {
    const parseResult = contextSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ ok: false, error: 'invalid_parameters' });
    }

    const { context_ref, intent } = parseResult.data;
    const result = await contextService.resolveContext(context_ref, intent);

    if (!result.ok) {
      return res.status(result.error === 'invalid_context_ref' ? 404 : 403).json(result);
    }

    return res.json(result);
  });

  return router;
}
