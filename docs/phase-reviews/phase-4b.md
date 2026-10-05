# Phase 4b review — 2026-10-02

**Result: INCOMPLETE as a phase gate.** The shipment software path passes on example
data. A printed 出貨單 has not been accepted by the supervisor and warehouse.

| Acceptance criterion | Result | Evidence |
|---|---|---|
| E0–E8 have separate timestamps | PASS on examples | `shipments` stores each event. `phase4.py` traversed the nine stages through arrival. |
| G14 requires a booking reference; retries increment | PASS | The browser test observed a G14 refusal, rejected attempt 1, confirmed attempt 2 and read `booking_attempts = 2`. The attempts have separate records. |
| G15 refuses notice before space confirmation | PASS in service | `issueShippingNotice` checks booking confirmation and vessel details inside the issuing transaction. The clean browser path issued the notice only after confirmation. A dedicated negative G15 browser assertion remains to add. |
| Printed 出貨單 accepted in person | **PENDING external review** | A print-ready A4 PDF was generated and visually inspected; no supervisor or warehouse acceptance was reported. |
| Booking delay on D2 with its own cause code | PASS on examples | `booking_delay_cause` is recorded for late or overdue bookings; D2 shows lateness and cause separately from production slip. `phase4_booking_cause.py` changed a disposable fixture date, submitted the cause through the browser, checked D2, and restored the fixture. |

The shipping notice and 出貨單 PDFs, export document uploads, payment-to-booking
gate G5, export/print gate G16, serial consistency, authenticated file retrieval,
and logistics queue passed the browser chain. The 出貨單 is one A4 page with Chinese
labels, ROC dates, the machine serial and sign-off lines. The example PDF must still
be compared with actual internal forms and accepted physically. Parts enquiry
identification and pricing states from `12-logistics.md` remain in Phase 6.
