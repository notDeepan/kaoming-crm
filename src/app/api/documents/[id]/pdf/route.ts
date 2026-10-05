import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '@/db/client';
import { documents } from '@/db/schema';
import { getActiveUser } from '@/lib/authorization';

export const runtime = 'nodejs';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await getActiveUser()) return new Response('Unauthorized', { status: 401 });
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return new Response('Not found', { status: 404 });
  const [document] = await getDb().select({ pdfBase64: documents.pdfBase64,
    docNumber: documents.docNumber, docType: documents.docType }).from(documents)
    .where(eq(documents.id, id)).limit(1);
  if (!document?.pdfBase64) return new Response('Not found', { status: 404 });
  const filename = `${document.docNumber}-${document.docType}.pdf`.replace(/[^A-Za-z0-9._-]/g, '_');
  return new Response(new Uint8Array(Buffer.from(document.pdfBase64, 'base64')), {
    headers: { 'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${filename}"`, 'Cache-Control': 'private, no-store' },
  });
}
