import { escapeHtml as e, rocDate } from '../../chinese';

export type SpecSheetDocument = {
  dealNumber: string; piNumber: string; miNumber: string; revision: number;
  issuedAt: Date; neededAt: string | null; partnerCode: string; partnerName: string;
  modelCode: string; modelNameZh: string; batchNumber: string | null;
  quantity: string; preparedBy: string; customImageCount: number; customImageNames: string[];
  specs: { categoryZh: string; valueZh: string }[];
};

export function renderSpecSheetTemplate(data: SpecSheetDocument): string {
  return `<main class="sheet"><header><div class="company">高明精機工業股份有限公司</div>
    <div class="title">製　造　規　格　表</div><div class="header-meta">版次：${e(data.revision)}<br/>頁次：1 / 1</div></header>
    <section class="metadata">
      <div>製單日期：${e(rocDate(data.issuedAt))}</div><div>內外銷：國外</div><div>訂單號碼：${e(data.piNumber)}</div>
      <div>需要日期：${e(data.neededAt ? rocDate(data.neededAt) : '')}</div>
      <div class="span2">客戶名稱：${e(data.partnerCode)} ${e(data.partnerName)}</div>
      <div>製令單號：${e(data.miNumber)}</div><div>製造批號：${e(data.batchNumber)}</div>
    </section>
    <div class="model">${e(data.modelNameZh)}<br/>型　號　${e(data.modelCode)} <span>數　量　${e(data.quantity)}</span></div>
    <table><tbody>${data.specs.map((spec) => `<tr><th>${e(spec.categoryZh)}</th><td>${e(spec.valueZh)}</td></tr>`).join('')}</tbody></table>
    <div class="manifest">自訂變更參考附件：${e(data.customImageCount)} 件；${data.customImageNames.length ? data.customImageNames.map(e).join('、') : '無'}。附件須標示製造規格表版次 ${e(data.revision)}。</div>
    <footer><span>生管：________________</span><span>核覆：________________</span><span>經辦：${e(data.preparedBy)} ________________</span></footer>
  </main>`;
}
