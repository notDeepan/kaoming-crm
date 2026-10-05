import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '@/db/client';
import { attachments } from '@/db/schema';
import { getActiveUser } from '@/lib/authorization';

export const runtime = 'nodejs';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await getActiveUser()) return new Response('Unauthorized', { status: 401 });
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return new Response('Not found', { status: 404 });
  const [attachment] = await getDb().select({ bytes: attachments.fileBase64,
    filename: attachments.filename, mimeType: attachments.mimeType }).from(attachments)
    .where(eq(attachments.id, id)).limit(1);
  if (!attachment?.bytes) return new Response('Not found', { status: 404 });
  const filename = attachment.filename.replace(/[^A-Za-z0-9._-]/g, '_');
  return new Response(new Uint8Array(Buffer.from(attachment.bytes, 'base64')), {
    headers: { 'Content-Type': attachment.mimeType ?? 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${filename}"`, 'Cache-Control': 'private, no-store' },
  });
}
