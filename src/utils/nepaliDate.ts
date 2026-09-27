/**
 * Comprehensive Bikram Sambat (BS) <-> Gregorian (AD) Date Converter Engine
 * Covers BS years 2060 to 2095 (1943 AD to 2039 AD)
 * PNP TECH TRADERS Billing & Invoice System
 */

export interface BSDate {
  year: number;
  month: number; // 1-12 (Baishakh to Chaitra)
  day: number;   // 1-32
}

export interface ADDate {
  year: number;
  month: number; // 1-12
  day: number;   // 1-31
}

export const NEPALI_MONTHS_EN = [
  'Baishakh', 'Jestha', 'Ashadh', 'Shrawan', 
  'Bhadra', 'Ashwin', 'Kartik', 'Mangsir', 
  'Poush', 'Magh', 'Falgun', 'Chaitra'
] as const;

export const NEPALI_MONTHS_NP = [
  'वैशाख', 'जेठ', 'असार', 'साउन',
  'भदौ', 'असोज', 'कात्तिक', 'मङ्सिर',
  'पुस', 'माघ', 'फागुन', 'चैत'
] as const;

export const NEPALI_DAYS_EN = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
] as const;

export const NEPALI_DAYS_NP = [
  'आइतबार', 'सोमबार', 'मङ्गलबार', 'बुधबार', 'बिहीबार', 'शुक्रबार', 'शनिबार'
] as const;

export const NEPALI_DAYS_SHORT_NP = [
  'आइत', 'सोम', 'मङ्गल', 'बुध', 'बिही', 'शुक्र', 'शनि'
] as const;

// Number of days in each BS month from 2060 BS to 2095 BS (Verified Astronomical BS Calendar Data)
export const BS_DATA: { [year: number]: number[] } = {
  2060: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2061: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2062: [30, 32, 31, 32, 31, 31, 29, 30, 29, 30, 29, 31],
  2063: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2064: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2065: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2066: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 29, 31],
  2067: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2068: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2069: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2070: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30],
  2071: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2072: [31, 32, 31, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2073: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2074: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2075: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2076: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
  2077: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2078: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2079: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2080: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
  2081: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2082: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2083: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2084: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2085: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2086: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2087: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2088: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2089: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2090: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2091: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2092: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2093: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 29, 31],
  2094: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2095: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30]
};

// Reference anchor point: 2080-01-01 BS = 2023-04-14 AD (Friday)
const ANCHOR_BS: BSDate = { year: 2080, month: 1, day: 1 };
const ANCHOR_AD: ADDate = { year: 2023, month: 4, day: 14 };

/**
 * Get the number of days in a specific BS Month and Year
 */
export function getDaysInBSMonth(year: number, month: number): number {
  const months = BS_DATA[year] || BS_DATA[2080];
  if (month < 1 || month > 12) return 30;
  return months[month - 1] || 30;
}

/**
 * Calculate total days elapsed from Anchor BS (2080-01-01) to given BS Date
 */
function getDaysFromAnchorBS(bs: BSDate): number {
  let days = 0;
  if (bs.year >= ANCHOR_BS.year) {
    for (let y = ANCHOR_BS.year; y < bs.year; y++) {
      const months = BS_DATA[y] || BS_DATA[2080];
      days += months.reduce((acc, d) => acc + d, 0);
    }
    const months = BS_DATA[bs.year] || BS_DATA[2080];
    for (let m = 1; m < bs.month; m++) {
      days += months[m - 1];
    }
    days += (bs.day - 1);
  } else {
    for (let y = bs.year; y < ANCHOR_BS.year; y++) {
      const months = BS_DATA[y] || BS_DATA[2080];
      days -= months.reduce((acc, d) => acc + d, 0);
    }
    const months = BS_DATA[bs.year] || BS_DATA[2080];
    for (let m = 1; m < bs.month; m++) {
      days += months[m - 1];
    }
    days += (bs.day - 1);
  }
  return days;
}

/**
 * Parses and sanitizes a BS date string into year, month, day.
 * Supports formats: '2081-05-19', '2081/05/19', '2081.05.19', '20810519', '2081-5-19'
 */
export function parseBSDate(bsString: string): BSDate | null {
  if (!bsString || typeof bsString !== 'string') return null;
  const cleaned = bsString.trim().replace(/[/.]/g, '-');
  
  // Format: YYYY-MM-DD or YYYY-M-D
  if (cleaned.includes('-')) {
    const parts = cleaned.split('-').map(Number);
    if (parts.length === 3 && !parts.some(isNaN)) {
      const [year, month, day] = parts;
      if (year >= 2000 && year <= 2100 && month >= 1 && month <= 12) {
        const maxDays = getDaysInBSMonth(year, month);
        const clampedDay = Math.min(Math.max(1, day), maxDays);
        return { year, month, day: clampedDay };
      }
    }
  }

  // Format: YYYYMMDD (8 digits continuous)
  if (/^\d{8}$/.test(cleaned)) {
    const year = parseInt(cleaned.slice(0, 4), 10);
    const month = parseInt(cleaned.slice(4, 6), 10);
    const day = parseInt(cleaned.slice(6, 8), 10);
    if (year >= 2000 && year <= 2100 && month >= 1 && month <= 12) {
      const maxDays = getDaysInBSMonth(year, month);
      const clampedDay = Math.min(Math.max(1, day), maxDays);
      return { year, month, day: clampedDay };
    }
  }

  return null;
}

/**
 * Checks if a string is a complete and valid BS date
 */
export function isValidBSDate(bsString: string): boolean {
  return parseBSDate(bsString) !== null;
}

/**
 * Converts AD Date (YYYY-MM-DD or Date object) to BS Date string (YYYY-MM-DD)
 */
export function convertADToBS(adInput: string | Date): string {
  if (!adInput) return '';

  let adParts: number[];
  if (adInput instanceof Date) {
    adParts = [adInput.getFullYear(), adInput.getMonth() + 1, adInput.getDate()];
  } else {
    const cleaned = String(adInput).trim().replace(/[/.]/g, '-');
    adParts = cleaned.split('-').map(Number);
  }

  if (adParts.length !== 3 || adParts.some(isNaN)) return typeof adInput === 'string' ? adInput : '';

  const targetDate = new Date(Date.UTC(adParts[0], adParts[1] - 1, adParts[2]));
  const anchorDate = new Date(Date.UTC(ANCHOR_AD.year, ANCHOR_AD.month - 1, ANCHOR_AD.day));

  const diffTime = targetDate.getTime() - anchorDate.getTime();
  let diffDays = Math.round(diffTime / (1000 * 3600 * 24));

  let year = ANCHOR_BS.year;
  let month = ANCHOR_BS.month;
  let day = ANCHOR_BS.day;

  if (diffDays >= 0) {
    while (diffDays > 0) {
      const daysInCurrentMonth = (BS_DATA[year] || BS_DATA[2080])[month - 1];
      if (diffDays >= daysInCurrentMonth - (day - 1)) {
        diffDays -= (daysInCurrentMonth - (day - 1));
        day = 1;
        month++;
        if (month > 12) {
          month = 1;
          year++;
        }
      } else {
        day += diffDays;
        diffDays = 0;
      }
    }
  } else {
    let absDays = Math.abs(diffDays);
    while (absDays > 0) {
      if (day > absDays) {
        day -= absDays;
        absDays = 0;
      } else {
        absDays -= day;
        month--;
        if (month < 1) {
          month = 12;
          year--;
        }
        const daysInPrevMonth = (BS_DATA[year] || BS_DATA[2080])[month - 1];
        day = daysInPrevMonth;
      }
    }
  }

  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

/**
 * Converts BS Date string (YYYY-MM-DD) to AD Date string (YYYY-MM-DD)
 */
export function convertBSToAD(bsString: string): string {
  if (!bsString) return '';
  const parsed = parseBSDate(bsString);
  if (!parsed) return '';

  const daysOffset = getDaysFromAnchorBS(parsed);

  const anchorDate = new Date(Date.UTC(ANCHOR_AD.year, ANCHOR_AD.month - 1, ANCHOR_AD.day));
  anchorDate.setUTCDate(anchorDate.getUTCDate() + daysOffset);

  const yyyy = anchorDate.getUTCFullYear();
  const mm = String(anchorDate.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(anchorDate.getUTCDate()).padStart(2, '0');

  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Derives Nepali Fiscal Year from BS date string (e.g. "2083-04-30" -> "2083-84")
 * Nepali Fiscal Year starts Shrawan 1 (Month 4)
 */
export function getFiscalYearFromBS(bsDateString: string): string {
  if (!bsDateString) return '2083-84';
  const parsed = parseBSDate(bsDateString);
  if (!parsed) return '2083-84';

  const { year, month } = parsed;
  if (month >= 4) {
    const nextYearShort = String(year + 1).slice(-2);
    return `${year}-${nextYearShort}`;
  } else {
    const prevYear = year - 1;
    const currYearShort = String(year).slice(-2);
    return `${prevYear}-${currYearShort}`;
  }
}

/**
 * Converts English digits (0-9) to Nepali Devanagari digits (०-९)
 */
export function toNepaliDigits(numStr: string | number): string {
  if (numStr === undefined || numStr === null) return '';
  const npDigits = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];
  return String(numStr).replace(/[0-9]/g, (digit) => npDigits[parseInt(digit, 10)]);
}

/**
 * Format BS Date for Display (e.g., "19 Bhadra 2083" or "१९ भदौ २०८३")
 */
export function formatBSDate(bsString: string, inDevanagari = false): string {
  if (!bsString) return '';
  const parsed = parseBSDate(bsString);
  if (!parsed) return bsString;

  const { year, month, day } = parsed;
  const monthName = inDevanagari ? NEPALI_MONTHS_NP[month - 1] : NEPALI_MONTHS_EN[month - 1];
  
  if (inDevanagari) {
    const npDay = toNepaliDigits(day);
    const npYear = toNepaliDigits(year);
    return `${npDay} ${monthName} ${npYear}`;
  }

  const formattedDay = String(day).padStart(2, '0');
  return `${formattedDay} ${monthName} ${year}`;
}

/**
 * Returns Day of Week (0 = Sunday to 6 = Saturday) for any BS date
 */
export function getBSDayOfWeek(bsString: string): { dayIndex: number; dayNameEN: string; dayNameNP: string } {
  const adString = convertBSToAD(bsString);
  if (!adString) {
    const today = new Date();
    const idx = today.getDay();
    return { dayIndex: idx, dayNameEN: NEPALI_DAYS_EN[idx], dayNameNP: NEPALI_DAYS_NP[idx] };
  }
  const [y, m, d] = adString.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const idx = date.getDay();
  return { dayIndex: idx, dayNameEN: NEPALI_DAYS_EN[idx], dayNameNP: NEPALI_DAYS_NP[idx] };
}

/**
 * Returns full formatted BS date with day name: e.g. "१९ भाद्र २०८३, बिहीबार" or "19 Bhadra 2083, Thursday"
 */
export function formatBSDateFull(bsString: string, inDevanagari = true): string {
  if (!bsString) return '';
  const dateFormatted = formatBSDate(bsString, inDevanagari);
  const { dayNameNP, dayNameEN } = getBSDayOfWeek(bsString);
  return inDevanagari ? `${dateFormatted}, ${dayNameNP}` : `${dateFormatted}, ${dayNameEN}`;
}

/**
 * Get Today's Date in both BS and AD with full meta information
 */
export function getTodayDates() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const dateAD = `${yyyy}-${mm}-${dd}`;
  const dateBS = convertADToBS(dateAD);
  const fiscalYear = getFiscalYearFromBS(dateBS);
  const dayIndex = today.getDay();

  const parsedBS = parseBSDate(dateBS) || { year: 2083, month: 5, day: 21 };
  const monthNameEN = NEPALI_MONTHS_EN[parsedBS.month - 1];
  const monthNameNP = NEPALI_MONTHS_NP[parsedBS.month - 1];
  const dayNameEN = NEPALI_DAYS_EN[dayIndex];
  const dayNameNP = NEPALI_DAYS_NP[dayIndex];

  return {
    dateAD,
    dateBS,
    fiscalYear,
    monthNameEN,
    monthNameNP,
    dayNameEN,
    dayNameNP,
    dayIndex,
    formattedBS: formatBSDate(dateBS, false),
    formattedBSDevanagari: formatBSDateFull(dateBS, true),
    timeStr: today.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  };
}

/**
 * Get Relative Dates (Yesterday, Tomorrow, First Day of Month)
 */
export function getYesterdayDates(): { dateAD: string; dateBS: string; fiscalYear: string } {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const dateAD = `${yyyy}-${mm}-${dd}`;
  const dateBS = convertADToBS(dateAD);
  const fiscalYear = getFiscalYearFromBS(dateBS);
  return { dateAD, dateBS, fiscalYear };
}

export function getTomorrowDates(): { dateAD: string; dateBS: string; fiscalYear: string } {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const dateAD = `${yyyy}-${mm}-${dd}`;
  const dateBS = convertADToBS(dateAD);
  const fiscalYear = getFiscalYearFromBS(dateBS);
  return { dateAD, dateBS, fiscalYear };
}

export function getFirstDayOfCurrentBSMonth(): { dateAD: string; dateBS: string; fiscalYear: string } {
  const { dateBS } = getTodayDates();
  const parsed = parseBSDate(dateBS) || { year: 2083, month: 5, day: 1 };
  const firstBS = `${parsed.year}-${String(parsed.month).padStart(2, '0')}-01`;
  const firstAD = convertBSToAD(firstBS);
  const fiscalYear = getFiscalYearFromBS(firstBS);
  return { dateAD: firstAD, dateBS: firstBS, fiscalYear };
}
