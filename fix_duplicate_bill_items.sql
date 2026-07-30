-- ============================================================
-- FIX DUPLICATE bill_items + RECOMPUTE BILL TOTALS
-- Run in Supabase SQL Editor.
--
-- Cause: the "Create Bill" button had no isPending guard, so a
-- double-click inserted the same line items twice, inflating totals.
-- The button is now fixed in code; this script cleans historical data.
--
-- Strategy:
--   1. Preview duplicates (SELECT) — inspect before deleting.
--   2. Delete duplicate line items, keeping the EARLIEST row of each
--      identical group (same bill_id + item_details + account + tonnage
--      + quantity + rate + vat_type + customer_id + amount).
--   3. Recompute bills.subtotal / tax_amount / amount / total_amount
--      from the surviving bill_items.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- STEP 1 — PREVIEW: how many duplicate rows exist per bill.
-- Run this alone first to see the impact. Nothing is changed.
-- ─────────────────────────────────────────────────────────────
SELECT
  bi.bill_id,
  b.bill_number,
  COUNT(*)                                              AS total_rows,
  COUNT(*) - COUNT(DISTINCT (
    bi.item_details, bi.account, bi.tonnage, bi.quantity,
    bi.rate, bi.vat_type, bi.customer_id, bi.amount
  ))                                                    AS duplicate_rows
FROM public.bill_items bi
JOIN public.bills b ON b.id = bi.bill_id
GROUP BY bi.bill_id, b.bill_number
HAVING COUNT(*) > COUNT(DISTINCT (
  bi.item_details, bi.account, bi.tonnage, bi.quantity,
  bi.rate, bi.vat_type, bi.customer_id, bi.amount
))
ORDER BY duplicate_rows DESC;


-- ─────────────────────────────────────────────────────────────
-- STEP 2 — DELETE duplicates, keeping the earliest row per group.
-- ─────────────────────────────────────────────────────────────
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY
        bill_id, item_details, account, tonnage,
        quantity, rate, vat_type, customer_id, amount
      ORDER BY created_at ASC, id ASC
    ) AS rn
  FROM public.bill_items
)
DELETE FROM public.bill_items
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);


-- ─────────────────────────────────────────────────────────────
-- STEP 3 — RECOMPUTE bill totals from the surviving line items.
-- subtotal    = sum of (amount minus its VAT portion)  [pre-tax base]
-- tax_amount  = sum of VAT portions
-- amount      = subtotal (pre-tax)  — matches createBill mapping
-- total_amount= subtotal + tax − discount + adjustment
--
-- VAT portion per line: when vat_type <> 'no_vat', the stored `amount`
-- is qty*rate*(1+vat/100). We derive the rate% from vat_type
-- (e.g. vat_7_5 → 7.5) and split base vs tax.
-- ─────────────────────────────────────────────────────────────
WITH line_split AS (
  SELECT
    bi.bill_id,
    -- parse vat percentage from vat_type text: 'vat_7_5' -> 7.5, 'no_vat' -> 0
    CASE
      WHEN bi.vat_type IS NULL OR bi.vat_type = 'no_vat' THEN 0
      ELSE COALESCE(NULLIF(replace(replace(bi.vat_type, 'vat_', ''), '_', '.'), '')::numeric, 0)
    END AS vat_pct,
    bi.amount AS line_amount
  FROM public.bill_items bi
),
line_base AS (
  SELECT
    bill_id,
    -- base (pre-tax) = amount / (1 + vat/100)
    (line_amount / (1 + vat_pct/100.0)) AS base_amount,
    (line_amount - (line_amount / (1 + vat_pct/100.0))) AS tax_amount
  FROM line_split
),
bill_totals AS (
  SELECT
    bill_id,
    ROUND(SUM(base_amount), 2) AS new_subtotal,
    ROUND(SUM(tax_amount), 2)  AS new_tax
  FROM line_base
  GROUP BY bill_id
)
UPDATE public.bills b
SET
  subtotal     = bt.new_subtotal,
  amount       = bt.new_subtotal,
  tax_amount   = bt.new_tax,
  total_amount = ROUND(
                   bt.new_subtotal + bt.new_tax
                   - (bt.new_subtotal * COALESCE(b.discount_percent, 0) / 100.0)
                   + COALESCE(b.adjustment, 0)
                 , 2)
FROM bill_totals bt
WHERE b.id = bt.bill_id;


-- ─────────────────────────────────────────────────────────────
-- STEP 4 — VERIFY: re-run STEP 1's preview; it should return 0 rows.
-- And spot-check a bill's new total:
--   SELECT bill_number, subtotal, tax_amount, total_amount
--   FROM public.bills WHERE bill_number = 'RHFMCG-001-20260724';
-- ─────────────────────────────────────────────────────────────
