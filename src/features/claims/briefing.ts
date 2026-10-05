import 'server-only';
import { and, eq, inArray, isNull, ne } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { claimEvents, claims, deals, machineModels, machines, orders, partners, shipments, users } from '@/db/schema';
import { escapeHtml as e, renderChineseHtml } from '@/documents/chinese';
import { renderA4Pdf } from '@/documents/pdf';
import { requireRole } from '@/lib/authorization';
import { dateUtc, daysBetween } from '@/features/production/dates';

const styles = `@page{size:A4 portrait;margin:11mm 12mm 16mm}*{box-sizing:border-box}
body{font:9px "Noto Sans TC",Arial,sans-serif;color:#152333}header{border-bottom:2px solid #152333;padding-bottom:7px}
h1{font-size:17px;margin:4px 0}h2{font-size:11px;margin:10px 0 5px}.meta{display:flex;justify-content:space-between;gap:12px}
.summary{display:flex;gap:14px;background:#f2f5f8;padding:8px;margin-top:8px}.summary>div{flex:1}
.claim{border:1px solid #8895a5;padding:8px;margin:7px 0;break-inside:avoid}.claim h3{font-size:10px;margin:0 0 4px}
.claim p{margin:3px 0;line-height:1.35}.flag{color:#a51d20;font-weight:700}.two{display:grid;grid-template-columns:1fr 1fr;gap:10px}
table{border-collapse:collapse;width:100%}td,th{border-bottom:1px solid #ccd3db;padding:3px;text-align:left}th{background:#f4f6f8}`;

export async function renderPartnerBriefing(partnerId: string, visitDate: string) {
  const actor = await requireRole('admin', 'manager', 'sales', 'finance');
  dateUtc(visitDate);
  const db = getDb();
  const [partner] = await db.select().from(partners).where(eq(partners.id, partnerId)).limit(1);
  if (!partner) throw new Error('Agent not found');
  const [open, installed, pendingCredits, payments] = await Promise.all([
    db.select({ claim: claims, serial: machines.serialNumber, model: machineModels.code,
      ownerName: users.name,
      contractual: orders.contractualDeliveryDate, shipped: shipments.shippedAt })
      .from(claims).innerJoin(machines, eq(machines.id, claims.machineId))
      .innerJoin(machineModels, eq(machineModels.id, machines.machineModelId))
      .innerJoin(orders, eq(orders.id, machines.orderId))
      .innerJoin(users, eq(users.id, claims.ownerId))
      .leftJoin(shipments, eq(shipments.orderId, orders.id))
      .where(and(eq(claims.partnerId, partnerId), ne(claims.status, 'closed'), isNull(claims.deletedAt))),
    db.select({ serial: machines.serialNumber, model: machineModels.code, acceptedAt: machines.acceptedAt })
      .from(machines).innerJoin(machineModels, eq(machineModels.id, machines.machineModelId))
      .where(eq(machines.partnerId, partnerId)),
    db.select({ number: claims.claimNumber, amount: claims.settledAmount, currency: claims.settledCurrency })
      .from(claims).where(and(eq(claims.partnerId, partnerId), eq(claims.pendingCredit, true))),
    db.select({ pi: orders.piNumber }).from(orders)
      .innerJoin(deals, eq(deals.id, orders.dealId))
      .leftJoin(shipments, eq(shipments.orderId, orders.id))
      .where(and(eq(deals.partnerId, partnerId), isNull(shipments.finalPaymentReceivedAt))),
  ]);
  const events = open.length ? await db.select().from(claimEvents)
    .where(inArray(claimEvents.claimId, open.map((row) => row.claim.id))) : [];
  const exposure = new Map<string, number>();
  for (const row of open) exposure.set(row.claim.claimedCurrency,
    (exposure.get(row.claim.claimedCurrency) ?? 0) + Number(row.claim.claimedAmount));
  const summary = [...exposure].map(([currency, amount]) => `${currency} ${amount.toFixed(2)}`).join(' · ') || 'None';
  const claimBlocks = open.map((row) => {
    const item = row.claim;
    const last = events.filter((event) => event.claimId === item.id).sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))[0];
    const shippedDate = row.shipped?.toISOString().slice(0, 10);
    const variance = row.contractual && shippedDate ? daysBetween(row.contractual, shippedDate) : null;
    return `<article class="claim"><h3>${e(item.claimNumber)} · ${e(row.model)} / ${e(row.serial)} · ${e(item.category.replaceAll('_', ' '))}</h3>
      <p><strong>Claim / 請款：</strong>${e(item.description)}</p>
      <p><strong>Ship / 出貨：</strong>${e(row.contractual ?? '—')} → ${e(shippedDate ?? '—')}${variance == null ? '' : ` · ${e(variance)} days variance`}</p>
      <p><strong>Amounts / 金額：</strong>asked ${e(item.claimedCurrency)} ${e(item.claimedAmount)} · offered ${e(item.offeredCurrency ?? '—')} ${e(item.offeredAmount ?? '—')} · settled ${e(item.settledCurrency ?? '—')} ${e(item.settledAmount ?? '—')}</p>
      <p><strong>Our position / 高明立場：</strong>${item.kaoMingPosition ? e(item.kaoMingPosition) : '<span class="flag">POSITION NOT STATED / 尚未提出立場</span>'}</p>
      <p><strong>Status / 狀態：</strong>${e(item.status)} · last ${e(last?.occurredAt ?? '—')}: ${e(last?.summary ?? '—')}</p>
      <p><strong>Next / 下一步：</strong>${e(item.nextAction ?? 'Not recorded / 尚未記錄')} · owner ${e(row.ownerName)}</p></article>`;
  }).join('');
  const body = `<header><div class="meta"><span>KAO MING · 高明精機</span><span>Visit / 拜訪 ${e(visitDate)} · Prepared by ${e(actor.name)}</span></div>
    <h1>Agent visit briefing / 代理商拜訪簡報</h1><div>${e(partner.name)} · ${e(partner.countryCode)} · ${e(partner.code)}</div></header>
    <div class="summary"><div><strong>Open claims / 未結請款</strong><br/>${e(open.length)}</div><div><strong>Exposure / 請款總額</strong><br/>${e(summary)}</div><div><strong>Machines / 在外機台</strong><br/>${e(installed.length)}</div></div>
    <h2>Claims and positions / 請款及處理立場</h2>${claimBlocks || '<p>No open claims / 無未結請款</p>'}
    <div class="two"><section><h2>Installed machines / 在外機台</h2><table><thead><tr><th>Serial</th><th>Model</th><th>Accepted</th></tr></thead><tbody>${installed.map((machine) => `<tr><td>${e(machine.serial)}</td><td>${e(machine.model)}</td><td>${e(machine.acceptedAt ?? '—')}</td></tr>`).join('')}</tbody></table></section>
    <section><h2>Commercial follow-up / 商務追蹤</h2><p>Pending credits / 待抵用折讓：${pendingCredits.map((credit) => `${e(credit.number)} ${e(credit.currency)} ${e(credit.amount)}`).join(' · ') || 'None'}</p>
    <p>Final payments pending / 尾款待收：${payments.map((payment) => e(payment.pi)).join(' · ') || 'None'}</p></section></div>`;
  const html = await renderChineseHtml(body, styles);
  return renderA4Pdf(html, { dealNumber: partner.code, revision: 1, issueDate: visitDate });
}
