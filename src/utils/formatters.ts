/**
 * Currency & Formatting Utilities for NPR (Nepalese Rupee)
 */

export function formatNPR(amount: number, includeSymbol = true): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return includeSymbol ? 'Rs. 0.00' : '0.00';
  }

  // Format with Nepalese/Indian digit grouping (e.g. 1,00,000.00)
  const parts = amount.toFixed(2).split('.');
  let lastThree = parts[0].substring(parts[0].length - 3);
  const otherNumbers = parts[0].substring(0, parts[0].length - 3);
  
  if (otherNumbers !== '') {
    lastThree = ',' + lastThree;
  }
  
  const formattedInt = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;
  const result = `${formattedInt}.${parts[1]}`;

  return includeSymbol ? `Rs. ${result}` : result;
}

export function generateInvoiceNumber(seq: number, prefix = 'INV', _fiscalYear = ''): string {
  const formattedSeq = String(seq).padStart(3, '0');
  if (!prefix || prefix.trim() === '') {
    return formattedSeq;
  }
  return `${prefix}-${formattedSeq}`;
}
