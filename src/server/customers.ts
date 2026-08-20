import "server-only";
import { prisma } from "@/lib/prisma";

export interface CustomerRow {
  id: string;
  customerCode: string;
  companyNameEn: string;
  companyNameLocal: string | null;
  country: string;
  city: string | null;
  industry: string | null;
  customerType: string;
  primaryAgentId: string | null;
  primaryAgentCode: string | null;
  ownerUserId: string;
  ownerName: string;
  contactCount: number;
}

export async function listCustomers(ownerNames: Map<string, string>): Promise<CustomerRow[]> {
  const customers = await prisma.customer.findMany({
    where: { deletedAt: null },
    include: {
      primaryAgent: { select: { agentCode: true } },
      _count: { select: { contacts: { where: { deletedAt: null } } } },
    },
    orderBy: { customerCode: "asc" },
  });
  return customers.map((c) => ({
    id: c.id,
    customerCode: c.customerCode,
    companyNameEn: c.companyNameEn,
    companyNameLocal: c.companyNameLocal,
    country: c.country,
    city: c.city,
    industry: c.industry,
    customerType: c.customerType,
    primaryAgentId: c.primaryAgentId,
    primaryAgentCode: c.primaryAgent?.agentCode ?? null,
    ownerUserId: c.ownerUserId,
    ownerName: ownerNames.get(c.ownerUserId) ?? "—",
    contactCount: c._count.contacts,
  }));
}

export async function getCustomer(id: string) {
  return prisma.customer.findFirst({
    where: { id, deletedAt: null },
    include: {
      primaryAgent: { select: { id: true, agentCode: true, companyNameEn: true } },
      contacts: { where: { deletedAt: null }, orderBy: [{ isPrimary: "desc" }, { fullName: "asc" }] },
    },
  });
}

export async function agentOptions() {
  const agents = await prisma.agent.findMany({
    where: { deletedAt: null },
    select: { id: true, agentCode: true, companyNameEn: true },
    orderBy: { agentCode: "asc" },
  });
  return agents.map((a) => ({ id: a.id, label: `${a.agentCode} · ${a.companyNameEn}` }));
}

/** CU-02 — probable duplicate by fuzzy name + country match. */
export async function findDuplicateCustomers(nameEn: string, country: string, excludeId?: string) {
  const norm = nameEn.trim().toLowerCase();
  if (!norm) return [];
  const candidates = await prisma.customer.findMany({
    where: { deletedAt: null, country, id: { not: excludeId } },
    select: { id: true, customerCode: true, companyNameEn: true, country: true },
  });
  return candidates.filter((c) => {
    const a = c.companyNameEn.toLowerCase();
    return a.includes(norm) || norm.includes(a);
  });
}
