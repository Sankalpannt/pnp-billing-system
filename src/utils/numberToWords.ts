/**
 * Converts a numeric total to formal English words in Nepalese Rupees (NPR)
 * Example: 13770 -> "Rupees Thirteen Thousand Seven Hundred Seventy Only"
 * Example: 1250000.50 -> "Rupees Twelve Lakh Fifty Thousand and Paisa Fifty Only"
 */

const ones = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen'
];

const tens = [
  '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
];

function convertLessThanThousand(num: number): string {
  if (num === 0) return '';
  
  let result = '';
  
  if (num >= 100) {
    result += ones[Math.floor(num / 100)] + ' Hundred ';
    num %= 100;
  }
  
  if (num >= 20) {
    result += tens[Math.floor(num / 10)] + (num % 10 !== 0 ? ' ' + ones[num % 10] : '');
  } else if (num > 0) {
    result += ones[num];
  }
  
  return result.trim();
}

/**
 * Convert number using Nepalese/Indian system (Lakh, Crore, Thousand)
 */
export function numberToWordsNPR(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return 'Rupees Zero Only';
  }

  // Round to 2 decimal places
  amount = Math.round(amount * 100) / 100;

  if (amount === 0) {
    return 'Rupees Zero Only';
  }

  const integerPart = Math.floor(Math.abs(amount));
  const decimalPart = Math.round((Math.abs(amount) - integerPart) * 100);

  let words = '';

  let temp = integerPart;

  // Crore (1,00,00,000)
  const crore = Math.floor(temp / 10000000);
  temp %= 10000000;

  // Lakh (1,00,000)
  const lakh = Math.floor(temp / 100000);
  temp %= 100000;

  // Thousand (1,000)
  const thousand = Math.floor(temp / 1000);
  temp %= 1000;

  // Hundreds & Below
  const hundred = temp;

  if (crore > 0) {
    words += convertLessThanThousand(crore) + ' Crore ';
  }

  if (lakh > 0) {
    words += convertLessThanThousand(lakh) + ' Lakh ';
  }

  if (thousand > 0) {
    words += convertLessThanThousand(thousand) + ' Thousand ';
  }

  if (hundred > 0) {
    words += convertLessThanThousand(hundred);
  }

  words = words.trim();

  let finalString = `Rupees ${words}`;

  if (decimalPart > 0) {
    const paisaWords = convertLessThanThousand(decimalPart);
    finalString += ` and Paisa ${paisaWords}`;
  }

  finalString += ' Only';

  return finalString;
}
