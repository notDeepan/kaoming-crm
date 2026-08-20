import type { Role } from "./enums";

/**
 * Role-based permissions, expressed as create/read/update/delete per entity plus a separate
 * export permission — the §26.2 matrix, verbatim. This is the server-side gate; the UI hides
 * controls a role cannot use, but every mutation re-checks here.
 */
export type Action = "c" | "r" | "u" | "d";
export type Entity =
  | "agent"
  | "customer"
  | "contact"
  | "enquiry"
  | "opportunity"
  | "quotation"
  | "catalogue"
  | "installed_machine"
  | "document"
  | "knowledge"
  | "user"
  | "settings";

// "CRUD" style capability strings from §26.2. "own" nuances (own-delete only) are enforced at
// the call site with an ownership check; here we grant the base capability.
const MATRIX: Record<Entity, Record<Role, string>> = {
  agent: { admin: "crud", sales_manager: "crud", sales: "cru", engineer: "r", viewer: "r" },
  customer: { admin: "crud", sales_manager: "crud", sales: "cru", engineer: "r", viewer: "r" },
  contact: { admin: "crud", sales_manager: "crud", sales: "crud", engineer: "r", viewer: "r" },
  enquiry: { admin: "crud", sales_manager: "crud", sales: "crud", engineer: "r", viewer: "r" },
  opportunity: { admin: "crud", sales_manager: "crud", sales: "cru", engineer: "r", viewer: "r" },
  quotation: { admin: "crud", sales_manager: "crud", sales: "cru", engineer: "r", viewer: "r" },
  catalogue: { admin: "crud", sales_manager: "r", sales: "r", engineer: "ru", viewer: "r" },
  installed_machine: { admin: "crud", sales_manager: "crud", sales: "cru", engineer: "ru", viewer: "r" },
  document: { admin: "crud", sales_manager: "crud", sales: "crud", engineer: "crud", viewer: "r" },
  knowledge: { admin: "crud", sales_manager: "crud", sales: "r", engineer: "cru", viewer: "r" },
  user: { admin: "crud", sales_manager: "r", sales: "", engineer: "", viewer: "" },
  settings: { admin: "crud", sales_manager: "r", sales: "", engineer: "", viewer: "" },
};

export function can(role: Role, action: Action, entity: Entity): boolean {
  return MATRIX[entity][role].includes(action);
}

export function canExport(role: Role): boolean {
  // §26.2 — export to Excel: Admin, Sales Manager, Sales. Not Engineer or Viewer.
  return role === "admin" || role === "sales_manager" || role === "sales";
}

export function isAdmin(role: Role): boolean {
  return role === "admin";
}
