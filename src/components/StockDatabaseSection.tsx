import React, { useState, useMemo } from 'react';
import { 
  Boxes, Plus, Search, AlertTriangle, ArrowDownRight, 
  ArrowUpRight, FileSpreadsheet, Printer, Edit2, Trash2, 
  X, Package, MapPin, DollarSign, ShoppingCart, 
  BarChart3, TrendingUp, UploadCloud, Download, CheckCircle2,
  Sparkles, AlertCircle
} from 'lucide-react';
import { useInvoiceStore } from '../store/useInvoiceStore';
import { CatalogItem } from '../types/invoice';
import { formatNPR } from '../utils/formatters';
import * as XLSX from 'xlsx';

export const StockDatabaseSection: React.FC = () => {
  const { 
    catalog, 
    stockLogs, 
    addCatalogItem, 
    bulkAddCatalogItems,
    updateCatalogItem, 
    deleteCatalogItem, 
    clearAllCatalogItems,
    clearAllDemoData,
    loadCctvStarterPack,
    restockItem, 
    deleteStockLog, 
    clearStockLogs,
    addLineItem, 
    setActiveTab, 
    companyDetails 
  } = useInvoiceStore();

  const [activeSubTab, setActiveSubTab] = useState<'inventory' | 'low_stock' | 'logs'>('inventory');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all');

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [addModalTab, setAddModalTab] = useState<'single' | 'excel' | 'multi' | 'starter'>('single');
  const [showClearDemoModal, setShowClearDemoModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);

  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);
  const [restockTarget, setRestockTarget] = useState<CatalogItem | null>(null);
  const [restockQty, setRestockQty] = useState<number>(5);
  const [restockNote, setRestockNote] = useState<string>('');

  // Excel / CSV File Import State
  const [importPreviewItems, setImportPreviewItems] = useState<Array<Omit<CatalogItem, 'id'>>>([]);
  const [importFileName, setImportFileName] = useState<string>('');
  const [importError, setImportError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState<boolean>(false);

  // Multi-row batch quick entry state
  interface BatchRow {
    tempId: string;
    code: string;
    description: string;
    category: CatalogItem['category'];
    unit: string;
    stockQty: string;
    costPrice: string;
    price: string;
    location: string;
  }

  const createInitialBatchRows = (): BatchRow[] => [
    { tempId: 'br-1', code: '', description: '', category: 'CCTV & Security', unit: 'Pcs', stockQty: '10', costPrice: '', price: '', location: '' },
    { tempId: 'br-2', code: '', description: '', category: 'CCTV & Security', unit: 'Pcs', stockQty: '10', costPrice: '', price: '', location: '' },
    { tempId: 'br-3', code: '', description: '', category: 'Accessories', unit: 'Pcs', stockQty: '10', costPrice: '', price: '', location: '' },
    { tempId: 'br-4', code: '', description: '', category: 'General Products', unit: 'Pcs', stockQty: '5', costPrice: '', price: '', location: '' },
    { tempId: 'br-5', code: '', description: '', category: 'Hardware', unit: 'Pcs', stockQty: '5', costPrice: '', price: '', location: '' }
  ];

  const [batchRows, setBatchRows] = useState<BatchRow[]>(createInitialBatchRows);

  // New Item State
  const [newItem, setNewItem] = useState<{
    code: string;
    description: string;
    category: CatalogItem['category'];
    unit: string;
    costPrice: number;
    price: number;
    stockQty: number;
    minStockAlert: number;
    trackStock: boolean;
    location: string;
    barcode: string;
    notes: string;
  }>({
    code: '',
    description: '',
    category: 'CCTV & Security',
    unit: 'Pcs',
    costPrice: 0,
    price: 0,
    stockQty: 10,
    minStockAlert: 3,
    trackStock: true,
    location: '',
    barcode: '',
    notes: ''
  });

  const categories = [
    'all', 
    'CCTV & Security', 
    'Accessories', 
    'General Products', 
    'Electronics', 
    'Hardware', 
    'Photo & Print', 
    'Framing', 
    'Printing', 
    'Services', 
    'Other'
  ];

  // Auto-generate SKU Code based on category
  const generateSku = (category: string) => {
    const prefixMap: Record<string, string> = {
      'CCTV & Security': 'CAM',
      'Accessories': 'ACC',
      'General Products': 'PRD',
      'Electronics': 'ELE',
      'Hardware': 'HDW',
      'Photo & Print': 'PHO',
      'Framing': 'FRM',
      'Printing': 'PRT',
      'Services': 'SRV',
      'Other': 'ITM'
    };
    const prefix = prefixMap[category] || 'SKU';
    const num = Math.floor(100 + Math.random() * 900);
    return `${prefix}-${num}`;
  };

  // Stock inventory KPIs
  const kpi = useMemo(() => {
    const trackedItems = catalog.filter(i => i.trackStock !== false);
    const totalItems = catalog.length;
    const totalUnits = trackedItems.reduce((sum, i) => sum + (Number(i.stockQty) || 0), 0);
    const totalCostValue = trackedItems.reduce((sum, i) => sum + ((Number(i.costPrice) || 0) * (Number(i.stockQty) || 0)), 0);
    const totalRetailValue = trackedItems.reduce((sum, i) => sum + ((Number(i.price) || 0) * (Number(i.stockQty) || 0)), 0);
    const expectedGrossProfit = Math.max(0, totalRetailValue - totalCostValue);
    const profitMargin = totalCostValue > 0 ? (expectedGrossProfit / totalCostValue) * 100 : 0;
    
    const lowStockItems = trackedItems.filter(i => (Number(i.stockQty) || 0) > 0 && (Number(i.stockQty) || 0) <= (i.minStockAlert ?? 3));
    const outOfStockItems = trackedItems.filter(i => (Number(i.stockQty) || 0) <= 0);

    return {
      totalItems,
      totalUnits,
      totalCostValue,
      totalRetailValue,
      expectedGrossProfit,
      profitMargin,
      lowStockCount: lowStockItems.length,
      outOfStockCount: outOfStockItems.length
    };
  }, [catalog]);

  // Filtered Items
  const filteredItems = useMemo(() => {
    return catalog.filter(item => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        item.description.toLowerCase().includes(q) ||
        (item.code && item.code.toLowerCase().includes(q)) ||
        (item.barcode && item.barcode.toLowerCase().includes(q)) ||
        (item.location && item.location.toLowerCase().includes(q)) ||
        item.category.toLowerCase().includes(q);

      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;

      const stock = Number(item.stockQty) || 0;
      const minAlert = item.minStockAlert ?? 3;
      let matchesStatus = true;

      if (selectedStatus === 'in_stock') {
        matchesStatus = stock > minAlert;
      } else if (selectedStatus === 'low_stock') {
        matchesStatus = stock > 0 && stock <= minAlert;
      } else if (selectedStatus === 'out_of_stock') {
        matchesStatus = stock <= 0;
      }

      if (activeSubTab === 'low_stock') {
        return matchesSearch && matchesCategory && stock <= minAlert;
      }

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [catalog, searchQuery, selectedCategory, selectedStatus, activeSubTab]);

  // Handle Add Item Submit
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.description.trim() || newItem.price <= 0) {
      alert('Please enter a valid item description and selling price.');
      return;
    }

    const codeToUse = newItem.code.trim() || generateSku(newItem.category);

    await addCatalogItem({
      code: codeToUse,
      description: newItem.description.trim(),
      category: newItem.category,
      unit: newItem.unit || 'Pcs',
      costPrice: Number(newItem.costPrice) || 0,
      price: Number(newItem.price) || 0,
      stockQty: Number(newItem.stockQty) || 0,
      minStockAlert: Number(newItem.minStockAlert) || 3,
      trackStock: newItem.trackStock,
      location: newItem.location.trim(),
      barcode: newItem.barcode.trim(),
      notes: newItem.notes.trim()
    });

    setNewItem({
      code: '',
      description: '',
      category: 'CCTV & Security',
      unit: 'Pcs',
      costPrice: 0,
      price: 0,
      stockQty: 10,
      minStockAlert: 3,
      trackStock: true,
      location: '',
      barcode: '',
      notes: ''
    });

    setShowAddModal(false);
    showToast(`Added "${newItem.description}" to stock database!`, 'success');
  };

  // Toast Helper
  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ type, text });
    setTimeout(() => {
      setToastMessage(prev => (prev?.text === text ? null : prev));
    }, 4500);
  };

  // Download Excel Import Template
  const handleDownloadTemplate = () => {
    const templateRows = [
      {
        'Item Name / Description': '2MP HD Night Vision Dome Camera (Hikvision)',
        'SKU / Code': 'CAM-HIK-2MP',
        'Category': 'CCTV & Security',
        'Stock Qty': 20,
        'Unit': 'Pcs',
        'Cost Price (Rs.)': 2150,
        'Selling Rate (Rs.)': 2800,
        'Min Alert Level': 5,
        'Shelf / Rack Location': 'Rack A-1',
        'Barcode': '',
        'Warranty & Notes': '2 Years Replacement Warranty'
      },
      {
        'Item Name / Description': '8-Channel 4K NVR Network Video Recorder',
        'SKU / Code': 'NVR-HIK-8CH',
        'Category': 'CCTV & Security',
        'Stock Qty': 6,
        'Unit': 'Pcs',
        'Cost Price (Rs.)': 5800,
        'Selling Rate (Rs.)': 7500,
        'Min Alert Level': 2,
        'Shelf / Rack Location': 'Rack B-1',
        'Barcode': '',
        'Warranty & Notes': 'Cloud P2P Hik-Connect'
      },
      {
        'Item Name / Description': 'Cat6 Pure Copper UTP Network Cable (305m Roll)',
        'SKU / Code': 'CAB-CAT6-300',
        'Category': 'CCTV & Security',
        'Stock Qty': 5,
        'Unit': 'Roll',
        'Cost Price (Rs.)': 9500,
        'Selling Rate (Rs.)': 12500,
        'Min Alert Level': 1,
        'Shelf / Rack Location': 'Ground Store',
        'Barcode': '',
        'Warranty & Notes': '100% Solid Copper'
      },
      {
        'Item Name / Description': '12V 10A Heavy Duty SMPS Power Supply Box',
        'SKU / Code': 'PSU-12V-10A',
        'Category': 'Accessories',
        'Stock Qty': 15,
        'Unit': 'Pcs',
        'Cost Price (Rs.)': 1750,
        'Selling Rate (Rs.)': 2400,
        'Min Alert Level': 3,
        'Shelf / Rack Location': 'Rack B-3',
        'Barcode': '',
        'Warranty & Notes': 'Overload Protected'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateRows);
    ws['!cols'] = [
      { wch: 45 }, { wch: 16 }, { wch: 20 }, { wch: 12 }, { wch: 10 },
      { wch: 16 }, { wch: 18 }, { wch: 16 }, { wch: 22 }, { wch: 16 }, { wch: 32 }
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Stock Items');
    XLSX.writeFile(wb, 'Inventory_Import_Template.xlsx');
    showToast('Downloaded Inventory_Import_Template.xlsx. Fill it out and upload it here!', 'info');
  };

  // Handle Excel / CSV File Upload & Parsing
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    setImportError(null);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const firstSheetName = wb.SheetNames[0];
        if (!firstSheetName) {
          setImportError('Uploaded file has no worksheets.');
          return;
        }
        const ws = wb.Sheets[firstSheetName];
        const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(ws);

        if (!rawRows || rawRows.length === 0) {
          setImportError('No data rows found in the first sheet. Please ensure rows exist below headers.');
          setImportPreviewItems([]);
          return;
        }

        const parsed: Array<Omit<CatalogItem, 'id'>> = [];
        rawRows.forEach((row, idx) => {
          let description = '';
          let code = '';
          let category: any = 'CCTV & Security';
          let unit = 'Pcs';
          let stockQty = 0;
          let costPrice = 0;
          let price = 0;
          let minStockAlert = 3;
          let location = '';
          let barcode = '';
          let notes = '';

          for (const [rawKey, rawVal] of Object.entries(row)) {
            if (rawVal === undefined || rawVal === null) continue;
            const k = rawKey.toLowerCase().replace(/[^a-z0-9]/g, '');
            const valStr = String(rawVal).trim();

            if (k.includes('desc') || k.includes('item') || k.includes('partic') || k.includes('prod') || k.includes('name')) {
              if (!description) description = valStr;
            } else if (k.includes('sku') || k.includes('code') || k.includes('tag')) {
              if (!code) code = valStr;
            } else if (k.includes('cat') || k.includes('group')) {
              category = valStr;
            } else if (k.includes('unit') || k.includes('uom')) {
              unit = valStr;
            } else if (k.includes('cost') || k.includes('purchase') || k.includes('cp')) {
              costPrice = Number(rawVal) || 0;
            } else if (k.includes('price') || k.includes('rate') || k.includes('retail') || k.includes('mrp') || k.includes('sell')) {
              price = Number(rawVal) || 0;
            } else if (k.includes('stock') || k.includes('qty') || k.includes('quantity') || k.includes('count') || k.includes('bal')) {
              stockQty = Number(rawVal) || 0;
            } else if (k.includes('alert') || k.includes('min') || k.includes('reorder')) {
              minStockAlert = Number(rawVal) || 3;
            } else if (k.includes('rack') || k.includes('shelf') || k.includes('loc')) {
              location = valStr;
            } else if (k.includes('barcode')) {
              barcode = valStr;
            } else if (k.includes('note') || k.includes('rem') || k.includes('warr')) {
              notes = valStr;
            }
          }

          if (description) {
            parsed.push({
              description,
              code: code || `SKU-${idx + 101}`,
              category: (category as any) || 'CCTV & Security',
              unit: unit || 'Pcs',
              costPrice,
              price: price || costPrice,
              stockQty,
              minStockAlert,
              trackStock: true,
              location,
              barcode,
              notes
            });
          }
        });

        if (parsed.length === 0) {
          setImportError('No valid items found. Please check column headers (e.g. Item Name, Stock Qty, Rate).');
          setImportPreviewItems([]);
        } else {
          setImportPreviewItems(parsed);
          setImportError(null);
        }
      } catch (err: any) {
        setImportError('Failed to read file: ' + (err.message || 'Check format'));
        setImportPreviewItems([]);
      }
    };

    reader.readAsBinaryString(file);
  };

  // Confirm Import
  const handleImportConfirm = async () => {
    if (importPreviewItems.length === 0) return;
    setIsImporting(true);
    try {
      await bulkAddCatalogItems(importPreviewItems);
      showToast(`Successfully imported ${importPreviewItems.length} items to inventory!`, 'success');
      setImportPreviewItems([]);
      setImportFileName('');
      setShowAddModal(false);
    } catch (err: any) {
      setImportError('Import failed: ' + (err.message || 'Unknown error'));
    } finally {
      setIsImporting(false);
    }
  };

  // Save Batch Rows
  const handleSaveBatchRows = async () => {
    const validRows = batchRows.filter(r => r.description.trim() !== '');
    if (validRows.length === 0) {
      alert('Please fill in at least one item particulars/name.');
      return;
    }

    const itemsToSave: Array<Omit<CatalogItem, 'id'>> = validRows.map(r => ({
      description: r.description.trim(),
      code: r.code.trim() || generateSku(r.category),
      category: r.category,
      unit: r.unit || 'Pcs',
      costPrice: Number(r.costPrice) || 0,
      price: Number(r.price) || 0,
      stockQty: Number(r.stockQty) || 0,
      minStockAlert: 3,
      trackStock: true,
      location: r.location.trim(),
      barcode: '',
      notes: ''
    }));

    await bulkAddCatalogItems(itemsToSave);
    setBatchRows(createInitialBatchRows());
    setShowAddModal(false);
    showToast(`Added ${itemsToSave.length} stock items to inventory!`, 'success');
  };

  // Load Starter Pack
  const handleLoadStarterPack = async () => {
    await loadCctvStarterPack();
    setShowAddModal(false);
    showToast('Loaded 13 standard CCTV inventory items into your stock database!', 'success');
  };

  // Wipe Demo Data
  const handleClearDemoData = async () => {
    await clearAllDemoData();
    setShowClearDemoModal(false);
    showToast('All demo and dummy data removed! Your stock database is now 100% clean (0 items).', 'success');
  };

  // Wipe Stock Catalog Only
  const handleClearStockOnly = async () => {
    await clearAllCatalogItems();
    setShowClearDemoModal(false);
    showToast('All stock items and logs cleared to 0.', 'success');
  };

  // Handle Edit Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    await updateCatalogItem(editingItem.id, {
      code: editingItem.code?.trim(),
      description: editingItem.description.trim(),
      category: editingItem.category,
      unit: editingItem.unit,
      costPrice: Number(editingItem.costPrice) || 0,
      price: Number(editingItem.price) || 0,
      stockQty: Number(editingItem.stockQty) || 0,
      minStockAlert: Number(editingItem.minStockAlert) || 3,
      trackStock: editingItem.trackStock !== false,
      location: editingItem.location?.trim() || '',
      barcode: editingItem.barcode?.trim() || '',
      notes: editingItem.notes?.trim() || ''
    });

    setEditingItem(null);
  };

  // Handle Restock Submit
  const handleRestockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockTarget || restockQty <= 0) return;

    await restockItem(
      restockTarget.id, 
      restockQty, 
      restockNote.trim() || `Restocked +${restockQty} ${restockTarget.unit || 'Pcs'}`
    );

    setRestockTarget(null);
    setRestockQty(5);
    setRestockNote('');
  };

  // Direct Add Item to Bill / Sale
  const handleSellItem = (item: CatalogItem) => {
    addLineItem({
      description: item.description,
      unit: item.unit,
      listPrice: item.price,
      stockItemId: item.id,
      code: item.code,
      qty: 1
    });
    setActiveTab('create');
  };

  // Export Stock Database to Excel (.xlsx)
  const handleExportExcel = () => {
    const dataToExport = catalog.map((item, idx) => ({
      'S.N.': idx + 1,
      'SKU / Code': item.code || '',
      'Product Particulars': item.description,
      'Category': item.category,
      'Unit': item.unit,
      'Cost Price (Rs.)': item.costPrice || 0,
      'Selling Rate (Rs.)': item.price || 0,
      'Stock In Hand': item.stockQty ?? 0,
      'Min Alert Level': item.minStockAlert ?? 3,
      'Total Stock Value (Rs.)': (item.price || 0) * (item.stockQty ?? 0),
      'Rack / Location': item.location || '',
      'Stock Status': (item.stockQty ?? 0) <= 0 
        ? 'OUT OF STOCK' 
        : (item.stockQty ?? 0) <= (item.minStockAlert ?? 3) 
        ? 'LOW STOCK' 
        : 'IN STOCK',
      'Notes': item.notes || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Stock Inventory');

    // Auto-size columns
    const colWidths = [
      { wch: 6 },
      { wch: 14 },
      { wch: 40 },
      { wch: 18 },
      { wch: 8 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 20 },
      { wch: 16 },
      { wch: 16 },
      { wch: 30 }
    ];
    worksheet['!cols'] = colWidths;

    const dateStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `PNP_Tech_Stock_Inventory_${dateStr}.xlsx`);
  };

  // Print Stock Audit Sheet
  const handlePrintAuditSheet = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      
      {/* Toast Alert Notification */}
      {toastMessage && (
        <div className={`p-3.5 rounded-2xl flex items-center justify-between text-xs font-bold shadow-xl border animate-in fade-in slide-in-from-top-2 duration-200 print:hidden ${
          toastMessage.type === 'success'
            ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
            : toastMessage.type === 'error'
            ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
            : 'bg-sky-500/10 text-sky-300 border-sky-500/30'
        }`}>
          <div className="flex items-center space-x-2.5">
            {toastMessage.type === 'success' && <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />}
            {toastMessage.type === 'error' && <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />}
            {toastMessage.type === 'info' && <Boxes className="h-4 w-4 text-sky-400 shrink-0" />}
            <span>{toastMessage.text}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setToastMessage(null)} 
            className="text-slate-400 hover:text-white px-2 py-0.5 rounded text-sm"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20">
              <Boxes className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                <span>Stock & Inventory Database</span>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  स्टक गोदाम
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Live stock counts, automatic deduction on bill printing, restock alerts & real-time inventory audit
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2 flex-wrap gap-y-2">
          {/* Clear Demo Data Button */}
          <button
            type="button"
            onClick={() => setShowClearDemoModal(true)}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-600 text-rose-300 hover:text-white text-xs font-bold border border-rose-500/30 transition-all shadow-sm group"
            title="Delete demo/dummy data to start with an empty shop database"
          >
            <Trash2 className="h-4 w-4 text-rose-400 group-hover:text-white" />
            <span>Clear Demo Data</span>
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-bold border border-slate-800 transition-all shadow-sm"
            title="Download Stock Inventory in Excel spreadsheet format"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
            <span>Export Excel</span>
          </button>

          <button
            type="button"
            onClick={handlePrintAuditSheet}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-bold border border-slate-800 transition-all shadow-sm"
            title="Print Stock Tally Audit Sheet for shop shelves"
          >
            <Printer className="h-4 w-4 text-sky-400" />
            <span>Print Audit Sheet</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setAddModalTab('single');
              setNewItem(prev => ({ ...prev, code: generateSku(prev.category) }));
              setShowAddModal(true);
            }}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-extrabold shadow-lg shadow-emerald-500/20 transition-all transform hover:scale-[1.02]"
          >
            <Plus className="h-4 w-4" />
            <span>+ Add / Import Inventory</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 print:hidden">
        {/* Total In-Stock Units */}
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-4 shadow-lg flex items-center justify-between group hover:border-slate-700 transition-all">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total In-Stock Units</span>
            <div className="text-2xl font-black font-mono text-white">
              {kpi.totalUnits.toLocaleString()} <span className="text-xs text-slate-400 font-sans">Units</span>
            </div>
            <span className="text-[10px] text-slate-500 block">Across {kpi.totalItems} distinct catalog items</span>
          </div>
          <div className="p-3 rounded-2xl bg-sky-500/10 text-sky-400 border border-sky-500/20 group-hover:scale-110 transition-transform">
            <Package className="h-5 w-5" />
          </div>
        </div>

        {/* Total Stock Valuation (Retail) */}
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-4 shadow-lg flex items-center justify-between group hover:border-slate-700 transition-all">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Stock Value</span>
            <div className="text-xl sm:text-2xl font-black font-mono text-emerald-400 truncate">
              {formatNPR(kpi.totalRetailValue)}
            </div>
            <span className="text-[10px] text-slate-500 block">At retail selling rate</span>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover:scale-110 transition-transform">
            <DollarSign className="h-5 w-5" />
          </div>
        </div>

        {/* Total Cost Investment */}
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-4 shadow-lg flex items-center justify-between group hover:border-slate-700 transition-all">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Cost Investment</span>
            <div className="text-xl sm:text-2xl font-black font-mono text-indigo-300 truncate">
              {formatNPR(kpi.totalCostValue)}
            </div>
            <div className="flex items-center space-x-1 text-[10px] text-slate-400 font-mono">
              <span>Margin: </span>
              <span className="text-emerald-400 font-bold">+{kpi.profitMargin.toFixed(1)}%</span>
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 group-hover:scale-110 transition-transform">
            <TrendingUp className="h-5 w-5" />
          </div>
        </div>

        {/* Low Stock & Reorder Alerts */}
        <div 
          onClick={() => setActiveSubTab('low_stock')}
          className="bg-slate-900/90 border border-slate-800/80 hover:border-amber-500/50 rounded-2xl p-4 shadow-lg flex items-center justify-between cursor-pointer group transition-all"
        >
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5 animate-pulse" />
              <span>Stock Warnings</span>
            </span>
            <div className="flex items-center space-x-2">
              <span className="text-2xl font-black font-mono text-amber-400">{kpi.lowStockCount}</span>
              <span className="text-xs text-slate-400">Low</span>
              <span className="text-slate-600">•</span>
              <span className="text-2xl font-black font-mono text-rose-400">{kpi.outOfStockCount}</span>
              <span className="text-xs text-slate-400">Out</span>
            </div>
            <span className="text-[10px] text-sky-400 group-hover:underline block">Click to view reorder list →</span>
          </div>
          <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 group-hover:scale-110 transition-transform">
            <AlertTriangle className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Main Subtabs Navigation */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 print:hidden">
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setActiveSubTab('inventory')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
              activeSubTab === 'inventory'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Boxes className="h-4 w-4" />
            <span>Stock Inventory ({catalog.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('low_stock')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
              activeSubTab === 'low_stock'
                ? 'bg-amber-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <AlertTriangle className="h-4 w-4" />
            <span>Low Stock Reorder ({kpi.lowStockCount + kpi.outOfStockCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('logs')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
              activeSubTab === 'logs'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            <span>Sales & Stock Movement Logs ({stockLogs.length})</span>
          </button>
        </div>
      </div>

      {/* SUBTAB 1 & 2: INVENTORY & LOW STOCK TABLE VIEW */}
      {(activeSubTab === 'inventory' || activeSubTab === 'low_stock') && (
        <div className="space-y-4">
          
          {/* Search, Status & Category Filters */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col md:flex-row items-center justify-between gap-3 print:hidden">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by product name, SKU, rack..."
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 transition-all font-sans"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-slate-500 hover:text-white text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Status Pills */}
            <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800 w-full md:w-auto overflow-x-auto scrollbar-none">
              <button
                type="button"
                onClick={() => setSelectedStatus('all')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  selectedStatus === 'all'
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All Status
              </button>
              <button
                type="button"
                onClick={() => setSelectedStatus('in_stock')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  selectedStatus === 'in_stock'
                    ? 'bg-emerald-600 text-white'
                    : 'text-emerald-400/80 hover:text-emerald-300'
                }`}
              >
                In Stock
              </button>
              <button
                type="button"
                onClick={() => setSelectedStatus('low_stock')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  selectedStatus === 'low_stock'
                    ? 'bg-amber-600 text-white'
                    : 'text-amber-400/80 hover:text-amber-300'
                }`}
              >
                Low Stock
              </button>
              <button
                type="button"
                onClick={() => setSelectedStatus('out_of_stock')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  selectedStatus === 'out_of_stock'
                    ? 'bg-rose-600 text-white'
                    : 'text-rose-400/80 hover:text-rose-300'
                }`}
              >
                Out of Stock
              </button>
            </div>
          </div>

          {/* Category Chips Bar */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none print:hidden">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize whitespace-nowrap transition-all border ${
                  selectedCategory === cat
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-emerald-500 shadow-md shadow-emerald-500/20'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Printable Header (Visible only when printing audit sheet) */}
          <div className="hidden print:block mb-4 p-4 border-b border-black">
            <h1 className="text-xl font-bold uppercase">{companyDetails.studioName || 'PNP TECH TRADERS'}</h1>
            <p className="text-xs">PHYSICAL STOCK AUDIT & INVENTORY TALLY REPORT</p>
            <div className="text-[10px] mt-1 flex justify-between">
              <span>Date: {new Date().toLocaleDateString()}</span>
              <span>Total Products: {filteredItems.length}</span>
            </div>
          </div>

          {/* EMPTY INVENTORY ONBOARDING & OPTIONS CARD */}
          {catalog.length === 0 && (
            <div className="bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-8 text-center shadow-2xl space-y-6 print:hidden">
              <div className="inline-flex p-4 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shadow-inner">
                <Boxes className="h-10 w-10 animate-pulse" />
              </div>
              
              <div className="max-w-xl mx-auto space-y-1.5">
                <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Your Stock Inventory is Clean & Ready
                </h3>
                <p className="text-xs sm:text-sm text-slate-400">
                  All demo records have been cleared. Select how you would like to add items into your stock database:
                </p>
              </div>

              {/* 4 Interactive Option Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto text-left pt-2">
                {/* Option 1: Excel / CSV File Import */}
                <button
                  type="button"
                  onClick={() => {
                    setAddModalTab('excel');
                    setShowAddModal(true);
                  }}
                  className="group p-5 rounded-2xl bg-slate-950/80 hover:bg-slate-800/80 border border-slate-800 hover:border-emerald-500/50 transition-all flex flex-col justify-between space-y-4 shadow-lg hover:shadow-emerald-500/10 text-left"
                >
                  <div className="space-y-3">
                    <div className="p-3 w-fit rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover:scale-110 transition-transform">
                      <UploadCloud className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-white group-hover:text-emerald-300 transition-colors">
                        Excel / CSV Import
                      </h4>
                      <p className="text-xs text-slate-400 mt-1">
                        Upload your existing spreadsheet file (.xlsx/.csv). Includes downloadable standard sample template.
                      </p>
                    </div>
                  </div>
                  <div className="text-xs font-bold text-emerald-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    <span>Upload File</span>
                    <span>→</span>
                  </div>
                </button>

                {/* Option 2: Multi-Row Fast Grid */}
                <button
                  type="button"
                  onClick={() => {
                    setAddModalTab('multi');
                    setShowAddModal(true);
                  }}
                  className="group p-5 rounded-2xl bg-slate-950/80 hover:bg-slate-800/80 border border-slate-800 hover:border-sky-500/50 transition-all flex flex-col justify-between space-y-4 shadow-lg hover:shadow-sky-500/10 text-left"
                >
                  <div className="space-y-3">
                    <div className="p-3 w-fit rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20 group-hover:scale-110 transition-transform">
                      <FileSpreadsheet className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-white group-hover:text-sky-300 transition-colors">
                        Multi-Row Fast Grid
                      </h4>
                      <p className="text-xs text-slate-400 mt-1">
                        Fast counter typing: enter 5 to 20 items in a quick spreadsheet grid without opening popups one by one.
                      </p>
                    </div>
                  </div>
                  <div className="text-xs font-bold text-sky-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    <span>Batch Quick Add</span>
                    <span>→</span>
                  </div>
                </button>

                {/* Option 3: Single Item Entry */}
                <button
                  type="button"
                  onClick={() => {
                    setAddModalTab('single');
                    setNewItem(prev => ({ ...prev, code: generateSku(prev.category) }));
                    setShowAddModal(true);
                  }}
                  className="group p-5 rounded-2xl bg-slate-950/80 hover:bg-slate-800/80 border border-slate-800 hover:border-teal-500/50 transition-all flex flex-col justify-between space-y-4 shadow-lg hover:shadow-teal-500/10 text-left"
                >
                  <div className="space-y-3">
                    <div className="p-3 w-fit rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20 group-hover:scale-110 transition-transform">
                      <Plus className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-white group-hover:text-teal-300 transition-colors">
                        Add Single Item
                      </h4>
                      <p className="text-xs text-slate-400 mt-1">
                        Detailed entry form with auto-generated SKU code, unit, cost, selling price, low alert & shelf location.
                      </p>
                    </div>
                  </div>
                  <div className="text-xs font-bold text-teal-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    <span>Open Form</span>
                    <span>→</span>
                  </div>
                </button>

                {/* Option 4: CCTV Equipment Starter Pack */}
                <button
                  type="button"
                  onClick={() => {
                    setAddModalTab('starter');
                    setShowAddModal(true);
                  }}
                  className="group p-5 rounded-2xl bg-slate-950/80 hover:bg-slate-800/80 border border-slate-800 hover:border-purple-500/50 transition-all flex flex-col justify-between space-y-4 shadow-lg hover:shadow-purple-500/10 text-left"
                >
                  <div className="space-y-3">
                    <div className="p-3 w-fit rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 group-hover:scale-110 transition-transform">
                      <Sparkles className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-white group-hover:text-purple-300 transition-colors">
                        CCTV Starter Pack
                      </h4>
                      <p className="text-xs text-slate-400 mt-1">
                        Need a template? Load 13 pre-configured CCTV cameras, NVRs, HDDs, cables & power supplies.
                      </p>
                    </div>
                  </div>
                  <div className="text-xs font-bold text-purple-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    <span>Preview Kit</span>
                    <span>→</span>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Stock Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden print:border-black print:bg-white print:text-black">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-extrabold uppercase tracking-wider text-slate-400 print:bg-slate-100 print:text-black print:border-black">
                    <th className="py-3 px-3 w-12 text-center">S.N.</th>
                    <th className="py-3 px-3 w-28">SKU Code</th>
                    <th className="py-3 px-4">Product Particulars</th>
                    <th className="py-3 px-3 w-32">Category</th>
                    <th className="py-3 px-3 w-28 text-right">Cost Price</th>
                    <th className="py-3 px-3 w-28 text-right">Retail Rate</th>
                    <th className="py-3 px-4 w-36 text-center">Stock Count</th>
                    <th className="py-3 px-3 w-32 text-right">Stock Value</th>
                    <th className="py-3 px-3 w-36 text-center print:hidden">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800/80 text-xs font-sans print:divide-black">
                  {filteredItems.length > 0 ? (
                    filteredItems.map((item, idx) => {
                      const isTracked = item.trackStock !== false;
                      const stock = Number(item.stockQty) || 0;
                      const minAlert = item.minStockAlert ?? 3;
                      const isLow = isTracked && stock > 0 && stock <= minAlert;
                      const isOut = isTracked && stock <= 0;
                      const stockVal = (item.price || 0) * stock;

                      return (
                        <tr 
                          key={item.id} 
                          className="hover:bg-slate-800/40 transition-colors group print:hover:bg-transparent"
                        >
                          {/* S.N. */}
                          <td className="py-3 px-3 text-center font-mono text-slate-500 font-semibold print:text-black">
                            {idx + 1}
                          </td>

                          {/* SKU Code */}
                          <td className="py-3 px-3">
                            <span className="font-mono font-bold text-[11px] px-2 py-0.5 rounded bg-slate-950 text-slate-300 border border-slate-800 print:border-none print:text-black">
                              {item.code || `SKU-${idx+1}`}
                            </span>
                          </td>

                          {/* Product Description & Location */}
                          <td className="py-3 px-4">
                            <div className="font-bold text-white group-hover:text-emerald-400 transition-colors print:text-black">
                              {item.description}
                            </div>
                            <div className="flex items-center space-x-2 mt-0.5 text-[10px] text-slate-500 print:text-black">
                              {item.location && (
                                <span className="flex items-center space-x-1 text-slate-400">
                                  <MapPin className="h-2.5 w-2.5 text-sky-400" />
                                  <span>{item.location}</span>
                                </span>
                              )}
                              {item.notes && <span>• {item.notes}</span>}
                            </div>
                          </td>

                          {/* Category */}
                          <td className="py-3 px-3">
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700/60 print:border-none print:text-black">
                              {item.category}
                            </span>
                          </td>

                          {/* Cost Price */}
                          <td className="py-3 px-3 text-right font-mono text-slate-400 print:text-black">
                            {item.costPrice ? formatNPR(item.costPrice) : '-'}
                          </td>

                          {/* Retail Price */}
                          <td className="py-3 px-3 text-right font-mono font-bold text-slate-200 print:text-black">
                            {formatNPR(item.price)}
                          </td>

                          {/* Stock Count with Status Badge */}
                          <td className="py-3 px-4 text-center">
                            {isTracked ? (
                              <div className="flex flex-col items-center">
                                <span className={`text-xs font-black font-mono px-2.5 py-0.5 rounded-full border inline-flex items-center space-x-1 ${
                                  isOut 
                                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/30 font-extrabold animate-pulse' 
                                    : isLow 
                                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 font-extrabold' 
                                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                } print:text-black print:border-black`}>
                                  <span>{stock}</span>
                                  <span className="text-[10px] font-sans font-medium text-slate-400">{item.unit || 'Pcs'}</span>
                                </span>

                                <span className="text-[9px] mt-0.5 font-bold uppercase tracking-wider block">
                                  {isOut ? (
                                    <span className="text-rose-400">Out of Stock</span>
                                  ) : isLow ? (
                                    <span className="text-amber-400">Low Stock (Min {minAlert})</span>
                                  ) : (
                                    <span className="text-emerald-500/80">Available</span>
                                  )}
                                </span>
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-500 italic">Service / Untracked</span>
                            )}
                          </td>

                          {/* Stock Valuation */}
                          <td className="py-3 px-3 text-right font-mono font-bold text-emerald-400 print:text-black">
                            {formatNPR(stockVal)}
                          </td>

                          {/* Action Buttons */}
                          <td className="py-3 px-3 text-center print:hidden">
                            <div className="flex items-center justify-center space-x-1.5">
                              {/* Quick Sell / Add to Bill */}
                              <button
                                type="button"
                                onClick={() => handleSellItem(item)}
                                className="px-2 py-1 rounded-lg bg-sky-500/10 hover:bg-sky-600 text-sky-400 hover:text-white font-bold text-[10px] border border-sky-500/30 transition-all flex items-center space-x-1"
                                title="Add directly to current Bill"
                              >
                                <ShoppingCart className="h-3 w-3" />
                                <span>Sell</span>
                              </button>

                              {/* Restock Button */}
                              {isTracked && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRestockTarget(item);
                                    setRestockQty(5);
                                    setRestockNote('');
                                  }}
                                  className="px-2 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-600 text-emerald-400 hover:text-white font-bold text-[10px] border border-emerald-500/30 transition-all flex items-center space-x-1"
                                  title="Add new stock shipment"
                                >
                                  <Plus className="h-3 w-3" />
                                  <span>Restock</span>
                                </button>
                              )}

                              {/* Edit Item */}
                              <button
                                type="button"
                                onClick={() => setEditingItem(item)}
                                className="p-1 rounded-lg text-slate-400 hover:text-sky-300 hover:bg-slate-800 transition-colors"
                                title="Edit item particulars"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>

                              {/* Delete Item */}
                              <button
                                type="button"
                                onClick={() => {
                                  if (window.confirm(`Delete ${item.description} from database?`)) {
                                    deleteCatalogItem(item.id);
                                  }
                                }}
                                className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                                title="Delete item"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-500 text-xs">
                        No stock items found matching your filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 3: STOCK AUDIT LOGS (SALES & RESTOCKS) */}
      {activeSubTab === 'logs' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Stock Deductions & Movement History</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
                  {stockLogs.length} Records
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Every time a bill sells an item, the quantity is automatically deducted and recorded here
              </p>
            </div>

            {stockLogs.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Clear all stock audit log records? Current stock counts will remain unchanged.')) {
                    clearStockLogs();
                  }
                }}
                className="text-xs text-rose-400 hover:text-rose-300 font-bold px-3 py-1.5 rounded-xl border border-rose-500/30 hover:bg-rose-500/10 transition-all self-start sm:self-auto"
              >
                Clear Audit History
              </button>
            )}
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                    <th className="py-3 px-3 w-12 text-center">S.N.</th>
                    <th className="py-3 px-3 w-36">Date & Time</th>
                    <th className="py-3 px-3 w-32">Movement Type</th>
                    <th className="py-3 px-4">Item Particulars</th>
                    <th className="py-3 px-3 w-28 text-center">Change Qty</th>
                    <th className="py-3 px-3 w-32 text-center">Balance</th>
                    <th className="py-3 px-4">Reference Bill / Customer</th>
                    <th className="py-3 px-2 w-12 text-center">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800/80 text-xs font-sans">
                  {stockLogs.length > 0 ? (
                    stockLogs.map((log, idx) => {
                      const isSale = log.type === 'sale';
                      const isRestock = log.type === 'restock' || log.type === 'initial';
                      const isReturn = log.type === 'return';

                      return (
                        <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                          {/* S.N. */}
                          <td className="py-3 px-3 text-center font-mono text-slate-500">
                            {idx + 1}
                          </td>

                          {/* Timestamp */}
                          <td className="py-3 px-3 font-mono text-[11px] text-slate-400">
                            {new Date(log.timestamp).toLocaleString()}
                          </td>

                          {/* Movement Type */}
                          <td className="py-3 px-3">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 border ${
                              isSale 
                                ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' 
                                : isRestock 
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                                : isReturn 
                                ? 'bg-purple-500/10 text-purple-400 border-purple-500/30' 
                                : 'bg-sky-500/10 text-sky-400 border-sky-500/30'
                            }`}>
                              {isSale && <ArrowDownRight className="h-3 w-3" />}
                              {isRestock && <ArrowUpRight className="h-3 w-3" />}
                              <span>
                                {isSale ? 'Sale (Bill Minus)' : isRestock ? 'Stock In (+)' : isReturn ? 'Return (+)' : 'Adjustment'}
                              </span>
                            </span>
                          </td>

                          {/* Item Name */}
                          <td className="py-3 px-4">
                            <div className="font-bold text-white">{log.itemDescription}</div>
                            {log.itemCode && (
                              <span className="text-[10px] font-mono text-slate-500">{log.itemCode}</span>
                            )}
                          </td>

                          {/* Change Quantity */}
                          <td className="py-3 px-3 text-center">
                            <span className={`font-mono font-black text-xs ${
                              log.changeQty < 0 ? 'text-rose-400' : 'text-emerald-400'
                            }`}>
                              {log.changeQty > 0 ? `+${log.changeQty}` : log.changeQty}
                            </span>
                          </td>

                          {/* Balance (Prev -> New) */}
                          <td className="py-3 px-3 text-center font-mono text-xs">
                            <span className="text-slate-400">{log.previousQty}</span>
                            <span className="text-slate-600 mx-1.5">→</span>
                            <span className="text-white font-bold">{log.newQty}</span>
                          </td>

                          {/* Reference Bill / Notes */}
                          <td className="py-3 px-4 text-xs">
                            {log.invoiceNumber ? (
                              <div>
                                <span className="font-bold text-sky-400 font-mono">#{log.invoiceNumber}</span>
                                {log.customerName && (
                                  <span className="text-slate-300 ml-1.5">({log.customerName})</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400">{log.notes || 'Direct Restock'}</span>
                            )}
                          </td>

                          {/* Action */}
                          <td className="py-3 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => deleteStockLog(log.id)}
                              className="text-slate-500 hover:text-rose-400 p-1 transition-colors"
                              title="Delete log record"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-500 text-xs">
                        No stock movement logs recorded yet. When a bill is printed, sales deductions will appear here automatically.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: ADD / IMPORT INVENTORY HUB */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full p-5 sm:p-6 space-y-4 shadow-2xl overflow-y-auto max-h-[92vh]">
            
            {/* Modal Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-3 gap-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2.5 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20">
                  <Boxes className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white tracking-tight">Add Inventory to Stock Database</h3>
                  <p className="text-xs text-slate-400">Add single item, import from Excel/CSV, use multi-row grid or load starter kit</p>
                </div>
              </div>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-xl hover:bg-slate-800 transition-colors self-end sm:self-auto"
              >
                ✕
              </button>
            </div>

            {/* 4 Tabs Selector */}
            <div className="flex items-center space-x-1.5 p-1 bg-slate-950 rounded-2xl border border-slate-800 overflow-x-auto scrollbar-none">
              <button
                type="button"
                onClick={() => setAddModalTab('single')}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  addModalTab === 'single'
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Single Item Form</span>
              </button>

              <button
                type="button"
                onClick={() => setAddModalTab('excel')}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  addModalTab === 'excel'
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <UploadCloud className="h-3.5 w-3.5" />
                <span>Excel / CSV File Import</span>
              </button>

              <button
                type="button"
                onClick={() => setAddModalTab('multi')}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  addModalTab === 'multi'
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                <span>Multi-Row Quick Grid</span>
              </button>

              <button
                type="button"
                onClick={() => setAddModalTab('starter')}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  addModalTab === 'starter'
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>CCTV Starter Kit</span>
              </button>
            </div>

            {/* TAB 1: SINGLE ITEM FORM */}
            {addModalTab === 'single' && (
              <form onSubmit={handleAddSubmit} className="space-y-3.5 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Product / Item Particulars *
                  </label>
                  <input
                    type="text"
                    required
                    value={newItem.description}
                    onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                    placeholder="e.g. 2MP HD Dome Camera, 4MP IP Bullet, Cat6 Cable Roll..."
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 font-sans"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-300">SKU / Item Code</label>
                      <button
                        type="button"
                        onClick={() => setNewItem({ ...newItem, code: generateSku(newItem.category) })}
                        className="text-[10px] text-emerald-400 hover:underline font-mono"
                      >
                        Auto-generate
                      </button>
                    </div>
                    <input
                      type="text"
                      value={newItem.code}
                      onChange={(e) => setNewItem({ ...newItem, code: e.target.value })}
                      placeholder="e.g. CAM-HIK-2MP"
                      className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Category</label>
                    <select
                      value={newItem.category}
                      onChange={(e) => {
                        const newCat = e.target.value as any;
                        setNewItem({ ...newItem, category: newCat, code: generateSku(newCat) });
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-medium"
                    >
                      {categories.filter(c => c !== 'all').map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Initial Stock Qty *</label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={newItem.stockQty}
                      onChange={(e) => setNewItem({ ...newItem, stockQty: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-white font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Unit</label>
                    <select
                      value={newItem.unit}
                      onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                    >
                      <option value="Pcs">Pcs</option>
                      <option value="Sets">Sets</option>
                      <option value="Box">Box</option>
                      <option value="Roll">Roll</option>
                      <option value="Mtr">Mtr</option>
                      <option value="Pkt">Pkt</option>
                      <option value="Copies">Copies</option>
                      <option value="Sq Ft">Sq Ft</option>
                      <option value="Job">Job</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Low Alert Limit</label>
                    <input
                      type="number"
                      min="1"
                      value={newItem.minStockAlert}
                      onChange={(e) => setNewItem({ ...newItem, minStockAlert: parseInt(e.target.value) || 3 })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Cost / Purchase Rate (Rs.)</label>
                    <input
                      type="number"
                      min="0"
                      value={newItem.costPrice}
                      onChange={(e) => setNewItem({ ...newItem, costPrice: parseFloat(e.target.value) || 0 })}
                      placeholder="0"
                      className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Selling / Retail Rate (Rs.) *</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={newItem.price}
                      onChange={(e) => setNewItem({ ...newItem, price: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-emerald-400 font-mono font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Shelf / Rack Location</label>
                    <input
                      type="text"
                      value={newItem.location}
                      onChange={(e) => setNewItem({ ...newItem, location: e.target.value })}
                      placeholder="e.g. Rack A-1, Counter Shelf"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-sans"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Barcode / Serial Tag</label>
                    <input
                      type="text"
                      value={newItem.barcode}
                      onChange={(e) => setNewItem({ ...newItem, barcode: e.target.value })}
                      placeholder="e.g. 8901234567890"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Warranty & Notes</label>
                  <input
                    type="text"
                    value={newItem.notes}
                    onChange={(e) => setNewItem({ ...newItem, notes: e.target.value })}
                    placeholder="e.g. 2 Years Replacement Warranty, Hikvision Official"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-sans"
                  />
                </div>

                <div className="pt-3 flex justify-end space-x-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-extrabold shadow-md shadow-emerald-500/20"
                  >
                    Save Stock Item
                  </button>
                </div>
              </form>
            )}

            {/* TAB 2: EXCEL / CSV BULK IMPORT */}
            {addModalTab === 'excel' && (
              <div className="space-y-4 pt-1">
                {/* Upload & Template Header Card */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
                      <span>Upload Spreadsheet (.xlsx, .xls, .csv)</span>
                    </h4>
                    <p className="text-xs text-slate-400">
                      Auto-detects Item Particulars, Category, Stock Qty, Cost & Selling Rate
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/30 text-xs font-bold transition-all whitespace-nowrap self-start sm:self-auto"
                  >
                    <Download className="h-4 w-4" />
                    <span>Download Excel Template</span>
                  </button>
                </div>

                {/* File Dropzone */}
                <div className="border-2 border-dashed border-slate-800 hover:border-emerald-500/50 rounded-2xl p-6 text-center space-y-3 transition-colors bg-slate-950/50">
                  <div className="inline-flex p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <UploadCloud className="h-6 w-6" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-white">
                      {importFileName ? `Selected: ${importFileName}` : 'Choose your Excel or CSV file to import'}
                    </p>
                    <p className="text-xs text-slate-400">
                      Standard columns: Item Name, Category, Stock Qty, Unit, Cost Price, Selling Rate, Shelf Location
                    </p>
                  </div>
                  <div>
                    <label className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold cursor-pointer transition-all border border-slate-700">
                      <UploadCloud className="h-4 w-4 text-emerald-400" />
                      <span>Browse File</span>
                      <input
                        type="file"
                        accept=".xlsx, .xls, .csv"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* Error Banner */}
                {importError && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center space-x-2">
                    <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                    <span>{importError}</span>
                  </div>
                )}

                {/* Preview Table */}
                {importPreviewItems.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Ready to import {importPreviewItems.length} items</span>
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Previewing recognized items:
                      </span>
                    </div>

                    <div className="max-h-56 overflow-y-auto border border-slate-800 rounded-xl bg-slate-950">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] font-bold sticky top-0">
                          <tr>
                            <th className="py-2 px-3">Item Particulars</th>
                            <th className="py-2 px-3">Category</th>
                            <th className="py-2 px-2 text-center">Stock</th>
                            <th className="py-2 px-3 text-right">Cost (Rs.)</th>
                            <th className="py-2 px-3 text-right">Selling (Rs.)</th>
                            <th className="py-2 px-3">Rack</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/80">
                          {importPreviewItems.map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-900/50">
                              <td className="py-2 px-3 font-semibold text-white truncate max-w-[200px]">
                                {item.description}
                              </td>
                              <td className="py-2 px-3 text-slate-400">{item.category}</td>
                              <td className="py-2 px-2 text-center font-mono font-bold text-white">
                                {item.stockQty} {item.unit}
                              </td>
                              <td className="py-2 px-3 text-right font-mono text-slate-400">
                                {item.costPrice || 0}
                              </td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-emerald-400">
                                {item.price}
                              </td>
                              <td className="py-2 px-3 text-slate-400">{item.location || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={() => {
                          setImportPreviewItems([]);
                          setImportFileName('');
                        }}
                        className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700"
                      >
                        Clear File
                      </button>
                      <button
                        type="button"
                        disabled={isImporting}
                        onClick={handleImportConfirm}
                        className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-black shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                      >
                        {isImporting ? 'Importing...' : `Confirm & Import ${importPreviewItems.length} Items`}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: MULTI-ROW QUICK GRID */}
            {addModalTab === 'multi' && (
              <div className="space-y-4 pt-1">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-400">
                    Type multiple items at once. Perfect for quick billing counter entry from box shipments:
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setBatchRows(prev => [
                        ...prev,
                        { tempId: 'br-' + Date.now() + '-1', code: '', description: '', category: 'CCTV & Security', unit: 'Pcs', stockQty: '10', costPrice: '', price: '', location: '' },
                        { tempId: 'br-' + Date.now() + '-2', code: '', description: '', category: 'Accessories', unit: 'Pcs', stockQty: '10', costPrice: '', price: '', location: '' },
                        { tempId: 'br-' + Date.now() + '-3', code: '', description: '', category: 'General Products', unit: 'Pcs', stockQty: '5', costPrice: '', price: '', location: '' }
                      ]);
                    }}
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>+ Add 3 More Rows</span>
                  </button>
                </div>

                <div className="max-h-80 overflow-y-auto border border-slate-800 rounded-2xl bg-slate-950">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] font-bold sticky top-0">
                      <tr>
                        <th className="py-2.5 px-2 w-10 text-center">#</th>
                        <th className="py-2.5 px-2 min-w-[200px]">Product / Particulars *</th>
                        <th className="py-2.5 px-2 w-36">Category</th>
                        <th className="py-2.5 px-2 w-20 text-center">Qty</th>
                        <th className="py-2.5 px-2 w-20">Unit</th>
                        <th className="py-2.5 px-2 w-24 text-right">Cost (Rs.)</th>
                        <th className="py-2.5 px-2 w-24 text-right">Retail (Rs.) *</th>
                        <th className="py-2.5 px-2 w-28">Rack / Shelf</th>
                        <th className="py-2.5 px-2 w-10 text-center">✕</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {batchRows.map((row, idx) => (
                        <tr key={row.tempId} className="hover:bg-slate-900/40">
                          <td className="py-2 px-2 text-center text-slate-500 font-mono text-[11px]">
                            {idx + 1}
                          </td>

                          {/* Particulars */}
                          <td className="py-2 px-2">
                            <input
                              type="text"
                              value={row.description}
                              onChange={(e) => {
                                const val = e.target.value;
                                setBatchRows(prev => prev.map(r => r.tempId === row.tempId ? { ...r, description: val } : r));
                              }}
                              placeholder="e.g. 4MP ColorVu Bullet..."
                              className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-lg px-2 py-1 text-xs text-white"
                            />
                          </td>

                          {/* Category */}
                          <td className="py-2 px-2">
                            <select
                              value={row.category}
                              onChange={(e) => {
                                const val = e.target.value as any;
                                setBatchRows(prev => prev.map(r => r.tempId === row.tempId ? { ...r, category: val } : r));
                              }}
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white"
                            >
                              {categories.filter(c => c !== 'all').map(c => (
                                <option key={c} value={c}>{c}</option>
                              ))}
                            </select>
                          </td>

                          {/* Stock Qty */}
                          <td className="py-2 px-2">
                            <input
                              type="number"
                              min="0"
                              value={row.stockQty}
                              onChange={(e) => {
                                const val = e.target.value;
                                setBatchRows(prev => prev.map(r => r.tempId === row.tempId ? { ...r, stockQty: val } : r));
                              }}
                              className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-lg px-1.5 py-1 text-xs text-white text-center font-mono font-bold"
                            />
                          </td>

                          {/* Unit */}
                          <td className="py-2 px-2">
                            <select
                              value={row.unit}
                              onChange={(e) => {
                                const val = e.target.value;
                                setBatchRows(prev => prev.map(r => r.tempId === row.tempId ? { ...r, unit: val } : r));
                              }}
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-1.5 py-1 text-xs text-white"
                            >
                              <option value="Pcs">Pcs</option>
                              <option value="Sets">Sets</option>
                              <option value="Box">Box</option>
                              <option value="Roll">Roll</option>
                              <option value="Mtr">Mtr</option>
                            </select>
                          </td>

                          {/* Cost Price */}
                          <td className="py-2 px-2">
                            <input
                              type="number"
                              min="0"
                              value={row.costPrice}
                              onChange={(e) => {
                                const val = e.target.value;
                                setBatchRows(prev => prev.map(r => r.tempId === row.tempId ? { ...r, costPrice: val } : r));
                              }}
                              placeholder="0"
                              className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-lg px-2 py-1 text-xs text-white text-right font-mono"
                            />
                          </td>

                          {/* Selling Price */}
                          <td className="py-2 px-2">
                            <input
                              type="number"
                              min="0"
                              value={row.price}
                              onChange={(e) => {
                                const val = e.target.value;
                                setBatchRows(prev => prev.map(r => r.tempId === row.tempId ? { ...r, price: val } : r));
                              }}
                              placeholder="0"
                              className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-lg px-2 py-1 text-xs text-emerald-400 font-mono font-bold text-right"
                            />
                          </td>

                          {/* Rack / Location */}
                          <td className="py-2 px-2">
                            <input
                              type="text"
                              value={row.location}
                              onChange={(e) => {
                                const val = e.target.value;
                                setBatchRows(prev => prev.map(r => r.tempId === row.tempId ? { ...r, location: val } : r));
                              }}
                              placeholder="Rack A-1"
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white"
                            />
                          </td>

                          {/* Delete Row */}
                          <td className="py-2 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                if (batchRows.length <= 1) return;
                                setBatchRows(prev => prev.filter(r => r.tempId !== row.tempId));
                              }}
                              className="text-slate-500 hover:text-rose-400 p-1"
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setBatchRows(createInitialBatchRows())}
                    className="text-xs text-slate-400 hover:text-slate-300 font-semibold"
                  >
                    Reset Grid
                  </button>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setShowAddModal(false)}
                      className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveBatchRows}
                      className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-black shadow-lg shadow-emerald-500/20"
                    >
                      Save All Rows to Inventory
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: CCTV STARTER KIT */}
            {addModalTab === 'starter' && (
              <div className="space-y-4 pt-1">
                <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 space-y-2">
                  <div className="flex items-center space-x-2 text-purple-400">
                    <Sparkles className="h-5 w-5" />
                    <h4 className="font-extrabold text-sm text-white">Standard CCTV Equipment Starter Pack</h4>
                  </div>
                  <p className="text-xs text-purple-200">
                    Need standard items to get going? This loads 13 essential CCTV products (Hikvision 2MP cameras, Dahua 4MP IP bullets, 8-Channel NVRs, Surveillance HDDs, Pure Copper Cat6 & Coaxial Cables, SMPS Power Boxes, and BNC connectors).
                  </p>
                </div>

                {/* Kit Items Preview */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-64 overflow-y-auto p-1">
                  {[
                    { name: '2MP HD Night Vision Dome Camera (Hikvision)', rate: 'Rs. 2,800', qty: '24 Pcs', loc: 'Rack A-1' },
                    { name: '4MP IP Outdoor Bullet Camera (ColorVu / Full Color)', rate: 'Rs. 4,800', qty: '12 Pcs', loc: 'Rack A-2' },
                    { name: '8-Channel HD DVR / NVR 4K Recorders', rate: 'Rs. 7,500', qty: '6 Pcs', loc: 'Rack B-1' },
                    { name: '1TB Surveillance Hard Disk (Seagate SkyHawk)', rate: 'Rs. 6,200', qty: '10 Pcs', loc: 'Locker C-1' },
                    { name: '2TB Surveillance Hard Disk (WD Purple)', rate: 'Rs. 9,200', qty: '8 Pcs', loc: 'Locker C-1' },
                    { name: 'CCTV Cable 3+1 Pure Copper Coaxial Wire', rate: 'Rs. 45 / Mtr', qty: '450 Mtr', loc: 'Ground Store' },
                    { name: 'Cat6 Pure Copper High-Speed UTP Cable', rate: 'Rs. 40 / Mtr', qty: '600 Mtr', loc: 'Ground Store' },
                    { name: '12V 10A Heavy Duty SMPS Power Supply Box', rate: 'Rs. 2,400', qty: '15 Pcs', loc: 'Rack B-2' },
                    { name: 'BNC & DC Power Connectors (Set of 8 Pairs)', rate: 'Rs. 600', qty: '40 Sets', loc: 'Drawer 1' },
                    { name: '4-Port / 8-Port 100Mbps PoE Network Switch', rate: 'Rs. 3,800', qty: '8 Pcs', loc: 'Rack B-1' }
                  ].map((itm, i) => (
                    <div key={i} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-white truncate max-w-[210px]">{itm.name}</div>
                        <div className="text-[10px] text-slate-400">{itm.loc}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-bold text-emerald-400">{itm.rate}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{itm.qty}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleLoadStarterPack}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-black shadow-lg shadow-purple-500/20"
                  >
                    Load CCTV Starter Kit (13 Items)
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* CLEAR DEMO DATA CONFIRMATION MODAL */}
      {showClearDemoModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center space-x-3 text-rose-400">
              <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20">
                <Trash2 className="h-6 w-6 text-rose-400" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-white">Clear Demo / Dummy Data?</h3>
                <p className="text-xs text-slate-400">Wipe sample records to start with an empty store</p>
              </div>
            </div>

            <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-xs text-rose-300 space-y-2">
              <p className="font-bold text-rose-200">This will delete:</p>
              <ul className="list-disc pl-5 space-y-1 text-slate-300">
                <li>All dummy inventory items ({catalog.length} items currently in stock)</li>
                <li>All stock deduction audit logs ({stockLogs.length} logs currently)</li>
                <li>Sample spreadsheet store & staff rows</li>
              </ul>
              <p className="text-[11px] text-slate-400 pt-1 border-t border-rose-500/20">
                Note: Your saved bills and customer invoices will NOT be deleted.
              </p>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={handleClearStockOnly}
                className="text-xs text-amber-400 hover:text-amber-300 underline font-semibold"
                title="Clear only stock items without touching spreadsheet data"
              >
                Clear Stock Only ({catalog.length})
              </button>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setShowClearDemoModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleClearDemoData}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black shadow-lg shadow-rose-600/30 transition-all"
                >
                  Yes, Wipe All Demo Data
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT STOCK ITEM */}
      {editingItem && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-5 space-y-4 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Edit2 className="h-5 w-5 text-sky-400" />
                <h3 className="font-bold text-sm text-white">Edit Stock Item Particulars</h3>
              </div>
              <button 
                onClick={() => setEditingItem(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Product / Item Particulars *
                </label>
                <input
                  type="text"
                  required
                  value={editingItem.description}
                  onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">SKU / Item Code</label>
                  <input
                    type="text"
                    value={editingItem.code || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, code: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Category</label>
                  <select
                    value={editingItem.category}
                    onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-medium"
                  >
                    {categories.filter(c => c !== 'all').map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Current Stock Qty</label>
                  <input
                    type="number"
                    min="0"
                    value={editingItem.stockQty ?? 0}
                    onChange={(e) => setEditingItem({ ...editingItem, stockQty: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-xl px-3 py-2 text-xs text-white font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Unit</label>
                  <input
                    type="text"
                    value={editingItem.unit}
                    onChange={(e) => setEditingItem({ ...editingItem, unit: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Low Alert Limit</label>
                  <input
                    type="number"
                    min="1"
                    value={editingItem.minStockAlert ?? 3}
                    onChange={(e) => setEditingItem({ ...editingItem, minStockAlert: parseInt(e.target.value) || 3 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Cost / Purchase Rate (Rs.)</label>
                  <input
                    type="number"
                    min="0"
                    value={editingItem.costPrice || 0}
                    onChange={(e) => setEditingItem({ ...editingItem, costPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Selling / Retail Rate (Rs.) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={editingItem.price}
                    onChange={(e) => setEditingItem({ ...editingItem, price: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-xl px-3 py-2 text-xs text-sky-400 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Shelf / Rack Location</label>
                  <input
                    type="text"
                    value={editingItem.location || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, location: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Warranty & Notes</label>
                  <input
                    type="text"
                    value={editingItem.notes || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, notes: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end space-x-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-extrabold shadow-md shadow-sky-500/20"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: QUICK RESTOCK POPUP */}
      {restockTarget && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Plus className="h-5 w-5 text-emerald-400" />
                <h3 className="font-bold text-sm text-white">Add New Stock Shipment</h3>
              </div>
              <button 
                onClick={() => setRestockTarget(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-500">Restocking Item:</span>
              <div className="text-sm font-bold text-white">{restockTarget.description}</div>
              <div className="flex items-center justify-between pt-1 text-xs">
                <span className="text-slate-400">Current In-Stock:</span>
                <span className="font-mono font-bold text-white">{restockTarget.stockQty ?? 0} {restockTarget.unit}</span>
              </div>
            </div>

            <form onSubmit={handleRestockSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Quantity to Add ({restockTarget.unit || 'Pcs'}) *
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    min="1"
                    required
                    value={restockQty}
                    onChange={(e) => setRestockQty(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-sm text-white font-mono font-bold"
                  />
                  
                  {/* Quick Preset Buttons */}
                  {[+5, +10, +25, +50].map(add => (
                    <button
                      key={add}
                      type="button"
                      onClick={() => setRestockQty(prev => prev + add)}
                      className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono font-bold text-emerald-400 border border-slate-700 whitespace-nowrap"
                    >
                      +{add}
                    </button>
                  ))}
                </div>
              </div>

              {/* Balance Preview */}
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs">
                <span className="text-emerald-300 font-semibold">New Stock Balance:</span>
                <span className="font-mono font-black text-emerald-400 text-sm">
                  {(Number(restockTarget.stockQty) || 0) + (Number(restockQty) || 0)} {restockTarget.unit || 'Pcs'}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Supplier / Purchase Bill Note (Optional)
                </label>
                <input
                  type="text"
                  value={restockNote}
                  onChange={(e) => setRestockNote(e.target.value)}
                  placeholder="e.g. Kathmandu shipment bill #4021"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setRestockTarget(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-extrabold shadow-md shadow-emerald-500/20"
                >
                  Confirm Restock (+{restockQty})
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
