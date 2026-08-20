// Plain module — see agents/empty.ts.

export interface UserInitial {
  id?: string;
  username: string;
  email: string;
  fullName: string;
  fullNameZh: string;
  role: string;
  languagePreference: string;
  jobTitle: string;
  phone: string;
  status: string;
}

export const EMPTY_USER: UserInitial = {
  username: "", email: "", fullName: "", fullNameZh: "", role: "sales",
  languagePreference: "en", jobTitle: "", phone: "", status: "active",
};
