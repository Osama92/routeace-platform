# Large-Corporate (LC) Module — RBAC & Isolation Matrix

This document is the source of truth for who can read/write what inside the
LC module. It maps **roles → routes → tables → actions** and is enforced by:

1. Postgres **RLS policies** keyed on `organization_id`
   (`is_org_member(auth.uid(), organization_id)` and `is_super_admin(auth.uid())`).
2. `_lc_user_org()` helper used by all LC reporting tables.
3. UI route guards (`<RequireRole>`, `useAuth().isSuperAdmin`).

> **Golden rule** — **No role**, including `Super Admin`, may read another
> tenant's transactional data. Super Admin sees only their own
> `organization_id` data, identical scoping to Finance Manager and COO.
> Cross-tenant aggregation only exists for *platform telemetry* (system
> health, billing usage), never for tenant business data.

---

## 1. Role definitions (LC scope)

| Role            | LC Scope                                                                 |
|-----------------|---------------------------------------------------------------------------|
| `super_admin`   | Owns governance, security, billing **for own org**. Cannot view other orgs' tenant tables. |
| `finance_manager` | Owns the financial close: ledger, reconciliation, AR/AP, P&L, statements. |
| `coo`           | Read-only on financials; full operational write on dispatch/fleet KPIs.   |
| `operations_manager` | Operational KPIs only — financial views hidden (Ops Manager Boundary memory). |

---

## 2. Permission matrix

Legend: ✅ read+write · 👁 read only · 🚫 hidden / denied.

| Route / Page                                | Tables touched                                                                 | super_admin | finance_manager | coo | operations_manager |
|---------------------------------------------|--------------------------------------------------------------------------------|-------------|-----------------|-----|--------------------|
| `/finance/erp` (Finance ERP)                | `ledger_entries`, `chart_of_accounts`, `legal_entities`                        | ✅          | ✅              | 👁  | 🚫                 |
| `/finance/ledger` (Finance Ledger)          | `ledger_entries`, `finance_periods`                                            | ✅          | ✅              | 👁  | 🚫                 |
| `/finance/reconciliation`                   | `reconciliation_batches`, `finance_reconciliation`, `suspense_cases`           | ✅          | ✅              | 👁  | 🚫                 |
| `/finance/ai-performance`                   | `finance_anomaly_events`, `finance_approval_requests`                          | ✅          | ✅              | 👁  | 🚫                 |
| `/profit-loss` (P&L)                        | `invoices` (revenue), `bills` (COGS via COA mapping), `expenses`               | ✅          | ✅              | 👁  | 🚫                 |
| `/financial-statements`                     | `ledger_entries`, `chart_of_accounts`                                          | ✅          | ✅              | 👁  | 🚫                 |
| `/cash-flow`                                | `cash_transactions`, `invoices`, `bills`                                       | ✅          | ✅              | 👁  | 🚫                 |
| `/admin-analytics` (Customer Profitability) | `invoices`, `dispatches`, `customers`                                          | ✅          | ✅              | 👁  | 🚫                 |
| `/sovereign-reporting`                      | `sovereign_report_snapshots`, `ledger_entries`, `invoices`                     | ✅          | 👁              | 👁  | 🚫                 |
| `/treasury-risk-engine`                     | `treasury_risk_scores`, `invoices`, `cash_transactions`                        | ✅          | ✅              | 👁  | 🚫                 |
| `/decision-cockpit`                         | `invoices`, `dispatches`, `expenses`, `fleet_downtime_log`                     | 👁          | 👁              | ✅  | 👁 (KPIs only)     |
| `/executive-command` (UnifiedExecutiveLayer) | `dispatches`, `invoices`, `fuel_savings_ledger`                               | 👁          | 👁              | ✅  | 🚫                 |
| `/api-access` (API key mgmt)                | `api_keys`, `api_layer_assignments`                                            | ✅          | 🚫              | 🚫  | 🚫                 |
| `/fleet-intelligence` (Cash flow / Sim)     | `dispatches`, `vehicles`, `fuel_savings_ledger`                                | ✅          | 👁              | ✅  | 👁                 |
| `/fleet-inspection`                         | `vehicle_inspections`, `inspection_findings`                                   | ✅          | 🚫              | ✅  | ✅                 |
| `/fines-and-incidents`                      | `fines_incidents` → auto-creates `expenses` row                                | ✅          | ✅              | ✅  | ✅                 |

### 2.1 Hard-gated finance tools

These routes **must** check `hasFinanceAccess = isSuperAdmin || hasRole('finance_manager')`
on the client AND have RLS policies that filter by `organization_id`:

- Finance ERP, Ledger, Reconciliation, AI Performance, Sovereign Reporting,
  Treasury Risk, P&L, Cash Flow, Financial Statements.

Operations Manager attempting to navigate to any of the above is redirected
to `/dashboard` with a toast (Ops Manager Boundary).

---

## 3. RLS template (every LC reporting table)

```sql
ALTER TABLE public.<table> ENABLE ROW LEVEL SECURITY;

-- SELECT
CREATE POLICY "<table>_org_select" ON public.<table>
FOR SELECT USING (
  organization_id = _lc_user_org()
);

-- INSERT (auto-stamped via trigger)
CREATE POLICY "<table>_org_insert" ON public.<table>
FOR INSERT WITH CHECK (
  organization_id = _lc_user_org()
);

-- UPDATE / DELETE — finance_manager or super_admin within same org
CREATE POLICY "<table>_org_write" ON public.<table>
FOR UPDATE USING (
  organization_id = _lc_user_org()
  AND (is_super_admin(auth.uid()) OR has_role(auth.uid(), 'finance_manager'))
);
```

`_lc_user_org()` is a `SECURITY DEFINER` helper returning the caller's
`organization_id` (and **does not** branch on Super Admin — Super Admin is
still scoped to one org for tenant data).

---

## 4. Audit & alerting

- Every cross-org access attempt is captured in
  `public.lc_access_audit_log` via the `log_lc_org_violation()` trigger
  attached to each protected finance table (insert/update).
- Super Admin can view their own org's audit log at `/security/audit`.
- The `lc-cross-org-alerts` edge function (cron, every 15 min) checks the
  audit log for any rows in the last interval and posts a webhook notice.

---

## 5. Change-control

When adding a new LC table:

1. Add `organization_id uuid NOT NULL` + the `set_org_id_from_user`
   BEFORE-INSERT trigger.
2. Add the standard RLS template above.
3. Add the table name to `PROTECTED_TABLES` in
   `src/test/lcOrgIsolation.test.ts` and to `PROTECTED_LC_TABLES` in
   the cross-org regression test.
4. Update this matrix.
