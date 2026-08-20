import "server-only";
import { prisma } from "@/lib/prisma";

export interface ContactRow {
  id: string;
  fullName: string;
  nameLocal: string | null;
  jobTitle: string | null;
  roleInDeal: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  isPrimary: boolean;
  parentType: string;
  parentId: string;
  parentName: string;
  parentCode: string;
}

export async function listContacts(): Promise<ContactRow[]> {
  const contacts = await prisma.contact.findMany({
    where: { deletedAt: null },
    include: {
      agent: { select: { agentCode: true, companyNameEn: true } },
      customer: { select: { customerCode: true, companyNameEn: true } },
    },
    orderBy: [{ isPrimary: "desc" }, { fullName: "asc" }],
  });
  return contacts.map((c) => {
    const isAgent = c.parentType === "agent";
    return {
      id: c.id,
      fullName: c.fullName,
      nameLocal: c.nameLocal,
      jobTitle: c.jobTitle,
      roleInDeal: c.roleInDeal,
      email: c.email,
      phone: c.phone,
      mobile: c.mobile,
      isPrimary: c.isPrimary,
      parentType: c.parentType,
      parentId: (isAgent ? c.agentId : c.customerId) ?? "",
      parentName: isAgent ? (c.agent?.companyNameEn ?? "—") : (c.customer?.companyNameEn ?? "—"),
      parentCode: isAgent ? (c.agent?.agentCode ?? "") : (c.customer?.customerCode ?? ""),
    };
  });
}

export async function getContact(id: string) {
  return prisma.contact.findFirst({
    where: { id, deletedAt: null },
    include: {
      agent: { select: { id: true, agentCode: true, companyNameEn: true } },
      customer: { select: { id: true, customerCode: true, companyNameEn: true } },
    },
  });
}

export async function contactParentOptions() {
  const [agents, customers] = await Promise.all([
    prisma.agent.findMany({
      where: { deletedAt: null },
      select: { id: true, agentCode: true, companyNameEn: true },
      orderBy: { agentCode: "asc" },
    }),
    prisma.customer.findMany({
      where: { deletedAt: null },
      select: { id: true, customerCode: true, companyNameEn: true },
      orderBy: { customerCode: "asc" },
    }),
  ]);
  return {
    agents: agents.map((a) => ({ id: a.id, label: `${a.agentCode} · ${a.companyNameEn}` })),
    customers: customers.map((c) => ({ id: c.id, label: `${c.customerCode} · ${c.companyNameEn}` })),
  };
}
