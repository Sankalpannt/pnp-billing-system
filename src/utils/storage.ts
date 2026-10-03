import Dexie, { Table } from 'dexie';
import { 
  Invoice, Customer, CatalogItem, PasswordItem, CompanyDetails, DatabaseSnapshot, 
  ShopSpreadsheetData, StockLog 
} from '../types/invoice';

export class PNPTechDatabase extends Dexie {
  invoices!: Table<Invoice, string>;
  customers!: Table<Customer, string>;
  catalog!: Table<CatalogItem, string>;
  passwords!: Table<PasswordItem, string>;
  stockLogs!: Table<StockLog, string>;

  constructor() {
    super('PNPTechBillingDB');
    this.version(1).stores({
      invoices: 'id, invoiceNumber, dateBS, dateAD, customerName, customerPhone, paymentStatus, fiscalYear, createdAt',
      customers: 'id, name, phone, panVatNo',
      catalog: 'id, category, description'
    });
    this.version(2).stores({
      invoices: 'id, invoiceNumber, dateBS, dateAD, customerName, customerPhone, paymentStatus, fiscalYear, createdAt',
      customers: 'id, name, phone, panVatNo',
      catalog: 'id, category, description',
      passwords: 'id, title, category, username, createdAt'
    });
    this.version(3).stores({
      invoices: 'id, invoiceNumber, dateBS, dateAD, customerName, customerPhone, paymentStatus, fiscalYear, createdAt',
      customers: 'id, name, phone, panVatNo',
      catalog: 'id, category, description, code',
      passwords: 'id, title, category, username, createdAt',
      stockLogs: 'id, itemId, invoiceId, type, timestamp'
    });
  }
}

export const db = new PNPTechDatabase();

export const DEFAULT_COMPANY_DETAILS: CompanyDetails = {
  studioName: 'PNP TECH TRADERS',
  generalBusinessName: 'PARICHAYA PHOTO STUDIO',
  generalBusinessTagline: 'Digital Photography, Framing, Printing & General Sales',
  tagline: 'CCTV Security Systems, Computer Networking & Tech Solutions',
  address: 'Pokhara 27, Talchok',
  city: 'Pokhara',
  phonePrimary: '+977 9740777765',
  phoneSecondary: '',
  email: 'pnptechtraders@gmail.com',
  panVatNo: '617322405',
  logoUrl: './pnp_icon_transparent.png',
  signatureUrl: '',
  stampUrl: '',
  bankName: 'Nabil Bank Ltd.',
  accountName: 'PNP TECH TRADERS',
  accountNumber: '01201017500123',
  qrCodeUrl: '',
  fiscalYear: '2083-84',
  cctvPrefix: 'INV',
  invoicePrefix: 'INV',
  salesPrefix: 'CS',
  defaultTerms: '1. Goods & services once provided are subject to terms & conditions.\n2. CCTV cameras & hardware carry manufacturer warranty as per card.\n3. Please verify items & invoice particulars before leaving.',
  isVatRegistered: true,
  showBankDetailsOnCashInvoices: false,
  showDiscountByDefault: true,
  backupSettings: {
    autoBackupEnabled: true,
    backupFrequency: 'on_save',
    googleDriveConnected: true,
    localSyncFolderPath: 'G:\\My Drive\\PNP Tech Traders Backups',
    localSyncEnabled: true,
    lastBackupStatus: 'idle'
  },
  securitySettings: {
    appLockEnabled: true,
    masterPassword: 'pnp2083',
    securityQuestion: 'Company Name',
    securityAnswer: 'PNP TECH TRADERS'
  }
};

export const DEMO_CCTV_STARTER_ITEMS: CatalogItem[] = [
  { id: '1', code: 'CAM-HIK-2MP', category: 'CCTV & Security', description: '2MP HD Night Vision Dome Camera (Hikvision/Dahua)', unit: 'Pcs', price: 2800, costPrice: 2150, stockQty: 24, minStockAlert: 5, trackStock: true, location: 'Rack A-1', notes: '2 Years Replacement Warranty' },
  { id: '2', code: 'CAM-DAH-4MP', category: 'CCTV & Security', description: '4MP IP Outdoor Bullet Camera (ColorVu / Full Color)', unit: 'Pcs', price: 4800, costPrice: 3750, stockQty: 12, minStockAlert: 3, trackStock: true, location: 'Rack A-2', notes: 'Waterproof IP67, Built-in Mic' },
  { id: '3', code: 'NVR-HIK-8CH', category: 'CCTV & Security', description: '8-Channel HD DVR / NVR 4K Recorders', unit: 'Pcs', price: 7500, costPrice: 5800, stockQty: 6, minStockAlert: 2, trackStock: true, location: 'Rack B-1', notes: 'HDMI 4K Output, Cloud P2P' },
  { id: '4', code: 'HDD-SEA-1TB', category: 'CCTV & Security', description: '1TB Surveillance Hard Disk Drive (Seagate SkyHawk / WD Purple)', unit: 'Pcs', price: 6200, costPrice: 5100, stockQty: 10, minStockAlert: 3, trackStock: true, location: 'Locker C-1', notes: '3 Years Warranty - Surveillance Grade' },
  { id: '5', code: 'HDD-WD-2TB', category: 'CCTV & Security', description: '2TB Surveillance Hard Disk Drive (WD Purple / Seagate)', unit: 'Pcs', price: 9200, costPrice: 7400, stockQty: 8, minStockAlert: 2, trackStock: true, location: 'Locker C-1', notes: '3 Years Warranty - High Endurance' },
  { id: '6', code: 'CAB-COAX-1M', category: 'CCTV & Security', description: 'CCTV Cable 3+1 Pure Copper Coaxial Wire (Per Meter)', unit: 'Mtr', price: 45, costPrice: 32, stockQty: 450, minStockAlert: 50, trackStock: true, location: 'Ground Store', notes: '100% Solid Copper' },
  { id: '7', code: 'CAB-CAT6-1M', category: 'CCTV & Security', description: 'Cat6 Pure Copper High-Speed UTP Network Cable', unit: 'Mtr', price: 40, costPrice: 28, stockQty: 600, minStockAlert: 100, trackStock: true, location: 'Ground Store', notes: 'Gigabit LAN Co-axial' },
  { id: '8', code: 'SRV-CCTV-INST', category: 'Services', description: 'CCTV Full System Installation, Alignment & Cabling Service', unit: 'Job', price: 3500, costPrice: 0, stockQty: 0, minStockAlert: 0, trackStock: false, notes: 'On-site technical support' },
  { id: '9', code: 'PSU-12V-5A', category: 'Accessories', description: '12V 5A Centralized Power Supply Box for CCTV', unit: 'Pcs', price: 1500, costPrice: 1100, stockQty: 18, minStockAlert: 4, trackStock: true, location: 'Rack B-2', notes: 'Overload Protected' },
  { id: '10', code: 'PSU-12V-10A', category: 'Accessories', description: '12V 10A Heavy Duty SMPS Power Supply', unit: 'Pcs', price: 2400, costPrice: 1800, stockQty: 15, minStockAlert: 3, trackStock: true, location: 'Rack B-2', notes: 'Heavy Duty Metal Body' },
  { id: '11', code: 'ACC-BNC-SET', category: 'Accessories', description: 'BNC & DC Power Connectors (Set of 8 Pairs)', unit: 'Sets', price: 600, costPrice: 380, stockQty: 40, minStockAlert: 10, trackStock: true, location: 'Drawer 1', notes: 'Gold Plated Pins' },
  { id: '12', code: 'NET-POE-SWITCH', category: 'Accessories', description: '4-Port / 8-Port 100Mbps PoE Network Switch', unit: 'Pcs', price: 3800, costPrice: 2900, stockQty: 8, minStockAlert: 2, trackStock: true, location: 'Rack B-1', notes: 'IEEE 802.3af Standard' },
  { id: '13', code: 'ACC-HDMI-3M', category: 'Accessories', description: '1.5M / 3M High-Speed HDMI Cable 4K Gold Plated', unit: 'Pcs', price: 450, costPrice: 280, stockQty: 25, minStockAlert: 5, trackStock: true, location: 'Rack B-3', notes: '4K 60Hz Ready' }
];

export const INITIAL_CATALOG: CatalogItem[] = [];

export const INITIAL_CUSTOMERS: Customer[] = [];

export const INITIAL_PASSWORDS: PasswordItem[] = [
  {
    id: 'pw-1',
    title: 'Shop CCTV NVR Admin',
    category: 'cctv',
    username: 'admin',
    password: 'Pnp@Tech#2083',
    ipOrUrl: '192.168.1.64:8000',
    pin: '888888',
    notes: 'Main 8-Channel Hikvision NVR in server rack. Verification code: ABCD1234',
    favorite: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'pw-2',
    title: 'Office Dual-Band WiFi Router',
    category: 'network',
    username: 'admin',
    password: 'PnpShop#WiFi@2083',
    ipOrUrl: '192.168.1.1',
    pin: '',
    notes: 'TP-Link Archer AX23 Gigabit Router. 5GHz SSID: PNP_TECH_5G',
    favorite: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'pw-3',
    title: 'eSewa Merchant Portal',
    category: 'banking',
    username: '9740777765',
    password: '',
    pin: '1234',
    ipOrUrl: 'https://merchant.esewa.com.np',
    notes: 'PNP Tech Traders merchant QR settlement account',
    favorite: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export const INITIAL_SPREADSHEET_DATA: ShopSpreadsheetData = {
  activeSheetId: 'sheet-price-store',
  sheets: [
    {
      id: 'sheet-price-store',
      name: 'Price Store & Stock',
      icon: 'price',
      columns: [
        { id: 'code', title: 'Item SKU / Code', type: 'text', width: 130 },
        { id: 'tagNumber', title: 'Tag # / Box', type: 'badge', width: 110 },
        { id: 'name', title: 'Product / Item Particulars', type: 'text', width: 270 },
        { id: 'category', title: 'Category', type: 'badge', width: 130 },
        { id: 'unit', title: 'Unit', type: 'text', width: 70 },
        { id: 'costPrice', title: 'Cost Price (Rs.)', type: 'currency', width: 120 },
        { id: 'dealerPrice', title: 'Dealer Rate (Rs.)', type: 'currency', width: 120 },
        { id: 'retailPrice', title: 'Retail Price (Rs.)', type: 'currency', width: 120 },
        { id: 'stockQty', title: 'Stock Qty', type: 'number', width: 90 },
        { id: 'marginPercent', title: 'Margin %', type: 'percent', width: 90, formula: '((retailPrice-costPrice)/costPrice)*100' },
        { id: 'stockValue', title: 'Stock Value (Rs.)', type: 'currency', width: 130, formula: 'retailPrice*stockQty' },
        { id: 'location', title: 'Rack / Shelf', type: 'text', width: 110 },
        { id: 'notes', title: 'Warranty & Notes', type: 'text', width: 200 }
      ],
      rows: []
    },
    {
      id: 'sheet-workers-staff',
      name: 'Shop Workers & Staff',
      icon: 'workers',
      columns: [
        { id: 'staffId', title: 'Staff ID', type: 'text', width: 90 },
        { id: 'name', title: 'Worker Full Name', type: 'text', width: 200 },
        { id: 'role', title: 'Role / Designation', type: 'badge', width: 170 },
        { id: 'phone', title: 'Mobile Number', type: 'text', width: 130 },
        { id: 'salary', title: 'Monthly Salary (Rs.)', type: 'currency', width: 130 },
        { id: 'dailyRate', title: 'Daily Wage (Rs.)', type: 'currency', width: 120 },
        { id: 'overtimeRate', title: 'Hourly Overtime (Rs.)', type: 'currency', width: 130 },
        { id: 'emergencyContact', title: 'Emergency Contact', type: 'text', width: 150 },
        { id: 'status', title: 'Duty Status', type: 'badge', width: 110 },
        { id: 'advanceTaken', title: 'Advance Taken (Rs.)', type: 'currency', width: 130 },
        { id: 'joiningDate', title: 'Joining Date (BS)', type: 'date', width: 120 },
        { id: 'notes', title: 'Specialization & Notes', type: 'text', width: 220 }
      ],
      rows: []
    },
    {
      id: 'sheet-staff-attendance',
      name: 'Staff Attendance & Khata',
      icon: 'attendance',
      columns: [
        { id: 'dateBS', title: 'Date (BS)', type: 'date', width: 110 },
        { id: 'workerName', title: 'Worker Name', type: 'text', width: 170 },
        { id: 'dutyType', title: 'Duty Status', type: 'badge', width: 140 },
        { id: 'hoursOvertime', title: 'Overtime (Hrs)', type: 'number', width: 110 },
        { id: 'dailyWage', title: 'Base Daily Wage (Rs.)', type: 'currency', width: 130 },
        { id: 'advanceDeduction', title: 'Advance Deduct (Rs.)', type: 'currency', width: 130 },
        { id: 'netPayable', title: 'Net Payable (Rs.)', type: 'currency', width: 130, formula: 'dailyWage-advanceDeduction' },
        { id: 'taskSite', title: 'Site Work / Installation Job', type: 'text', width: 260 },
        { id: 'paymentStatus', title: 'Khata Status', type: 'badge', width: 110 }
      ],
      rows: []
    }
  ]
};

/**
 * Automatically migrates existing database records from legacy ParichayaPhotoStudioDB if present
 */
export async function checkAndMigrateLegacyDatabase(): Promise<void> {
  try {
    const currentCount = await db.invoices.count();
    if (currentCount > 0) return; // Already initialized

    // Check if legacy database exists
    const legacyDb = new Dexie('ParichayaPhotoStudioDB');
    legacyDb.version(1).stores({
      invoices: 'id, invoiceNumber, dateBS, dateAD, customerName, customerPhone, paymentStatus, fiscalYear, createdAt',
      customers: 'id, name, phone, panVatNo',
      catalog: 'id, category, description'
    });

    const legacyInvoices = await legacyDb.table<Invoice>('invoices').toArray();
    const legacyCustomers = await legacyDb.table<Customer>('customers').toArray();
    const legacyCatalog = await legacyDb.table<CatalogItem>('catalog').toArray();

    if (legacyInvoices.length > 0) {
      await db.invoices.bulkAdd(legacyInvoices);
    }
    if (legacyCustomers.length > 0) {
      await db.customers.bulkAdd(legacyCustomers);
    }
    if (legacyCatalog.length > 0) {
      await db.catalog.bulkAdd(legacyCatalog);
    }
  } catch (err) {
    console.log('Legacy migration check completed without legacy DB:', err);
  }
}

/**
 * Save / Load Settings from LocalStorage
 */
export function getSavedCompanyDetails(): CompanyDetails {
  try {
    const raw = localStorage.getItem('pnp_company_details') || localStorage.getItem('parichaya_company_details');
    if (raw) {
      const parsed = JSON.parse(raw);
      const isOutdatedName = !parsed.studioName || 
        parsed.studioName.toLowerCase().includes('parichaya') || 
        parsed.studioName.toLowerCase().includes('sankalpa') || 
        parsed.studioName.toLowerCase().includes('praders');

      const isOutdatedAccount = !parsed.accountName || 
        parsed.accountName.toLowerCase().includes('parichaya') || 
        parsed.accountName.toLowerCase().includes('sankalpa') || 
        parsed.accountName.toLowerCase().includes('praders');

      const isOutdatedAddress = !parsed.address || parsed.address.includes('New Road');
      const isOutdatedPhone = !parsed.phonePrimary || parsed.phonePrimary.includes('9856012345');
      const isOutdatedEmail = !parsed.email || parsed.email.includes('parichaya') || parsed.email.includes('praders') || parsed.email.includes('info@pnptech');

      const details: CompanyDetails = {
        ...DEFAULT_COMPANY_DETAILS,
        ...parsed,
        studioName: isOutdatedName ? DEFAULT_COMPANY_DETAILS.studioName : parsed.studioName,
        generalBusinessName: parsed.generalBusinessName || DEFAULT_COMPANY_DETAILS.generalBusinessName,
        generalBusinessTagline: parsed.generalBusinessTagline || DEFAULT_COMPANY_DETAILS.generalBusinessTagline,
        panVatNo: parsed.panVatNo && parsed.panVatNo !== '601234567' ? parsed.panVatNo : DEFAULT_COMPANY_DETAILS.panVatNo,
        accountName: isOutdatedAccount ? DEFAULT_COMPANY_DETAILS.accountName : parsed.accountName,
        address: isOutdatedAddress ? DEFAULT_COMPANY_DETAILS.address : parsed.address,
        phonePrimary: isOutdatedPhone ? DEFAULT_COMPANY_DETAILS.phonePrimary : parsed.phonePrimary,
        phoneSecondary: isOutdatedPhone ? '' : (parsed.phoneSecondary || ''),
        email: isOutdatedEmail ? DEFAULT_COMPANY_DETAILS.email : parsed.email,
        logoUrl: parsed.logoUrl || DEFAULT_COMPANY_DETAILS.logoUrl,
        backupSettings: {
          ...DEFAULT_COMPANY_DETAILS.backupSettings,
          ...(parsed.backupSettings || {}),
          googleDriveFolderName: 'PNP Tech Traders Backups'
        }
      };

      // Persist the clean details
      saveCompanyDetails(details);
      return details;
    }
  } catch (e) {
    console.error('Failed to load company details from localStorage', e);
  }
  return DEFAULT_COMPANY_DETAILS;
}

export function saveCompanyDetails(details: CompanyDetails): void {
  try {
    localStorage.setItem('pnp_company_details', JSON.stringify(details));
    // Keep legacy key synced for backward compatibility
    localStorage.setItem('parichaya_company_details', JSON.stringify(details));
  } catch (e) {
    console.error('Failed to save company details', e);
  }
}

export function getSavedSpreadsheetData(): ShopSpreadsheetData {
  try {
    const raw = localStorage.getItem('pnp_excel_sheets');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.sheets) && parsed.sheets.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load spreadsheet data from localStorage', e);
  }
  return INITIAL_SPREADSHEET_DATA;
}

export function saveSpreadsheetData(data: ShopSpreadsheetData): void {
  try {
    localStorage.setItem('pnp_excel_sheets', JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save spreadsheet data', e);
  }
}

/**
 * Creates a complete database snapshot containing all invoices, customers, catalog, passwords, spreadsheet data, and settings
 */
export async function createFullDatabaseSnapshot(): Promise<DatabaseSnapshot> {
  const invoices = await db.invoices.toArray();
  const customers = await db.customers.toArray();
  const catalog = await db.catalog.toArray();
  const stockLogs = await db.stockLogs.toArray();
  const passwords = await db.passwords.toArray();
  const companyDetails = getSavedCompanyDetails();
  const spreadsheetData = getSavedSpreadsheetData();

  return {
    version: '1.0.0',
    appName: 'PNP TECH TRADERS Billing Software',
    exportedAt: new Date().toISOString(),
    companyDetails,
    invoices,
    customers,
    catalog,
    stockLogs,
    passwords,
    spreadsheetData,
    backupSettings: companyDetails.backupSettings
  };
}

/**
 * Restores entire database from a snapshot
 */
export async function restoreDatabaseFromSnapshot(snapshot: DatabaseSnapshot, mode: 'overwrite' | 'merge' = 'overwrite'): Promise<{
  invoicesCount: number;
  customersCount: number;
  catalogCount: number;
  passwordsCount: number;
}> {
  if (!snapshot || !Array.isArray(snapshot.invoices)) {
    throw new Error('Invalid backup file format: Missing invoices collection.');
  }

  if (mode === 'overwrite') {
    await db.transaction('rw', db.invoices, db.customers, db.catalog, db.passwords, db.stockLogs, async () => {
      await db.invoices.clear();
      await db.customers.clear();
      await db.catalog.clear();
      await db.passwords.clear();
      await db.stockLogs.clear();

      if (snapshot.invoices.length > 0) {
        await db.invoices.bulkAdd(snapshot.invoices);
      }
      if (Array.isArray(snapshot.customers) && snapshot.customers.length > 0) {
        await db.customers.bulkAdd(snapshot.customers);
      }
      if (Array.isArray(snapshot.catalog) && snapshot.catalog.length > 0) {
        await db.catalog.bulkAdd(snapshot.catalog);
      }
      if (Array.isArray(snapshot.stockLogs) && snapshot.stockLogs.length > 0) {
        await db.stockLogs.bulkAdd(snapshot.stockLogs);
      }
      if (Array.isArray(snapshot.passwords) && snapshot.passwords.length > 0) {
        await db.passwords.bulkAdd(snapshot.passwords);
      }
    });
  } else {
    // Merge mode: put items
    await db.transaction('rw', db.invoices, db.customers, db.catalog, db.passwords, db.stockLogs, async () => {
      for (const inv of snapshot.invoices) {
        await db.invoices.put(inv);
      }
      if (Array.isArray(snapshot.customers)) {
        for (const cust of snapshot.customers) {
          await db.customers.put(cust);
        }
      }
      if (Array.isArray(snapshot.catalog)) {
        for (const cat of snapshot.catalog) {
          await db.catalog.put(cat);
        }
      }
      if (Array.isArray(snapshot.stockLogs)) {
        for (const log of snapshot.stockLogs) {
          await db.stockLogs.put(log);
        }
      }
      if (Array.isArray(snapshot.passwords)) {
        for (const pw of snapshot.passwords) {
          await db.passwords.put(pw);
        }
      }
    });
  }

  if (snapshot.spreadsheetData) {
    saveSpreadsheetData(snapshot.spreadsheetData);
  }

  if (snapshot.companyDetails) {
    saveCompanyDetails(snapshot.companyDetails);
  }

  return {
    invoicesCount: snapshot.invoices.length,
    customersCount: snapshot.customers?.length || 0,
    catalogCount: snapshot.catalog?.length || 0,
    passwordsCount: snapshot.passwords?.length || 0
  };
}

/**
 * Triggers download of a full database JSON backup file in the browser / desktop
 */
export async function exportDatabaseToFile(): Promise<string> {
  const snapshot = await createFullDatabaseSnapshot();
  const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const fileName = `PNP_TECH_TRADERS_Backup_${dateStr}.json`;
  const jsonContent = JSON.stringify(snapshot, null, 2);

  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return fileName;
}
