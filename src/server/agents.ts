import "server-only";
import { prisma } from "@/lib/prisma";
import { daysBetween } from "@/lib/format";

const OPEN_STAGES = ["qualified", "specification", "quoted", "negotiation", "demonstration", "verbal_commitment"];

export interface AgentRow {
  id: string;
  agentCode: string;
  companyNameEn: string;
  companyNameLocal: string | null;
  agentType: string;
  status: string;
  territories: string[]; // country codes
  ownerUserId: string;
  ownerName: string;
  preferredCurrency: string | null;
  commissionPercent: string | null;
  lastContactDate: Date | null;
  contactCadenceDays: number | null;
  nextContactDue: Date | null;
  agreementEndDate: Date | null;
  daysSinceContact: number | null;
  overdue: boolean;
  openOppCount: number;
}

/** Derived performance panel figures (AG-03). Computed live; 0 until Phase 2 data exists. */
export interface AgentPerformance {
  openOppCount: number;
  openOppValueByCurrency: Record<string, number>;
  quotes12m: number;
  machines12m: number;
  machinesLifetime: number;
  installedInTerritory: number;
  daysSinceContact: number | null;
}

function overdueOf(last: Date | null, cadence: number | null): boolean {
  if (!last || !cadence) return false;
  return daysBetween(last) > cadence;
}

export async function listAgents(ownerNames: Map<string, string>): Promise<AgentRow[]> {
  const agents = await prisma.agent.findMany({
    where: { deletedAt: null },
    include: { territories: true },
    orderBy: { agentCode: "asc" },
  });

  // open opportunity counts per agent, in one grouped query
  const openCounts = await prisma.opportunity.groupBy({
    by: ["agentId"],
    where: { deletedAt: null, stage: { in: OPEN_STAGES }, agentId: { not: null } },
    _count: { _all: true },
  });
  const countMap = new Map(openCounts.map((c) => [c.agentId, c._count._all]));

  return agents.map((a) => {
    const days = a.lastContactDate ? daysBetween(a.lastContactDate) : null;
    return {
      id: a.id,
      agentCode: a.agentCode,
      companyNameEn: a.companyNameEn,
      companyNameLocal: a.companyNameLocal,
      agentType: a.agentType,
      status: a.status,
      territories: a.territories.map((t) => t.countryCode),
      ownerUserId: a.ownerUserId,
      ownerName: ownerNames.get(a.ownerUserId) ?? "—",
      preferredCurrency: a.preferredCurrency,
      commissionPercent: a.commissionPercent?.toString() ?? null,
      lastContactDate: a.lastContactDate,
      contactCadenceDays: a.contactCadenceDays,
      nextContactDue: a.nextContactDue,
      agreementEndDate: a.agreementEndDate,
      daysSinceContact: days,
      overdue: overdueOf(a.lastContactDate, a.contactCadenceDays),
      openOppCount: a.id ? (countMap.get(a.id) ?? 0) : 0,
    };
  });
}

export async function getAgent(id: string) {
  return prisma.agent.findFirst({
    where: { id, deletedAt: null },
    include: {
      territories: true,
      contacts: { where: { deletedAt: null }, orderBy: [{ isPrimary: "desc" }, { fullName: "asc" }] },
    },
  });
}

export async function agentPerformance(agentId: string, countryCodes: string[]): Promise<AgentPerformance> {
  const yearAgo = new Date(Date.now() - 365 * 86400_000);

  const [agent, openOpps, quotes12m, machinesLifetime, machines12m, installedTerritory] = await Promise.all([
    prisma.agent.findUnique({ where: { id: agentId }, select: { lastContactDate: true } }),
    prisma.opportunity.findMany({
      where: { agentId, deletedAt: null, stage: { in: OPEN_STAGES } },
      select: { estimatedValue: true, currency: true },
    }),
    prisma.quotation.count({
      where: { agentId, deletedAt: null, status: { not: "draft" }, issueDate: { gte: yearAgo } },
    }),
    prisma.installedMachine.count({ where: { agentId, deletedAt: null } }),
    prisma.installedMachine.count({
      where: { agentId, deletedAt: null, shipDate: { gte: yearAgo } },
    }),
    countryCodes.length
      ? prisma.installedMachine.count({ where: { deletedAt: null, country: { in: countryCodes } } })
      : Promise.resolve(0),
  ]);

  const valueByCurrency: Record<string, number> = {};
  for (const o of openOpps) {
    if (o.estimatedValue == null) continue;
    valueByCurrency[o.currency] = (valueByCurrency[o.currency] ?? 0) + Number(o.estimatedValue);
  }

  return {
    openOppCount: openOpps.length,
    openOppValueByCurrency: valueByCurrency,
    quotes12m,
    machines12m,
    machinesLifetime,
    installedInTerritory: installedTerritory,
    daysSinceContact: agent?.lastContactDate ? daysBetween(agent.lastContactDate) : null,
  };
}

/**
 * AG-01 / AG-02 territory checks. Returns exclusive conflicts (blockers surfaced as warnings —
 * per GP3 we warn, we do not gate) and non-exclusive overlaps, for the countries given.
 */
export async function territoryConflicts(
  countryCodes: string[],
  excludeAgentId?: string
): Promise<Array<{ countryCode: string; agentId: string; agentName: string; exclusive: boolean }>> {
  if (countryCodes.length === 0) return [];
  const rows = await prisma.agentTerritory.findMany({
    where: {
      countryCode: { in: countryCodes },
      agent: { deletedAt: null, status: { in: ["active", "probation"] }, id: { not: excludeAgentId } },
    },
    include: { agent: { select: { id: true, companyNameEn: true } } },
  });
  return rows.map((r) => ({
    countryCode: r.countryCode,
    agentId: r.agent.id,
    agentName: r.agent.companyNameEn,
    exclusive: r.exclusivity === "exclusive" || r.exclusivity === "exclusive_by_product_line",
  }));
}
