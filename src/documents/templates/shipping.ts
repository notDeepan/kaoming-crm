import { escapeHtml as e, rocDate, renderChineseHtml } from '../chinese';

export type ShippingDocument = {
  dealNumber: string; piNumber: string; partnerName: string; modelCode: string;
  serialNumber: string | null; forwarderName: string | null; vesselOrFlight: string;
  bookingReference: string; etd: string; eta: string; incoterm: string;
  packageLengthMm: number; packageWidthMm: number; packageHeightMm: number;
  grossWeightKg: string; billOfLadingRef: string | null; preparedBy: string;
};

const style = `@page{size:A4 portrait;margin:15mm 14mm 18mm}
*{box-sizing:border-box}body{font-family:"Noto Sans TC",Arial,sans-serif;color:#152333;font-size:11px}
header{border-bottom:2px solid #152333;padding-bottom:12px;text-align:center}header .company{font-size:15px}
h1{font-size:23px;margin:8px 0 2px}p{line-height:1.6}table{border-collapse:collapse;width:100%;margin-top:20px}
th,td{border:1px solid #8390a0;padding:9px 10px;text-align:left}th{width:35%;background:#f3f5f7}
footer{display:flex;justify-content:space-between;gap:20px;margin-top:42px;border-top:1px solid #8390a0;padding-top:14px}`;

function rows(data: ShippingDocument, chinese: boolean) {
  const fields: [string, string][] = chinese ? [
    ['訂單號碼', data.piNumber], ['代理商', data.partnerName], ['機型', data.modelCode],
    ['機器序號', data.serialNumber ?? ''], ['承攬商', data.forwarderName ?? ''],
    ['船名／航班', data.vesselOrFlight], ['訂艙編號', data.bookingReference],
    ['預定出發', rocDate(data.etd)], ['預定抵達', rocDate(data.eta)],
    ['貿易條件', data.incoterm], ['包裝尺寸 mm', `${data.packageLengthMm} × ${data.packageWidthMm} × ${data.packageHeightMm}`],
    ['毛重 kg', data.grossWeightKg], ['提單號碼', data.billOfLadingRef ?? ''],
  ] : [
    ['Order', data.piNumber], ['Agent', data.partnerName], ['Model', data.modelCode],
    ['Serial number', data.serialNumber ?? ''], ['Forwarder', data.forwarderName ?? ''],
    ['Vessel / flight', data.vesselOrFlight], ['Booking reference', data.bookingReference],
    ['Estimated departure', data.etd], ['Estimated arrival', data.eta],
    ['Incoterm', data.incoterm], ['Package dimensions mm', `${data.packageLengthMm} × ${data.packageWidthMm} × ${data.packageHeightMm}`],
    ['Gross weight kg', data.grossWeightKg], ['Bill of lading', data.billOfLadingRef ?? ''],
  ];
  return fields.map(([label, value]) => `<tr><th>${e(label)}</th><td>${e(value)}</td></tr>`).join('');
}

export async function renderShippingOrderHtml(data: ShippingDocument) {
  return renderChineseHtml(`<header><div class="company">高明精機工業股份有限公司</div><h1>出　貨　單</h1></header>
    <p>本單據依訂單 ${e(data.piNumber)} 製作，請倉儲、物流與生管核對機器及裝箱資料。</p>
    <table>${rows(data, true)}</table><footer><span>生管：________________</span><span>倉儲：________________</span><span>核覆：________________</span><span>經辦：${e(data.preparedBy)} ________________</span></footer>`, style);
}

export function renderShippingNoticeHtml(data: ShippingDocument) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"/><style>${style}</style></head><body>
    <header><div class="company">KAO MING MACHINERY INDUSTRIAL CO., LTD.</div><h1>Shipping notice</h1></header>
    <p>Dear ${e(data.partnerName)}, the shipment space for your machine has been confirmed. Please review the booking details below.</p>
    <table>${rows(data, false)}</table><p>Contact your Kao Ming sales representative if any destination detail needs correction.</p>
    </body></html>`;
}
