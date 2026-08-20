// Plain (non-client) module so server pages can import the runtime constant. A `const` exported
// from a "use client" module becomes an opaque client reference when imported server-side, which
// silently drops fields — hence these live here.

export interface AgentInitial {
  id?: string;
  agentCode: string;
  companyNameEn: string;
  companyNameLocal: string;
  agentType: string;
  status: string;
  website: string;
  ownerUserId: string;
  exclusivity: string;
  pricingBasis: string;
  preferredCurrency: string;
  workingLanguage: string;
  commissionPercent: string;
  standardDiscountPercent: string;
  contactCadenceDays: string;
  paymentTerms: string;
  preferredIncoterms: string;
  territoryNotes: string;
  notes: string;
  agreementStartDate: string;
  agreementEndDate: string;
  firstAppointedDate: string;
  territories: string[];
  exclusiveProductFamilies: string[];
}

export const EMPTY_AGENT: AgentInitial = {
  agentCode: "", companyNameEn: "", companyNameLocal: "", agentType: "agent", status: "prospective",
  website: "", ownerUserId: "", exclusivity: "", pricingBasis: "", preferredCurrency: "",
  workingLanguage: "", commissionPercent: "", standardDiscountPercent: "", contactCadenceDays: "",
  paymentTerms: "", preferredIncoterms: "", territoryNotes: "", notes: "",
  agreementStartDate: "", agreementEndDate: "", firstAppointedDate: "",
  territories: [], exclusiveProductFamilies: [],
};
