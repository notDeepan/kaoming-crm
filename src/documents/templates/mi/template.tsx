import { escapeHtml as e, rocDate } from '../../chinese';

export type MiDocument = {
  dealNumber: string; piNumber: string; miNumber: string; issuedAt: Date;
  plannedStart: string | null; plannedFinish: string | null; batchNumber: string | null;
  productionStatus: string; partnerCode: string; partnerName: string;
  modelCode: string; modelNameZh: string; preparedBy: string;
  isProvisional: boolean; provisionalHoldStage: string | null;
  customImageCount: number; customImageNames: string[];
  lines: { lineNo: number; itemCode: string; nameZh: string; unit: string; quantity: string }[];
};

export function renderMiTemplate(data: MiDocument): string {
  return `<main class="sheet"><header><div class="company">高明精機工業股份有限公司</div>
    <div class="title">製　令　單</div><div class="header-meta">製表日期：${e(rocDate(data.issuedAt))}<br/>頁次：1 / 1</div></header>
    <section class="metadata">
      <div>開單日期：${e(rocDate(data.issuedAt))}</div><div>製令單號：<strong>${e(data.miNumber)}</strong></div>
      <div>部門：業務部</div><div>製單人：${e(data.preparedBy)}</div>
      <div>訂單號碼：${e(data.piNumber)}</div><div class="span3">客戶名稱：${e(data.partnerCode)} ${e(data.partnerName)}</div>
      <div>開工日期：${e(data.plannedStart ? rocDate(data.plannedStart) : '')}</div>
      <div>完工日期：${e(data.plannedFinish ? rocDate(data.plannedFinish) : '')}</div>
      <div>製造批號：${e(data.batchNumber)}</div><div>生產狀況：${e(data.productionStatus)}</div>
      <div>派工部門：</div><div>派工員工：</div><div class="span2">修改日期：</div>
    </section>
    <table><thead><tr><th>次</th><th>品號</th><th>品名規格</th><th>單位</th><th>生產數量</th><th>備註</th></tr></thead><tbody>
      ${data.lines.map((line) => `<tr><td>${e(line.lineNo)}</td><td>${e(line.itemCode)}</td><td>${e(line.nameZh)}</td><td>${e(line.unit)}</td><td>${e(line.quantity)}</td><td></td></tr>`).join('')}
    </tbody></table>
    <section class="remarks"><strong>備　註</strong><br/>型號：${e(data.modelCode)} ${e(data.modelNameZh)}<br/>
      ${data.isProvisional ? `預定單：${e(data.provisionalHoldStage)}<br/>` : ''}
      自訂變更參考附件：${e(data.customImageCount)} 件；${data.customImageNames.length ? data.customImageNames.map(e).join('、') : '無'}；請核對製造規格表版次及附件清單。</section>
    <footer><span>生管：________________</span><span>核覆：________________</span><span>經辦：${e(data.preparedBy)} ________________</span></footer>
  </main>`;
}
