import { z } from 'zod';

const serverEnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  AUTH_SECRET: z.string().min(32),
  AUTH_URL: z.string().url().optional(),
  DEFAULT_LOCALE: z.enum(['en', 'zh-Hant']).default('en'),
  TZ: z.literal('Asia/Taipei').default('Asia/Taipei'),
});

export function readServerEnv(input: Record<string, string | undefined>) {
  return serverEnvSchema.safeParse(input);
}

export function requireServerEnv(input: Record<string, string | undefined> = process.env) {
  const result = readServerEnv(input);
  if (!result.success) {
    const fields = Object.keys(result.error.flatten().fieldErrors).join(', ');
    throw new Error(`Invalid server configuration: ${fields}`);
  }
  return result.data;
}
