import { PrismaClient } from "@prisma/client";
import { hash } from "@node-rs/argon2";

const prisma = new PrismaClient();

// Deterministic "days ago" helper.
const daysAgo = (n: number) => new Date(Date.now() - n * 86400_000);
const daysAhead = (n: number) => new Date(Date.now() + n * 86400_000);

async function main() {
  // Clean, in FK-safe order (dev convenience — real deployments never hard-delete).
  await prisma.contact.deleteMany();
  await prisma.agentTerritory.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.agent.deleteMany();
  await prisma.systemSetting.deleteMany();
  await prisma.notificationPreference.deleteMany();
  await prisma.savedView.deleteMany();
  await prisma.user.deleteMany();

  // ── Users ──────────────────────────────────────────────────────────────────
  const adminPw = await hash("admin12345");
  const tempPw = await hash("changeme123");

  const admin = await prisma.user.create({
    data: {
      username: "deepan",
      email: "deepan@kaoming.com",
      fullName: "Deepan Goswami",
      fullNameZh: "高深",
      role: "admin",
      languagePreference: "en",
      jobTitle: "International Business Development",
      status: "active",
      passwordHash: adminPw,
      mustChangePassword: false,
    },
  });

  const [manager, sales1, sales2, engineer, viewer] = await Promise.all([
    prisma.user.create({
      data: { username: "lchen", email: "lchen@kaoming.com", fullName: "Lucy Chen", fullNameZh: "陳麗雲",
        role: "sales_manager", languagePreference: "zh-TW", jobTitle: "Overseas Sales Manager",
        status: "active", passwordHash: tempPw, mustChangePassword: true },
    }),
    prisma.user.create({
      data: { username: "mkaya", email: "mkaya@kaoming.com", fullName: "Mert Kaya",
        role: "sales", languagePreference: "en", jobTitle: "Overseas Sales Engineer",
        status: "active", passwordHash: tempPw, mustChangePassword: true },
    }),
    prisma.user.create({
      data: { username: "awong", email: "awong@kaoming.com", fullName: "Andy Wong", fullNameZh: "黃安迪",
        role: "sales", languagePreference: "zh-TW", jobTitle: "Overseas Sales Engineer",
        status: "active", passwordHash: tempPw, mustChangePassword: true },
    }),
    prisma.user.create({
      data: { username: "jhsu", email: "jhsu@kaoming.com", fullName: "Jason Hsu", fullNameZh: "許家源",
        role: "engineer", languagePreference: "zh-TW", jobTitle: "Application Engineer",
        status: "active", passwordHash: tempPw, mustChangePassword: true },
    }),
    prisma.user.create({
      data: { username: "director", email: "director@kaoming.com", fullName: "T. K. Kao", fullNameZh: "高德昌",
        role: "viewer", languagePreference: "zh-TW", jobTitle: "Managing Director",
        status: "active", passwordHash: tempPw, mustChangePassword: true },
    }),
  ]);

  // ── System settings (§18 placeholders — 9.7) ────────────────────────────────
  const settings: Array<[string, unknown, string]> = [
    ["default_incoterms", "FOB", "Placeholder — confirm before go-live"],
    ["default_named_place", "Keelung, Taiwan", "Placeholder"],
    ["default_payment_terms", "30% with order, 70% before shipment", "Placeholder"],
    ["default_validity_days", 30, "Quotation validity"],
    ["default_warranty_months", 12, "Warranty period"],
    ["warranty_basis", "shipment", "shipment | installation"],
    ["default_currency", "USD", "Default quotation currency"],
    ["quote_number_format", "KM-Q-{YYYY}-{NNNN}", "Placeholder — match current practice (9.5)"],
    ["agent_cadence_default_days", 30, "Default agent contact cadence"],
    ["opportunity_inactivity_days", 30, "Opportunity inactivity threshold"],
  ];
  for (const [key, value, description] of settings) {
    await prisma.systemSetting.create({
      data: { key, valueJson: value as object, description, updatedById: admin.id },
    });
  }

  // ── Agents ───────────────────────────────────────────────────────────────────
  type A = {
    code: string; en: string; local?: string; type: string; status: string;
    countries: string[]; owner: string; cadence: number | null; last: number | null;
    exclusivity?: string; families?: string[]; currency?: string; commission?: number;
    agreementEnd?: number | null; notes?: string; firstAppointed?: number;
  };
  const agentDefs: A[] = [
    { code: "TR-01", en: "Anadolu Takım Tezgâhları A.Ş.", local: "Anadolu Takım Tezgâhları", type: "distributor",
      status: "active", countries: ["TR"], owner: sales1.id, cadence: 30, last: 41,
      exclusivity: "exclusive", currency: "USD", commission: 8, agreementEnd: 70, firstAppointed: 1400,
      notes: "Strong in die & mould around Bursa. Overdue — chase this week." },
    { code: "IN-01", en: "Bharat Machine Tools Pvt. Ltd.", type: "agent",
      status: "active", countries: ["IN"], owner: sales2.id, cadence: 45, last: 12,
      exclusivity: "non_exclusive", currency: "USD", commission: 10, agreementEnd: 400, firstAppointed: 900 },
    { code: "PL-01", en: "Precyzja Obrabiarki Sp. z o.o.", type: "distributor",
      status: "active", countries: ["PL"], owner: sales1.id, cadence: 60, last: 20,
      exclusivity: "exclusive_by_product_line", families: ["five_axis", "multi_face"], currency: "USD",
      commission: 7, agreementEnd: 210, firstAppointed: 620 },
    { code: "TH-01", en: "Siam Precision Machinery Co., Ltd.", type: "dealer",
      status: "active", countries: ["TH"], owner: sales2.id, cadence: 30, last: 5,
      exclusivity: "non_exclusive", currency: "USD", commission: 9, agreementEnd: 520, firstAppointed: 300 },
    { code: "MX-01", en: "Maquinaria CNC del Bajío S.A. de C.V.", type: "agent",
      status: "probation", countries: ["MX"], owner: sales1.id, cadence: 30, last: 47,
      exclusivity: "non_exclusive", currency: "USD", commission: 10, agreementEnd: 150, firstAppointed: 110,
      notes: "New appointment on probation. Watch responsiveness." },
    { code: "VN-01", en: "Trường Hải Machine Tools JSC", type: "representative",
      status: "prospective", countries: ["VN"], owner: sales2.id, cadence: null, last: null,
      exclusivity: "non_exclusive", currency: "USD", firstAppointed: 40,
      notes: "Introduced at TIMTOS. No agreement signed yet." },
    { code: "DE-01", en: "Präzisions-Werkzeugmaschinen GmbH", type: "distributor",
      status: "active", countries: ["DE"], owner: manager.id, cadence: 45, last: 9,
      exclusivity: "exclusive", currency: "USD", commission: 6, agreementEnd: 85, firstAppointed: 2100,
      notes: "Longest-standing partner. Agreement renews soon." },
    { code: "ID-01", en: "Karya Presisi Nusantara PT", type: "dealer",
      status: "dormant", countries: ["ID"], owner: sales1.id, cadence: 90, last: 160,
      exclusivity: "non_exclusive", currency: "USD", commission: 9, agreementEnd: -30, firstAppointed: 800,
      notes: "Gone quiet since 2025. Agreement lapsed." },
  ];

  const agents: Record<string, string> = {};
  for (const a of agentDefs) {
    const agent = await prisma.agent.create({
      data: {
        agentCode: a.code, companyNameEn: a.en, companyNameLocal: a.local,
        agentType: a.type, status: a.status,
        exclusivity: a.exclusivity,
        exclusiveProductFamilies: a.families ?? undefined,
        preferredCurrency: a.currency,
        commissionPercent: a.commission ?? undefined,
        pricingBasis: "commission_on_invoice",
        ownerUserId: a.owner,
        contactCadenceDays: a.cadence ?? undefined,
        lastContactDate: a.last != null ? daysAgo(a.last) : undefined,
        nextContactDue: a.cadence != null && a.last != null ? daysAhead(a.cadence - a.last) : undefined,
        firstAppointedDate: a.firstAppointed ? daysAgo(a.firstAppointed) : undefined,
        agreementStartDate: a.firstAppointed ? daysAgo(a.firstAppointed) : undefined,
        agreementEndDate: a.agreementEnd != null ? daysAhead(a.agreementEnd) : undefined,
        workingLanguage: "english",
        notes: a.notes,
        createdById: admin.id,
      },
    });
    agents[a.code] = agent.id;
    for (const c of a.countries) {
      await prisma.agentTerritory.create({
        data: { agentId: agent.id, countryCode: c, exclusivity: a.exclusivity },
      });
    }
  }

  // ── Customers ────────────────────────────────────────────────────────────────
  type C = { code: string; en: string; local?: string; country: string; city?: string;
    industry: string; type: string; agent?: string; owner: string; machines?: string };
  const customerDefs: C[] = [
    { code: "C-0001", en: "Ege Kalıp Sanayi A.Ş.", country: "TR", city: "Bursa", industry: "die_mould", type: "active", agent: "TR-01", owner: sales1.id, machines: "2× KMC-321 (2019, 2021)" },
    { code: "C-0002", en: "Marmara Aerospace Machining", country: "TR", city: "İstanbul", industry: "aerospace", type: "prospect", agent: "TR-01", owner: sales1.id },
    { code: "C-0003", en: "Tata Precision Components Ltd.", country: "IN", city: "Pune", industry: "automotive", type: "active", agent: "IN-01", owner: sales2.id, machines: "KMC-423RF (2022)" },
    { code: "C-0004", en: "Hindustan Heavy Fabricators", country: "IN", city: "Coimbatore", industry: "heavy_machinery", type: "active", agent: "IN-01", owner: sales2.id },
    { code: "C-0005", en: "Deccan Aero Systems Pvt. Ltd.", country: "IN", city: "Bengaluru", industry: "aerospace", type: "prospect", agent: "IN-01", owner: sales2.id },
    { code: "C-0006", en: "Śląskie Formy Wtryskowe Sp. z o.o.", country: "PL", city: "Katowice", industry: "die_mould", type: "active", agent: "PL-01", owner: sales1.id, machines: "KMC-DV (2023)" },
    { code: "C-0007", en: "PolAvia Aerostructures", country: "PL", city: "Rzeszów", industry: "aerospace", type: "active", agent: "PL-01", owner: sales1.id, machines: "KMC-5AX-2000 (2024)" },
    { code: "C-0008", en: "Bangkok Mould & Die Co., Ltd.", country: "TH", city: "Bangkok", industry: "die_mould", type: "active", agent: "TH-01", owner: sales2.id },
    { code: "C-0009", en: "Eastern Seaboard Auto Parts", country: "TH", city: "Rayong", industry: "automotive", type: "active", agent: "TH-01", owner: sales2.id, machines: "3× KMC-1500V" },
    { code: "C-0010", en: "Grupo Industrial Querétaro", country: "MX", city: "Querétaro", industry: "automotive", type: "prospect", agent: "MX-01", owner: sales1.id },
    { code: "C-0011", en: "Aeroestructuras del Norte S.A.", country: "MX", city: "Chihuahua", industry: "aerospace", type: "prospect", agent: "MX-01", owner: sales1.id },
    { code: "C-0012", en: "Saigon Precision Engineering", country: "VN", city: "Ho Chi Minh City", industry: "general_subcontract", type: "prospect", agent: "VN-01", owner: sales2.id },
    { code: "C-0013", en: "Hanoi Heavy Machinery JSC", country: "VN", city: "Hanoi", industry: "heavy_machinery", type: "prospect", agent: "VN-01", owner: sales2.id },
    { code: "C-0014", en: "Bayerische Werkzeugbau GmbH", country: "DE", city: "Augsburg", industry: "die_mould", type: "active", agent: "DE-01", owner: manager.id, machines: "KMC-4000SV-H (2020)" },
    { code: "C-0015", en: "Rheinenergie Turbinen GmbH", country: "DE", city: "Essen", industry: "energy", type: "active", agent: "DE-01", owner: manager.id, machines: "2× KMC-6000 gantry" },
    { code: "C-0016", en: "Schwarzwald Aerospace GmbH", country: "DE", city: "Freiburg", industry: "aerospace", type: "active", agent: "DE-01", owner: manager.id },
    { code: "C-0017", en: "Nusantara Presisi Manufaktur", country: "ID", city: "Surabaya", industry: "general_subcontract", type: "former", agent: "ID-01", owner: sales1.id, machines: "KMC-321 (2018)" },
    { code: "C-0018", en: "Jaya Energi Komponen", country: "ID", city: "Jakarta", industry: "energy", type: "former", agent: "ID-01", owner: sales1.id },
    { code: "C-0019", en: "Precision Dynamics Corp.", country: "US", city: "Cincinnati", industry: "semiconductor", type: "prospect", owner: manager.id, machines: "Direct enquiry — no agent" },
    { code: "C-0020", en: "Anatolia Energy Systems", country: "TR", city: "İzmir", industry: "energy", type: "active", agent: "TR-01", owner: sales1.id, machines: "KMC-2500V (2021)" },
  ];

  const customers: Record<string, string> = {};
  for (const c of customerDefs) {
    const cust = await prisma.customer.create({
      data: {
        customerCode: c.code, companyNameEn: c.en, companyNameLocal: c.local,
        country: c.country, city: c.city, industry: c.industry, customerType: c.type,
        primaryAgentId: c.agent ? agents[c.agent] : undefined,
        ownerUserId: c.owner, existingMachinesNotes: c.machines, createdById: admin.id,
      },
    });
    customers[c.code] = cust.id;
  }

  // ── Contacts (40): people at customers and agents ───────────────────────────
  type CT = { name: string; local?: string; title: string; role: string; email: string;
    phone?: string; parent: "agent" | "customer"; key: string; primary?: boolean; lang?: string };
  const contactDefs: CT[] = [
    // agent contacts
    { name: "Emre Yılmaz", title: "General Manager", role: "owner", email: "emre@anadolutt.com.tr", phone: "+90 224 000 0001", parent: "agent", key: "TR-01", primary: true },
    { name: "Selin Demir", title: "Sales Manager", role: "purchasing", email: "selin@anadolutt.com.tr", parent: "agent", key: "TR-01" },
    { name: "Rajesh Nair", title: "Director", role: "owner", email: "rajesh@bharatmt.in", phone: "+91 20 0000 0002", parent: "agent", key: "IN-01", primary: true },
    { name: "Tomasz Kowalski", title: "Owner", role: "owner", email: "tomasz@precyzja.pl", parent: "agent", key: "PL-01", primary: true },
    { name: "Somchai Boonmee", title: "Managing Director", role: "owner", email: "somchai@siamprecision.co.th", parent: "agent", key: "TH-01", primary: true },
    { name: "Carlos Mendoza", title: "General Manager", role: "owner", email: "carlos@maqcncbajio.mx", parent: "agent", key: "MX-01", primary: true },
    { name: "Nguyễn Văn Hải", local: "阮文海", title: "Business Development", role: "decision_maker", email: "hai@truonghai-mt.vn", parent: "agent", key: "VN-01", primary: true },
    { name: "Klaus Bergmann", title: "Geschäftsführer", role: "owner", email: "bergmann@praez-wm.de", phone: "+49 821 000 0007", parent: "agent", key: "DE-01", primary: true },
    { name: "Budi Santoso", title: "Director", role: "owner", email: "budi@karyapresisi.co.id", parent: "agent", key: "ID-01", primary: true },
    // customer contacts (2 each for many)
    { name: "Ahmet Öztürk", title: "Plant Manager", role: "decision_maker", email: "ahmet@egekalip.com.tr", phone: "+90 224 111 1111", parent: "customer", key: "C-0001", primary: true },
    { name: "Deniz Arslan", title: "Production Engineer", role: "technical_evaluator", email: "deniz@egekalip.com.tr", parent: "customer", key: "C-0001" },
    { name: "Cem Yıldız", title: "Head of Manufacturing", role: "decision_maker", email: "cem@marmara-aero.com", parent: "customer", key: "C-0002", primary: true },
    { name: "Vikram Patel", title: "VP Operations", role: "decision_maker", email: "vikram@tataprecision.in", phone: "+91 20 222 2222", parent: "customer", key: "C-0003", primary: true },
    { name: "Anjali Rao", title: "Purchase Head", role: "purchasing", email: "anjali@tataprecision.in", parent: "customer", key: "C-0003" },
    { name: "Suresh Kumar", title: "Works Manager", role: "decision_maker", email: "suresh@hindustanheavy.in", parent: "customer", key: "C-0004", primary: true },
    { name: "Meera Iyer", title: "Chief Engineer", role: "technical_evaluator", email: "meera@deccanaero.in", parent: "customer", key: "C-0005", primary: true },
    { name: "Paweł Nowak", title: "Dyrektor Produkcji", role: "decision_maker", email: "pawel@slaskieformy.pl", parent: "customer", key: "C-0006", primary: true },
    { name: "Katarzyna Wójcik", title: "Inżynier Procesu", role: "technical_evaluator", email: "kasia@slaskieformy.pl", parent: "customer", key: "C-0006" },
    { name: "Marek Zieliński", title: "Head of Machining", role: "decision_maker", email: "marek@polavia.pl", parent: "customer", key: "C-0007", primary: true },
    { name: "Anna Lewandowska", title: "Quality Manager", role: "technical_evaluator", email: "anna@polavia.pl", parent: "customer", key: "C-0007" },
    { name: "Preecha Wong", title: "Owner", role: "owner", email: "preecha@bkkmould.co.th", parent: "customer", key: "C-0008", primary: true },
    { name: "Nattapong Sri", title: "Engineering Lead", role: "technical_evaluator", email: "nattapong@esbautoparts.co.th", parent: "customer", key: "C-0009", primary: true },
    { name: "Wanida Chai", title: "Purchasing", role: "purchasing", email: "wanida@esbautoparts.co.th", parent: "customer", key: "C-0009" },
    { name: "José Luis Ramírez", title: "Director de Planta", role: "decision_maker", email: "jlramirez@giqueretaro.mx", parent: "customer", key: "C-0010", primary: true },
    { name: "María Fernanda Ruiz", title: "Ingeniera de Manufactura", role: "technical_evaluator", email: "mfruiz@aeronorte.mx", parent: "customer", key: "C-0011", primary: true },
    { name: "Trần Thị Mai", local: "陳氏梅", title: "Production Head", role: "decision_maker", email: "mai@saigonprecision.vn", parent: "customer", key: "C-0012", primary: true },
    { name: "Lê Quốc Anh", title: "Chief Engineer", role: "technical_evaluator", email: "anh@hanoiheavy.vn", parent: "customer", key: "C-0013", primary: true },
    { name: "Stefan Huber", title: "Werkleiter", role: "decision_maker", email: "huber@bayer-wkzbau.de", phone: "+49 821 333 3333", parent: "customer", key: "C-0014", primary: true },
    { name: "Petra Wolf", title: "Fertigungsplanung", role: "technical_evaluator", email: "wolf@bayer-wkzbau.de", parent: "customer", key: "C-0014" },
    { name: "Dr. Michael Schneider", title: "Head of Turbine Machining", role: "decision_maker", email: "schneider@rheinenergie-tb.de", parent: "customer", key: "C-0015", primary: true },
    { name: "Julia Fischer", title: "Einkauf", role: "purchasing", email: "fischer@rheinenergie-tb.de", parent: "customer", key: "C-0015" },
    { name: "Thomas Braun", title: "Manufacturing Director", role: "decision_maker", email: "braun@schwarzwald-aero.de", parent: "customer", key: "C-0016", primary: true },
    { name: "Agus Wijaya", title: "Plant Head", role: "decision_maker", email: "agus@nusantarapresisi.co.id", parent: "customer", key: "C-0017", primary: true },
    { name: "Dewi Lestari", title: "Procurement", role: "purchasing", email: "dewi@jayaenergi.co.id", parent: "customer", key: "C-0018", primary: true },
    { name: "Robert Miller", title: "Director of Operations", role: "decision_maker", email: "rmiller@precisiondynamics.com", phone: "+1 513 000 0000", parent: "customer", key: "C-0019", primary: true },
    { name: "Sarah Collins", title: "Process Engineer", role: "technical_evaluator", email: "scollins@precisiondynamics.com", parent: "customer", key: "C-0019" },
    { name: "Burak Şahin", title: "Maintenance Manager", role: "operator", email: "burak@anatoliaenergy.com.tr", parent: "customer", key: "C-0020", primary: true },
    { name: "Elif Kaya", title: "Manufacturing Engineer", role: "technical_evaluator", email: "elif@anatoliaenergy.com.tr", parent: "customer", key: "C-0020" },
    { name: "Hakan Çelik", title: "Purchasing Manager", role: "purchasing", email: "hakan@egekalip.com.tr", parent: "customer", key: "C-0001" },
    { name: "Priya Sharma", title: "Finance Controller", role: "purchasing", email: "priya@hindustanheavy.in", parent: "customer", key: "C-0004" },
  ];

  for (const ct of contactDefs) {
    await prisma.contact.create({
      data: {
        parentType: ct.parent,
        agentId: ct.parent === "agent" ? agents[ct.key] : undefined,
        customerId: ct.parent === "customer" ? customers[ct.key] : undefined,
        fullName: ct.name, nameLocal: ct.local, jobTitle: ct.title, roleInDeal: ct.role,
        email: ct.email, phone: ct.phone, isPrimary: ct.primary ?? false,
        preferredLanguage: ct.lang, createdById: admin.id,
      },
    });
  }

  const counts = {
    users: await prisma.user.count(),
    agents: await prisma.agent.count(),
    territories: await prisma.agentTerritory.count(),
    customers: await prisma.customer.count(),
    contacts: await prisma.contact.count(),
    settings: await prisma.systemSetting.count(),
  };
  console.log("Seeded:", counts);
  console.log("Sign in: deepan / admin12345  (admin)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
