export type TaxMode = 'exempted' | 'vat_13_exclusive' | 'vat_13_inclusive';

export type PaymentStatus = 'paid' | 'unpaid' | 'partial';

export type PaymentMethod = 'cash' | 'esewa' | 'khalti' | 'fonepay' | 'bank_transfer' | 'cheque' | 'credit';

export type DocumentType = 'cctv_invoice' | 'studio_invoice' | 'counter_sale';

export interface CompanyDetails {
  studioName: string;            // Primary / CCTV Business Name (e.g. "PNP TECH TRADERS")
  generalBusinessName?: string;  // General Sales / Studio Name on Bill (e.g. "PARICHAYA PHOTO STUDIO")
  generalBusinessTagline?: string;
  tagline: string;
  address: string;
  city: string;
  phonePrimary: string;
  phoneSecondary: string;
  email: string;
  panVatNo: string;
  logoUrl: string;
  signatureUrl?: string;         // Authorized Signature Image (JPEG, PNG, JPG)
  stampUrl?: string;             // Official Company Stamp / Seal (JPEG, PNG, JPG)
  bankName: string;
  accountName: string;
  accountNumber: string;
  qrCodeUrl: string;
  fiscalYear: string;   // e.g. "2083-84"
  cctvPrefix: string;    // e.g. "CCTV"
  invoicePrefix: string; // e.g. "INV"
  salesPrefix: string;   // e.g. "SALE"
  defaultTerms: string;
  isVatRegistered: boolean;
  showBankDetailsOnCashInvoices?: boolean;
  showDiscountByDefault?: boolean;
  backupSettings?: BackupSettings;
  securitySettings?: SecuritySettings;
}

export interface SecuritySettings {
  appLockEnabled: boolean;
  masterPassword?: string;
  securityQuestion?: string;
  securityAnswer?: string;
}

export interface BackupSettings {
  autoBackupEnabled: boolean;
  backupFrequency: 'on_save' | '30_min' | 'hourly' | 'daily';
  googleDriveConnected: boolean;
  googleUserEmail?: string;
  localSyncEnabled: boolean;
  localSyncFolderPath?: string; // Default: G:\My Drive\PNP Tech Traders Backups
  lastBackupTime?: string;
  lastBackupStatus?: 'success' | 'failed' | 'idle' | 'syncing';
  lastBackupMessage?: string;
}

export interface BackupRecord {
  id: string;
  fileName: string;
  timestamp: string;
  sizeBytes: number;
  invoiceCount: number;
  customerCount: number;
  catalogCount: number;
  type: 'cloud' | 'local';
  driveFileId?: string;
  driveWebViewLink?: string;
}

export interface PasswordItem {
  id: string;
  title: string;
  category: 'cctv' | 'network' | 'banking' | 'cloud' | 'software' | 'general';
  username: string;
  password?: string;
  pin?: string;
  ipOrUrl?: string;
  notes?: string;
  favorite?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ExcelColumn {
  id: string;
  title: string;
  type: 'text' | 'number' | 'currency' | 'percent' | 'badge' | 'date';
  width?: number;
  formula?: string; // Optional default formula or column calculation
}

export interface ExcelRow {
  id: string;
  [colId: string]: any;
}

export interface ExcelSheet {
  id: string;
  name: string;
  icon?: 'price' | 'workers' | 'attendance' | 'custom';
  columns: ExcelColumn[];
  rows: ExcelRow[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ShopSpreadsheetData {
  sheets: ExcelSheet[];
  activeSheetId: string;
}

export interface DatabaseSnapshot {
  version: string;
  appName: string;
  exportedAt: string;
  checksum?: string;
  companyDetails: CompanyDetails;
  invoices: Invoice[];
  customers: Customer[];
  catalog: CatalogItem[];
  passwords?: PasswordItem[];
  spreadsheetData?: ShopSpreadsheetData;
  backupSettings?: BackupSettings;
}

export interface Customer {
  id: string;
  name: string;
  address: string;
  phone: string;
  panVatNo?: string;
  email?: string;
  createdAt?: string;
}

export interface CatalogItem {
  id: string;
  code?: string;
  description: string;
  category: 'General Products' | 'Electronics' | 'Hardware' | 'Accessories' | 'CCTV & Security' | 'Photo & Print' | 'Studio Photo' | 'Framing' | 'Printing' | 'Event' | 'Services' | 'Other';
  unit: string; // Pcs, Copies, Sets, Pkt, Sq Ft, Hrs, Mtr, Job, Box, Packet, etc.
  price: number;
}

export interface LineItem {
  id: string;
  sn: number;
  description: string;
  qty: number;
  unit: string;
  listPrice: number;
  discountType: 'percent' | 'flat';
  discountValue: number;
  effectivePrice: number;
  amount: number;
}

export interface Invoice {
  id: string;
  docType: DocumentType; // CCTV Sales Invoice vs General Sales Invoice / Normal Bill vs Retail Counter Sale
  invoiceNumber: string; // e.g. CCTV-001/2083-84, INV-001/2083-84, SALE-001/2083-84
  invoiceSeq: number;    // numeric sequence number e.g. 1
  fiscalYear: string;    // e.g. 2083-84
  dateBS: string;        // YYYY-MM-DD (e.g. 2083-05-01)
  dateAD: string;        // YYYY-MM-DD (e.g. 2026-08-17)
  customerName: string;
  customerAddress: string;
  customerPhone: string;
  customerPanVat: string;
  installationSite?: string; // Specific Site / Installation location for CCTV
  serialNumbers?: string;    // Camera & DVR/NVR Serial Numbers (S/N)
  warrantyInfo?: string;     // Warranty terms & conditions
  items: LineItem[];
  taxMode: TaxMode;
  showDiscount?: boolean;
  subtotal: number;
  totalDiscount: number;
  taxableAmount: number;
  vatAmount: number;
  grandTotal: number;
  amountInWords: string;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  amountPaid: number;
  amountDue: number;
  notes: string;
  terms: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceFilterOptions {
  searchQuery: string;
  paymentStatus: string;
  taxMode: string;
  startDateBS?: string;
  endDateBS?: string;
  startDateAD?: string;
  endDateAD?: string;
}

