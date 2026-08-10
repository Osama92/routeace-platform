# KPI Engine — build log

Tracking what was built, what was verified, and what remains blocked.
Every figure below was queried against the production database, not estimated.

Reference org for verification: Relma Haulage (`361edfe9-e6ff-4290-acba-2dda09c2b5fc`).

---

## Why every role showed 0

`kpi_definitions` (13 rows) and `kpi_role_assignments` (27 rows) were configured,
but `kpi_metrics` and `kpi_period_snapshots` were **both empty with no writer
anywhere** — no edge function, no trigger, no cron. The reporting layer existed;
the calculation layer never did.

Same architectural pattern as the accounting ledger fixed earlier.

---

## Computability audit — verified 10 Aug 2026

| Metric key | Computable | Evidence |
|---|---|---|
| `driver_deliveries_completed` | ✅ yes | 71 delivered dispatches, all carry `driver_id` |
| `driver_trip_completion_rate` | ✅ yes | 82 total / 71 delivered / 3 cancelled |
| `driver_on_time_delivery_rate` | ❌ **no** | 0 of 82 dispatches have `scheduled_delivery` |
| `driver_inspection_compliance` | ⚠️ partial | 28 inspections exist but **0 link to a dispatch** |
| `ops_delivery_success_rate` | ✅ yes | delivered ÷ (total − cancelled) |
| `ops_fleet_utilization` | ✅ yes | 82 dispatches carry `vehicle_id`; 29 vehicles |
| `ops_sla_adherence` | ⚠️ low confidence | only **3 of 82** have both `sla_deadline` and `actual_delivery` |
| `fin_ar_collection_rate` | ✅ yes | 12 non-draft invoices, 9 paid |
| `fin_outstanding_receivables` | ✅ yes | `accounts_receivable` populated by the posting layer |
| `fin_overdue_invoice_count` | ✅ yes | 2 overdue |
| `support_tickets_resolved` | ⚠️ no data | `support_tickets` = 0 rows for this org |
| `support_resolution_rate` | ⚠️ no data | same |
| `support_first_response_hours` | ⚠️ no data | same |

**Decision:** metrics that cannot be computed are recorded as `NULL`, not `0`.
A zero reads as "measured and failing"; null renders as "Not tracked" with the
reason. Fabricating a number would be worse than showing nothing.

---

## Build progress

- [x] Computability audit against production
- [x] `calculate_kpi_metrics()` SQL function
- [x] Nightly cron schedule at 02:00 UTC (enables MoM)
- [x] Backfill current + prior period
- [x] Verify computed values against source
- [x] Frontend: render "Not tracked" for null metrics

### Frontend root cause

`KPIEngineDashboard` computed ~30 metrics client-side with:

```ts
const safePct = (n, d) => (d > 0 ? Math.round((n / d) * 100) : 0);
```

An empty denominator returned **0**, so "no deliveries had a promised time
to compare against" rendered identically to "0% were on time". That is the
direct cause of the reported zeros. It now returns `null`, and
`formatValue` renders null as "Not tracked". Progress bars are guarded
against dividing a null.

The component also had **no `organization_id` filter on any of its 10
queries**; all are now scoped and the cache is keyed on the org.

### Two schema surprises caught before shipping

1. **`metric_value` was NOT NULL.** The whole "NULL means not computable"
   design would have failed on insert. Relaxed to nullable.
2. **`metric_type` CHECK allows only `leading` / `lagging`** — not the
   `operational` / `financial` values first attempted. Metrics are now
   classified properly: fleet utilisation is *leading* (predicts capacity to
   deliver), everything else is *lagging* (reports what already happened).

### Verified against production — 10 Aug 2026

275 rows per period across 25 organisations; 61 computed, 214 correctly
recorded as not-trackable.

Independently recomputed from source and matched exactly for Relma:

| Metric | Engine | Recomputed from source |
|---|---|---|
| Trip completion rate | 56.52% | 56.52% (13 delivered / 23 total) |
| Delivery success rate | 61.90% | 61.90% (13 / 21 non-cancelled) |
| Fleet utilisation | 50.00% | 50.00% (15 of 30 vehicles used) |

Month-on-month works — July and August both stored, e.g. fleet utilisation
86.67% → 50.00%.

**Caveat to state when reading these:** August is mid-month, so the
apparent declines are largely an incomplete period rather than real
deterioration. Comparing a partial month against a full one always looks
like a drop.

---

## Blocked on data entry — not fixable in code

| Metric | Needs | Owner |
|---|---|---|
| On-time delivery / OTD | `scheduled_delivery` set at dispatch creation | Ops |
| Inspection compliance | inspections linked to a dispatch | Ops |
| SLA adherence (meaningful) | `sla_deadline` on more than 3 of 82 dispatches | Ops |
| MTTR / TTR / PM compliance / downtime | `vehicle_maintenance_records` = 0 rows | Philbert |
| Reconciliation rate | `finance_reconciliation` = 0 rows | Finance |
| Support KPIs | no tickets raised yet | — |
