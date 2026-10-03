import { create } from 'zustand';
import { 
  Invoice, LineItem, Customer, CatalogItem, PasswordItem, CompanyDetails, TaxMode, PaymentStatus, PaymentMethod, DocumentType, 
  BackupSettings, BackupRecord, DatabaseSnapshot, ShopSpreadsheetData, ExcelSheet, ExcelColumn, ExcelRow, SecuritySettings,
  StockLog
} from '../types/invoice';
import { 
  db, getSavedCompanyDetails, saveCompanyDetails, INITIAL_CATALOG, INITIAL_CUSTOMERS, INITIAL_PASSWORDS,
  DEMO_CCTV_STARTER_ITEMS,
  checkAndMigrateLegacyDatabase, restoreDatabaseFromSnapshot, exportDatabaseToFile,
  getSavedSpreadsheetData, saveSpreadsheetData 
} from '../utils/storage';
import { 
  performAutomaticBackup, getBackupHistory 
} from '../utils/googleDriveBackup';
import { getTodayDates, getFiscalYearFromBS } from '../utils/nepaliDate';
import { numberToWordsNPR } from '../utils/numberToWords';
import { generateInvoiceNumber } from '../utils/formatters';

interface InvoiceState {
  companyDetails: CompanyDetails;
  currentInvoice: Invoice;
  savedInvoices: Invoice[];
  customers: Customer[];
  catalog: CatalogItem[];
  stockLogs: StockLog[];
  passwords: PasswordItem[];
  spreadsheetData: ShopSpreadsheetData;
  activeTab: 'create' | 'preview' | 'stock' | 'cctv_history' | 'studio_history' | 'counter_history' | 'history' | 'customers' | 'catalog' | 'settings' | 'analytics' | 'backup' | 'calculator' | 'passwords' | 'excel_store';
  isEditing: boolean;
  editingInvoiceId: string | null;
  isLoading: boolean;
  isBackingUp: boolean;
  backupHistory: BackupRecord[];
  backupStatusMessage: string | null;
  isAppLocked: boolean;

  // Actions
  initializeStore: () => Promise<void>;
  setActiveTab: (tab: 'create' | 'preview' | 'stock' | 'cctv_history' | 'studio_history' | 'counter_history' | 'history' | 'customers' | 'catalog' | 'settings' | 'analytics' | 'backup' | 'calculator' | 'passwords' | 'excel_store') => void;
  updateCompanyDetails: (details: Partial<CompanyDetails>) => void;
  updateBackupSettings: (settings: Partial<BackupSettings>) => void;
  updateSecuritySettings: (settings: Partial<SecuritySettings>) => void;
  unlockApp: (password: string) => { success: boolean; error?: string };
  lockApp: () => void;
  triggerManualBackup: (reason?: string) => Promise<{ success: boolean; message: string }>;
  restoreFromSnapshot: (snapshot: DatabaseSnapshot, mode?: 'overwrite' | 'merge') => Promise<void>;
  downloadBackupJSON: () => Promise<string>;
  refreshBackupHistory: () => void;
  
  // Current Invoice Form Operations
  setDocumentType: (docType: DocumentType) => void;
  setCctvDetails: (installationSite: string, warrantyInfo: string, serialNumbers?: string) => void;
  setInvoiceDates: (dateBS: string, dateAD: string) => void;
  autoUpdateToToday: () => void;
  updateCustomerInfo: (data: { customerName: string; customerAddress: string; customerPhone: string; customerPanVat: string }) => void;
  selectCustomer: (customer: Customer) => void;
  
  addLineItem: (item?: Partial<LineItem>) => void;
  updateLineItem: (id: string, field: keyof LineItem, value: any) => void;
  removeLineItem: (id: string) => void;
  reorderItems: (items: LineItem[]) => void;
  
  setTaxMode: (taxMode: TaxMode) => void;
  setShowDiscount: (show: boolean) => void;
  setPaymentDetails: (status: PaymentStatus, method: PaymentMethod, amountPaid: number) => void;
  setInvoiceNotes: (notes: string) => void;
  setInvoiceTerms: (terms: string) => void;
  
  recalculateCurrentInvoice: () => void;
  
  saveCurrentInvoice: () => Promise<Invoice>;
  loadInvoiceForEdit: (id: string) => Promise<void>;
  viewInvoicePreview: (invoice: Invoice) => void;
  duplicateInvoice: (id: string) => Promise<void>;
  deleteInvoice: (id: string) => Promise<void>;
  resetInvoiceForm: (docType?: DocumentType) => void;

  // Stock Inventory Actions
  deductStockForInvoice: (invoiceOrId?: string | Invoice) => Promise<{ success: boolean; deductedItems: Array<{ name: string; qty: number; remaining: number }> }>;
  restoreStockForInvoice: (invoice: Invoice) => Promise<void>;
  restockItem: (itemId: string, addQty: number, notes?: string) => Promise<void>;
  adjustStockItem: (itemId: string, newQty: number, reason?: string) => Promise<void>;
  deleteStockLog: (id: string) => Promise<void>;
  clearStockLogs: () => Promise<void>;

  // Catalog & Customer Directory Actions
  addCustomer: (customer: Omit<Customer, 'id'>) => Promise<Customer>;
  deleteCustomer: (id: string) => Promise<void>;
  clearCustomers: () => Promise<void>;
  addCatalogItem: (item: Omit<CatalogItem, 'id'>) => Promise<CatalogItem>;
  bulkAddCatalogItems: (items: Array<Omit<CatalogItem, 'id'>>) => Promise<CatalogItem[]>;
  updateCatalogItem: (id: string, updates: Partial<CatalogItem>) => Promise<void>;
  deleteCatalogItem: (id: string) => Promise<void>;
  clearAllCatalogItems: () => Promise<void>;
  clearAllDemoData: () => Promise<void>;
  loadCctvStarterPack: () => Promise<void>;

  // Password Vault Actions
  addPassword: (item: Omit<PasswordItem, 'id' | 'createdAt' | 'updatedAt'>) => Promise<PasswordItem>;
  updatePassword: (id: string, item: Partial<PasswordItem>) => Promise<void>;
  deletePassword: (id: string) => Promise<void>;
  toggleFavoritePassword: (id: string) => Promise<void>;

  // Excel Spreadsheet Store & Workers Actions
  setActiveSheet: (sheetId: string) => void;
  addSheet: (name: string, template?: 'blank' | 'price' | 'workers' | 'attendance') => void;
  deleteSheet: (sheetId: string) => void;
  renameSheet: (sheetId: string, name: string) => void;
  updateCellValue: (sheetId: string, rowId: string, colId: string, value: any) => void;
  addRow: (sheetId: string, rowData?: Record<string, any>, insertIndex?: number) => void;
  deleteRow: (sheetId: string, rowId: string) => void;
  reorderRows: (sheetId: string, rows: ExcelRow[]) => void;
  addColumn: (sheetId: string, column: ExcelColumn) => void;
  deleteColumn: (sheetId: string, colId: string) => void;
  updateColumn: (sheetId: string, colId: string, updates: Partial<ExcelColumn>) => void;
  importSheetFromExcelData: (sheetName: string, columns: ExcelColumn[], rows: ExcelRow[]) => void;
  addItemToInvoiceFromStore: (row: ExcelRow) => void;
}

const createDefaultLineItem = (sn: number): LineItem => ({
  id: 'item-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
  sn,
  description: '',
  qty: 1,
  unit: 'Pcs',
  listPrice: 0,
  discountType: 'percent',
  discountValue: 0,
  effectivePrice: 0,
  amount: 0
});

const getPrefixForDocType = (company: CompanyDetails, docType: DocumentType): string => {
  if (docType === 'cctv_invoice') return company.cctvPrefix || 'INV';
  if (docType === 'counter_sale') return company.salesPrefix || 'CS';
  return company.invoicePrefix || 'INV';
};

const createInitialInvoice = (company: CompanyDetails, docType: DocumentType = 'cctv_invoice', nextSeq = 1): Invoice => {
  const { dateAD, dateBS, fiscalYear } = getTodayDates();
  const prefix = getPrefixForDocType(company, docType);
  const invoiceNumber = generateInvoiceNumber(nextSeq, prefix);

  return {
    id: 'inv-' + Date.now(),
    docType,
    invoiceNumber,
    invoiceSeq: nextSeq,
    fiscalYear,
    dateBS,
    dateAD,
    customerName: '',
    customerAddress: '',
    customerPhone: '',
    customerPanVat: '',
    installationSite: '',
    serialNumbers: '',
    warrantyInfo: '',
    items: [createDefaultLineItem(1)],
    taxMode: company.isVatRegistered ? 'vat_13_exclusive' : 'exempted',
    showDiscount: company.showDiscountByDefault ?? true,
    subtotal: 0,
    totalDiscount: 0,
    taxableAmount: 0,
    vatAmount: 0,
    grandTotal: 0,
    amountInWords: 'Rupees Zero Only',
    paymentStatus: 'paid',
    paymentMethod: 'cash',
    amountPaid: 0,
    amountDue: 0,
    notes: '',
    terms: company.defaultTerms || '1. Goods & services once provided are subject to terms & conditions.\n2. CCTV cameras & hardware carry manufacturer warranty as per card.\n3. Please verify items & invoice particulars before leaving.',
    createdBy: 'Admin',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
};

export const useInvoiceStore = create<InvoiceState>((set, get) => ({
  companyDetails: getSavedCompanyDetails(),
  currentInvoice: createInitialInvoice(getSavedCompanyDetails()),
  savedInvoices: [],
  customers: [],
  catalog: [],
  stockLogs: [],
  passwords: [],
  spreadsheetData: getSavedSpreadsheetData(),
  activeTab: 'create',
  isEditing: false,
  editingInvoiceId: null,
  isLoading: false,
  isBackingUp: false,
  backupHistory: getBackupHistory(),
  backupStatusMessage: null,
  isAppLocked: (() => {
    try {
      const savedDetails = getSavedCompanyDetails();
      const security = savedDetails?.securitySettings;
      if (security && security.appLockEnabled === false) {
        return false;
      }
      return sessionStorage.getItem('pnp_software_unlocked') !== 'true';
    } catch {
      return true;
    }
  })(),

  initializeStore: async () => {
    set({ isLoading: true });
    try {
      // 1. Check legacy DB migration safely
      try {
        await checkAndMigrateLegacyDatabase();
      } catch (err) {
        console.warn('Legacy DB migration error:', err);
      }

      // 2. Seed default data using bulkPut so duplicate keys never throw ConstraintError
      try {
        const catalogCount = await db.catalog.count();
        if (catalogCount === 0) {
          await db.catalog.bulkPut(INITIAL_CATALOG);
        }
      } catch (err) {
        console.warn('Catalog seeding skipped/error:', err);
      }

      try {
        const customerCount = await db.customers.count();
        if (customerCount === 0) {
          await db.customers.bulkPut(INITIAL_CUSTOMERS);
        }
      } catch (err) {
        console.warn('Customer seeding skipped/error:', err);
      }

      try {
        const pwCount = await db.passwords.count();
        if (pwCount === 0) {
          await db.passwords.bulkPut(INITIAL_PASSWORDS);
        }
      } catch (err) {
        console.warn('Password seeding skipped/error:', err);
      }

      const invoices = await db.invoices.orderBy('createdAt').reverse().toArray();
      const customers = await db.customers.toArray();
      let catalog = await db.catalog.toArray();
      const passwords = await db.passwords.toArray();
      let stockLogs: StockLog[] = [];
      try {
        if (db.stockLogs) {
          stockLogs = await db.stockLogs.orderBy('timestamp').reverse().toArray();
        }
      } catch (err) {
        console.warn('Error loading stock logs:', err);
      }

      // Self-heal / migrate any catalog items missing stock tracking
      let needsCatalogUpdate = false;
      const updatedCatalog = catalog.map(item => {
        let changed = false;
        const copy = { ...item };
        const matchInitial = INITIAL_CATALOG.find(i => i.id === copy.id || i.description.trim().toLowerCase() === copy.description.trim().toLowerCase());
        
        if (copy.trackStock === undefined) {
          copy.trackStock = matchInitial ? matchInitial.trackStock !== false : copy.category !== 'Services';
          changed = true;
        }
        if (copy.stockQty === undefined) {
          copy.stockQty = matchInitial?.stockQty ?? (copy.trackStock ? 20 : 0);
          changed = true;
        }
        if (copy.minStockAlert === undefined) {
          copy.minStockAlert = matchInitial?.minStockAlert ?? (copy.trackStock ? 3 : 0);
          changed = true;
        }
        if (copy.costPrice === undefined) {
          copy.costPrice = matchInitial?.costPrice ?? Math.round(copy.price * 0.75);
          changed = true;
        }
        if (!copy.code) {
          copy.code = matchInitial?.code || ('SKU-' + (copy.id || Math.random().toString(36).substring(2, 7)).toUpperCase());
          changed = true;
        }
        if (!copy.location && matchInitial?.location) {
          copy.location = matchInitial.location;
          changed = true;
        }
        if (changed) needsCatalogUpdate = true;
        return copy;
      });

      if (needsCatalogUpdate) {
        try {
          await db.catalog.bulkPut(updatedCatalog);
          catalog = updatedCatalog;
        } catch (err) {
          console.warn('Failed to update catalog with stock fields:', err);
        }
      }

      const spreadsheetData = getSavedSpreadsheetData();
      let companyDetails = getSavedCompanyDetails();

      const sameDocInvoices = invoices.filter(i => (i.docType || 'cctv_invoice') === 'cctv_invoice');
      const highestSeq = sameDocInvoices.reduce((max, inv) => Math.max(max, inv.invoiceSeq || 0), 0);
      const nextSeq = highestSeq + 1;
      const initialInvoice = createInitialInvoice(companyDetails, 'cctv_invoice', nextSeq);
      initialInvoice.warrantyInfo = '';

      set({
        companyDetails,
        savedInvoices: invoices,
        customers,
        catalog,
        stockLogs,
        passwords,
        spreadsheetData,
        currentInvoice: initialInvoice,
        backupHistory: getBackupHistory(),
        isLoading: false
      });
    } catch (e) {
      console.error('Error initializing store:', e);
      set({ isLoading: false });
    }
  },

  setActiveTab: (tab) => set({ activeTab: tab }),

  updateCompanyDetails: (details) => {
    const updated = { ...get().companyDetails, ...details };
    saveCompanyDetails(updated);
    set({ companyDetails: updated });
  },

  updateBackupSettings: (settings) => {
    const current = get().companyDetails;
    const updatedBackupSettings: BackupSettings = {
      ...(current.backupSettings || {
        autoBackupEnabled: true,
        backupFrequency: 'on_save',
        googleDriveConnected: false,
        localSyncEnabled: true,
        lastBackupStatus: 'idle'
      }),
      ...settings
    };
    const updatedCompany = { ...current, backupSettings: updatedBackupSettings };
    saveCompanyDetails(updatedCompany);
    set({ companyDetails: updatedCompany });
  },

  updateSecuritySettings: (settings) => {
    const current = get().companyDetails;
    const updatedSecurity: SecuritySettings = {
      ...(current.securitySettings || {
        appLockEnabled: true,
        masterPassword: 'pnp2083',
        securityQuestion: 'Company Name',
        securityAnswer: 'PNP TECH TRADERS'
      }),
      ...settings
    };
    const updatedCompany = { ...current, securitySettings: updatedSecurity };
    saveCompanyDetails(updatedCompany);
    set({ companyDetails: updatedCompany });
  },

  unlockApp: (password: string) => {
    const company = get().companyDetails;
    const master = company.securitySettings?.masterPassword || 'pnp2083';
    const pan = (company.panVatNo || '617322405').trim();
    const secAnswer = (company.securitySettings?.securityAnswer || 'PNP TECH TRADERS').trim().toLowerCase();
    const input = password.trim();

    // Unlock if matches master password OR emergency PAN OR emergency security answer
    if (input === master || input === pan || input.toLowerCase() === secAnswer) {
      try {
        sessionStorage.setItem('pnp_software_unlocked', 'true');
      } catch {}
      set({ isAppLocked: false });
      return { success: true };
    }
    return { success: false, error: 'Incorrect Password. Please try again.' };
  },

  lockApp: () => {
    try {
      sessionStorage.removeItem('pnp_software_unlocked');
    } catch {}
    set({ isAppLocked: true });
  },

  triggerManualBackup: async (reason = 'Manual Trigger') => {
    set({ isBackingUp: true, backupStatusMessage: 'Creating and uploading backup snapshot...' });
    try {
      const res = await performAutomaticBackup(reason);
      const updatedDetails = getSavedCompanyDetails();
      const history = getBackupHistory();
      set({
        isBackingUp: false,
        companyDetails: updatedDetails,
        backupHistory: history,
        backupStatusMessage: res.message
      });
      setTimeout(() => set({ backupStatusMessage: null }), 5000);
      return res;
    } catch (err: any) {
      set({ isBackingUp: false, backupStatusMessage: err.message || 'Backup failed' });
      setTimeout(() => set({ backupStatusMessage: null }), 5000);
      return { success: false, message: err.message || 'Backup failed' };
    }
  },

  restoreFromSnapshot: async (snapshot, mode = 'overwrite') => {
    set({ isLoading: true });
    try {
      await restoreDatabaseFromSnapshot(snapshot, mode);
      const invoices = await db.invoices.orderBy('createdAt').reverse().toArray();
      const customers = await db.customers.toArray();
      const catalog = await db.catalog.toArray();
      const passwords = await db.passwords.toArray();
      const companyDetails = getSavedCompanyDetails();

      set({
        savedInvoices: invoices,
        customers,
        catalog,
        passwords,
        companyDetails,
        isLoading: false,
        backupStatusMessage: `Database successfully restored (${invoices.length} invoices, ${customers.length} customers, ${passwords.length} passwords)`
      });
      setTimeout(() => set({ backupStatusMessage: null }), 6000);
    } catch (err: any) {
      set({ isLoading: false, backupStatusMessage: `Restore failed: ${err.message}` });
      throw err;
    }
  },

  downloadBackupJSON: async () => {
    return await exportDatabaseToFile();
  },

  refreshBackupHistory: () => {
    set({ backupHistory: getBackupHistory() });
  },

  setCctvDetails: (installationSite, warrantyInfo, serialNumbers) => {
    set((state) => ({
      currentInvoice: {
        ...state.currentInvoice,
        installationSite,
        warrantyInfo,
        serialNumbers: serialNumbers !== undefined ? serialNumbers : state.currentInvoice.serialNumbers
      }
    }));
  },

  setDocumentType: (docType) => {
    const company = get().companyDetails;
    const sameDocInvoices = get().savedInvoices.filter(inv => (inv.docType || 'cctv_invoice') === docType);
    const highestSeq = sameDocInvoices.reduce((max, inv) => Math.max(max, inv.invoiceSeq || 0), 0);
    const nextSeq = highestSeq + 1;
    const prefix = getPrefixForDocType(company, docType);
    const invoiceNumber = generateInvoiceNumber(nextSeq, prefix);

    set((state) => ({
      currentInvoice: {
        ...state.currentInvoice,
        docType,
        invoiceSeq: nextSeq,
        invoiceNumber,
        taxMode: docType === 'counter_sale' ? 'exempted' : state.currentInvoice.taxMode
      }
    }));
  },

  setInvoiceDates: (dateBS, dateAD) => {
    const fiscalYear = getFiscalYearFromBS(dateBS);
    const company = get().companyDetails;
    const docType = get().currentInvoice.docType || 'cctv_invoice';
    const prefix = getPrefixForDocType(company, docType);
    const invoiceNumber = generateInvoiceNumber(
      get().currentInvoice.invoiceSeq, 
      prefix
    );

    set((state) => ({
      currentInvoice: {
        ...state.currentInvoice,
        dateBS,
        dateAD,
        fiscalYear,
        invoiceNumber
      }
    }));
  },

  autoUpdateToToday: () => {
    const { dateAD, dateBS } = getTodayDates();
    get().setInvoiceDates(dateBS, dateAD);
  },

  updateCustomerInfo: (data) => {
    set((state) => ({
      currentInvoice: {
        ...state.currentInvoice,
        ...data
      }
    }));
  },

  selectCustomer: (customer) => {
    set((state) => ({
      currentInvoice: {
        ...state.currentInvoice,
        customerName: customer.name,
        customerAddress: customer.address,
        customerPhone: customer.phone,
        customerPanVat: customer.panVatNo || ''
      }
    }));
  },

  addLineItem: (customItem) => {
    const items = get().currentInvoice.items;
    const nextSN = items.length + 1;
    const newItem = {
      ...createDefaultLineItem(nextSN),
      ...customItem
    };

    set((state) => ({
      currentInvoice: {
        ...state.currentInvoice,
        items: [...state.currentInvoice.items, newItem]
      }
    }));

    get().recalculateCurrentInvoice();
  },

  updateLineItem: (id, field, value) => {
    set((state) => {
      const showDiscount = state.currentInvoice.showDiscount !== false;
      return {
        currentInvoice: {
          ...state.currentInvoice,
          items: state.currentInvoice.items.map((item) => {
            if (item.id !== id) return item;
            const updated = { ...item, [field]: value };
            
            const listPrice = Number(updated.listPrice) || 0;
            const discountVal = showDiscount ? (Number(updated.discountValue) || 0) : 0;
            const qty = Number(updated.qty) || 0;

            let effectivePrice = listPrice;
            if (showDiscount && discountVal > 0) {
              if (updated.discountType === 'percent') {
                effectivePrice = listPrice - (listPrice * (discountVal / 100));
              } else {
                effectivePrice = listPrice - discountVal;
              }
            }

            effectivePrice = Math.max(0, effectivePrice);
            const amount = qty * effectivePrice;

            return {
              ...updated,
              effectivePrice: Math.round(effectivePrice * 100) / 100,
              amount: Math.round(amount * 100) / 100
            };
          })
        }
      };
    });

    get().recalculateCurrentInvoice();
  },

  removeLineItem: (id) => {
    const items = get().currentInvoice.items.filter(item => item.id !== id);
    const reindexed = items.map((item, idx) => ({ ...item, sn: idx + 1 }));
    
    set((state) => ({
      currentInvoice: {
        ...state.currentInvoice,
        items: reindexed.length > 0 ? reindexed : [createDefaultLineItem(1)]
      }
    }));

    get().recalculateCurrentInvoice();
  },

  reorderItems: (items) => {
    const reindexed = items.map((item, idx) => ({ ...item, sn: idx + 1 }));
    set((state) => ({
      currentInvoice: {
        ...state.currentInvoice,
        items: reindexed
      }
    }));
    get().recalculateCurrentInvoice();
  },

  setTaxMode: (taxMode) => {
    set((state) => ({
      currentInvoice: {
        ...state.currentInvoice,
        taxMode
      }
    }));
    get().recalculateCurrentInvoice();
  },

  setShowDiscount: (showDiscount) => {
    set((state) => ({
      currentInvoice: {
        ...state.currentInvoice,
        showDiscount
      }
    }));
    get().recalculateCurrentInvoice();
  },

  setPaymentDetails: (paymentStatus, paymentMethod, amountPaid) => {
    const grandTotal = get().currentInvoice.grandTotal;
    let actualPaid = amountPaid;
    
    if (paymentStatus === 'paid') {
      actualPaid = grandTotal;
    } else if (paymentStatus === 'unpaid') {
      actualPaid = 0;
    }

    const amountDue = Math.max(0, grandTotal - actualPaid);

    set((state) => ({
      currentInvoice: {
        ...state.currentInvoice,
        paymentStatus,
        paymentMethod,
        amountPaid: actualPaid,
        amountDue
      }
    }));
  },

  setInvoiceNotes: (notes) => set((state) => ({ currentInvoice: { ...state.currentInvoice, notes } })),
  setInvoiceTerms: (terms) => set((state) => ({ currentInvoice: { ...state.currentInvoice, terms } })),

  recalculateCurrentInvoice: () => {
    const inv = get().currentInvoice;
    const showDiscount = inv.showDiscount !== false;
    let rawSubtotal = 0;
    let sumEffectiveAmounts = 0;

    inv.items.forEach(item => {
      const list = Number(item.listPrice) || 0;
      const qty = Number(item.qty) || 0;
      const discVal = showDiscount ? (Number(item.discountValue) || 0) : 0;

      let effective = list;
      if (showDiscount && discVal > 0) {
        if (item.discountType === 'percent') {
          effective = list - (list * (discVal / 100));
        } else {
          effective = list - discVal;
        }
      }
      effective = Math.max(0, effective);
      const amt = qty * effective;

      rawSubtotal += (list * qty);
      sumEffectiveAmounts += amt;
    });

    const totalDiscount = showDiscount ? (Math.round((rawSubtotal - sumEffectiveAmounts) * 100) / 100) : 0;
    let taxableAmount = 0;
    let vatAmount = 0;
    let grandTotal = 0;

    if (inv.taxMode === 'exempted') {
      taxableAmount = sumEffectiveAmounts;
      vatAmount = 0;
      grandTotal = sumEffectiveAmounts;
    } else if (inv.taxMode === 'vat_13_exclusive') {
      taxableAmount = sumEffectiveAmounts;
      vatAmount = Math.round((taxableAmount * 0.13) * 100) / 100;
      grandTotal = taxableAmount + vatAmount;
    } else if (inv.taxMode === 'vat_13_inclusive') {
      grandTotal = sumEffectiveAmounts;
      taxableAmount = Math.round((grandTotal / 1.13) * 100) / 100;
      vatAmount = Math.round((grandTotal - taxableAmount) * 100) / 100;
    }

    grandTotal = Math.round(grandTotal * 100) / 100;
    const amountInWords = numberToWordsNPR(grandTotal);

    let amountPaid = inv.amountPaid;
    if (inv.paymentStatus === 'paid') {
      amountPaid = grandTotal;
    } else if (inv.paymentStatus === 'unpaid') {
      amountPaid = 0;
    }

    const amountDue = Math.max(0, Math.round((grandTotal - amountPaid) * 100) / 100);

    set((state) => ({
      currentInvoice: {
        ...state.currentInvoice,
        subtotal: Math.round(rawSubtotal * 100) / 100,
        totalDiscount,
        taxableAmount,
        vatAmount,
        grandTotal,
        amountInWords,
        amountPaid,
        amountDue
      }
    }));
  },

  saveCurrentInvoice: async () => {
    try {
      get().recalculateCurrentInvoice();
      const inv = get().currentInvoice;
      const now = new Date().toISOString();
      const invoiceToSave: Invoice = {
        ...inv,
        id: inv.id || ('inv-' + Date.now()),
        updatedAt: now
      };

      await db.invoices.put(invoiceToSave);

      // Auto-deduct stock for this invoice if not yet deducted
      if (!invoiceToSave.stockDeducted) {
        try {
          await get().deductStockForInvoice(invoiceToSave);
        } catch (stockErr) {
          console.warn('Stock auto-deduction error:', stockErr);
        }
      }

      // Auto-save customer if party name and valid phone exist
      if (inv.customerName?.trim() && inv.customerPhone?.trim()) {
        try {
          const cleanPhone = inv.customerPhone.trim();
          const existing = await db.customers.where('phone').equals(cleanPhone).first();
          if (!existing) {
            await db.customers.put({
              id: 'cust-' + Date.now(),
              name: inv.customerName.trim(),
              address: inv.customerAddress || '',
              phone: cleanPhone,
              panVatNo: inv.customerPanVat || '',
              createdAt: now
            });
          }
        } catch (err) {
          console.warn('Customer auto-save skipped:', err);
        }
      }

      const updatedInvoices = await db.invoices.orderBy('createdAt').reverse().toArray();
      const updatedCustomers = await db.customers.toArray();

      set({
        savedInvoices: updatedInvoices,
        customers: updatedCustomers,
        activeTab: 'preview'
      });

      // Automated background backup after saving
      performAutomaticBackup('Invoice Created/Updated').then(() => {
        set({ backupHistory: getBackupHistory(), companyDetails: getSavedCompanyDetails() });
      }).catch(() => {});

      return invoiceToSave;
    } catch (error) {
      console.error('Failed to save invoice:', error);
      alert('Error saving invoice: ' + (error instanceof Error ? error.message : String(error)));
      throw error;
    }
  },

  loadInvoiceForEdit: async (id) => {
    const invoice = await db.invoices.get(id);
    if (invoice) {
      set({
        currentInvoice: invoice,
        isEditing: true,
        editingInvoiceId: id,
        activeTab: 'create'
      });
    }
  },

  viewInvoicePreview: (invoice) => {
    set({
      currentInvoice: invoice,
      activeTab: 'preview'
    });
  },

  duplicateInvoice: async (id) => {
    const source = await db.invoices.get(id);
    if (!source) return;

    const company = get().companyDetails;
    const docType = source.docType || 'cctv_invoice';
    const sameDocInvoices = get().savedInvoices.filter(inv => (inv.docType || 'cctv_invoice') === docType);
    const highestSeq = sameDocInvoices.reduce((max, inv) => Math.max(max, inv.invoiceSeq || 0), 0);
    const nextSeq = highestSeq + 1;
    const { dateAD, dateBS, fiscalYear } = getTodayDates();
    const prefix = getPrefixForDocType(company, docType);
    const invoiceNumber = generateInvoiceNumber(nextSeq, prefix);

    const duplicated: Invoice = {
      ...source,
      id: 'inv-' + Date.now(),
      docType,
      invoiceNumber,
      invoiceSeq: nextSeq,
      fiscalYear,
      dateBS,
      dateAD,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      stockDeducted: false,
      stockDeductedAt: undefined
    };

    set({
      currentInvoice: duplicated,
      isEditing: false,
      editingInvoiceId: null,
      activeTab: 'create'
    });
  },

  deleteInvoice: async (id) => {
    const inv = await db.invoices.get(id);
    if (inv && inv.stockDeducted) {
      try {
        await get().restoreStockForInvoice(inv);
      } catch (stockErr) {
        console.warn('Stock restoration on delete error:', stockErr);
      }
    }

    await db.invoices.delete(id);
    const updatedInvoices = await db.invoices.orderBy('createdAt').reverse().toArray();
    set({ savedInvoices: updatedInvoices });

    // Automated background backup after deletion
    performAutomaticBackup('Invoice Deleted').then(() => {
      set({ backupHistory: getBackupHistory(), companyDetails: getSavedCompanyDetails() });
    }).catch(() => {});
  },

  resetInvoiceForm: (docType = 'cctv_invoice') => {
    const company = get().companyDetails;
    const sameDocInvoices = get().savedInvoices.filter(inv => (inv.docType || 'cctv_invoice') === docType);
    const highestSeq = sameDocInvoices.reduce((max, inv) => Math.max(max, inv.invoiceSeq || 0), 0);
    const nextSeq = highestSeq + 1;

    set({
      currentInvoice: createInitialInvoice(company, docType, nextSeq),
      isEditing: false,
      editingInvoiceId: null,
      activeTab: 'create'
    });
  },

  // Stock Inventory Actions
  deductStockForInvoice: async (targetInvoice?: string | Invoice) => {
    try {
      const invoice = typeof targetInvoice === 'string'
        ? await db.invoices.get(targetInvoice)
        : (targetInvoice || get().currentInvoice);

      if (!invoice || !invoice.items || invoice.items.length === 0) {
        return { success: false, deductedItems: [] };
      }

      // Prevent duplicate deduction
      if (invoice.stockDeducted) {
        return { success: true, deductedItems: [] };
      }

      const currentCatalog = [...get().catalog];
      const deductedItems: Array<{ name: string; qty: number; remaining: number }> = [];
      const newLogs: StockLog[] = [];
      const now = new Date().toISOString();

      for (const lineItem of invoice.items) {
        const qtyToMinus = Number(lineItem.qty) || 0;
        if (qtyToMinus <= 0) continue;

        // Match catalog item: 1. stockItemId, 2. code, 3. exact/fuzzy description
        let catIndex = -1;
        if (lineItem.stockItemId) {
          catIndex = currentCatalog.findIndex(c => c.id === lineItem.stockItemId);
        }
        if (catIndex === -1 && lineItem.code) {
          catIndex = currentCatalog.findIndex(c => c.code && c.code.toLowerCase() === lineItem.code?.toLowerCase());
        }
        if (catIndex === -1 && lineItem.description) {
          const descTrimmed = lineItem.description.trim().toLowerCase();
          catIndex = currentCatalog.findIndex(c => c.description.trim().toLowerCase() === descTrimmed);
          if (catIndex === -1) {
            catIndex = currentCatalog.findIndex(c => 
              descTrimmed.includes(c.description.trim().toLowerCase()) || 
              c.description.trim().toLowerCase().includes(descTrimmed)
            );
          }
        }

        if (catIndex !== -1) {
          const item = currentCatalog[catIndex];
          if (item.trackStock === false) continue; // Services or untracked items

          const prevQty = Number(item.stockQty) || 0;
          const newQty = Math.max(0, prevQty - qtyToMinus);

          currentCatalog[catIndex] = {
            ...item,
            stockQty: newQty,
            updatedAt: now
          };

          deductedItems.push({
            name: item.description,
            qty: qtyToMinus,
            remaining: newQty
          });

          newLogs.push({
            id: 'log-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
            itemId: item.id,
            itemDescription: item.description,
            itemCode: item.code,
            type: 'sale',
            changeQty: -qtyToMinus,
            previousQty: prevQty,
            newQty: newQty,
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            customerName: invoice.customerName || 'Walk-in Customer',
            notes: `Bill #${invoice.invoiceNumber}: Sold ${qtyToMinus} ${item.unit || 'Pcs'}`,
            timestamp: now
          });
        }
      }

      if (deductedItems.length > 0) {
        await db.catalog.bulkPut(currentCatalog);
      }

      if (newLogs.length > 0) {
        await db.stockLogs.bulkPut(newLogs);
      }

      // Synchronize with spreadsheet sheet-price-store if active
      const spreadsheetData = getSavedSpreadsheetData();
      let spreadsheetChanged = false;
      const priceSheet = spreadsheetData.sheets.find(s => s.id === 'sheet-price-store' || s.icon === 'price');
      if (priceSheet && deductedItems.length > 0) {
        priceSheet.rows = priceSheet.rows.map(row => {
          const matchingDed = deductedItems.find(d => 
            (row.name && row.name.toLowerCase() === d.name.toLowerCase()) ||
            (row.code && currentCatalog.some(c => c.code === row.code && c.description === d.name))
          );
          if (matchingDed) {
            spreadsheetChanged = true;
            const updatedStock = Math.max(0, (Number(row.stockQty) || 0) - matchingDed.qty);
            const retail = Number(row.retailPrice) || 0;
            return {
              ...row,
              stockQty: updatedStock,
              stockValue: Math.round((retail * updatedStock) * 100) / 100
            };
          }
          return row;
        });
        if (spreadsheetChanged) {
          saveSpreadsheetData(spreadsheetData);
        }
      }

      // Mark invoice as stock deducted
      const updatedInvoice: Invoice = {
        ...invoice,
        stockDeducted: true,
        stockDeductedAt: now
      };
      await db.invoices.put(updatedInvoice);

      const allLogs = await db.stockLogs.orderBy('timestamp').reverse().toArray();
      const allInvoices = await db.invoices.orderBy('createdAt').reverse().toArray();

      set(state => ({
        catalog: currentCatalog,
        stockLogs: allLogs,
        savedInvoices: allInvoices,
        spreadsheetData: spreadsheetChanged ? spreadsheetData : state.spreadsheetData,
        currentInvoice: state.currentInvoice.id === invoice.id ? updatedInvoice : state.currentInvoice
      }));

      return { success: true, deductedItems };
    } catch (err) {
      console.error('Failed to deduct stock:', err);
      return { success: false, deductedItems: [] };
    }
  },

  restoreStockForInvoice: async (invoice: Invoice) => {
    try {
      if (!invoice || !invoice.stockDeducted || !invoice.items || invoice.items.length === 0) {
        return;
      }

      const currentCatalog = [...get().catalog];
      const now = new Date().toISOString();
      const newLogs: StockLog[] = [];

      for (const lineItem of invoice.items) {
        const qtyToReturn = Number(lineItem.qty) || 0;
        if (qtyToReturn <= 0) continue;

        let catIndex = -1;
        if (lineItem.stockItemId) {
          catIndex = currentCatalog.findIndex(c => c.id === lineItem.stockItemId);
        }
        if (catIndex === -1 && lineItem.code) {
          catIndex = currentCatalog.findIndex(c => c.code && c.code.toLowerCase() === lineItem.code?.toLowerCase());
        }
        if (catIndex === -1 && lineItem.description) {
          const descTrimmed = lineItem.description.trim().toLowerCase();
          catIndex = currentCatalog.findIndex(c => c.description.trim().toLowerCase() === descTrimmed);
        }

        if (catIndex !== -1) {
          const item = currentCatalog[catIndex];
          if (item.trackStock === false) continue;

          const prevQty = Number(item.stockQty) || 0;
          const newQty = prevQty + qtyToReturn;

          currentCatalog[catIndex] = {
            ...item,
            stockQty: newQty,
            updatedAt: now
          };

          newLogs.push({
            id: 'log-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
            itemId: item.id,
            itemDescription: item.description,
            itemCode: item.code,
            type: 'return',
            changeQty: qtyToReturn,
            previousQty: prevQty,
            newQty: newQty,
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            customerName: invoice.customerName,
            notes: `Returned +${qtyToReturn} ${item.unit || 'Pcs'} due to Bill #${invoice.invoiceNumber} cancellation`,
            timestamp: now
          });
        }
      }

      if (newLogs.length > 0) {
        await db.catalog.bulkPut(currentCatalog);
        await db.stockLogs.bulkPut(newLogs);
        const allLogs = await db.stockLogs.orderBy('timestamp').reverse().toArray();
        set({ catalog: currentCatalog, stockLogs: allLogs });
      }
    } catch (err) {
      console.error('Failed to restore stock:', err);
    }
  },

  restockItem: async (itemId: string, addQty: number, notes?: string) => {
    try {
      const item = get().catalog.find(c => c.id === itemId);
      if (!item) return;

      const prevQty = Number(item.stockQty) || 0;
      const newQty = prevQty + addQty;
      const now = new Date().toISOString();

      const updatedItem: CatalogItem = {
        ...item,
        stockQty: newQty,
        updatedAt: now
      };

      await db.catalog.put(updatedItem);

      const log: StockLog = {
        id: 'log-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        itemId: item.id,
        itemDescription: item.description,
        itemCode: item.code,
        type: 'restock',
        changeQty: addQty,
        previousQty: prevQty,
        newQty: newQty,
        notes: notes || `Restocked +${addQty} ${item.unit}`,
        timestamp: now
      };

      await db.stockLogs.put(log);

      const updatedCatalog = await db.catalog.toArray();
      const updatedLogs = await db.stockLogs.orderBy('timestamp').reverse().toArray();

      set({
        catalog: updatedCatalog,
        stockLogs: updatedLogs
      });
    } catch (err) {
      console.error('Failed to restock item:', err);
      throw err;
    }
  },

  adjustStockItem: async (itemId: string, newQty: number, reason?: string) => {
    try {
      const item = get().catalog.find(c => c.id === itemId);
      if (!item) return;

      const prevQty = Number(item.stockQty) || 0;
      const diff = newQty - prevQty;
      const now = new Date().toISOString();

      const updatedItem: CatalogItem = {
        ...item,
        stockQty: Math.max(0, newQty),
        updatedAt: now
      };

      await db.catalog.put(updatedItem);

      const log: StockLog = {
        id: 'log-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        itemId: item.id,
        itemDescription: item.description,
        itemCode: item.code,
        type: 'adjustment',
        changeQty: diff,
        previousQty: prevQty,
        newQty: Math.max(0, newQty),
        notes: reason || `Inventory count adjustment from ${prevQty} to ${newQty}`,
        timestamp: now
      };

      await db.stockLogs.put(log);

      const updatedCatalog = await db.catalog.toArray();
      const updatedLogs = await db.stockLogs.orderBy('timestamp').reverse().toArray();

      set({
        catalog: updatedCatalog,
        stockLogs: updatedLogs
      });
    } catch (err) {
      console.error('Failed to adjust stock item:', err);
      throw err;
    }
  },

  deleteStockLog: async (id: string) => {
    await db.stockLogs.delete(id);
    const stockLogs = await db.stockLogs.orderBy('timestamp').reverse().toArray();
    set({ stockLogs });
  },

  clearStockLogs: async () => {
    await db.stockLogs.clear();
    set({ stockLogs: [] });
  },

  // Catalog & Customer Directory Actions
  addCustomer: async (customerData) => {
    const newCust: Customer = {
      ...customerData,
      id: 'cust-' + Date.now(),
      createdAt: new Date().toISOString()
    };
    await db.customers.add(newCust);
    const customers = await db.customers.toArray();
    set({ customers });
    return newCust;
  },

  deleteCustomer: async (id) => {
    await db.customers.delete(id);
    const customers = await db.customers.toArray();
    set({ customers });
  },

  clearCustomers: async () => {
    await db.customers.clear();
    set({ customers: [] });
  },

  addCatalogItem: async (itemData) => {
    const now = new Date().toISOString();
    const newItem: CatalogItem = {
      ...itemData,
      id: 'cat-' + Date.now(),
      stockQty: itemData.stockQty ?? 0,
      trackStock: itemData.trackStock ?? (itemData.category !== 'Services'),
      createdAt: now,
      updatedAt: now
    };
    await db.catalog.add(newItem);

    if (Number(newItem.stockQty) > 0 && newItem.trackStock !== false) {
      const log: StockLog = {
        id: 'log-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        itemId: newItem.id,
        itemDescription: newItem.description,
        itemCode: newItem.code,
        type: 'initial' as any,
        changeQty: Number(newItem.stockQty),
        previousQty: 0,
        newQty: Number(newItem.stockQty),
        notes: `Initial stock entered for ${newItem.description}`,
        timestamp: now
      };
      await db.stockLogs.put(log);
    }

    const catalog = await db.catalog.toArray();
    const stockLogs = await db.stockLogs.orderBy('timestamp').reverse().toArray();
    set({ catalog, stockLogs });
    return newItem;
  },

  updateCatalogItem: async (id: string, updates: Partial<CatalogItem>) => {
    try {
      const existing = await db.catalog.get(id);
      if (!existing) return;

      const updated: CatalogItem = {
        ...existing,
        ...updates,
        updatedAt: new Date().toISOString()
      };

      await db.catalog.put(updated);
      const catalog = await db.catalog.toArray();
      set({ catalog });
    } catch (err) {
      console.error('Failed to update catalog item:', err);
      throw err;
    }
  },

  deleteCatalogItem: async (id) => {
    await db.catalog.delete(id);
    const catalog = await db.catalog.toArray();
    set({ catalog });
  },

  bulkAddCatalogItems: async (itemsData) => {
    const now = new Date().toISOString();
    const newItems: CatalogItem[] = itemsData.map((item, idx) => ({
      ...item,
      id: 'cat-' + Date.now() + '-' + idx + '-' + Math.random().toString(36).substring(2, 6),
      stockQty: Number(item.stockQty) || 0,
      costPrice: Number(item.costPrice) || 0,
      price: Number(item.price) || 0,
      minStockAlert: item.minStockAlert !== undefined ? Number(item.minStockAlert) : 3,
      trackStock: item.trackStock ?? (item.category !== 'Services'),
      createdAt: now,
      updatedAt: now
    }));

    if (newItems.length > 0) {
      await db.catalog.bulkAdd(newItems);

      const logs: StockLog[] = [];
      newItems.forEach((item, idx) => {
        if (Number(item.stockQty) > 0 && item.trackStock !== false) {
          logs.push({
            id: 'log-' + Date.now() + '-' + idx + '-' + Math.random().toString(36).substring(2, 6),
            itemId: item.id,
            itemDescription: item.description,
            itemCode: item.code,
            type: 'initial' as any,
            changeQty: Number(item.stockQty),
            previousQty: 0,
            newQty: Number(item.stockQty),
            notes: `Inventory batch added / imported (${item.description})`,
            timestamp: now
          });
        }
      });

      if (logs.length > 0 && db.stockLogs) {
        await db.stockLogs.bulkPut(logs);
      }
    }

    const catalog = await db.catalog.toArray();
    let stockLogs: StockLog[] = [];
    if (db.stockLogs) {
      stockLogs = await db.stockLogs.orderBy('timestamp').reverse().toArray();
    }
    set({ catalog, stockLogs });
    return newItems;
  },

  clearAllCatalogItems: async () => {
    await db.catalog.clear();
    if (db.stockLogs) {
      await db.stockLogs.clear();
    }
    set({ catalog: [], stockLogs: [] });
  },

  clearAllDemoData: async () => {
    await db.catalog.clear();
    if (db.stockLogs) {
      await db.stockLogs.clear();
    }
    await db.customers.clear();

    const currentSpreadsheet = get().spreadsheetData;
    if (currentSpreadsheet) {
      const cleanedSheets = currentSpreadsheet.sheets.map(sheet => ({
        ...sheet,
        rows: []
      }));
      const cleanedData: ShopSpreadsheetData = {
        ...currentSpreadsheet,
        sheets: cleanedSheets
      };
      saveSpreadsheetData(cleanedData);
      set({ spreadsheetData: cleanedData });
    }

    set({ catalog: [], stockLogs: [], customers: [] });
  },

  loadCctvStarterPack: async () => {
    const now = new Date().toISOString();
    const starterItems: CatalogItem[] = DEMO_CCTV_STARTER_ITEMS.map((item, idx) => ({
      ...item,
      id: 'cat-starter-' + Date.now() + '-' + idx,
      createdAt: now,
      updatedAt: now
    }));

    await db.catalog.bulkPut(starterItems);

    const logs: StockLog[] = [];
    starterItems.forEach((item, idx) => {
      if (Number(item.stockQty) > 0 && item.trackStock !== false) {
        logs.push({
          id: 'log-start-' + Date.now() + '-' + idx,
          itemId: item.id,
          itemDescription: item.description,
          itemCode: item.code,
          type: 'initial' as any,
          changeQty: Number(item.stockQty),
          previousQty: 0,
          newQty: Number(item.stockQty),
          notes: `Starter pack loaded: ${item.description}`,
          timestamp: now
        });
      }
    });

    if (logs.length > 0 && db.stockLogs) {
      await db.stockLogs.bulkPut(logs);
    }

    const catalog = await db.catalog.toArray();
    let stockLogs: StockLog[] = [];
    if (db.stockLogs) {
      stockLogs = await db.stockLogs.orderBy('timestamp').reverse().toArray();
    }
    set({ catalog, stockLogs });
  },

  // Password Vault Actions
  addPassword: async (itemData) => {
    const now = new Date().toISOString();
    const newPw: PasswordItem = {
      ...itemData,
      id: 'pw-' + Date.now(),
      createdAt: now,
      updatedAt: now
    };
    await db.passwords.add(newPw);
    const passwords = await db.passwords.toArray();
    set({ passwords });
    return newPw;
  },

  updatePassword: async (id, itemData) => {
    const existing = await db.passwords.get(id);
    if (!existing) return;
    const updated: PasswordItem = {
      ...existing,
      ...itemData,
      updatedAt: new Date().toISOString()
    };
    await db.passwords.put(updated);
    const passwords = await db.passwords.toArray();
    set({ passwords });
  },

  deletePassword: async (id) => {
    await db.passwords.delete(id);
    const passwords = await db.passwords.toArray();
    set({ passwords });
  },

  toggleFavoritePassword: async (id) => {
    const existing = await db.passwords.get(id);
    if (!existing) return;
    const updated: PasswordItem = {
      ...existing,
      favorite: !existing.favorite,
      updatedAt: new Date().toISOString()
    };
    await db.passwords.put(updated);
    const passwords = await db.passwords.toArray();
    set({ passwords });
  },

  // Excel Spreadsheet Actions
  setActiveSheet: (sheetId: string) => {
    const current = get().spreadsheetData;
    const updated = { ...current, activeSheetId: sheetId };
    saveSpreadsheetData(updated);
    set({ spreadsheetData: updated });
  },

  addSheet: (name: string, template: 'blank' | 'price' | 'workers' | 'attendance' = 'blank') => {
    const current = get().spreadsheetData;
    const id = 'sheet-' + Date.now();
    let newSheet: ExcelSheet;

    if (template === 'price') {
      newSheet = {
        id,
        name: name.trim() || 'New Price Store',
        icon: 'price',
        columns: [
          { id: 'code', title: 'Item SKU / Code', type: 'text', width: 130 },
          { id: 'name', title: 'Product / Item Particulars', type: 'text', width: 260 },
          { id: 'category', title: 'Category', type: 'badge', width: 140 },
          { id: 'unit', title: 'Unit', type: 'text', width: 70 },
          { id: 'costPrice', title: 'Cost Price (Rs.)', type: 'currency', width: 120 },
          { id: 'dealerPrice', title: 'Dealer Rate (Rs.)', type: 'currency', width: 120 },
          { id: 'retailPrice', title: 'Retail Price (Rs.)', type: 'currency', width: 120 },
          { id: 'stockQty', title: 'Stock Qty', type: 'number', width: 90 },
          { id: 'marginPercent', title: 'Margin %', type: 'percent', width: 90, formula: '((retailPrice-costPrice)/costPrice)*100' },
          { id: 'stockValue', title: 'Stock Value (Rs.)', type: 'currency', width: 130, formula: 'retailPrice*stockQty' },
          { id: 'location', title: 'Rack / Shelf', type: 'text', width: 110 },
          { id: 'notes', title: 'Notes', type: 'text', width: 180 }
        ],
        rows: [
          { id: 'row-' + Date.now() + '-1', code: 'PRD-001', name: 'Sample Item', category: 'General Products', unit: 'Pcs', costPrice: 500, dealerPrice: 650, retailPrice: 800, stockQty: 10, marginPercent: 60, stockValue: 8000, location: 'Store A', notes: '' }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    } else if (template === 'workers') {
      newSheet = {
        id,
        name: name.trim() || 'New Staff Sheet',
        icon: 'workers',
        columns: [
          { id: 'staffId', title: 'Staff ID', type: 'text', width: 90 },
          { id: 'name', title: 'Worker Name', type: 'text', width: 200 },
          { id: 'role', title: 'Role / Designation', type: 'badge', width: 170 },
          { id: 'phone', title: 'Phone Number', type: 'text', width: 130 },
          { id: 'salary', title: 'Monthly Salary (Rs.)', type: 'currency', width: 130 },
          { id: 'dailyRate', title: 'Daily Wage (Rs.)', type: 'currency', width: 120 },
          { id: 'status', title: 'Duty Status', type: 'badge', width: 110 },
          { id: 'advanceTaken', title: 'Advance Taken (Rs.)', type: 'currency', width: 130 },
          { id: 'notes', title: 'Notes', type: 'text', width: 200 }
        ],
        rows: [
          { id: 'row-' + Date.now() + '-1', staffId: 'EMP-01', name: 'Staff Name', role: 'Technician', phone: '9800000000', salary: 20000, dailyRate: 800, status: 'Active', advanceTaken: 0, notes: '' }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    } else if (template === 'attendance') {
      newSheet = {
        id,
        name: name.trim() || 'New Daily Khata',
        icon: 'attendance',
        columns: [
          { id: 'dateBS', title: 'Date (BS)', type: 'date', width: 110 },
          { id: 'workerName', title: 'Worker Name', type: 'text', width: 170 },
          { id: 'dutyType', title: 'Duty Status', type: 'badge', width: 140 },
          { id: 'dailyWage', title: 'Daily Wage (Rs.)', type: 'currency', width: 130 },
          { id: 'advanceDeduction', title: 'Advance (Rs.)', type: 'currency', width: 130 },
          { id: 'netPayable', title: 'Net Payable (Rs.)', type: 'currency', width: 130, formula: 'dailyWage-advanceDeduction' },
          { id: 'taskSite', title: 'Work / Site Job', type: 'text', width: 240 },
          { id: 'paymentStatus', title: 'Status', type: 'badge', width: 110 }
        ],
        rows: [
          { id: 'row-' + Date.now() + '-1', dateBS: getTodayDates().dateBS, workerName: 'Staff Member', dutyType: 'Full Day', dailyWage: 1000, advanceDeduction: 0, netPayable: 1000, taskSite: 'Shop Maintenance & Cabling', paymentStatus: 'Pending' }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    } else {
      newSheet = {
        id,
        name: name.trim() || 'Custom Sheet',
        icon: 'custom',
        columns: [
          { id: 'col_a', title: 'Column A', type: 'text', width: 160 },
          { id: 'col_b', title: 'Column B', type: 'text', width: 160 },
          { id: 'col_c', title: 'Column C (Qty)', type: 'number', width: 120 },
          { id: 'col_d', title: 'Column D (Rate Rs.)', type: 'currency', width: 140 }
        ],
        rows: [
          { id: 'row-' + Date.now() + '-1', col_a: 'Entry 1', col_b: 'Details', col_c: 1, col_d: 1000 },
          { id: 'row-' + Date.now() + '-2', col_a: 'Entry 2', col_b: 'Details', col_c: 2, col_d: 2500 }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }

    const updated = {
      ...current,
      sheets: [...current.sheets, newSheet],
      activeSheetId: id
    };
    saveSpreadsheetData(updated);
    set({ spreadsheetData: updated });
  },

  deleteSheet: (sheetId: string) => {
    const current = get().spreadsheetData;
    if (current.sheets.length <= 1) return; // Maintain at least one sheet
    const newSheets = current.sheets.filter(s => s.id !== sheetId);
    const newActiveId = current.activeSheetId === sheetId ? newSheets[0].id : current.activeSheetId;
    const updated = {
      sheets: newSheets,
      activeSheetId: newActiveId
    };
    saveSpreadsheetData(updated);
    set({ spreadsheetData: updated });
  },

  renameSheet: (sheetId: string, name: string) => {
    const current = get().spreadsheetData;
    const updated = {
      ...current,
      sheets: current.sheets.map(s => s.id === sheetId ? { ...s, name: name.trim() || s.name, updatedAt: new Date().toISOString() } : s)
    };
    saveSpreadsheetData(updated);
    set({ spreadsheetData: updated });
  },

  updateCellValue: (sheetId: string, rowId: string, colId: string, value: any) => {
    const current = get().spreadsheetData;
    const updatedSheets = current.sheets.map(sheet => {
      if (sheet.id !== sheetId) return sheet;
      const updatedRows = sheet.rows.map(row => {
        if (row.id !== rowId) return row;
        const updatedRow = { ...row, [colId]: value };

        // Recalculate automatic formulas
        if (colId === 'costPrice' || colId === 'retailPrice' || colId === 'stockQty') {
          const cost = Number(updatedRow.costPrice) || 0;
          const retail = Number(updatedRow.retailPrice) || 0;
          const qty = Number(updatedRow.stockQty) || 0;
          if (cost > 0) {
            updatedRow.marginPercent = Math.round(((retail - cost) / cost) * 1000) / 10;
          }
          updatedRow.stockValue = Math.round((retail * qty) * 100) / 100;
        }
        if (colId === 'dailyWage' || colId === 'advanceDeduction') {
          const wage = Number(updatedRow.dailyWage) || 0;
          const adv = Number(updatedRow.advanceDeduction) || 0;
          updatedRow.netPayable = Math.max(0, wage - adv);
        }

        return updatedRow;
      });
      return { ...sheet, rows: updatedRows, updatedAt: new Date().toISOString() };
    });

    const updated = { ...current, sheets: updatedSheets };
    saveSpreadsheetData(updated);
    set({ spreadsheetData: updated });
  },

  addRow: (sheetId: string, rowData?: Record<string, any>, insertIndex?: number) => {
    const current = get().spreadsheetData;
    const updatedSheets = current.sheets.map(sheet => {
      if (sheet.id !== sheetId) return sheet;
      const newRow: ExcelRow = {
        id: 'row-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        ...(rowData || {})
      };
      // Populate defaults for missing columns
      sheet.columns.forEach(col => {
        if (newRow[col.id] === undefined) {
          if (col.type === 'number' || col.type === 'currency' || col.type === 'percent') {
            newRow[col.id] = 0;
          } else {
            newRow[col.id] = '';
          }
        }
      });

      let updatedRows = [...sheet.rows];
      if (insertIndex !== undefined && insertIndex >= 0 && insertIndex <= updatedRows.length) {
        updatedRows.splice(insertIndex, 0, newRow);
      } else {
        updatedRows.push(newRow);
      }
      return { ...sheet, rows: updatedRows, updatedAt: new Date().toISOString() };
    });

    const updated = { ...current, sheets: updatedSheets };
    saveSpreadsheetData(updated);
    set({ spreadsheetData: updated });
  },

  deleteRow: (sheetId: string, rowId: string) => {
    const current = get().spreadsheetData;
    const updatedSheets = current.sheets.map(sheet => {
      if (sheet.id !== sheetId) return sheet;
      return { ...sheet, rows: sheet.rows.filter(r => r.id !== rowId), updatedAt: new Date().toISOString() };
    });
    const updated = { ...current, sheets: updatedSheets };
    saveSpreadsheetData(updated);
    set({ spreadsheetData: updated });
  },

  reorderRows: (sheetId: string, rows: ExcelRow[]) => {
    const current = get().spreadsheetData;
    const updatedSheets = current.sheets.map(sheet => {
      if (sheet.id !== sheetId) return sheet;
      return { ...sheet, rows, updatedAt: new Date().toISOString() };
    });
    const updated = { ...current, sheets: updatedSheets };
    saveSpreadsheetData(updated);
    set({ spreadsheetData: updated });
  },

  addColumn: (sheetId: string, column: ExcelColumn) => {
    const current = get().spreadsheetData;
    const updatedSheets = current.sheets.map(sheet => {
      if (sheet.id !== sheetId) return sheet;
      const exists = sheet.columns.some(c => c.id === column.id);
      if (exists) return sheet;
      const updatedCols = [...sheet.columns, column];
      return { ...sheet, columns: updatedCols, updatedAt: new Date().toISOString() };
    });
    const updated = { ...current, sheets: updatedSheets };
    saveSpreadsheetData(updated);
    set({ spreadsheetData: updated });
  },

  deleteColumn: (sheetId: string, colId: string) => {
    const current = get().spreadsheetData;
    const updatedSheets = current.sheets.map(sheet => {
      if (sheet.id !== sheetId) return sheet;
      if (sheet.columns.length <= 1) return sheet;
      const updatedCols = sheet.columns.filter(c => c.id !== colId);
      return { ...sheet, columns: updatedCols, updatedAt: new Date().toISOString() };
    });
    const updated = { ...current, sheets: updatedSheets };
    saveSpreadsheetData(updated);
    set({ spreadsheetData: updated });
  },

  updateColumn: (sheetId: string, colId: string, updates: Partial<ExcelColumn>) => {
    const current = get().spreadsheetData;
    const updatedSheets = current.sheets.map(sheet => {
      if (sheet.id !== sheetId) return sheet;
      const updatedCols = sheet.columns.map(c => c.id === colId ? { ...c, ...updates } : c);
      return { ...sheet, columns: updatedCols, updatedAt: new Date().toISOString() };
    });
    const updated = { ...current, sheets: updatedSheets };
    saveSpreadsheetData(updated);
    set({ spreadsheetData: updated });
  },

  importSheetFromExcelData: (sheetName: string, columns: ExcelColumn[], rows: ExcelRow[]) => {
    const current = get().spreadsheetData;
    const newId = 'sheet-import-' + Date.now();
    const newSheet: ExcelSheet = {
      id: newId,
      name: sheetName.trim() || 'Imported Excel Sheet',
      icon: 'custom',
      columns,
      rows,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const updated = {
      ...current,
      sheets: [...current.sheets, newSheet],
      activeSheetId: newId
    };
    saveSpreadsheetData(updated);
    set({ spreadsheetData: updated });
  },

  addItemToInvoiceFromStore: (row: ExcelRow) => {
    const desc = row.name || row.description || row.col_a || 'Item from Price Store';
    const price = Number(row.retailPrice) || Number(row.price) || Number(row.dealerPrice) || Number(row.col_d) || 0;
    const unit = row.unit || 'Pcs';
    const code = row.code || '';
    get().addLineItem({
      description: desc,
      unit: unit,
      listPrice: price,
      code: code,
      qty: 1
    });
    get().setActiveTab('create');
  }
}));
