# 08 · Open decisions

Implement the stated default and leave a `// DECISION-PENDING: <id>` comment. **Never
invent a business rule.** When one is resolved, record it in `docs/decisions/<id>.md` with
who decided and when, update this table, and remove the matching comments.

| ID | Question | Default to implement | Stakes |
|---|---|---|---|
| D1 | Late-delivery penalty rates and caps in European contracts | 0.5% per week, capped at 5%. Configurable per contract | Forward penalty exposure cannot be calculated without it |
| D2 | Do standard terms exclude consequential and production loss? | Assume excluded; expose the flag on the contract | If not excluded, downtime claims from large end customers are uncapped |
| D3 | **Is commission calculated on list price or on the discounted price?** | `after_discount` | **Highest stakes.** If on list, agents are paid to negotiate our price down |
| D4 | Does the quoted lead time run from PO or from deposit? | `deposit` | Every delivery date and slip calculation |
| D5 | Warranty period — the source says "usually 1 month", implausible for a machining centre | 12 months, per-deal override | Two reports and every FOC decision |
| D6 | Confirm PI = 訂單 (P-number), MI = 製令單 + 製造規格表 (M-number) | As stated in `01-domain.md` | Document naming throughout |
| D7 | Is revenue recognised at shipment or at acceptance? | Shipment | Date basis on A2 and A3 |
| D8 | Do agent contracts carry annual targets? | No target field; add later | The scorecard's strongest commercial metric |
| D9 | How many of the 59 agents are on each commission model? | Store per partner; report the split | If close to even, every ranking needs correcting before it is shown |
| D10 | Is a standard cost or margin per machine available in the ERP? | No. Leakage measured against order value | Understates leakage severity |
| D11 | Is commission paid on spare parts and service? | No | Commission accrual scope |
| D12 | Can an agent be on both commission models at once? | No — the model lives on the partner | If yes, it moves to the order |
| ~~D13~~ | **RESOLVED, with a caveat.** Quotations are reviewed by the supervisor. Implemented as gate G18: the approver must not be the preparer; when the supervisor prepares, approval routes to the department manager. Confirm with her |
| ~~D14~~ | **RESOLVED.** 售後 supplies a part number, or suggests an alternative where the part is unavailable. Substitution states added; a rejected alternative is a lost sale with a reason |
| ~~D15~~ | **RESOLVED.** Payment first, then booking, then the notice. Phase E reordered; G5 now gates booking rather than shipment |
| ~~D16~~ | **RESOLVED.** Created at shipment (E6) |
| ~~D17~~ | **RESOLVED.** Determined by the incoterm: FOB → customer appoints, CIF → Kao Ming chooses. `forwarder_nominated_by` is derived, not entered |
| D18 | What share of orders are CIF rather than FOB? | Record the split; leakage category `freight_rate_movement` exists but is not chased | Under CIF, freight is priced 10–12 months before it is booked. If CIF is a meaningful share, that is real unrecorded margin exposure |
| D19 | Does "delivery within 10–12 months" mean ready to ship, or arrived? | `ready_to_ship` | Booking adds 2–3 weeks. The two are materially different promises to an agent |
| D20 | Who decides a claim settlement, and above what amount does it go to the GM? | Department manager to USD 5,000, GM above | The real register shows offers of 50% and of half the cost — unclear whether that was judgement or a rule |
| D21 | How are pending credit notes tracked, and by whom? | Held on the agent record until applied to an order | A €7,500 credit may wait a year for the next order. Untracked, the concession vanishes |
| D22 | Does finance need claims as provisions once offered, or only when settled? | Only when settled | Affects whether `offered_amount` reaches the accounts |
