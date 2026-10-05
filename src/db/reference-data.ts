import { getDb } from './client';
import { specCategories } from './schema';

// Fixed document sections shared by every installation. These are reference data,
// not worked-example customers, products, prices, or transactions.
export const referenceSpecCategories = [
  { code: 'standard_accessories', nameEn: 'Standard accessories', nameZh: '標準附件', sortOrder: 10, appearsOn: ['quotation', 'proposal', 'spec_sheet'] },
  { code: 'spindle', nameEn: 'Spindle', nameZh: '主軸', sortOrder: 20, appearsOn: ['quotation', 'proposal', 'spec_sheet'] },
  { code: 'tool_magazine', nameEn: 'Tool magazine and guard', nameZh: '刀庫及護罩', sortOrder: 30, appearsOn: ['quotation', 'proposal', 'spec_sheet'] },
  { code: 'controller', nameEn: 'Controller and CRT', nameZh: '控制器及CRT', sortOrder: 40, appearsOn: ['quotation', 'proposal', 'spec_sheet'] },
  { code: 'travels', nameEn: 'Axis travels', nameZh: '行程', sortOrder: 50, appearsOn: ['quotation', 'proposal', 'spec_sheet'] },
  { code: 'table', nameEn: 'Table', nameZh: '工作台', sortOrder: 60, appearsOn: ['quotation', 'proposal', 'spec_sheet'] },
  { code: 'coolant', nameEn: 'Coolant system', nameZh: '冷卻系統', sortOrder: 70, appearsOn: ['quotation', 'proposal', 'spec_sheet'] },
  { code: 'chip_conveyor', nameEn: 'Chip conveyor', nameZh: '排屑機', sortOrder: 80, appearsOn: ['quotation', 'proposal', 'spec_sheet'] },
  { code: 'attachment_head', nameEn: 'Attachment head', nameZh: '附件頭', sortOrder: 90, appearsOn: ['quotation', 'proposal', 'spec_sheet'] },
  { code: 'electrical', nameEn: 'Electrical supply', nameZh: '電壓', sortOrder: 100, appearsOn: ['proposal', 'spec_sheet'] },
  { code: 'compliance', nameEn: 'Compliance and nameplate', nameZh: '規格及銘牌文字', sortOrder: 110, appearsOn: ['proposal', 'spec_sheet'] },
  { code: 'colour', nameEn: 'Colour', nameZh: '顏色', sortOrder: 120, appearsOn: ['spec_sheet'] },
  { code: 'special', nameEn: 'Special accessories', nameZh: '特別附件', sortOrder: 130, appearsOn: ['quotation', 'proposal', 'spec_sheet'] },
];

export async function ensureReferenceData() {
  const db = getDb();
  for (const category of referenceSpecCategories) {
    await db.insert(specCategories).values(category).onConflictDoNothing();
  }
}
