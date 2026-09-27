import { create } from 'zustand';
import { 
  Invoice, LineItem, Customer, CatalogItem, PasswordItem, CompanyDetails, TaxMode, PaymentStatus, PaymentMethod, DocumentType, 
  BackupSettings, BackupRecord, DatabaseSnapshot, ShopSpreadsheetData, ExcelSheet, ExcelColumn, ExcelRow, SecuritySettings 
} from '../types/invoice';
import { 
  db, getSavedCompanyDetails, saveCompanyDetails, INITIAL_CATALOG, INITIAL_CUSTOMERS, INITIAL_PASSWORDS,
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
  passwords: PasswordItem[];
  spreadsheetData: ShopSpreadsheetData;
  activeTab: 'create' | 'preview' | 'cctv_history' | 'studio_history' | 'counter_history' | 'history' | 'customers' | 'catalog' | 'settings' | 'analytics' | 'backup' | 'calculator' | 'passwords' | 'excel_store';
  isEditing: boolean;
  editingInvoiceId: string | null;
  isLoading: boolean;
  isBackingUp: boolean;
  backupHistory: BackupRecord[];
  backupStatusMessage: string | null;
  isAppLocked: boolean;

  // Actions
  initializeStore: () => Promise<void>;
  setActiveTab: (tab: 'create' | 'preview' | 'cctv_history' | 'studio_history' | 'counter_history' | 'history' | 'customers' | 'catalog' | 'settings' | 'analytics' | 'backup' | 'calculator' | 'passwords' | 'excel_store') => void;
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

  // Catalog & Customer Directory Actions
  addCustomer: (customer: Omit<Customer, 'id'>) => Promise<Customer>;
  deleteCustomer: (id: string) => Promise<void>;
  addCatalogItem: (item: Omit<CatalogItem, 'id'>) => Promise<CatalogItem>;
  deleteCatalogItem: (id: string) => Promise<void>;

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
      const catalog = await db.catalog.toArray();
      const passwords = await db.passwords.toArray();
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
      updatedAt: new Date().toISOString()
    };

    set({
      currentInvoice: duplicated,
      isEditing: false,
      editingInvoiceId: null,
      activeTab: 'create'
    });
  },

  deleteInvoice: async (id) => {
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

  addCatalogItem: async (itemData) => {
    const newItem: CatalogItem = {
      ...itemData,
      id: 'cat-' + Date.now()
    };
    await db.catalog.add(newItem);
    const catalog = await db.catalog.toArray();
    set({ catalog });
    return newItem;
  },

  deleteCatalogItem: async (id) => {
    await db.catalog.delete(id);
    const catalog = await db.catalog.toArray();
    set({ catalog });
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
    get().addLineItem({
      description: desc,
      unit: unit,
      listPrice: price,
      qty: 1
    });
    get().setActiveTab('create');
  }
}));
