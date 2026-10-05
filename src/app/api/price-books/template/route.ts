import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { getActiveUser } from '@/lib/authorization';

export const runtime = 'nodejs';

export async function GET() {
  const user = await getActiveUser();
  if (!user || !['admin', 'manager'].includes(user.role)) return new Response('Forbidden', { status: 403 });
  const csv = await readFile(join(process.cwd(), 'data/import-templates/price-list.csv'));
  return new Response(new Uint8Array(csv), {
    headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="price-list-template.csv"', 'Cache-Control': 'private, no-store' },
  });
}
