import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '@/db/client';
import { conditionPhotos } from '@/db/schema';
import { getActiveUser } from '@/lib/authorization';

export const runtime = 'nodejs';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await getActiveUser()) return new Response('Unauthorized', { status: 401 });
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return new Response('Not found', { status: 404 });
  const [photo] = await getDb().select({ bytes: conditionPhotos.fileBase64,
    mimeType: conditionPhotos.mimeType }).from(conditionPhotos).where(eq(conditionPhotos.id, id)).limit(1);
  if (!photo) return new Response('Not found', { status: 404 });
  return new Response(new Uint8Array(Buffer.from(photo.bytes, 'base64')), { headers: {
    'Content-Type': photo.mimeType, 'Content-Disposition': 'inline', 'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
  } });
}
