import Dexie, { Table } from 'dexie';
import { 
  Invoice, Customer, CatalogItem, PasswordItem, CompanyDetails, DatabaseSnapshot, 
  ShopSpreadsheetData 
} from '../types/invoice';

export class PNPTechDatabase extends Dexie {
  invoices!: Table<Invoice, string>;
  customers!: Table<Customer, string>;
  catalog!: Table<CatalogItem, string>;
  passwords!: Table<PasswordItem, string>;

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

export const INITIAL_CATALOG: CatalogItem[] = [
  { id: '1', category: 'CCTV & Security', description: '2MP HD Night Vision Dome Camera (Hikvision/Dahua)', unit: 'Pcs', price: 2800 },
  { id: '2', category: 'CCTV & Security', description: '4MP IP Outdoor Bullet Camera (ColorVu / Full Color)', unit: 'Pcs', price: 4800 },
  { id: '3', category: 'CCTV & Security', description: '8-Channel HD DVR / NVR 4K Recorders', unit: 'Pcs', price: 7500 },
  { id: '4', category: 'CCTV & Security', description: '1TB Surveillance Hard Disk Drive (Seagate SkyHawk / WD Purple)', unit: 'Pcs', price: 6200 },
  { id: '5', category: 'CCTV & Security', description: '2TB Surveillance Hard Disk Drive (WD Purple / Seagate)', unit: 'Pcs', price: 9200 },
  { id: '6', category: 'CCTV & Security', description: 'CCTV Cable 3+1 Pure Copper Coaxial Wire (Per Meter)', unit: 'Mtr', price: 45 },
  { id: '7', category: 'CCTV & Security', description: 'Cat6 Pure Copper High-Speed UTP Network Cable', unit: 'Mtr', price: 40 },
  { id: '8', category: 'CCTV & Security', description: 'CCTV Full System Installation, Alignment & Cabling Service', unit: 'Job', price: 3500 },
  { id: '9', category: 'Accessories', description: '12V 5A Centralized Power Supply Box for CCTV', unit: 'Pcs', price: 1500 },
  { id: '10', category: 'Accessories', description: '12V 10A Heavy Duty SMPS Power Supply', unit: 'Pcs', price: 2400 },
  { id: '11', category: 'Accessories', description: 'BNC & DC Power Connectors (Set of 8 Pairs)', unit: 'Sets', price: 600 },
  { id: '12', category: 'Accessories', description: '4-Port / 8-Port 100Mbps PoE Network Switch', unit: 'Pcs', price: 3800 },
  { id: '13', category: 'Accessories', description: '1.5M / 3M High-Speed HDMI Cable 4K Gold Plated', unit: 'Pcs', price: 450 },
  { id: '14', category: 'General Products', description: 'Wireless Optical Mouse 2.4GHz (Logitech / Rapoo)', unit: 'Pcs', price: 650 },
  { id: '15', category: 'General Products', description: 'USB 3.2 High-Speed 64GB Flash Drive (SanDisk / Kingston)', unit: 'Pcs', price: 850 },
  { id: '16', category: 'General Products', description: 'Heavy Duty 6-Socket Surge Protector Power Strip Extension', unit: 'Pcs', price: 950 },
  { id: '17', category: 'General Products', description: 'Cat6 Pure Copper Molded RJ45 Patch Cord 3 Meter', unit: 'Pcs', price: 180 },
  { id: '18', category: 'Photo & Print', description: 'Passport Size Photo (8 Copies Glossy Lab Print)', unit: 'Pkt', price: 200 },
  { id: '19', category: 'Photo & Print', description: 'Visa / MRP Photo Official Format (4 Copies)', unit: 'Pkt', price: 250 },
  { id: '20', category: 'Photo & Print', description: 'Digital Soft Copy & High-Res Image Transfer', unit: 'Pcs', price: 100 },
  { id: '21', category: 'Framing', description: 'Photo Frame 12x18 inch (Synthetic Matte)', unit: 'Pcs', price: 1200 },
  { id: '22', category: 'Framing', description: 'Photo Frame 16x24 inch (Wooden Finish)', unit: 'Pcs', price: 2500 },
  { id: '23', category: 'Services', description: 'Technical Site Survey & Security Audit', unit: 'Job', price: 1500 }
];

export const INITIAL_CUSTOMERS: Customer[] = [
  { id: 'c1', name: 'Sharma Traders Pvt. Ltd.', address: 'Mahendrapool, Pokhara', phone: '9846011111', panVatNo: '304958671' },
  { id: 'c2', name: 'Ramesh Adhikari', address: 'Lakeside, Pokhara', phone: '9806122222' },
  { id: 'c3', name: 'Hotel Annapurna Sanctuary', address: 'Gairapatan, Pokhara', phone: '061-520123', panVatNo: '600129845' }
];

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
      rows: [
        {
          id: 'row-p-1',
          code: 'CAM-HIK-2MP',
          name: '2MP HD Night Vision Dome Camera (Hikvision)',
          category: 'CCTV & Security',
          unit: 'Pcs',
          costPrice: 2150,
          dealerPrice: 2450,
          retailPrice: 2800,
          stockQty: 24,
          marginPercent: 30.2,
          stockValue: 67200,
          location: 'Rack A-1',
          notes: '2 Years Replacement Warranty'
        },
        {
          id: 'row-p-2',
          code: 'CAM-DAH-4MP',
          name: '4MP IP Outdoor Bullet Camera (ColorVu / Full Color)',
          category: 'CCTV & Security',
          unit: 'Pcs',
          costPrice: 3750,
          dealerPrice: 4200,
          retailPrice: 4800,
          stockQty: 12,
          marginPercent: 28.0,
          stockValue: 57600,
          location: 'Rack A-2',
          notes: 'Waterproof IP67, Built-in Mic'
        },
        {
          id: 'row-p-3',
          code: 'NVR-HIK-8CH',
          name: '8-Channel 4K NVR Network Video Recorder',
          category: 'CCTV & Security',
          unit: 'Pcs',
          costPrice: 5800,
          dealerPrice: 6600,
          retailPrice: 7500,
          stockQty: 6,
          marginPercent: 29.3,
          stockValue: 45000,
          location: 'Rack B-1',
          notes: 'HDMI 4K Output, Cloud P2P Hik-Connect'
        },
        {
          id: 'row-p-4',
          code: 'HDD-SEA-1TB',
          name: '1TB Surveillance Hard Disk (Seagate SkyHawk)',
          category: 'CCTV & Security',
          unit: 'Pcs',
          costPrice: 5100,
          dealerPrice: 5650,
          retailPrice: 6200,
          stockQty: 10,
          marginPercent: 21.6,
          stockValue: 62000,
          location: 'Locker C-1',
          notes: '3 Years Warranty - Surveillance Grade'
        },
        {
          id: 'row-p-5',
          code: 'CAB-COP-300',
          name: 'Cat6 Pure Copper High-Speed UTP Cable (305m Drum)',
          category: 'CCTV & Security',
          unit: 'Roll',
          costPrice: 9200,
          dealerPrice: 10500,
          retailPrice: 12200,
          stockQty: 4,
          marginPercent: 32.6,
          stockValue: 48800,
          location: 'Ground Floor Store',
          notes: '100% Solid Copper'
        },
        {
          id: 'row-p-6',
          code: 'PSU-12V-10A',
          name: '12V 10A Heavy Duty CCTV Power Supply Box',
          category: 'Accessories',
          unit: 'Pcs',
          costPrice: 1750,
          dealerPrice: 2050,
          retailPrice: 2400,
          stockQty: 15,
          marginPercent: 37.1,
          stockValue: 36000,
          location: 'Rack B-3',
          notes: 'Overvoltage & Surge Protection'
        },
        {
          id: 'row-p-7',
          code: 'IT-MOU-LOGI',
          name: 'Logitech M170 Wireless Optical Mouse 2.4GHz',
          category: 'General Products',
          unit: 'Pcs',
          costPrice: 480,
          dealerPrice: 560,
          retailPrice: 650,
          stockQty: 18,
          marginPercent: 35.4,
          stockValue: 11700,
          location: 'Counter Showcase 1',
          notes: '1 Year Warranty'
        },
        {
          id: 'row-p-8',
          code: 'IT-PEN-64GB',
          name: 'SanDisk Ultra 64GB USB 3.2 Flash Drive',
          category: 'General Products',
          unit: 'Pcs',
          costPrice: 620,
          dealerPrice: 720,
          retailPrice: 850,
          stockQty: 22,
          marginPercent: 37.1,
          stockValue: 18700,
          location: 'Counter Showcase 1',
          notes: 'High-speed 130MB/s transfer'
        },
        {
          id: 'row-p-9',
          code: 'FRM-MAT-1218',
          name: 'Photo Frame 12x18 inch (Synthetic Matte Finish)',
          category: 'Framing',
          unit: 'Pcs',
          costPrice: 750,
          dealerPrice: 950,
          retailPrice: 1200,
          stockQty: 8,
          marginPercent: 60.0,
          stockValue: 9600,
          location: 'Studio Wall Rack',
          notes: 'Front Glass with Hanging Bracket'
        },
        {
          id: 'row-p-10',
          code: 'SRV-CCTV-INST',
          name: 'CCTV Installation & Cabling Service (Per Point)',
          category: 'Services',
          unit: 'Job',
          costPrice: 350,
          dealerPrice: 600,
          retailPrice: 800,
          stockQty: 999,
          marginPercent: 128.6,
          stockValue: 799200,
          location: 'On-Site Service',
          notes: 'Includes conduit fitting & alignment'
        }
      ]
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
      rows: [
        {
          id: 'row-w-1',
          staffId: 'EMP-01',
          name: 'Bikash Thapa',
          role: 'Lead CCTV Technician',
          phone: '9846054321',
          salary: 28000,
          dailyRate: 1100,
          overtimeRate: 200,
          emergencyContact: 'Father: 9806112233',
          status: 'Active',
          advanceTaken: 3000,
          joiningDate: '2079-04-15',
          notes: 'Expert in IP Camera, NVR Configuration & Optical Fiber'
        },
        {
          id: 'row-w-2',
          staffId: 'EMP-02',
          name: 'Sushila Sharma',
          role: 'Sales & Billing Officer',
          phone: '9812345678',
          salary: 22000,
          dailyRate: 850,
          overtimeRate: 150,
          emergencyContact: 'Brother: 9846098765',
          status: 'Active',
          advanceTaken: 0,
          joiningDate: '2080-01-10',
          notes: 'Front desk billing, inventory stock management & customer support'
        },
        {
          id: 'row-w-3',
          staffId: 'EMP-03',
          name: 'Anil Gurung',
          role: 'Studio Photographer & Editor',
          phone: '9865432109',
          salary: 25000,
          dailyRate: 950,
          overtimeRate: 180,
          emergencyContact: 'Mother: 9806543210',
          status: 'Active',
          advanceTaken: 1500,
          joiningDate: '2080-08-01',
          notes: 'Photoshop, photo frame designing, visa/MRP lab printing'
        },
        {
          id: 'row-w-4',
          staffId: 'EMP-04',
          name: 'Kiran Pariyar',
          role: 'CCTV Assistant & Wireman',
          phone: '9806123456',
          salary: 18000,
          dailyRate: 700,
          overtimeRate: 120,
          emergencyContact: 'Uncle: 9846123987',
          status: 'Active',
          advanceTaken: 500,
          joiningDate: '2081-02-15',
          notes: 'On-site cabling, conduit pipe laying, ladder works & mounting'
        }
      ]
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
      rows: [
        {
          id: 'row-a-1',
          dateBS: '2083-05-15',
          workerName: 'Bikash Thapa',
          dutyType: 'Full Day + Site',
          hoursOvertime: 2,
          dailyWage: 1500,
          advanceDeduction: 500,
          netPayable: 1000,
          taskSite: 'Sharma Traders 4-Cam Hikvision System Installation',
          paymentStatus: 'Paid'
        },
        {
          id: 'row-a-2',
          dateBS: '2083-05-15',
          workerName: 'Kiran Pariyar',
          dutyType: 'Full Day + Site',
          hoursOvertime: 2,
          dailyWage: 940,
          advanceDeduction: 0,
          netPayable: 940,
          taskSite: 'Sharma Traders cabling & conduit mounting assistant',
          paymentStatus: 'Paid'
        },
        {
          id: 'row-a-3',
          dateBS: '2083-05-15',
          workerName: 'Sushila Sharma',
          dutyType: 'Full Day (Shop)',
          hoursOvertime: 0,
          dailyWage: 850,
          advanceDeduction: 0,
          netPayable: 850,
          taskSite: 'Counter Billing & Customer Invoicing Support',
          paymentStatus: 'Pending'
        },
        {
          id: 'row-a-4',
          dateBS: '2083-05-15',
          workerName: 'Anil Gurung',
          dutyType: 'Full Day (Studio)',
          hoursOvertime: 1,
          dailyWage: 1130,
          advanceDeduction: 200,
          netPayable: 930,
          taskSite: 'Urgent Visa Photo Processing & 16x24 Wooden Framing',
          paymentStatus: 'Pending'
        }
      ]
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
    await db.transaction('rw', db.invoices, db.customers, db.catalog, db.passwords, async () => {
      await db.invoices.clear();
      await db.customers.clear();
      await db.catalog.clear();
      await db.passwords.clear();

      if (snapshot.invoices.length > 0) {
        await db.invoices.bulkAdd(snapshot.invoices);
      }
      if (Array.isArray(snapshot.customers) && snapshot.customers.length > 0) {
        await db.customers.bulkAdd(snapshot.customers);
      }
      if (Array.isArray(snapshot.catalog) && snapshot.catalog.length > 0) {
        await db.catalog.bulkAdd(snapshot.catalog);
      }
      if (Array.isArray(snapshot.passwords) && snapshot.passwords.length > 0) {
        await db.passwords.bulkAdd(snapshot.passwords);
      }
    });
  } else {
    // Merge mode: put items
    await db.transaction('rw', db.invoices, db.customers, db.catalog, db.passwords, async () => {
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
