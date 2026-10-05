---
name: domain-context
description: Kao Ming machine tool domain vocabulary and business rules. Use whenever working on deals, quotations, agents, orders, work orders, spec sheets, FAT, commission, after-sales cases, or any Chinese document.
user-invocable: false
---

## Vocabulary — use these names in code and UI

| Term | Chinese | Meaning |
|---|---|---|
| Partner | 代理商 | The in-country agent. Long-lived. **Never model as a Lead** |
| Deal | — | One machine opportunity, enquiry to warranty expiry |
| PI | 訂單 | Internal sales order, P-number, Chinese, printed |
| MI | 製令單 | Work order, M-number, Chinese, printed |
| Spec sheet | 製造規格表 | Manufacturing specification, versioned by 版次 |
| FAT | — | Customer inspects the machine in Taiwan before shipment |
| 預定單 | 預定單 | Provisional order: build to an agreed stage, then stop |
| 生管 / 採購 / 製造 | | Production control / procurement / manufacturing |

## Rules that are easy to get wrong

- Kao Ming never contacts the end customer. All communication goes through the agent.
- Prices quoted are **agent prices**, not customer prices, in USD.
- EU destinations carry a higher price band than non-EU.
- The same item list produces six documents. Entered once, rendered many times.
- Two commission models per agent: `markup` (agent resells, no commission) and
  `commission` (customer pays Kao Ming, agent claims). Gross revenue is **not comparable**
  between them — every ranking uses net revenue after commission.
- A quotation locks to the price book version live at its issue date. Prices change every
  six months.
- Sales cycle 4–12 months. Metrics tuned for high-velocity CRM do not apply.
- Small N: three deals is not a win rate. Flag any score built on fewer than five points.
- Progress records the **expected completion date**, never a percentage.
- Slip is attributed to whichever stage was reported in that month's review.

## Translation rule — subtle, get it right

| Context | Rule |
|---|---|
| Factory documents (PI, MI, 製造規格表) | Chinese comes from the **item master 品名**. Never machine translation — the shop floor must see identical wording every time |
| After-sales case correspondence | Machine translation **is** appropriate, drafted then reviewed by a person before sending |

## Never

- Build an ERP integration. It was ruled out.
- Build an accessory compatibility rules engine. Fit is decided per deal by the design team.
- Add a percentage-complete field.
- Apply discount at total level only. Line level, always.
- Migrate transactional history. Master data and open orders only.
