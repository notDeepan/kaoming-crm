// Plain module — see agents/empty.ts.

export interface ContactInitial {
  id?: string;
  parentType: string;
  agentId: string;
  customerId: string;
  fullName: string;
  nameLocal: string;
  jobTitle: string;
  roleInDeal: string;
  email: string;
  phone: string;
  mobile: string;
  messagingHandle: string;
  preferredLanguage: string;
  isPrimary: boolean;
  notes: string;
}

export const EMPTY_CONTACT: ContactInitial = {
  parentType: "customer", agentId: "", customerId: "", fullName: "", nameLocal: "", jobTitle: "",
  roleInDeal: "", email: "", phone: "", mobile: "", messagingHandle: "", preferredLanguage: "",
  isPrimary: false, notes: "",
};
