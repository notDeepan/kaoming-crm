# Worked examples for the seed

Two real cases. Between them they exercise nearly every path in the system. Load both in
`src/db/seed.ts` — the snapshot tests and the report queries depend on them.

---

## Example 1 · Q-2026-0147 — the discount and item-type case

| Field | Value |
|---|---|
| Agent | CP Agencies (`A11004`), India, `markup` model, non-EU price band |
| End customer | FAB TOOLS |
| Machine | KMC-637AS Plano Machining Center, Fanuc 31iMB control |
| Quotation | `Q-2026-0147 r3`, issued 28 Aug 2026, 3-month validity |
| Terms | 30% down payment, balance by irrevocable at-sight LC before shipment |
| Delivery | FOB Taiwan, 10–12 months after receiving down payment |

### Lines

| # | Item | Type | Unit US$ | In total |
|---|---|---|---|---|
| 1 | KMC-637AS base machine | `machine` | 686,740 | yes |
| 2 | Z travel to 1100mm, W travel to 1500mm | `spec_change` | 58,850 | yes |
| 3 | Coolant through spindle 40bar + 1000L tank + oil skimmer | `accessory` | 11,228 | yes |
| 4 | Coolant through spindle centre (H) | `accessory` | 5,273 | yes |
| 5 | 3-seat AAC assembly | `accessory` | 4,500 | yes |
| 6 | Fanuc power failure backup system | `accessory` | 1,926 | yes |
| 7 | Automatic universal head A&C axis 1° index, 3500rpm | `accessory` | 75,000 | yes |
| 8 | On-site levelling technician (travel billed to agent) | `service` | 24,100 | yes |
| 9 | Link type chip conveyor | `accessory` | 3,973 | yes |
| 10 | Renishaw RMP60 probe | `excluded` | 15,023 | **no** |

**List total US$871,590. Final total US$688,000. Discount US$183,590 — 21.1%.**

### Why this example matters

- The discount is applied at **total level** on the original paper quotation. The system
  must capture it **per line** — that is the whole point of the `line_discount` column.
  Distribute it across lines 2–9 so the options carry the concession and the base machine
  stays near list, which is the commercially truthful reading.
- Line 10 is priced but excluded. It must print on the technical proposal Part C under
  "quoted but not included" and must **not** reach the MI.
- Line 8 is a service. It must **not** reach the MI either.
- Line 2 is a spec change — it overwrites the `travels` spec value, and the technical
  proposal must print `1100` and `1500` **without asterisks** because the customer paid
  for them.
- The remark on the original quotation states that travel and accommodation to India are
  billed to CP Agencies. That is a `chargeable_unbilled` leakage candidate if never
  invoiced.

---

## Example 2 · M-2026-0147 — the compliance and provisional case

Based on the real work order `M1508003` for TEZMAKSAN. Layout in
`reference/forms/real-forms-layout.md`.

| Field | Value |
|---|---|
| Agent | TEZMAKSAN (`A16001`), Turkey, `markup`, **EU price band** |
| Machine | KMC-218E8 High Speed Double Column Machining Center |
| PI | `P-2026-0147`, MI `M-2026-0147`, batch `227E005194` |
| Dates | 開工 115.08.13, 完工 115.12.14, 生產狀況 未結 |

### Specification by 規格類別

| 規格類別 | Value |
|---|---|
| 標準附件 | 附如型錄之標準附件一套 |
| 主軸 | BBT50 / 主軸馬達 22-26KW / 10000RPM (直結式) |
| 刀庫及護罩 | 30ATC電動式(德大) / BBT50 / 拉緊螺栓 MAS P50T-1 |
| 控制器及CRT | Mitsubishi M80V / 標準CRT / 15" LCD |
| 電壓 | 380V / 50HZ / 3相 |
| 規格及銘牌文字 | 公制 / 新版CE標準(標誌依土耳其規定) / 警告標語：土耳其語＋英語 / 加貼代理商公司名牌 |
| 顏色 | 790-49780H(白色) / 790-49K84(黑色) / 790-47440F1H(主軸頭鈑金 藍紫色) |
| 特別附件 | 1. 鍊式鐵屑輸送機含小車 2. 海德漢光學尺X軸 3. 主軸中心出水中壓20BAR附600L水箱 4. 電控箱內第四軸插座準備 5. 此為客戶的預定單，先行組裝至三軸組立階段，待客戶正式下單後再啟動續組裝 |

### Why this example matters

- Every value in 電壓, 規格及銘牌文字 and 顏色 comes from the **compliance profile** on the
  agent record, not from the quotation. This is the data that gate G4 blocks the MI on.
- Special accessory 5 is a **預定單 provisional hold**: build to the three-axis assembly
  stage, then stop and wait for the formal order. It must set `is_provisional = true` and
  `provisional_hold_stage` on the work order, and appear as project stage
  `provisional_hold`.
- The Turkish CE variant and bilingual labels differ from the Indian order in Example 1,
  which proves the compliance profile is per-agent rather than per-region.

---

## Progress reviews to seed

Attach five monthly reviews to the TEZMAKSAN work order, so report D2 and the slip curve
have data on first run:

| Review | Reported stage | Expected completion | Δ | Cumulative slip |
|---|---|---|---|---|
| M+1 | 鑄件入廠 | 14 Dec 2026 | — | 0 |
| M+2 | 加工 | 14 Dec 2026 | — | 0 |
| M+3 | 加工 | 20 Dec 2026 | +6 | 6 |
| M+4 | 組裝 | 5 Jan 2027 | +16 | 22 |
| M+5 | 組裝 | 22 Jan 2027 | +17 | 39 |

Cause `supplier`, attribution `supplier`, escalation reaching `dept_manager` at M+4 and
`gm` at M+5. Assembly should carry 33 of the 39 days once attribution is calculated — that
is the assertion the phase 4 integration test makes.
