/**
 * Single source of truth for every "enum" in the system.
 *
 * Prisma enums are unsupported on SQLite and §28.3 wants enums stored as readable strings,
 * so enums live here as `as const` string tuples with Zod validators. UI labels are NOT here —
 * they live in the i18n message files, keyed by `enums.<group>.<value>`, so both languages
 * render from one place (LO-02: no hard-coded strings).
 */
import { z } from "zod";

export const ROLES = [
  "admin",
  "sales_manager",
  "sales",
  "engineer",
  "viewer",
] as const;
export const LANGUAGES = ["en", "zh-TW"] as const;
export const USER_STATUSES = ["active", "suspended", "disabled"] as const;

export const AGENT_TYPES = [
  "agent",
  "distributor",
  "dealer",
  "representative",
  "trading_company",
] as const;
export const AGENT_STATUSES = [
  "prospective",
  "active",
  "probation",
  "dormant",
  "terminated",
] as const;
export const EXCLUSIVITY = [
  "exclusive",
  "non_exclusive",
  "exclusive_by_product_line",
] as const;
export const PRICING_BASIS = [
  "net_price",
  "list_less_discount",
  "commission_on_invoice",
] as const;
export const CURRENCIES = ["USD", "TWD"] as const;
export const WORKING_LANGUAGES = ["english", "chinese", "other"] as const;

export const INDUSTRIES = [
  "die_mould",
  "aerospace",
  "automotive",
  "energy",
  "heavy_machinery",
  "general_subcontract",
  "semiconductor",
  "other",
] as const;
export const CUSTOMER_TYPES = ["prospect", "active", "former"] as const;

export const CONTACT_PARENTS = ["agent", "customer"] as const;
export const ROLES_IN_DEAL = [
  "decision_maker",
  "technical_evaluator",
  "purchasing",
  "operator",
  "owner",
] as const;

export const PRODUCT_FAMILIES = [
  "double_column",
  "high_speed_double_column",
  "multi_face",
  "five_axis",
  "vertical",
  "radial_drill",
  "without_atc",
] as const;

export const ENQUIRY_SOURCES = [
  "agent",
  "trade_show",
  "website",
  "referral",
  "direct_approach",
  "existing_customer",
  "other",
] as const;
export const ENQUIRY_TYPES = [
  "new_machine",
  "spare_parts",
  "technical_question",
  "other",
] as const;
export const ENQUIRY_STATUSES = [
  "new",
  "in_review",
  "converted",
  "not_pursued",
] as const;
export const NOT_PURSUED_REASONS = [
  "out_of_range",
  "no_budget",
  "territory_conflict",
  "no_response",
  "not_genuine",
  "other",
] as const;

export const STAGES = [
  "qualified",
  "specification",
  "quoted",
  "negotiation",
  "demonstration",
  "verbal_commitment",
  "won",
  "lost",
  "dormant",
] as const;
export const STAGE_PROBABILITY: Record<(typeof STAGES)[number], number> = {
  qualified: 10,
  specification: 25,
  quoted: 40,
  negotiation: 60,
  demonstration: 75,
  verbal_commitment: 90,
  won: 100,
  lost: 0,
  dormant: 0,
};
export const LOST_REASONS = [
  "price",
  "delivery",
  "specification",
  "competitor",
  "budget_withdrawn",
  "no_decision",
  "other",
] as const;

export const UNIT_SYSTEMS = ["metric", "imperial"] as const;
export const LINE_KINDS = ["machine", "option", "custom"] as const;
export const REMEMBERED_FIELD_KEYS = [
  "terms_of_payment",
  "time_of_delivery",
  "place_of_delivery",
  "machine_type",
  "config_heading",
] as const;

export const QUOTE_TO = ["agent", "end_customer"] as const;
export const QUOTATION_STATUSES = [
  "draft",
  "issued",
  "superseded",
  "accepted",
  "declined",
  "expired",
] as const;
export const LINE_TYPES = ["catalogue", "custom"] as const;
export const ENGINEERING_REVIEW_STATUSES = [
  "not_required",
  "pending",
  "approved",
] as const;

export const MODEL_STATUSES = ["active", "legacy", "discontinued"] as const;
export const OPTION_CATEGORIES = [
  "controller",
  "spindle",
  "spindle_taper",
  "tool_magazine",
  "attachment_head",
  "rotary_table",
  "coolant",
  "chip_handling",
  "measurement_probing",
  "linear_scales",
  "axis_travel_extension",
  "electrical_voltage",
  "safety_compliance",
  "packing_shipping",
  "documentation_language",
  "other",
] as const;

export const ACTIVITY_TYPES = [
  "email",
  "call",
  "meeting",
  "customer_visit",
  "factory_visit_by_customer",
  "machine_demonstration",
  "trade_show_meeting",
  "sample_test",
  "fat",
  "installation",
  "internal_note",
] as const;
export const ACTIVITY_PARENTS = [
  "agent",
  "customer",
  "opportunity",
  "installed_machine",
] as const;
export const DIRECTIONS = ["inbound", "outbound"] as const;
export const OUTCOMES = ["positive", "neutral", "negative", "no_response"] as const;
export const ACTIVITY_STATUSES = ["planned", "completed", "cancelled"] as const;

export const INSTALLED_STATUSES = [
  "on_order",
  "shipped",
  "installed",
  "operational",
  "decommissioned",
] as const;
export const FAT_STATUSES = [
  "not_scheduled",
  "scheduled",
  "passed",
  "passed_with_conditions",
] as const;
export const ORDER_STATUSES = [
  "received",
  "in_production",
  "ready_for_fat",
  "shipped",
  "delivered",
  "installed",
] as const;

export const DOCUMENT_TYPES = [
  "layout_drawing",
  "foundation_plan",
  "specification_sheet",
  "quotation_pdf",
  "proforma_invoice",
  "purchase_order",
  "test_report",
  "fat_report",
  "installation_report",
  "agency_agreement",
  "certificate",
  "photo",
  "other",
] as const;
export const SENSITIVITIES = ["internal", "restricted", "confidential"] as const;
export const DOCUMENT_PARENTS = [
  "agent",
  "customer",
  "opportunity",
  "quotation",
  "installed_machine",
  "machine_model",
  "general",
] as const;

export const KNOWLEDGE_CATEGORIES = [
  "product_specification",
  "application_note",
  "competitor_comparison",
  "commercial_terms",
  "sales_guidance",
  "faq",
] as const;
export const KNOWLEDGE_VISIBILITY = ["all", "sales_only", "admin_only"] as const;
export const KNOWLEDGE_STATUSES = ["draft", "published", "archived"] as const;

export const NOTIFICATION_TYPES = [
  "activity_due",
  "opportunity_inactive",
  "agent_overdue",
  "quotation_expiring",
  "quotation_expired",
  "warranty_expiring",
  "agreement_expiring",
  "enquiry_stale",
  "ownership_assigned",
] as const;

export const AUDIT_ACTIONS = [
  "login",
  "logout",
  "login_failed",
  "create",
  "update",
  "delete",
  "document_view",
  "document_download",
  "permission_change",
  "export",
  "quotation_issue",
  "quotation_revise",
] as const;

// Zod validators, derived so they never drift from the tuples above.
export const zRole = z.enum(ROLES);
export const zLanguage = z.enum(LANGUAGES);
export const zUserStatus = z.enum(USER_STATUSES);
export const zAgentType = z.enum(AGENT_TYPES);
export const zAgentStatus = z.enum(AGENT_STATUSES);
export const zExclusivity = z.enum(EXCLUSIVITY);
export const zPricingBasis = z.enum(PRICING_BASIS);
export const zCurrency = z.enum(CURRENCIES);
export const zWorkingLanguage = z.enum(WORKING_LANGUAGES);
export const zIndustry = z.enum(INDUSTRIES);
export const zCustomerType = z.enum(CUSTOMER_TYPES);
export const zContactParent = z.enum(CONTACT_PARENTS);
export const zRoleInDeal = z.enum(ROLES_IN_DEAL);
export const zProductFamily = z.enum(PRODUCT_FAMILIES);

export type Role = (typeof ROLES)[number];
export type Language = (typeof LANGUAGES)[number];
export type AgentStatus = (typeof AGENT_STATUSES)[number];
export type Currency = (typeof CURRENCIES)[number];
