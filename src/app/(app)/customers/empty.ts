// Plain module — see agents/empty.ts for why runtime constants can't live in a "use client" file.

export interface CustomerInitial {
  id?: string;
  customerCode: string;
  companyNameEn: string;
  companyNameLocal: string;
  country: string;
  city: string;
  addressEn: string;
  addressLocal: string;
  industry: string;
  customerType: string;
  primaryAgentId: string;
  ownerUserId: string;
  website: string;
  employeeCount: string;
  existingMachinesNotes: string;
  notes: string;
}

export const EMPTY_CUSTOMER: CustomerInitial = {
  customerCode: "", companyNameEn: "", companyNameLocal: "", country: "", city: "",
  addressEn: "", addressLocal: "", industry: "", customerType: "prospect", primaryAgentId: "",
  ownerUserId: "", website: "", employeeCount: "", existingMachinesNotes: "", notes: "",
};
