import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('3000').transform((v) => parseInt(v, 10)),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  OMNIDIM_API_KEY: z.string().min(1, 'OMNIDIM_API_KEY is required'),
  OMNIDIM_BASE_URL: z.string().url().default('https://omnidim.io/api/v1'),
  OMNIDIM_AGENT_ID: z.string().transform((v) => parseInt(v, 10)),
  OMNIDIM_FROM_NUMBER_ID: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : undefined)),
  VOICE_TOOL_TOKEN: z.string().min(8, 'VOICE_TOOL_TOKEN must be at least 8 chars'),
  VOICE_WEBHOOK_TOKEN: z.string().min(8, 'VOICE_WEBHOOK_TOKEN must be at least 8 chars'),
  VOICE_WEBHOOK_URL: z.string().optional(),
  DB_HOST: z.string().default('127.0.0.1'),
  DB_PORT: z.string().default('3306').transform((v) => parseInt(v, 10)),
  DB_USER: z.string().default('root'),
  DB_PASSWORD: z.string().default(''),
  DB_NAME: z.string().default('voice_crm'),
  ENABLE_REAL_CALLING: z
    .string()
    .default('false')
    .transform((v) => v === 'true'),
});

export const env = envSchema.parse(process.env);
export type Env = z.infer<typeof envSchema>;
