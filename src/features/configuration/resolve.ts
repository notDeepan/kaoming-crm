import type { itemTypes, specValueSources } from '@/db/enums';

type ItemType = (typeof itemTypes)[number];
type SpecSource = (typeof specValueSources)[number];
export type SpecPair = { valueEn: string; valueZh: string };
export type ConfigurationLine = {
  itemId: string;
  itemType: ItemType;
  categoryCode: string | null;
  descriptionEn: string;
  descriptionZh: string;
  specOverride: SpecPair | null;
  included: boolean;
};
export type ComplianceInput = {
  voltage: string | null;
  frequency: string | null;
  phase: string | null;
  ceVariant: string | null;
  labelLanguages: string[] | null;
  nameplateRequired: boolean | null;
  defaultColourCodes: string[] | null;
};
export type ResolvedSpec = SpecPair & {
  categoryCode: string;
  isUpgraded: boolean;
  source: SpecSource;
  sourceItemIds: string[];
};

function present(value: string | null | undefined): value is string {
  return Boolean(value?.trim());
}

export function resolveConfiguration(
  baseSpecs: Record<string, SpecPair> | null,
  lines: ConfigurationLine[],
  compliance: ComplianceInput | null,
): ResolvedSpec[] {
  const resolved = new Map<string, ResolvedSpec>();
  for (const [categoryCode, value] of Object.entries(baseSpecs ?? {})) {
    if (!present(value.valueEn) || !present(value.valueZh)) {
      throw new Error(`The model's ${categoryCode} base specification needs English and Chinese values`);
    }
    resolved.set(categoryCode, {
      categoryCode, valueEn: value.valueEn.trim(), valueZh: value.valueZh.trim(),
      isUpgraded: false, source: 'base', sourceItemIds: [],
    });
  }

  for (const line of lines) {
    if (!line.included || line.itemType === 'service' || line.itemType === 'excluded' || line.itemType === 'machine') continue;
    if (!line.categoryCode) throw new Error(`Included ${line.itemType} ${line.itemId} needs a specification category`);
    if (line.itemType === 'spec_change') {
      if (!line.specOverride || !present(line.specOverride.valueEn) || !present(line.specOverride.valueZh)) {
        throw new Error(`Specification change ${line.itemId} needs a bilingual override`);
      }
      resolved.set(line.categoryCode, {
        categoryCode: line.categoryCode, valueEn: line.specOverride.valueEn.trim(),
        valueZh: line.specOverride.valueZh.trim(), isUpgraded: true,
        source: 'quotation_line', sourceItemIds: [line.itemId],
      });
    } else if (line.itemType === 'accessory') {
      if (!present(line.descriptionEn) || !present(line.descriptionZh)) {
        throw new Error(`Accessory ${line.itemId} needs an English and Chinese item name`);
      }
      const previous = resolved.get(line.categoryCode);
      resolved.set(line.categoryCode, {
        categoryCode: line.categoryCode,
        valueEn: [previous?.valueEn, line.descriptionEn.trim()].filter(Boolean).join('; '),
        valueZh: [previous?.valueZh, line.descriptionZh.trim()].filter(Boolean).join('；'),
        isUpgraded: true, source: 'quotation_line',
        sourceItemIds: [...(previous?.sourceItemIds ?? []), line.itemId],
      });
    }
  }

  if (compliance) {
    if (present(compliance.voltage) && present(compliance.frequency) && present(compliance.phase)) {
      const phaseCount = compliance.phase.replace(/\s*相\s*$/, '').trim();
      resolved.set('electrical', {
        categoryCode: 'electrical',
        valueEn: `${compliance.voltage} / ${compliance.frequency} / ${phaseCount} phase`,
        valueZh: `${compliance.voltage} / ${compliance.frequency} / ${phaseCount} 相`,
        isUpgraded: false, source: 'compliance_profile', sourceItemIds: [],
      });
    }
    if (present(compliance.ceVariant) && compliance.labelLanguages?.length && compliance.nameplateRequired !== null) {
      const languages = compliance.labelLanguages.join(', ');
      resolved.set('compliance', {
        categoryCode: 'compliance',
        valueEn: `${compliance.ceVariant}; labels: ${languages}; ${compliance.nameplateRequired ? 'agent nameplate required' : 'no agent nameplate'}`,
        valueZh: `${compliance.ceVariant}；標語: ${languages}；${compliance.nameplateRequired ? '貼代理商名牌' : '無代理商名牌'}`,
        isUpgraded: false, source: 'compliance_profile', sourceItemIds: [],
      });
    }
    if (compliance.defaultColourCodes?.length) {
      const colours = compliance.defaultColourCodes.join(' / ');
      resolved.set('colour', {
        categoryCode: 'colour', valueEn: colours, valueZh: colours,
        isUpgraded: false, source: 'compliance_profile', sourceItemIds: [],
      });
    }
  }
  return [...resolved.values()];
}
