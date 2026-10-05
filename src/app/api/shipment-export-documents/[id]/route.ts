import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '@/db/client';
import { shipmentExportDocuments } from '@/db/schema';
import { getActiveUser } from '@/lib/authorization';

export const runtime = 'nodejs';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await getActiveUser()) return new Response('Unauthorized', { status: 401 });
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return new Response('Not found', { status: 404 });
  const [doc] = await getDb().select({ bytes: shipmentExportDocuments.fileBase64,
    filename: shipmentExportDocuments.filename }).from(shipmentExportDocuments)
    .where(eq(shipmentExportDocuments.id, id)).limit(1);
  if (!doc) return new Response('Not found', { status: 404 });
  const filename = doc.filename.replace(/[^A-Za-z0-9._-]/g, '_');
  return new Response(new Uint8Array(Buffer.from(doc.bytes, 'base64')), { headers: {
    'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${filename}"`,
    'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff',
  } });
}
