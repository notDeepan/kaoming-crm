import { and, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '@/db/client';
import { machineModels } from '@/db/schema';
import { getActiveUser } from '@/lib/authorization';

export const runtime = 'nodejs';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await getActiveUser()) return new Response('Unauthorized', { status: 401 });
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return new Response('Not found', { status: 404 });
  const [model] = await getDb().select({ pdfBase64: machineModels.proposalAssetBase64 })
    .from(machineModels).where(and(eq(machineModels.id, id), isNull(machineModels.deletedAt))).limit(1);
  if (!model?.pdfBase64) return new Response('Not found', { status: 404 });
  return new Response(new Uint8Array(Buffer.from(model.pdfBase64, 'base64')), {
    headers: { 'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="model-proposal-${id}.pdf"`,
      'Cache-Control': 'private, no-store' },
  });
}
