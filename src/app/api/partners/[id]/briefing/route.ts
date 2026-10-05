import { z } from 'zod';
import { getActiveUser } from '@/lib/authorization';
import { renderPartnerBriefing } from '@/features/claims/briefing';

export const runtime = 'nodejs';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getActiveUser();
  if (!user) return new Response('Unauthorized', { status: 401 });
  if (!['admin', 'manager', 'sales', 'finance'].includes(user.role)) return new Response('Forbidden', { status: 403 });
  const { id } = await params;
  const date = new URL(request.url).searchParams.get('visitDate');
  if (!z.string().uuid().safeParse(id).success || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return new Response('Invalid agent or visit date', { status: 400 });
  }
  try {
    const bytes = await renderPartnerBriefing(id, date);
    return new Response(new Uint8Array(bytes), { headers: { 'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="agent-briefing-${date}.pdf"`,
      'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return new Response(error instanceof Error && error.message === 'Agent not found' ? 'Agent not found' : 'Could not generate briefing',
      { status: error instanceof Error && error.message === 'Agent not found' ? 404 : 500 });
  }
}
