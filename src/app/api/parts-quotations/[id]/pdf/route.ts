import { eq } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { partsQuotations } from '@/db/schema';
import { requireRole } from '@/lib/authorization';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireRole('admin', 'manager', 'sales', 'logistics', 'service', 'viewer');
  const { id } = await params;
  const [quotation] = await getDb().select({ number: partsQuotations.quoteNumber,
    pdf: partsQuotations.pdfBase64 }).from(partsQuotations).where(eq(partsQuotations.id, id)).limit(1);
  if (!quotation?.pdf) return new Response('Not found', { status: 404 });
  return new Response(Buffer.from(quotation.pdf, 'base64'), {
    headers: { 'content-type': 'application/pdf',
      'content-disposition': `inline; filename="${quotation.number}.pdf"`,
      'cache-control': 'private, no-store' },
  });
}
