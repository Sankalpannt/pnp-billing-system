import * as XLSX from 'xlsx';
import { Invoice } from '../types/invoice';

export interface BrandSalesItem {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  dateBS: string;
  dateAD: string;
  fiscalYear: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  installationSite: string;
  brand: string;
  description: string;
  qty: number;
  unit: string;
  listPrice: number;
  effectivePrice: number;
  amount: number;
  serialNumbers: string;
  warrantyInfo: string;
  paymentStatus: string;
  paymentMethod: string;
}

export const KNOWN_BRANDS = [
  'Hikvision',
  'Dahua',
  'CP Plus',
  'Uniview',
  'Ezviz',
  'Imou',
  'TP-Link / Tapo',
  'Secureye',
  'Honeywell',
  'Panasonic',
  'Sony',
  'General CCTV & Accessories',
  'Other Products'
] as const;

/**
 * Intelligent brand detection from item description and invoice context
 */
export function detectBrand(description: string = ''): string {
  const text = description.toLowerCase();

  if (/hikvision|\bhik\b|colorvu|acuseries/i.test(text)) return 'Hikvision';
  if (/dahua|wizsense|cooper|tioc/i.test(text)) return 'Dahua';
  if (/cp[\s\-_]*plus|cpplus|orange\s*series/i.test(text)) return 'CP Plus';
  if (/uniview|\bunv\b|prime\s*i/i.test(text)) return 'Uniview';
  if (/ezviz/i.test(text)) return 'Ezviz';
  if (/imou/i.test(text)) return 'Imou';
  if (/tapo|tp[\s\-_]*link/i.test(text)) return 'TP-Link / Tapo';
  if (/secureye/i.test(text)) return 'Secureye';
  if (/honeywell/i.test(text)) return 'Honeywell';
  if (/panasonic/i.test(text)) return 'Panasonic';
  if (/sony/i.test(text)) return 'Sony';

  if (/cctv|camera|dvr|nvr|coaxial|bnc|smps|power supply|hard disk|surveillance|dome|bullet|ptz|ip\s*camera/i.test(text)) {
    return 'General CCTV & Accessories';
  }

  return 'Other Products';
}

/**
 * Extracts and groups all sold items by brand from a list of invoices
 */
export function extractBrandSales(invoices: Invoice[]): {
  itemsByBrand: Record<string, BrandSalesItem[]>;
  allBrandItems: BrandSalesItem[];
  brandSummary: Record<string, { count: number; totalQty: number; totalAmount: number }>;
} {
  const itemsByBrand: Record<string, BrandSalesItem[]> = {};
  const allBrandItems: BrandSalesItem[] = [];
  const brandSummary: Record<string, { count: number; totalQty: number; totalAmount: number }> = {};

  // Initialize brand lists
  KNOWN_BRANDS.forEach((brand) => {
    itemsByBrand[brand] = [];
    brandSummary[brand] = { count: 0, totalQty: 0, totalAmount: 0 };
  });

  invoices.forEach((inv) => {
    inv.items.forEach((item) => {
      const brand = detectBrand(item.description);
      
      if (!itemsByBrand[brand]) {
        itemsByBrand[brand] = [];
        brandSummary[brand] = { count: 0, totalQty: 0, totalAmount: 0 };
      }

      const salesItem: BrandSalesItem = {
        id: item.id,
        invoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber,
        dateBS: inv.dateBS,
        dateAD: inv.dateAD,
        fiscalYear: inv.fiscalYear,
        customerName: inv.customerName || 'Retail Customer',
        customerPhone: inv.customerPhone || '-',
        customerAddress: inv.customerAddress || '-',
        installationSite: inv.installationSite || inv.customerAddress || '-',
        brand,
        description: item.description,
        qty: Number(item.qty) || 0,
        unit: item.unit || 'Pcs',
        listPrice: Number(item.listPrice) || 0,
        effectivePrice: Number(item.effectivePrice) || 0,
        amount: Number(item.amount) || 0,
        serialNumbers: inv.serialNumbers || '-',
        warrantyInfo: inv.warrantyInfo || '-',
        paymentStatus: inv.paymentStatus.toUpperCase(),
        paymentMethod: (inv.paymentMethod || 'cash').toUpperCase()
      };

      itemsByBrand[brand].push(salesItem);
      allBrandItems.push(salesItem);

      brandSummary[brand].count += 1;
      brandSummary[brand].totalQty += salesItem.qty;
      brandSummary[brand].totalAmount += salesItem.amount;
    });
  });

  return { itemsByBrand, allBrandItems, brandSummary };
}

/**
 * Creates formatted rows for an Excel Sheet from a list of BrandSalesItems
 */
function createWorksheetRows(items: BrandSalesItem[], brandName: string, companyName = 'PNP TECH TRADERS') {
  const rows: any[] = [];

  // Title block
  rows.push([`${companyName.toUpperCase()} - ${brandName.toUpperCase()} SALES REPORT`]);
  rows.push([`Generated On: ${new Date().toLocaleDateString()} | Total Items: ${items.length}`]);
  rows.push([]); // Empty row

  // Table Headers
  const headers = [
    'S.N.',
    'Mitti (BS)',
    'Date (AD)',
    'Invoice No.',
    'Customer / Party Name',
    'Phone Number',
    'Installation Site / Address',
    'Product / Camera Particulars',
    'Brand',
    'Quantity',
    'Unit',
    'Rate (NPR)',
    'Total Amount (NPR)',
    'Serial Number(s)',
    'Warranty Details',
    'Payment Status',
    'Payment Mode'
  ];
  rows.push(headers);

  let totalQty = 0;
  let totalAmount = 0;

  items.forEach((item, index) => {
    totalQty += item.qty;
    totalAmount += item.amount;

    rows.push([
      index + 1,
      item.dateBS,
      item.dateAD,
      item.invoiceNumber,
      item.customerName,
      item.customerPhone,
      item.installationSite,
      item.description,
      item.brand,
      item.qty,
      item.unit,
      item.effectivePrice,
      item.amount,
      item.serialNumbers,
      item.warrantyInfo,
      item.paymentStatus,
      item.paymentMethod
    ]);
  });

  // Summary Row
  rows.push([]);
  rows.push([
    'TOTAL SUMMARY',
    '',
    '',
    '',
    '',
    '',
    '',
    `Total Records: ${items.length}`,
    brandName,
    totalQty,
    'Units',
    '',
    totalAmount,
    '',
    '',
    '',
    ''
  ]);

  return rows;
}

/**
 * Download an Excel file for a single brand
 */
export function exportSingleBrandToExcel(brandName: string, items: BrandSalesItem[], prefix = 'PNP_Tech') {
  if (items.length === 0) {
    alert(`No sales records found for brand: ${brandName}`);
    return;
  }

  const rows = createWorksheetRows(items, brandName);
  const worksheet = XLSX.utils.aoa_to_sheet(rows);

  // Set column widths for clean readability in Excel
  worksheet['!cols'] = [
    { wch: 6 },  // SN
    { wch: 12 }, // Date BS
    { wch: 12 }, // Date AD
    { wch: 18 }, // Invoice No
    { wch: 28 }, // Customer
    { wch: 15 }, // Phone
    { wch: 26 }, // Site
    { wch: 38 }, // Particulars
    { wch: 16 }, // Brand
    { wch: 10 }, // Qty
    { wch: 8 },  // Unit
    { wch: 14 }, // Rate
    { wch: 18 }, // Amount
    { wch: 24 }, // Serial No
    { wch: 26 }, // Warranty
    { wch: 14 }, // Status
    { wch: 14 }  // Method
  ];

  const workbook = XLSX.utils.book_new();
  const safeSheetName = brandName.replace(/[\/\\?*:[\]]/g, '_').slice(0, 31);
  XLSX.utils.book_append_sheet(workbook, worksheet, safeSheetName);

  const cleanBrand = brandName.replace(/[^a-zA-Z0-9]/g, '_');
  const dateStr = new Date().toISOString().slice(0, 10);
  const fileName = `${prefix}_${cleanBrand}_Report_${dateStr}.xlsx`;

  XLSX.writeFile(workbook, fileName);
}

/**
 * Downloads SEPARATE Excel (.xlsx) files for each brand one-by-one with staggered downloads
 */
export async function exportAllBrandsSeparateFiles(
  itemsByBrand: Record<string, BrandSalesItem[]>,
  prefix = 'PNP_Tech'
): Promise<number> {
  const activeBrands = Object.entries(itemsByBrand).filter(([_, items]) => items.length > 0);

  if (activeBrands.length === 0) {
    alert('No items or camera records to export!');
    return 0;
  }

  let exportedCount = 0;

  for (let i = 0; i < activeBrands.length; i++) {
    const [brandName, items] = activeBrands[i];
    
    // Add small delay between downloads so browser doesn't block concurrent popups
    await new Promise((resolve) => setTimeout(resolve, 300));
    exportSingleBrandToExcel(brandName, items, prefix);
    exportedCount++;
  }

  return exportedCount;
}

/**
 * Creates a Master multi-sheet Excel workbook where each brand has its own tab
 */
export function exportMasterMultiSheetExcel(
  itemsByBrand: Record<string, BrandSalesItem[]>,
  prefix = 'PNP_Tech'
) {
  const workbook = XLSX.utils.book_new();
  const activeBrands = Object.entries(itemsByBrand).filter(([_, items]) => items.length > 0);

  if (activeBrands.length === 0) {
    alert('No items found to export.');
    return;
  }

  // 1. Overview Sheet
  const summaryRows: any[] = [
    ['PNP TECH TRADERS - MASTER BRAND SALES REPORT'],
    [`Generated On: ${new Date().toLocaleDateString()}`],
    [],
    ['S.N.', 'Camera / Product Brand', 'Total Products Sold', 'Total Quantity Sold', 'Total Gross Sales (NPR)']
  ];

  let grandTotalUnits = 0;
  let grandTotalRevenue = 0;

  activeBrands.forEach(([brand, items], idx) => {
    const totalQty = items.reduce((sum, item) => sum + item.qty, 0);
    const totalRev = items.reduce((sum, item) => sum + item.amount, 0);
    grandTotalUnits += totalQty;
    grandTotalRevenue += totalRev;

    summaryRows.push([
      idx + 1,
      brand,
      items.length,
      totalQty,
      totalRev
    ]);
  });

  summaryRows.push([]);
  summaryRows.push(['GRAND TOTAL', `All ${activeBrands.length} Brands`, '', grandTotalUnits, grandTotalRevenue]);

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
  summarySheet['!cols'] = [{ wch: 6 }, { wch: 30 }, { wch: 22 }, { wch: 22 }, { wch: 25 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Brand Summary');

  // 2. Individual Brand Sheets
  activeBrands.forEach(([brandName, items]) => {
    const rows = createWorksheetRows(items, brandName);
    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    worksheet['!cols'] = [
      { wch: 6 }, { wch: 12 }, { wch: 12 }, { wch: 18 }, { wch: 28 },
      { wch: 15 }, { wch: 26 }, { wch: 38 }, { wch: 16 }, { wch: 10 },
      { wch: 8 }, { wch: 14 }, { wch: 18 }, { wch: 24 }, { wch: 26 },
      { wch: 14 }, { wch: 14 }
    ];
    const safeSheetName = brandName.replace(/[\/\\?*:[\]]/g, '_').slice(0, 31);
    XLSX.utils.book_append_sheet(workbook, worksheet, safeSheetName);
  });

  const dateStr = new Date().toISOString().slice(0, 10);
  const fileName = `${prefix}_Master_CCTV_Brand_Workbook_${dateStr}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}

