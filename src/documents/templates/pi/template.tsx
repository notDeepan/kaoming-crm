import { escapeHtml as e, rocDate } from '../../chinese';

export type PiDocument = {
  dealNumber: string; piNumber: string; issuedAt: Date; partnerCode: string;
  partnerName: string; customerName: string | null; countryCode: string;
  salesOwnerName: string;
  modelCode: string; currency: string; incoterm: string; paymentTerms: string;
  deliveryTerms: string; leadTimeText: string; poRef: string;
  listTotal: string; discountAmount: string; netTotal: string;
  lines: { lineNo: number; code: string; nameZh: string; unit: string;
    quantity: string; unitPrice: string; lineTotal: string }[];
};

function money(value: string) {
  return Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function renderPiTemplate(data: PiDocument): string {
  const delivery = data.deliveryTerms.trim().toUpperCase().startsWith(data.incoterm.toUpperCase())
    ? data.deliveryTerms : `${data.incoterm} ${data.deliveryTerms}`.trim();
  return `<main class="sheet">
    <header><div class="company">高明精機工業股份有限公司</div><div class="title">訂　單</div>
      <div class="header-meta">製表日期：${e(rocDate(data.issuedAt))}<br/>頁次：1 / 1</div></header>
    <section class="metadata">
      <div>訂單號碼：<strong>${e(data.piNumber)}</strong></div><div>訂單日期：${e(rocDate(data.issuedAt))}</div><div>內外銷：國外</div>
      <div>代理商：${e(data.partnerCode)} ${e(data.partnerName)}</div><div>業務員：${e(data.salesOwnerName)}</div><div>幣別：${e(data.currency)}</div>
      <div>終端客戶：${e(data.customerName)}</div><div>國別：${e(data.countryCode)}</div><div>報價單號：${e(data.dealNumber)}</div>
      <div>幣別：${e(data.currency)}</div><div>交貨條件：${e(delivery)}</div><div>訂貨依據：${e(data.poRef)}</div>
      <div class="wide">付款條件：${e(data.paymentTerms)}　交期：${e(data.leadTimeText)}</div>
    </section>
    <table><thead><tr><th>次</th><th>品號</th><th>品名規格</th><th>單位</th><th>數量</th><th>單價</th><th>金額</th></tr></thead>
      <tbody>${data.lines.map((line) => `<tr><td>${e(line.lineNo)}</td><td>${e(line.code)}</td><td>${e(line.nameZh)}</td><td>${e(line.unit)}</td><td class="number">${e(line.quantity)}</td><td class="number">${e(money(line.unitPrice))}</td><td class="number">${e(money(line.lineTotal))}</td></tr>`).join('')}
      </tbody><tfoot><tr><td colspan="6">合計</td><td class="number">${e(money(data.listTotal))}</td></tr>
      <tr><td colspan="6">折扣</td><td class="number">-${e(money(data.discountAmount))}</td></tr>
      <tr><td colspan="6">訂單總額 ${e(data.currency)}</td><td class="number"><strong>${e(money(data.netTotal))}</strong></td></tr></tfoot></table>
    <section class="remarks"><strong>備註：</strong><br/>客戶訂單 ${e(data.poRef)} 已核對最終報價。機器型號：${e(data.modelCode)}。</section>
    <footer><span>業務主管：________________</span><span>核覆：________________</span><span>經辦：________________</span></footer>
  </main>`;
}
