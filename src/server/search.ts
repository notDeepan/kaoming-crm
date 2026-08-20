import "server-only";
import { prisma } from "@/lib/prisma";

export interface SearchHit {
  type: "agent" | "customer" | "contact" | "installed_machine";
  id: string;
  href: string;
  primary: string;
  secondary: string;
  code: string;
}

// SL-01 — one global search over agents, customers, contacts and serial numbers, grouped by type.
// SQLite `contains` is case-insensitive for ASCII by default; adequate at v1 scale.
export async function globalSearch(query: string): Promise<SearchHit[]> {
  const q = query.trim();
  if (q.length < 1) return [];

  const [agents, customers, contacts, machines] = await Promise.all([
    prisma.agent.findMany({
      where: {
        deletedAt: null,
        OR: [
          { agentCode: { contains: q } },
          { companyNameEn: { contains: q } },
          { companyNameLocal: { contains: q } },
        ],
      },
      take: 10,
      select: { id: true, agentCode: true, companyNameEn: true, status: true },
    }),
    prisma.customer.findMany({
      where: {
        deletedAt: null,
        OR: [
          { customerCode: { contains: q } },
          { companyNameEn: { contains: q } },
          { companyNameLocal: { contains: q } },
          { city: { contains: q } },
        ],
      },
      take: 10,
      select: { id: true, customerCode: true, companyNameEn: true, country: true },
    }),
    prisma.contact.findMany({
      where: {
        deletedAt: null,
        OR: [
          { fullName: { contains: q } },
          { nameLocal: { contains: q } },
          { email: { contains: q } },
        ],
      },
      take: 10,
      select: { id: true, fullName: true, email: true, jobTitle: true },
    }),
    prisma.installedMachine.findMany({
      where: { deletedAt: null, serialNo: { contains: q } },
      take: 10,
      select: { id: true, serialNo: true, country: true },
    }),
  ]);

  return [
    ...agents.map<SearchHit>((a) => ({
      type: "agent", id: a.id, href: `/agents/${a.id}`, code: a.agentCode,
      primary: a.companyNameEn, secondary: a.status,
    })),
    ...customers.map<SearchHit>((c) => ({
      type: "customer", id: c.id, href: `/customers/${c.id}`, code: c.customerCode,
      primary: c.companyNameEn, secondary: c.country,
    })),
    ...contacts.map<SearchHit>((c) => ({
      type: "contact", id: c.id, href: `/contacts/${c.id}`, code: "",
      primary: c.fullName, secondary: c.jobTitle ?? c.email ?? "",
    })),
    ...machines.map<SearchHit>((m) => ({
      type: "installed_machine", id: m.id, href: `/installed/${m.id}`, code: m.serialNo,
      primary: m.serialNo, secondary: m.country,
    })),
  ];
}
