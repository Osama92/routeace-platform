import * as XLSX from 'xlsx';

// ============= Types =============

export interface VendorRateRow {
  vendor_name: string;
  customer_name?: string;
  tonnage: string;
  truck_type: string;
  pickup_location?: string;
  route?: string;
  zone: string;
  rate_amount: number;
  is_net?: boolean;
  notes?: string;
}

export interface DieselRateRow {
  route_name: string;
  origin: string;
  destination: string;
  distance_km?: number;
  truck_type: string;
  diesel_liters_agreed: number;
  diesel_cost_per_liter?: number;
  notes?: string;
}

export interface HistoricalInvoiceRow {
  customer_name: string;
  vendor_name?: string;
  period_year: number;
  period_month: number;
  tonnage?: string;
  truck_type?: string;
  route?: string;
  pickup_location?: string;
  delivery_location?: string;
  trips_count?: number;
  total_revenue?: number;
  total_cost?: number;
  profit_margin?: number;
  notes?: string;
  transaction_type?: string;
  transaction_date?: string;
  week_num?: number;
  drop_point?: string;
  route_cluster?: string;
  km_covered?: number;
  tonnage_loaded?: number;
  driver_name?: string;
  truck_number?: string;
  waybill_numbers?: string;
  num_deliveries?: number;
  amount_vatable?: number;
  amount_not_vatable?: number;
  extra_dropoffs?: number;
  extra_dropoff_cost?: number;
  total_vendor_cost?: number;
  sub_total?: number;
  vat_amount?: number;
  invoice_number?: string;
  gross_profit?: number;
  wht_status?: string;
  vendor_bill_number?: string;
  vendor_invoice_status?: string;
  customer_payment_status?: string;
  invoice_status?: string;
  payment_receipt_date?: string;
  invoice_date?: string;
  payment_terms_days?: number;
  due_date?: string;
  invoice_paid_date?: string;
}

// ============= Row Error Tracking =============

export interface RowError {
  rowNumber: number;
  column: string;
  error: string;
  suggestedFix: string;
  rawValue?: any;
}

export interface ParseResult<T> {
  validRows: T[];
  invalidRows: { row: Partial<T>; errors: RowError[] }[];
  totalRows: number;
  warnings: string[];
}

// ============= Sanitization Helpers =============

/** Remove commas from numbers: "1,200,000" → 1200000 */
export function sanitizeNumber(value: any): number | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return isNaN(value) ? null : value;
  const cleaned = String(value).replace(/,/g, '').replace(/\s/g, '').trim();
  const num = Number(cleaned);
  return isNaN(num) ? null : num;
}

/** Normalize date strings to ISO format */
export function normalizeDate(value: any): string | null {
  if (!value) return null;
  
  // Handle Excel serial date numbers
  if (typeof value === 'number') {
    try {
      const date = XLSX.SSF.parse_date_code(value);
      if (date) {
        const d = new Date(date.y, date.m - 1, date.d);
        return d.toISOString().split('T')[0];
      }
    } catch {
      return null;
    }
  }
  
  const str = String(value).trim();
  if (!str) return null;

  // Try common date formats
  const formats = [
    // ISO: 2024-08-01
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
    // US: 08/01/2024 or 8/1/2024
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
    // EU: 01-08-2024
    /^(\d{1,2})-(\d{1,2})-(\d{4})$/,
    // Dot: 01.08.2024
    /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/,
  ];

  // ISO format
  let match = str.match(formats[0]);
  if (match) {
    const d = new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  }

  // US format (MM/DD/YYYY)
  match = str.match(formats[1]);
  if (match) {
    const d = new Date(parseInt(match[3]), parseInt(match[1]) - 1, parseInt(match[2]));
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  }

  // EU format (DD-MM-YYYY)
  match = str.match(formats[2]);
  if (match) {
    const d = new Date(parseInt(match[3]), parseInt(match[2]) - 1, parseInt(match[1]));
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  }

  // Dot format (DD.MM.YYYY)
  match = str.match(formats[3]);
  if (match) {
    const d = new Date(parseInt(match[3]), parseInt(match[2]) - 1, parseInt(match[1]));
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  }

  // Fallback: try native Date parsing
  try {
    const d = new Date(str);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  } catch {
    // ignore
  }

  return null;
}

/** Trim and clean string values */
function sanitizeString(value: any): string {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

// ============= Core Parser =============

export const parseExcelFile = async <T>(
  file: File,
  headerMap: Record<string, keyof T>
): Promise<T[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        const rawData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet);
        
        const mappedData = rawData.map((row) => {
          const mappedRow: Partial<T> = {};
          
          for (const [excelHeader, targetKey] of Object.entries(headerMap)) {
            const matchingKey = Object.keys(row).find(
              (k) => k.toLowerCase().trim() === excelHeader.toLowerCase().trim()
            );
            
            if (matchingKey !== undefined) {
              mappedRow[targetKey] = row[matchingKey];
            }
          }
          
          return mappedRow as T;
        });
        
        resolve(mappedData);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
};

/** Enhanced parser with validation, error tracking, and partial success */
export async function parseExcelFileRobust<T>(
  file: File,
  headerMap: Record<string, keyof T>,
  requiredFields: (keyof T)[],
  fieldTypes?: Partial<Record<keyof T, 'string' | 'number' | 'date'>>
): Promise<ParseResult<T>> {
  const rawRows = await parseExcelFile<T>(file, headerMap);
  
  const validRows: T[] = [];
  const invalidRows: { row: Partial<T>; errors: RowError[] }[] = [];
  const warnings: string[] = [];

  // Check header coverage
  const sampleRow = rawRows[0];
  if (sampleRow) {
    const mappedKeys = Object.values(headerMap) as string[];
    const foundKeys = Object.keys(sampleRow as any).filter(
      k => (sampleRow as any)[k] !== undefined && (sampleRow as any)[k] !== ''
    );
    if (foundKeys.length < mappedKeys.length * 0.3) {
      warnings.push('Less than 30% of expected columns were matched. Check your column headers.');
    }
  }

  rawRows.forEach((rawRow, index) => {
    const rowNum = index + 2; // +2 for header row + 0-index
    const row = { ...rawRow } as any;
    const errors: RowError[] = [];

    // Sanitize fields based on type hints
    if (fieldTypes) {
      for (const [key, type] of Object.entries(fieldTypes)) {
        const val = row[key];
        if (val === undefined || val === null || val === '') continue;

        if (type === 'number') {
          const num = sanitizeNumber(val);
          if (num === null) {
            errors.push({
              rowNumber: rowNum,
              column: key,
              error: `Invalid number: "${val}"`,
              suggestedFix: 'Remove non-numeric characters (commas, letters, symbols)',
              rawValue: val,
            });
          } else {
            row[key] = num;
          }
        } else if (type === 'date') {
          const date = normalizeDate(val);
          if (date === null) {
            errors.push({
              rowNumber: rowNum,
              column: key,
              error: `Invalid date: "${val}"`,
              suggestedFix: 'Use YYYY-MM-DD, MM/DD/YYYY, or DD-MM-YYYY format',
              rawValue: val,
            });
          } else {
            row[key] = date;
          }
        } else if (type === 'string') {
          row[key] = sanitizeString(val);
        }
      }
    }

    // Check required fields
    for (const field of requiredFields) {
      const val = row[field as string];
      if (val === undefined || val === null || val === '') {
        errors.push({
          rowNumber: rowNum,
          column: String(field),
          error: `Required field "${String(field)}" is missing`,
          suggestedFix: `Ensure the "${String(field)}" column has a value in every row`,
        });
      }
    }

    if (errors.length > 0) {
      invalidRows.push({ row: row as Partial<T>, errors });
    } else {
      validRows.push(row as T);
    }
  });

  return {
    validRows,
    invalidRows,
    totalRows: rawRows.length,
    warnings,
  };
}

// ============= Header Maps =============

export const vendorRateHeaderMap: Record<string, keyof VendorRateRow> = {
  'vendor name': 'vendor_name',
  'vendor': 'vendor_name',
  'partner': 'vendor_name',
  'customer name': 'customer_name',
  'customer': 'customer_name',
  'tonnage': 'tonnage',
  'truck type': 'truck_type',
  'truck': 'truck_type',
  'pickup location': 'pickup_location',
  'pickup': 'pickup_location',
  'route': 'route',
  'destination': 'route',
  'zone': 'zone',
  'rate': 'rate_amount',
  'rate amount': 'rate_amount',
  'amount': 'rate_amount',
  'is net': 'is_net',
  'net': 'is_net',
  'notes': 'notes',
  'description': 'notes',
};

export const dieselRateHeaderMap: Record<string, keyof DieselRateRow> = {
  'route name': 'route_name',
  'route': 'route_name',
  'origin': 'origin',
  'from': 'origin',
  'pickup': 'origin',
  'destination': 'destination',
  'to': 'destination',
  'delivery': 'destination',
  'distance': 'distance_km',
  'distance km': 'distance_km',
  'km': 'distance_km',
  'truck type': 'truck_type',
  'truck': 'truck_type',
  'diesel agreed': 'diesel_liters_agreed',
  'diesel liters': 'diesel_liters_agreed',
  'liters': 'diesel_liters_agreed',
  'fuel': 'diesel_liters_agreed',
  'cost per liter': 'diesel_cost_per_liter',
  'diesel cost': 'diesel_cost_per_liter',
  'notes': 'notes',
};

export const historicalInvoiceHeaderMap: Record<string, keyof HistoricalInvoiceRow> = {
  'customer': 'customer_name',
  'customer name': 'customer_name',
  'vendor': 'vendor_name',
  'vendor name': 'vendor_name',
  '3pl vendor': 'vendor_name',
  'year': 'period_year',
  'period year': 'period_year',
  'month': 'period_month',
  'period month': 'period_month',
  'week num': 'week_num',
  'week': 'week_num',
  'transaction type': 'transaction_type',
  'date': 'transaction_date',
  'transaction date': 'transaction_date',
  'route': 'route',
  'drop point': 'drop_point',
  'route clauster': 'route_cluster',
  'route cluster': 'route_cluster',
  'pickup': 'pickup_location',
  'pickup location': 'pickup_location',
  'delivery': 'delivery_location',
  'delivery location': 'delivery_location',
  'km covered': 'km_covered',
  'tonnage': 'tonnage',
  'tonnage loaded': 'tonnage_loaded',
  'truck type': 'truck_type',
  'truck': 'truck_type',
  'truck number': 'truck_number',
  'driver name': 'driver_name',
  'driver': 'driver_name',
  'waybill no': 'waybill_numbers',
  'waybill': 'waybill_numbers',
  'no of customers /deliveries': 'num_deliveries',
  'no of deliveries': 'num_deliveries',
  'deliveries': 'num_deliveries',
  'trips': 'trips_count',
  'trips count': 'trips_count',
  'extra drop off': 'extra_dropoffs',
  'extra dropoff': 'extra_dropoffs',
  'cost per extra dropoff': 'extra_dropoff_cost',
  'amount (vatable)': 'amount_vatable',
  'amount vatable': 'amount_vatable',
  'amount (not vatable)': 'amount_not_vatable',
  'amount not vatable': 'amount_not_vatable',
  'amount': 'total_revenue',
  'revenue': 'total_revenue',
  'total revenue': 'total_revenue',
  'total rev vat incl': 'total_revenue',
  'total vendor cost (+ vat)': 'total_vendor_cost',
  'total vendor cost': 'total_vendor_cost',
  'vendor cost': 'total_vendor_cost',
  'cost': 'total_cost',
  'total cost': 'total_cost',
  'sub-total': 'sub_total',
  'sub total': 'sub_total',
  'subtotal': 'sub_total',
  'total vat on invoice': 'vat_amount',
  'vat': 'vat_amount',
  'gross profit': 'gross_profit',
  'profit': 'profit_margin',
  'profit margin': 'profit_margin',
  'customer invoice number': 'invoice_number',
  'invoice number': 'invoice_number',
  'invoice no': 'invoice_number',
  'invoice date': 'invoice_date',
  'invoice status': 'invoice_status',
  'wht payment status': 'wht_status',
  'wht status': 'wht_status',
  'vendor bill number': 'vendor_bill_number',
  'vendor invoice status': 'vendor_invoice_status',
  'customer payment status': 'customer_payment_status',
  'payment reciept date': 'payment_receipt_date',
  'payment receipt date': 'payment_receipt_date',
  'payment terms(days)': 'payment_terms_days',
  'payment terms': 'payment_terms_days',
  'due date': 'due_date',
  'invoice paid date': 'invoice_paid_date',
  'notes': 'notes',
};

// ============= Normalizers =============

export const normalizeTruckType = (type: string): string => {
  const normalized = type.toLowerCase().trim();
  if (normalized.includes('trailer') || normalized.includes('45') || normalized.includes('40')) return 'trailer';
  if (normalized.includes('20') || normalized.includes('twenty')) return '20t';
  if (normalized.includes('15') || normalized.includes('fifteen')) return '15t';
  if (normalized.includes('10') || normalized.includes('ten')) return '10t';
  if (normalized.includes('5') || normalized.includes('five')) return '5t';
  return '10t';
};

export const normalizeZone = (zone: string): 'within_ibadan' | 'outside_ibadan' => {
  const normalized = zone.toLowerCase().trim();
  if (normalized.includes('within') || normalized.includes('inside') || normalized.includes('local')) {
    return 'within_ibadan';
  }
  return 'outside_ibadan';
};

// ============= Template Generators =============

export const generateVendorRateTemplate = (): void => {
  const headers = ['Vendor Name', 'Customer Name', 'Tonnage', 'Truck Type', 'Pickup Location', 'Route/Destination', 'Zone', 'Rate Amount', 'Is Net', 'Notes'];
  const sampleData = [
    ['ABC Logistics', 'Dangote Cement', '20T', '20t', 'Agbara', 'Abuja', 'outside_ibadan', 350000, 'Yes', 'Standard rate'],
    ['XYZ Transport', 'BUA Cement', '10T', '10t', 'Lagos', 'Ibadan', 'within_ibadan', 150000, 'Yes', 'Local delivery'],
  ];
  const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Vendor Rates');
  XLSX.writeFile(wb, 'vendor-rates-template.xlsx');
};

export const generateDieselRateTemplate = (): void => {
  const headers = ['Route Name', 'Origin', 'Destination', 'Distance (km)', 'Truck Type', 'Diesel Agreed (Liters)', 'Cost per Liter', 'Notes'];
  const sampleData = [
    ['Lagos-Abuja', 'Agbara', 'FCT Abuja', 750, '20t', 280, 950, 'Via Lokoja'],
    ['Lagos-Ibadan', 'Lagos', 'Ibadan', 130, '10t', 50, 950, 'Express route'],
  ];
  const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Diesel Rates');
  XLSX.writeFile(wb, 'diesel-rates-template.xlsx');
};

export const generateHistoricalDataTemplate = (): void => {
  const headers = [
    'Transaction Type', 'Date', 'Customer Name', 'Week Num', 'Month', 'Year',
    '3PL Vendor', 'Drop Point', 'Route Cluster', 'KM Covered', 'Tonnage Loaded',
    'Driver Name', 'Tonnage', 'Truck Number', 'Waybill No', 'No of Deliveries',
    'Amount (Vatable)', 'Amount (Not Vatable)', 'Extra Drop Off', 'Cost per Extra Dropoff',
    'Total Vendor Cost (+ VAT)', 'Sub-Total', 'Total VAT on Invoice',
    'Customer Invoice Number', 'Total Rev VAT Incl', 'Gross Profit',
    'WHT Payment Status', 'Vendor Bill Number', 'Vendor Invoice Status',
    'Customer Payment Status', 'Invoice Status', 'Payment Receipt Date',
    'Invoice Date', 'Payment Terms(Days)', 'Due Date', 'Invoice Paid Date', 'Notes'
  ];
  const sampleData = [[
    'Invoice', '2024-08-01', 'Dangote Cement', 32, 8, 2024,
    'ABC Logistics', 'Lagos - Abuja', 'North-Central', 750, 30,
    'John Driver', '30T', 'ABC-123-XY', 'WB-001,WB-002', 2,
    350000, 0, 1, 15000, 280000, 365000, 27375,
    'INV-2024-001', 392375, 112375, 'Pending', 'VB-001', 'Paid',
    'Paid', 'Closed', '2024-09-15', '2024-08-05', 30, '2024-09-05',
    '2024-09-15', 'Sample historical record'
  ]];
  const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Historical Data');
  XLSX.writeFile(wb, 'historical-data-template.xlsx');
};
