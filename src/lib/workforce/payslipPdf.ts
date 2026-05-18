// Lightweight client-side payslip PDF using browser print-to-PDF.
// Avoids adding a new heavy dep; opens a print window with a clean payslip layout.

export interface PayslipLineItem { label: string; amount: number }
export interface Payslip {
  id: string;
  payslip_number: string;
  staff_name: string;
  staff_email?: string | null;
  staff_role?: string | null;
  period_start?: string | null;
  period_end?: string | null;
  pay_date: string;
  gross_amount: number;
  tax_amount: number;
  net_amount: number;
  earnings: PayslipLineItem[] | unknown;
  deductions: PayslipLineItem[] | unknown;
  payment_reference?: string | null;
  currency_code: string;
}

const fmt = (n: number, ccy: string) =>
  `${ccy} ${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

const toRows = (items: unknown): PayslipLineItem[] =>
  Array.isArray(items) ? (items as PayslipLineItem[]) : [];

const esc = (s: unknown): string =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export function downloadPayslipPdf(p: Payslip): void {
  const earnings = toRows(p.earnings);
  const deductions = toRows(p.deductions);
  const period = p.period_start && p.period_end
    ? `${new Date(p.period_start).toLocaleDateString()} – ${new Date(p.period_end).toLocaleDateString()}`
    : new Date(p.pay_date).toLocaleDateString();

  const html = `<!doctype html><html><head><meta charset="utf-8"/>
  <title>Payslip ${esc(p.payslip_number)}</title>
  <style>
    body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#111;padding:32px;max-width:780px;margin:auto}
    h1{margin:0 0 4px;font-size:22px}
    .muted{color:#666;font-size:13px}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:24px}
    table{width:100%;border-collapse:collapse;font-size:14px}
    th,td{text-align:left;padding:8px 0;border-bottom:1px solid #eee}
    th{font-weight:600}
    .total{font-weight:700;font-size:16px;margin-top:8px;display:flex;justify-content:space-between;border-top:2px solid #111;padding-top:8px}
    .net{background:#0f172a;color:#fff;padding:16px;border-radius:8px;margin-top:24px;display:flex;justify-content:space-between;font-size:18px;font-weight:700}
    .meta{margin-top:6px;font-size:12px;color:#888}
  </style></head><body>
    <h1>Payslip</h1>
    <div class="muted">${esc(p.payslip_number)} · Pay date ${esc(new Date(p.pay_date).toLocaleDateString())}</div>
    <div class="grid">
      <div>
        <div class="muted">Employee</div>
        <div><strong>${esc(p.staff_name)}</strong></div>
        ${p.staff_role ? `<div class="muted">${esc(p.staff_role)}</div>` : ""}
        ${p.staff_email ? `<div class="muted">${esc(p.staff_email)}</div>` : ""}
      </div>
      <div>
        <div class="muted">Pay period</div>
        <div>${esc(period)}</div>
        ${p.payment_reference ? `<div class="muted">Ref: ${esc(p.payment_reference)}</div>` : ""}
      </div>
    </div>

    <div class="grid">
      <div>
        <table><thead><tr><th>Earnings</th><th style="text-align:right">Amount</th></tr></thead>
        <tbody>${earnings.map(e => `<tr><td>${esc(e.label)}</td><td style="text-align:right">${esc(fmt(e.amount, p.currency_code))}</td></tr>`).join("")}</tbody></table>
        <div class="total"><span>Gross</span><span>${esc(fmt(p.gross_amount, p.currency_code))}</span></div>
      </div>
      <div>
        <table><thead><tr><th>Deductions</th><th style="text-align:right">Amount</th></tr></thead>
        <tbody>${deductions.map(d => `<tr><td>${esc(d.label)}</td><td style="text-align:right">${esc(fmt(d.amount, p.currency_code))}</td></tr>`).join("")}</tbody></table>
        <div class="total"><span>Tax</span><span>${esc(fmt(p.tax_amount, p.currency_code))}</span></div>
      </div>
    </div>

    <div class="net"><span>Net Pay</span><span>${esc(fmt(p.net_amount, p.currency_code))}</span></div>
    <div class="meta">This payslip is system-generated and tamper-proof. Corrections must be issued at the payroll level.</div>
    <script>window.onload=()=>{setTimeout(()=>window.print(),200)}</script>
  </body></html>`;

  const win = window.open("", "_blank");
  if (!win) return;
  win.document.open();
  win.document.write(html);
  win.document.close();
}
