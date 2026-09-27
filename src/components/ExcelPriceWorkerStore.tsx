import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  FileSpreadsheet, Plus, Trash2, Download, Upload, Search, 
  Printer, Check, X, RefreshCw, Layers, Users, ShieldCheck, 
  Calculator, MoveUp, MoveDown, ArrowRight 
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useInvoiceStore } from '../store/useInvoiceStore';
import { ExcelColumn, ExcelRow } from '../types/invoice';
import { formatNPR } from '../utils/formatters';
import { triggerAppPrint } from '../utils/printHelper';

export const ExcelPriceWorkerStore: React.FC = () => {
  const { 
    spreadsheetData, 
    setActiveSheet, 
    addSheet, 
    deleteSheet, 
    renameSheet, 
    updateCellValue, 
    addRow, 
    deleteRow, 
    reorderRows, 
    addColumn, 
    deleteColumn, 
    importSheetFromExcelData,
    addItemToInvoiceFromStore,
    catalog
  } = useInvoiceStore();

  const { sheets, activeSheetId } = spreadsheetData;
  const activeSheet = useMemo(() => {
    return sheets.find(s => s.id === activeSheetId) || sheets[0] || null;
  }, [sheets, activeSheetId]);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortConfig, setSortConfig] = useState<{ colId: string; direction: 'asc' | 'desc' } | null>(null);

  // Active cell & editing state
  const [selectedCell, setSelectedCell] = useState<{ rowId: string; colId: string; rowIndex: number; colIndex: number } | null>(null);
  const [editingCell, setEditingCell] = useState<{ rowId: string; colId: string } | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [formulaBarValue, setFormulaBarValue] = useState<string>('');

  // Modals & UI controls
  const [showAddSheetModal, setShowAddSheetModal] = useState(false);
  const [newSheetName, setNewSheetName] = useState('');
  const [newSheetTemplate, setNewSheetTemplate] = useState<'blank' | 'price' | 'workers' | 'attendance'>('price');

  const [showAddColModal, setShowAddColModal] = useState(false);
  const [newColTitle, setNewColTitle] = useState('');
  const [newColType, setNewColType] = useState<ExcelColumn['type']>('text');

  const [renamingSheetId, setRenamingSheetId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const [importStatusMessage, setImportStatusMessage] = useState<string | null>(null);
  const [addedBillSuccessRowId, setAddedBillSuccessRowId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cellInputRef = useRef<HTMLInputElement>(null);

  // Focus inline editor on edit start
  useEffect(() => {
    if (editingCell && cellInputRef.current) {
      cellInputRef.current.focus();
      cellInputRef.current.select();
    }
  }, [editingCell]);

  // Safe formula evaluation for cell / column
  const evaluateFormula = (formulaStr: string, row: ExcelRow, allRows: ExcelRow[], colIndex: number): any => {
    if (!formulaStr || !formulaStr.startsWith('=')) return null;
    try {
      const cleanExpr = formulaStr.substring(1).trim().toUpperCase();

      // Range formula: =SUM(D1:D10) or =SUM(D) or =AVG(...)
      const sumMatch = cleanExpr.match(/^SUM\(([A-Z0-9:]+)\)$/i);
      if (sumMatch && activeSheet) {
        const target = sumMatch[1];
        const colLetter = target.replace(/[^A-Z]/gi, '');
        const targetColIndex = colLetter ? colLetter.charCodeAt(0) - 65 : colIndex;
        const targetCol = activeSheet.columns[targetColIndex];
        if (targetCol) {
          return allRows.reduce((sum, r) => sum + (Number(r[targetCol.id]) || 0), 0);
        }
      }

      const countMatch = cleanExpr.match(/^COUNT\(([A-Z0-9:]+)\)$/i);
      if (countMatch && activeSheet) {
        return allRows.length;
      }

      // Row variable formula replacement: e.g. "retailPrice*stockQty" or "col_a+col_b"
      let expr = formulaStr.substring(1);
      Object.keys(row).forEach((k) => {
        const val = typeof row[k] === 'number' ? row[k] : `(${Number(row[k]) || 0})`;
        const regex = new RegExp(`\\b${k}\\b`, 'g');
        expr = expr.replace(regex, String(val));
      });

      // Basic arithmetic evaluation
      const sanitized = expr.replace(/[^0-9+\-*/().\s]/g, '');
      if (sanitized) {
        // eslint-disable-next-line no-new-func
        const res = Function(`'use strict'; return (${sanitized})`)();
        if (typeof res === 'number' && !isNaN(res) && isFinite(res)) {
          return Math.round(res * 100) / 100;
        }
      }
      return 0;
    } catch {
      return null;
    }
  };

  // Get cell display content & calculated value
  const getCellDisplay = (row: ExcelRow, col: ExcelColumn, _rowIndex: number, colIndex: number, allRows: ExcelRow[]) => {
    let val = row[col.id];

    // Check if column has automated formula
    if (col.formula && (val === undefined || val === null || val === '')) {
      const calc = evaluateFormula('=' + col.formula, row, allRows, colIndex);
      if (calc !== null) val = calc;
    }

    // Check if cell itself is a formula string
    if (typeof val === 'string' && val.startsWith('=')) {
      const calc = evaluateFormula(val, row, allRows, colIndex);
      if (calc !== null) val = calc;
    }

    return val;
  };

  // Filter and sort rows for the active sheet
  const filteredAndSortedRows = useMemo(() => {
    if (!activeSheet) return [];
    let list = [...activeSheet.rows];

    // Filter by search
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(row => {
        return Object.values(row).some(v => 
          String(v || '').toLowerCase().includes(q)
        );
      });
    }

    // Filter by category if column exists
    if (categoryFilter !== 'all') {
      list = list.filter(row => row.category === categoryFilter);
    }

    // Sort by selected column
    if (sortConfig) {
      list.sort((a, b) => {
        const valA = a[sortConfig.colId];
        const valB = b[sortConfig.colId];

        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
        }
        const strA = String(valA || '').toLowerCase();
        const strB = String(valB || '').toLowerCase();
        return sortConfig.direction === 'asc' 
          ? strA.localeCompare(strB) 
          : strB.localeCompare(strA);
      });
    }

    return list;
  }, [activeSheet, searchTerm, categoryFilter, sortConfig]);

  // Categories list in active sheet
  const uniqueCategories = useMemo(() => {
    if (!activeSheet) return [];
    const hasCategoryCol = activeSheet.columns.some(c => c.id === 'category');
    if (!hasCategoryCol) return [];
    const set = new Set<string>();
    activeSheet.rows.forEach(r => {
      if (r.category) set.add(String(r.category));
    });
    return Array.from(set);
  }, [activeSheet]);

  // Summary Metrics depending on sheet type
  const sheetMetrics = useMemo(() => {
    if (!activeSheet) return null;
    const isPrice = activeSheet.icon === 'price' || activeSheet.name.toLowerCase().includes('price') || activeSheet.name.toLowerCase().includes('stock');
    const isWorkers = activeSheet.icon === 'workers' || activeSheet.name.toLowerCase().includes('worker') || activeSheet.name.toLowerCase().includes('staff');
    const isAttendance = activeSheet.icon === 'attendance' || activeSheet.name.toLowerCase().includes('attendance') || activeSheet.name.toLowerCase().includes('khata');

    const totalRows = activeSheet.rows.length;

    if (isPrice) {
      const totalQty = activeSheet.rows.reduce((s, r) => s + (Number(r.stockQty) || 0), 0);
      const totalCostVal = activeSheet.rows.reduce((s, r) => s + ((Number(r.costPrice) || 0) * (Number(r.stockQty) || 0)), 0);
      const totalRetailVal = activeSheet.rows.reduce((s, r) => s + ((Number(r.retailPrice) || 0) * (Number(r.stockQty) || 0)), 0);
      const totalPotentialProfit = Math.max(0, totalRetailVal - totalCostVal);
      const avgMargin = totalCostVal > 0 ? Math.round(((totalRetailVal - totalCostVal) / totalCostVal) * 1000) / 10 : 0;

      return {
        type: 'price',
        totalRows,
        totalQty,
        totalCostVal,
        totalRetailVal,
        totalPotentialProfit,
        avgMargin
      };
    }

    if (isWorkers) {
      const totalSalary = activeSheet.rows.reduce((s, r) => s + (Number(r.salary) || 0), 0);
      const totalAdvances = activeSheet.rows.reduce((s, r) => s + (Number(r.advanceTaken) || 0), 0);
      const activeStaffCount = activeSheet.rows.filter(r => String(r.status || '').toLowerCase() === 'active').length;

      return {
        type: 'workers',
        totalRows,
        activeStaffCount,
        totalSalary,
        totalAdvances
      };
    }

    if (isAttendance) {
      const totalWages = activeSheet.rows.reduce((s, r) => s + (Number(r.dailyWage) || 0), 0);
      const totalAdvDeductions = activeSheet.rows.reduce((s, r) => s + (Number(r.advanceDeduction) || 0), 0);
      const totalNetPayable = activeSheet.rows.reduce((s, r) => s + (Number(r.netPayable) || 0), 0);
      const paidCount = activeSheet.rows.filter(r => String(r.paymentStatus || '').toLowerCase() === 'paid').length;

      return {
        type: 'attendance',
        totalRows,
        totalWages,
        totalAdvDeductions,
        totalNetPayable,
        paidCount
      };
    }

    // Default custom metrics
    return {
      type: 'custom',
      totalRows,
      totalCols: activeSheet.columns.length
    };
  }, [activeSheet]);

  // Handle Cell Click & Selection
  const handleSelectCell = (rowId: string, colId: string, rowIndex: number, colIndex: number) => {
    setSelectedCell({ rowId, colId, rowIndex, colIndex });
    const row = activeSheet?.rows.find(r => r.id === rowId);
    const rawVal = row ? (row[colId] !== undefined ? String(row[colId]) : '') : '';
    setFormulaBarValue(rawVal);
  };

  // Start Inline Edit
  const handleStartEdit = (rowId: string, colId: string) => {
    const row = activeSheet?.rows.find(r => r.id === rowId);
    const rawVal = row ? (row[colId] !== undefined ? String(row[colId]) : '') : '';
    setEditingCell({ rowId, colId });
    setEditValue(rawVal);
    setFormulaBarValue(rawVal);
  };

  // Save Cell Value
  const handleSaveCell = (rowId: string, colId: string, val: string) => {
    if (!activeSheet) return;
    const col = activeSheet.columns.find(c => c.id === colId);
    let parsed: any = val;

    if (col && (col.type === 'number' || col.type === 'currency' || col.type === 'percent')) {
      if (val.trim().startsWith('=')) {
        parsed = val.trim(); // store formula
      } else {
        parsed = val.trim() === '' ? 0 : Number(val) || 0;
      }
    }

    updateCellValue(activeSheet.id, rowId, colId, parsed);
    setEditingCell(null);
  };

  // Handle Formula Bar Submit
  const handleFormulaSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedCell || !activeSheet) return;
    handleSaveCell(selectedCell.rowId, selectedCell.colId, formulaBarValue);
  };

  // Keyboard navigation inside grid
  const handleKeyDown = (e: React.KeyboardEvent, rowId: string, colId: string, rowIndex: number, colIndex: number) => {
    if (editingCell) {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSaveCell(rowId, colId, editValue);
        // Move to next row
        if (rowIndex + 1 < filteredAndSortedRows.length) {
          const nextRow = filteredAndSortedRows[rowIndex + 1];
          handleSelectCell(nextRow.id, colId, rowIndex + 1, colIndex);
        }
      } else if (e.key === 'Tab') {
        e.preventDefault();
        handleSaveCell(rowId, colId, editValue);
        // Move to next column
        if (colIndex + 1 < (activeSheet?.columns.length || 0)) {
          const nextCol = activeSheet!.columns[colIndex + 1];
          handleSelectCell(rowId, nextCol.id, rowIndex, colIndex + 1);
        }
      } else if (e.key === 'Escape') {
        setEditingCell(null);
      }
      return;
    }

    // Navigation when not editing
    if (e.key === 'Enter') {
      e.preventDefault();
      handleStartEdit(rowId, colId);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (rowIndex + 1 < filteredAndSortedRows.length) {
        const nextRow = filteredAndSortedRows[rowIndex + 1];
        handleSelectCell(nextRow.id, colId, rowIndex + 1, colIndex);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (rowIndex > 0) {
        const prevRow = filteredAndSortedRows[rowIndex - 1];
        handleSelectCell(prevRow.id, colId, rowIndex - 1, colIndex);
      }
    } else if (e.key === 'ArrowRight' || e.key === 'Tab') {
      e.preventDefault();
      if (colIndex + 1 < (activeSheet?.columns.length || 0)) {
        const nextCol = activeSheet!.columns[colIndex + 1];
        handleSelectCell(rowId, nextCol.id, rowIndex, colIndex + 1);
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (colIndex > 0) {
        const prevCol = activeSheet!.columns[colIndex - 1];
        handleSelectCell(rowId, prevCol.id, rowIndex, colIndex - 1);
      }
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      handleSaveCell(rowId, colId, '');
    } else if (/^[a-zA-Z0-9=+\-*/.,]$/.test(e.key) && !e.ctrlKey && !e.metaKey) {
      handleStartEdit(rowId, colId);
      setEditValue(e.key);
      setFormulaBarValue(e.key);
    }
  };

  // Add Column Handler
  const handleAddColumnSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSheet || !newColTitle.trim()) return;
    const colId = 'col_' + Date.now().toString(36);
    const newCol: ExcelColumn = {
      id: colId,
      title: newColTitle.trim(),
      type: newColType,
      width: newColType === 'currency' ? 130 : newColType === 'badge' ? 120 : 160
    };
    addColumn(activeSheet.id, newCol);
    setNewColTitle('');
    setShowAddColModal(false);
  };

  // Add Sheet Handler
  const handleAddSheetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addSheet(newSheetName, newSheetTemplate);
    setNewSheetName('');
    setShowAddSheetModal(false);
  };

  // Export Sheet to Excel (.xlsx)
  const handleExportExcel = () => {
    if (!activeSheet) return;
    try {
      const allRows = activeSheet.rows;
      const headers = activeSheet.columns.map(c => c.title);
      
      const dataRows = allRows.map((row, rIdx) => {
        return activeSheet.columns.map((col, cIdx) => {
          return getCellDisplay(row, col, rIdx, cIdx, allRows);
        });
      });

      const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);
      ws['!cols'] = activeSheet.columns.map(c => ({ wch: Math.max(12, Math.round((c.width || 120) / 8)) }));

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, activeSheet.name.substring(0, 31));

      const fileName = `${activeSheet.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(wb, fileName);
    } catch (err) {
      console.error('Failed to export Excel file', err);
      alert('Error generating Excel file');
    }
  };

  // Export All Sheets to Master Excel Workbook
  const handleExportAllSheetsExcel = () => {
    try {
      const wb = XLSX.utils.book_new();
      sheets.forEach(sheet => {
        const headers = sheet.columns.map(c => c.title);
        const dataRows = sheet.rows.map((row, rIdx) => {
          return sheet.columns.map((col, cIdx) => {
            return getCellDisplay(row, col, rIdx, cIdx, sheet.rows);
          });
        });
        const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);
        ws['!cols'] = sheet.columns.map(c => ({ wch: Math.max(12, Math.round((c.width || 120) / 8)) }));
        XLSX.utils.book_append_sheet(wb, ws, sheet.name.substring(0, 31));
      });

      const fileName = `PNP_Shop_Master_Workbook_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(wb, fileName);
    } catch (err) {
      console.error('Failed to export master workbook', err);
      alert('Error generating master workbook');
    }
  };

  // Import Excel File (.xlsx / .csv)
  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const firstSheetName = wb.SheetNames[0];
        const ws = wb.Sheets[firstSheetName];
        const rawData: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

        if (rawData.length === 0) {
          alert('Imported file contains no data.');
          return;
        }

        const rawHeaders = (rawData[0] || []) as string[];
        const columns: ExcelColumn[] = rawHeaders.map((h, i) => {
          const title = String(h || `Column ${String.fromCharCode(65 + i)}`).trim();
          const lower = title.toLowerCase();
          let type: ExcelColumn['type'] = 'text';
          if (lower.includes('price') || lower.includes('rate') || lower.includes('cost') || lower.includes('salary') || lower.includes('wage') || lower.includes('amount') || lower.includes('total')) {
            type = 'currency';
          } else if (lower.includes('qty') || lower.includes('quantity') || lower.includes('count') || lower.includes('hrs') || lower.includes('hours')) {
            type = 'number';
          } else if (lower.includes('margin') || lower.includes('percent') || lower.includes('%')) {
            type = 'percent';
          } else if (lower.includes('date')) {
            type = 'date';
          } else if (lower.includes('status') || lower.includes('role') || lower.includes('category')) {
            type = 'badge';
          }

          return {
            id: `col_imp_${i}_${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
            title,
            type,
            width: type === 'currency' ? 130 : 160
          };
        });

        const rows: ExcelRow[] = rawData.slice(1).map((rData, rIdx) => {
          const rowObj: ExcelRow = { id: `row-imp-${Date.now()}-${rIdx}` };
          columns.forEach((col, cIdx) => {
            const rawCellVal = rData[cIdx];
            if (col.type === 'number' || col.type === 'currency' || col.type === 'percent') {
              rowObj[col.id] = Number(rawCellVal) || 0;
            } else {
              rowObj[col.id] = rawCellVal !== undefined && rawCellVal !== null ? String(rawCellVal) : '';
            }
          });
          return rowObj;
        });

        importSheetFromExcelData(file.name.replace(/\.[^/.]+$/, ''), columns, rows);
        setImportStatusMessage(`Imported ${rows.length} rows & ${columns.length} columns from "${file.name}"!`);
        setTimeout(() => setImportStatusMessage(null), 5000);
      } catch (err) {
        console.error('Failed to parse Excel file', err);
        alert('Failed to parse Excel file. Please ensure it is a valid .xlsx or .csv format.');
      }
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Sync Catalog into Price Store
  const handleSyncFromCatalog = () => {
    if (!activeSheet) return;
    let addedCount = 0;
    catalog.forEach(item => {
      const exists = activeSheet.rows.some(r => 
        String(r.name || r.description || '').toLowerCase() === item.description.toLowerCase()
      );
      if (!exists) {
        addRow(activeSheet.id, {
          code: item.code || `CAT-${item.id}`,
          name: item.description,
          category: item.category,
          unit: item.unit,
          costPrice: Math.round(item.price * 0.75),
          dealerPrice: Math.round(item.price * 0.88),
          retailPrice: item.price,
          stockQty: 10,
          marginPercent: 33.3,
          stockValue: item.price * 10,
          location: 'Main Store',
          notes: 'Auto-synced from Product Catalog'
        });
        addedCount++;
      }
    });

    setImportStatusMessage(`Successfully synced ${addedCount} new items from Catalog into Price Store!`);
    setTimeout(() => setImportStatusMessage(null), 5000);
  };

  // Helper to format badge styles
  const renderBadgeContent = (val: any) => {
    const str = String(val || '').trim();
    if (!str) return <span className="text-slate-600">-</span>;

    const lower = str.toLowerCase();
    let badgeClasses = 'bg-slate-800 text-slate-300 border-slate-700';

    if (lower === 'active' || lower === 'paid' || lower === 'in stock') {
      badgeClasses = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25';
    } else if (lower === 'pending' || lower === 'on leave' || lower === 'low stock' || lower === 'part-time') {
      badgeClasses = 'bg-amber-500/10 text-amber-400 border-amber-500/25';
    } else if (lower === 'unpaid' || lower === 'absent' || lower === 'out of stock') {
      badgeClasses = 'bg-rose-500/10 text-rose-400 border-rose-500/25';
    } else if (lower.includes('cctv') || lower.includes('technician')) {
      badgeClasses = 'bg-sky-500/10 text-sky-400 border-sky-500/25';
    } else if (lower.includes('sales') || lower.includes('billing')) {
      badgeClasses = 'bg-indigo-500/10 text-indigo-400 border-indigo-500/25';
    } else if (lower.includes('photo') || lower.includes('studio') || lower.includes('framing')) {
      badgeClasses = 'bg-purple-500/10 text-purple-400 border-purple-500/25';
    }

    return (
      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border tracking-wide font-sans ${badgeClasses}`}>
        {str}
      </span>
    );
  };

  // Active cell coordinate indicator (e.g. "B4")
  const activeCellCoord = useMemo(() => {
    if (!selectedCell || !activeSheet) return 'A1';
    const colLetter = String.fromCharCode(65 + selectedCell.colIndex);
    return `${colLetter}${selectedCell.rowIndex + 1}`;
  }, [selectedCell, activeSheet]);

  return (
    <div className="space-y-4 max-w-[98%] mx-auto pb-16 print:p-0 print:m-0 print:max-w-full">
      
      {/* Hidden File Input for Excel Import */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileImport} 
        accept=".xlsx, .xls, .csv" 
        className="hidden" 
      />

      {/* Top Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800/80 p-5 rounded-3xl shadow-2xl backdrop-blur-md print:hidden">
        <div className="flex items-center space-x-3.5">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-600/25 shrink-0 border border-emerald-400/30">
            <FileSpreadsheet className="h-6 w-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-black text-white tracking-tight">
                Shop Excel Spreadsheet & Price Store
              </h1>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-mono">
                Real-Time Sheet
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Live Excel grid for product prices, stock inventory, shop staff directory & daily wage khata
            </p>
          </div>
        </div>

        {/* Global Toolbar Quick Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Sync with Catalog */}
          <button
            type="button"
            onClick={handleSyncFromCatalog}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-400 hover:text-sky-300 border border-slate-700 text-xs font-bold transition-all flex items-center space-x-1.5 shadow-sm"
            title="Import items from Item Catalog into current Price Store sheet"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Sync Catalog</span>
          </button>

          {/* Import Excel Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 border border-slate-700 text-xs font-bold transition-all flex items-center space-x-1.5 shadow-sm"
            title="Upload and import .xlsx or .csv spreadsheets"
          >
            <Upload className="h-3.5 w-3.5" />
            <span>Import Excel</span>
          </button>

          {/* Export Current Sheet (.xlsx) */}
          <button
            type="button"
            onClick={handleExportExcel}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/25 transition-all flex items-center space-x-1.5"
            title="Download active sheet as an Excel file"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export Sheet (.xlsx)</span>
          </button>

          {/* Export All Sheets Master Workbook */}
          <button
            type="button"
            onClick={handleExportAllSheetsExcel}
            className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-lg shadow-sky-600/25 transition-all flex items-center space-x-1.5"
            title="Download all sheets in one Excel workbook"
          >
            <Layers className="h-3.5 w-3.5" />
            <span>All Sheets (.xlsx)</span>
          </button>

          {/* Print Sheet View */}
          <button
            type="button"
            onClick={() => triggerAppPrint()}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-all flex items-center space-x-1.5 shadow-sm"
            title="Print sheet table or export as PDF"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print Sheet</span>
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {importStatusMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center space-x-2 animate-in fade-in">
          <Check className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{importStatusMessage}</span>
        </div>
      )}

      {/* Multi-Sheet Workbook Tab Bar */}
      <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-2 flex items-center justify-between shadow-lg overflow-x-auto print:hidden gap-3">
        <div className="flex items-center space-x-1.5 overflow-x-auto scrollbar-none py-0.5">
          {sheets.map((sheet) => {
            const isActive = sheet.id === activeSheetId;
            const isPrice = sheet.icon === 'price' || sheet.name.toLowerCase().includes('price');
            const isWorkers = sheet.icon === 'workers' || sheet.name.toLowerCase().includes('worker');
            const isAttendance = sheet.icon === 'attendance' || sheet.name.toLowerCase().includes('attendance');

            return (
              <div
                key={sheet.id}
                onClick={() => setActiveSheet(sheet.id)}
                className={`group px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center space-x-2 shrink-0 border select-none ${
                  isActive
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-emerald-400/40 shadow-md shadow-emerald-950 scale-[1.02]'
                    : 'bg-slate-950/60 hover:bg-slate-800/80 text-slate-400 hover:text-white border-slate-800'
                }`}
              >
                {isPrice ? (
                  <ShieldCheck className={`h-4 w-4 ${isActive ? 'text-white' : 'text-emerald-400'}`} />
                ) : isWorkers ? (
                  <Users className={`h-4 w-4 ${isActive ? 'text-white' : 'text-sky-400'}`} />
                ) : isAttendance ? (
                  <Calculator className={`h-4 w-4 ${isActive ? 'text-white' : 'text-purple-400'}`} />
                ) : (
                  <FileSpreadsheet className={`h-4 w-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                )}

                {renamingSheetId === sheet.id ? (
                  <input
                    type="text"
                    autoFocus
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={() => {
                      if (renameValue.trim()) renameSheet(sheet.id, renameValue);
                      setRenamingSheetId(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        if (renameValue.trim()) renameSheet(sheet.id, renameValue);
                        setRenamingSheetId(null);
                      } else if (e.key === 'Escape') {
                        setRenamingSheetId(null);
                      }
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-slate-950 text-white text-xs px-1.5 py-0.5 rounded border border-sky-400 focus:outline-none w-32"
                  />
                ) : (
                  <span 
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      setRenamingSheetId(sheet.id);
                      setRenameValue(sheet.name);
                    }}
                    title="Double click to rename sheet"
                  >
                    {sheet.name}
                  </span>
                )}

                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
                }`}>
                  {sheet.rows.length}
                </span>

                {/* Delete Sheet button if > 1 sheets */}
                {sheets.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm(`Delete sheet "${sheet.name}" and all its rows?`)) {
                        deleteSheet(sheet.id);
                      }
                    }}
                    className={`opacity-0 group-hover:opacity-100 hover:text-red-400 p-0.5 transition-all ${
                      isActive ? 'text-white/80' : 'text-slate-500'
                    }`}
                    title="Delete Sheet"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            );
          })}

          {/* Add Sheet (+) Button */}
          <button
            type="button"
            onClick={() => setShowAddSheetModal(true)}
            className="px-3 py-2 rounded-xl bg-slate-950/80 hover:bg-slate-800 text-emerald-400 hover:text-emerald-300 border border-dashed border-slate-700 text-xs font-bold transition-all flex items-center space-x-1.5 shrink-0"
            title="Create New Sheet Tab"
          >
            <Plus className="h-4 w-4" />
            <span>New Sheet</span>
          </button>
        </div>

        {/* Total Sheets Badge */}
        <div className="text-[11px] font-mono font-bold text-slate-500 px-2 shrink-0 hidden sm:block">
          {sheets.length} Sheets Available
        </div>
      </div>

      {/* Live Metrics Summary Dashboard */}
      {sheetMetrics && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 print:hidden">
          {sheetMetrics.type === 'price' && (
            <>
              <div className="bg-slate-900/80 border border-slate-800/80 p-3.5 rounded-2xl">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Total Items</span>
                <span className="text-lg font-black font-mono text-white mt-1 block">{sheetMetrics.totalRows} Products</span>
              </div>
              <div className="bg-slate-900/80 border border-slate-800/80 p-3.5 rounded-2xl">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Total In-Stock Qty</span>
                <span className="text-lg font-black font-mono text-sky-400 mt-1 block">{sheetMetrics.totalQty} Units</span>
              </div>
              <div className="bg-slate-900/80 border border-slate-800/80 p-3.5 rounded-2xl">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Total Cost Value</span>
                <span className="text-lg font-black font-mono text-slate-300 mt-1 block">{formatNPR(sheetMetrics.totalCostVal || 0)}</span>
              </div>
              <div className="bg-slate-900/80 border border-slate-800/80 p-3.5 rounded-2xl">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Total Selling Value</span>
                <span className="text-lg font-black font-mono text-emerald-400 mt-1 block">{formatNPR(sheetMetrics.totalRetailVal || 0)}</span>
              </div>
              <div className="bg-slate-900/80 border border-slate-800/80 p-3.5 rounded-2xl col-span-2 sm:col-span-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Potential Profit</span>
                <span className="text-lg font-black font-mono text-teal-300 mt-1 block">+{formatNPR(sheetMetrics.totalPotentialProfit || 0)}</span>
              </div>
            </>
          )}

          {sheetMetrics.type === 'workers' && (
            <>
              <div className="bg-slate-900/80 border border-slate-800/80 p-3.5 rounded-2xl">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Total Staff</span>
                <span className="text-lg font-black font-mono text-white mt-1 block">{sheetMetrics.totalRows} Workers</span>
              </div>
              <div className="bg-slate-900/80 border border-slate-800/80 p-3.5 rounded-2xl">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Active On-Duty</span>
                <span className="text-lg font-black font-mono text-emerald-400 mt-1 block">{sheetMetrics.activeStaffCount} Active</span>
              </div>
              <div className="bg-slate-900/80 border border-slate-800/80 p-3.5 rounded-2xl">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Monthly Payroll</span>
                <span className="text-lg font-black font-mono text-sky-400 mt-1 block">{formatNPR(sheetMetrics.totalSalary || 0)}</span>
              </div>
              <div className="bg-slate-900/80 border border-slate-800/80 p-3.5 rounded-2xl col-span-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Total Staff Advances</span>
                <span className="text-lg font-black font-mono text-amber-400 mt-1 block">{formatNPR(sheetMetrics.totalAdvances || 0)}</span>
              </div>
            </>
          )}

          {sheetMetrics.type === 'attendance' && (
            <>
              <div className="bg-slate-900/80 border border-slate-800/80 p-3.5 rounded-2xl">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Total Duty Logs</span>
                <span className="text-lg font-black font-mono text-white mt-1 block">{sheetMetrics.totalRows} Records</span>
              </div>
              <div className="bg-slate-900/80 border border-slate-800/80 p-3.5 rounded-2xl">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Total Gross Wages</span>
                <span className="text-lg font-black font-mono text-purple-400 mt-1 block">{formatNPR(sheetMetrics.totalWages || 0)}</span>
              </div>
              <div className="bg-slate-900/80 border border-slate-800/80 p-3.5 rounded-2xl">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Advance Deductions</span>
                <span className="text-lg font-black font-mono text-rose-400 mt-1 block">-{formatNPR(sheetMetrics.totalAdvDeductions || 0)}</span>
              </div>
              <div className="bg-slate-900/80 border border-slate-800/80 p-3.5 rounded-2xl col-span-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Net Khata Payable</span>
                <span className="text-lg font-black font-mono text-emerald-400 mt-1 block">{formatNPR(sheetMetrics.totalNetPayable || 0)}</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* Excel Formula Bar & Action Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 shadow-xl space-y-3 print:hidden">
        
        {/* Row 1: Search & Filter Controls & Quick Add Buttons */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          
          {/* Search Input */}
          <div className="flex items-center space-x-2 w-full md:w-auto flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search across all cells, names, codes..."
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 outline-none"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-2.5 text-slate-500 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Category Filter if exists */}
            {uniqueCategories.length > 0 && (
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 outline-none shrink-0"
              >
                <option value="all">All Categories</option>
                {uniqueCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            )}
          </div>

          {/* Row & Column Action Controls */}
          <div className="flex items-center space-x-2 w-full md:w-auto justify-end">
            <button
              type="button"
              onClick={() => {
                if (activeSheet) {
                  addRow(activeSheet.id);
                }
              }}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition-all flex items-center space-x-1.5"
            >
              <Plus className="h-4 w-4" />
              <span>+ Add Row</span>
            </button>

            <button
              type="button"
              onClick={() => setShowAddColModal(true)}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-all flex items-center space-x-1.5"
            >
              <Plus className="h-4 w-4" />
              <span>+ Add Column</span>
            </button>
          </div>

        </div>

        {/* Row 2: Real-time Excel Formula Bar (fx) */}
        <form onSubmit={handleFormulaSubmit} className="flex items-center space-x-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 shadow-inner">
          {/* Active Cell Coordinate Box */}
          <div className="px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-xs font-mono font-black text-emerald-400 min-w-[50px] text-center shrink-0">
            {activeCellCoord}
          </div>

          {/* fx symbol */}
          <div className="text-xs font-black font-serif italic text-slate-500 select-none shrink-0 px-1">
            fx
          </div>

          {/* Formula / Value Input */}
          <input
            type="text"
            value={formulaBarValue}
            onChange={(e) => setFormulaBarValue(e.target.value)}
            placeholder="Type value or formula (e.g. =SUM(E1:E10), =C2*1.15, =D2-C2, text...)"
            className="w-full bg-transparent text-xs text-white font-mono focus:outline-none placeholder-slate-600"
          />

          <button
            type="submit"
            className="p-1 rounded hover:bg-emerald-600/20 text-emerald-400 hover:text-emerald-300 transition-colors shrink-0"
            title="Apply formula / value (Enter)"
          >
            <Check className="h-4 w-4" />
          </button>
        </form>

      </div>

      {/* Main Interactive Excel Grid */}
      {activeSheet && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
          
          <div className="overflow-x-auto max-h-[68vh] overflow-y-auto custom-scrollbar">
            <table className="w-full text-left border-collapse select-none text-xs">
              
              {/* Table Column Headers with Excel Letters & Titles */}
              <thead className="sticky top-0 bg-slate-950 text-slate-300 border-b border-slate-800 z-20 shadow-md">
                <tr>
                  {/* Row # Header Column */}
                  <th className="py-2.5 px-3 w-12 text-center text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 bg-slate-950 border-r border-slate-800 sticky left-0 z-30">
                    #
                  </th>

                  {/* Column Headers */}
                  {activeSheet.columns.map((col, cIdx) => {
                    const colLetter = String.fromCharCode(65 + cIdx);
                    const isSorted = sortConfig?.colId === col.id;

                    return (
                      <th
                        key={col.id}
                        style={{ minWidth: col.width || 120, width: col.width || 120 }}
                        className="py-2 px-3 border-r border-slate-800/80 bg-slate-950/95 group relative hover:bg-slate-900/90 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div 
                            className="flex items-center space-x-1.5 cursor-pointer truncate"
                            onClick={() => {
                              setSortConfig(prev => {
                                if (prev?.colId === col.id) {
                                  return prev.direction === 'asc' ? { colId: col.id, direction: 'desc' } : null;
                                }
                                return { colId: col.id, direction: 'asc' };
                              });
                            }}
                            title="Click to sort column"
                          >
                            <span className="text-[9px] font-mono font-black text-emerald-400/80 bg-emerald-500/10 px-1 rounded border border-emerald-500/20">
                              {colLetter}
                            </span>
                            <span className="font-extrabold text-xs text-white truncate">
                              {col.title}
                            </span>
                            {isSorted && (
                              <span className="text-[10px] text-emerald-400 font-bold">
                                {sortConfig.direction === 'asc' ? '↑' : '↓'}
                              </span>
                            )}
                          </div>

                          {/* Column Action Dropdown */}
                          <div className="opacity-0 group-hover:opacity-100 flex items-center space-x-1 transition-opacity print:hidden">
                            {activeSheet.columns.length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (window.confirm(`Delete column "${col.title}"?`)) {
                                    deleteColumn(activeSheet.id, col.id);
                                  }
                                }}
                                className="text-slate-500 hover:text-red-400 p-0.5"
                                title="Delete Column"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      </th>
                    );
                  })}

                  {/* Actions Column Header */}
                  <th className="py-2.5 px-3 w-28 text-center text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 bg-slate-950 print:hidden">
                    Actions
                  </th>
                </tr>
              </thead>

              {/* Table Rows & Cells */}
              <tbody className="divide-y divide-slate-800/60 bg-slate-900/40 font-mono">
                {filteredAndSortedRows.length > 0 ? (
                  filteredAndSortedRows.map((row, rIdx) => {
                    const isRowSelected = selectedCell?.rowId === row.id;

                    return (
                      <tr 
                        key={row.id} 
                        className={`hover:bg-slate-800/50 transition-colors group ${
                          isRowSelected ? 'bg-slate-800/30' : ''
                        }`}
                      >
                        {/* Row Number Header */}
                        <td className="py-2 px-2 text-center text-slate-500 text-[11px] font-mono border-r border-slate-800/80 bg-slate-950/80 sticky left-0 z-10 select-none">
                          <div className="flex items-center justify-between">
                            <span>{rIdx + 1}</span>
                            <div className="opacity-0 group-hover:opacity-100 flex items-center space-x-0.5 print:hidden">
                              {rIdx > 0 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newRows = [...activeSheet.rows];
                                    const origIdx = activeSheet.rows.findIndex(r => r.id === row.id);
                                    if (origIdx > 0) {
                                      const temp = newRows[origIdx];
                                      newRows[origIdx] = newRows[origIdx - 1];
                                      newRows[origIdx - 1] = temp;
                                      reorderRows(activeSheet.id, newRows);
                                    }
                                  }}
                                  className="text-slate-400 hover:text-white"
                                  title="Move Up"
                                >
                                  <MoveUp className="h-2.5 w-2.5" />
                                </button>
                              )}
                              {rIdx < activeSheet.rows.length - 1 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newRows = [...activeSheet.rows];
                                    const origIdx = activeSheet.rows.findIndex(r => r.id === row.id);
                                    if (origIdx >= 0 && origIdx < newRows.length - 1) {
                                      const temp = newRows[origIdx];
                                      newRows[origIdx] = newRows[origIdx + 1];
                                      newRows[origIdx + 1] = temp;
                                      reorderRows(activeSheet.id, newRows);
                                    }
                                  }}
                                  className="text-slate-400 hover:text-white"
                                  title="Move Down"
                                >
                                  <MoveDown className="h-2.5 w-2.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Cells in Row */}
                        {activeSheet.columns.map((col, cIdx) => {
                          const isSelected = selectedCell?.rowId === row.id && selectedCell?.colId === col.id;
                          const isEditing = editingCell?.rowId === row.id && editingCell?.colId === col.id;
                          const displayVal = getCellDisplay(row, col, rIdx, cIdx, activeSheet.rows);

                          return (
                            <td
                              key={col.id}
                              tabIndex={0}
                              onClick={() => handleSelectCell(row.id, col.id, rIdx, cIdx)}
                              onDoubleClick={() => handleStartEdit(row.id, col.id)}
                              onKeyDown={(e) => handleKeyDown(e, row.id, col.id, rIdx, cIdx)}
                              className={`py-2 px-3 border-r border-slate-800/60 relative outline-none transition-all cursor-cell ${
                                isSelected 
                                  ? 'ring-2 ring-emerald-400 bg-emerald-950/30 z-10' 
                                  : 'hover:bg-slate-800/70'
                              } ${
                                col.type === 'currency' || col.type === 'number' || col.type === 'percent'
                                  ? 'text-right' 
                                  : 'text-left'
                              }`}
                            >
                              {isEditing ? (
                                <input
                                  ref={cellInputRef}
                                  type="text"
                                  value={editValue}
                                  onChange={(e) => {
                                    setEditValue(e.target.value);
                                    setFormulaBarValue(e.target.value);
                                  }}
                                  onBlur={() => handleSaveCell(row.id, col.id, editValue)}
                                  className="w-full bg-slate-950 text-white font-mono text-xs px-1.5 py-0.5 rounded border border-emerald-400 focus:outline-none shadow-inner"
                                />
                              ) : (
                                <div className="truncate">
                                  {col.type === 'currency' ? (
                                    <span className="font-bold text-slate-100">
                                      {typeof displayVal === 'number' ? formatNPR(displayVal) : displayVal}
                                    </span>
                                  ) : col.type === 'percent' ? (
                                    <span className="font-bold text-teal-400 font-mono">
                                      {displayVal !== '' && displayVal !== undefined ? `${displayVal}%` : '-'}
                                    </span>
                                  ) : col.type === 'badge' ? (
                                    renderBadgeContent(displayVal)
                                  ) : col.type === 'number' ? (
                                    <span className={`font-bold ${
                                      col.id === 'stockQty' && Number(displayVal) <= 3 && Number(displayVal) > 0
                                        ? 'text-amber-400'
                                        : col.id === 'stockQty' && Number(displayVal) === 0
                                        ? 'text-rose-400'
                                        : 'text-white'
                                    }`}>
                                      {displayVal}
                                    </span>
                                  ) : (
                                    <span className="text-slate-200 font-sans font-medium">
                                      {displayVal !== undefined && displayVal !== null ? String(displayVal) : ''}
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>
                          );
                        })}

                        {/* Action Column */}
                        <td className="py-1.5 px-3 text-center border-r border-slate-800/60 print:hidden">
                          <div className="flex items-center justify-center space-x-1">
                            
                            {/* "Add to Current Invoice" button if price sheet */}
                            {(activeSheet.icon === 'price' || activeSheet.name.toLowerCase().includes('price') || activeSheet.columns.some(c => c.id === 'retailPrice')) && (
                              <button
                                type="button"
                                onClick={() => {
                                  addItemToInvoiceFromStore(row);
                                  setAddedBillSuccessRowId(row.id);
                                  setTimeout(() => setAddedBillSuccessRowId(null), 3000);
                                }}
                                className="px-2 py-1 rounded-lg bg-sky-600/20 hover:bg-sky-600 text-sky-400 hover:text-white text-[11px] font-bold border border-sky-500/30 transition-all flex items-center space-x-1"
                                title="Add this item & rate to current invoice bill"
                              >
                                {addedBillSuccessRowId === row.id ? (
                                  <Check className="h-3 w-3 text-emerald-400 animate-bounce" />
                                ) : (
                                  <ArrowRight className="h-3 w-3" />
                                )}
                                <span>+ Bill</span>
                              </button>
                            )}

                            {/* Delete Row */}
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm('Delete this row?')) {
                                  deleteRow(activeSheet.id, row.id);
                                }
                              }}
                              className="p-1 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                              title="Delete Row"
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
                    <td colSpan={activeSheet.columns.length + 2} className="py-12 text-center text-slate-500 text-xs font-sans">
                      No records found in this sheet. Click "+ Add Row" or "Import Excel" to get started.
                    </td>
                  </tr>
                )}
              </tbody>

            </table>
          </div>

          {/* Excel Status Bar Footer */}
          <div className="px-4 py-2.5 border-t border-slate-800 bg-slate-950 text-slate-400 text-xs flex flex-col sm:flex-row items-center justify-between gap-2 font-sans select-none">
            <div className="flex items-center space-x-3 text-[11px] text-slate-400 font-mono">
              <span>Ready</span>
              <span>•</span>
              <span>Sheet: <strong className="text-white">{activeSheet.name}</strong></span>
              <span>•</span>
              <span>Rows: <strong className="text-emerald-400">{filteredAndSortedRows.length}</strong> / {activeSheet.rows.length}</span>
              <span>•</span>
              <span>Columns: <strong className="text-sky-400">{activeSheet.columns.length}</strong></span>
            </div>

            <div className="flex items-center space-x-3 text-[11px] font-mono">
              <span className="text-slate-500">Keyboard: Arrow keys / Tab / Enter to edit cells</span>
            </div>
          </div>

        </div>
      )}

      {/* Add New Sheet Modal */}
      {showAddSheetModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-emerald-400" />
                Create New Sheet Tab
              </h3>
              <button onClick={() => setShowAddSheetModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleAddSheetSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Sheet Tab Name *</label>
                <input
                  type="text"
                  required
                  value={newSheetName}
                  onChange={(e) => setNewSheetName(e.target.value)}
                  placeholder="e.g. CCTV Price List, Branch Staff, Daily Log..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Choose Sheet Template</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'price', label: 'Price & Stock Store', desc: 'Product prices, cost, dealer & retail' },
                    { id: 'workers', label: 'Shop Workers Directory', desc: 'Staff names, roles, salary & status' },
                    { id: 'attendance', label: 'Daily Attendance Khata', desc: 'Wages, overtime, advances & sites' },
                    { id: 'blank', label: 'Blank Custom Sheet', desc: 'Custom columns (A, B, C, D...)' },
                  ].map(t => (
                    <div
                      key={t.id}
                      onClick={() => setNewSheetTemplate(t.id as any)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${
                        newSheetTemplate === t.id
                          ? 'bg-emerald-600/20 border-emerald-500 text-white shadow-md'
                          : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-400'
                      }`}
                    >
                      <h4 className="text-xs font-bold text-white">{t.label}</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">{t.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddSheetModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md"
                >
                  Create Sheet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add New Column Modal */}
      {showAddColModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                <Plus className="h-5 w-5 text-emerald-400" />
                Add New Column to Sheet
              </h3>
              <button onClick={() => setShowAddColModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleAddColumnSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Column Title Header *</label>
                <input
                  type="text"
                  required
                  value={newColTitle}
                  onChange={(e) => setNewColTitle(e.target.value)}
                  placeholder="e.g. Brand Name, Warranty (Months), Tax %, Supplier..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Column Data Type</label>
                <select
                  value={newColType}
                  onChange={(e) => setNewColType(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none"
                >
                  <option value="text">Text (General text, names, notes)</option>
                  <option value="currency">Currency Rs. (Money & rates with formatting)</option>
                  <option value="number">Number (Quantities, counts, hours)</option>
                  <option value="percent">Percentage % (Margins, tax %)</option>
                  <option value="badge">Status Badge (Pill badges for status, roles)</option>
                  <option value="date">Date (BS or AD date)</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddColModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md"
                >
                  Add Column
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
