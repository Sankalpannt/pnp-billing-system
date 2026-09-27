import React, { useState, useEffect } from 'react';
import { 
  Calendar, ChevronDown, Sparkles 
} from 'lucide-react';
import { 
  convertADToBS, 
  convertBSToAD, 
  getTodayDates, 
  getYesterdayDates, 
  getFirstDayOfCurrentBSMonth, 
  getFiscalYearFromBS, 
  parseBSDate, 
  getDaysInBSMonth, 
  formatBSDateFull, 
  NEPALI_MONTHS_EN, 
  NEPALI_MONTHS_NP,
  toNepaliDigits 
} from '../utils/nepaliDate';
import { useLiveClock } from '../hooks/useLiveClock';

interface NepaliDatePickerProps {
  dateBS: string;
  dateAD: string;
  onChange: (dateBS: string, dateAD: string, fiscalYear: string) => void;
  labelBS?: string;
  labelAD?: string;
  showQuickPresets?: boolean;
}

export const NepaliDatePicker: React.FC<NepaliDatePickerProps> = ({
  dateBS,
  dateAD,
  onChange,
  labelBS = 'Mitti Date (BS)',
  labelAD = 'Roman Date (AD)',
  showQuickPresets = true,
}) => {
  const liveClock = useLiveClock();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [tempBSInput, setTempBSInput] = useState(dateBS);

  // Sync temp input when prop dateBS changes
  useEffect(() => {
    setTempBSInput(dateBS);
  }, [dateBS]);

  const parsed = parseBSDate(dateBS) || parseBSDate(liveClock.dateBS) || { year: 2083, month: 5, day: 21 };
  const [selectedYear, setSelectedYear] = useState<number>(parsed.year);
  const [selectedMonth, setSelectedMonth] = useState<number>(parsed.month);
  const [selectedDay, setSelectedDay] = useState<number>(parsed.day);

  useEffect(() => {
    if (parsed) {
      setSelectedYear(parsed.year);
      setSelectedMonth(parsed.month);
      setSelectedDay(parsed.day);
    }
  }, [dateBS]);

  const maxDaysInMonth = getDaysInBSMonth(selectedYear, selectedMonth);

  // Handle typing directly into BS input
  const handleBSInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTempBSInput(val);

    const parsedInput = parseBSDate(val);
    if (parsedInput) {
      const formattedBS = `${parsedInput.year}-${String(parsedInput.month).padStart(2, '0')}-${String(parsedInput.day).padStart(2, '0')}`;
      const calculatedAD = convertBSToAD(formattedBS);
      const fy = getFiscalYearFromBS(formattedBS);
      if (calculatedAD) {
        onChange(formattedBS, calculatedAD, fy);
      }
    }
  };

  // Handle typing or picking in AD input
  const handleADInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (!val) return;
    const calculatedBS = convertADToBS(val);
    const fy = getFiscalYearFromBS(calculatedBS);
    onChange(calculatedBS, val, fy);
  };

  // Set to Live Today's Date
  const handleSetToday = () => {
    const today = getTodayDates();
    onChange(today.dateBS, today.dateAD, today.fiscalYear);
    setTempBSInput(today.dateBS);
  };

  // Set to Yesterday
  const handleSetYesterday = () => {
    const yest = getYesterdayDates();
    onChange(yest.dateBS, yest.dateAD, yest.fiscalYear);
    setTempBSInput(yest.dateBS);
  };

  // Set to 1st Day of Current Month
  const handleSetFirstOfMonth = () => {
    const first = getFirstDayOfCurrentBSMonth();
    onChange(first.dateBS, first.dateAD, first.fiscalYear);
    setTempBSInput(first.dateBS);
  };

  // Apply dropdown selection
  const handleApplyDropdown = (y: number, m: number, d: number) => {
    const maxD = getDaysInBSMonth(y, m);
    const safeDay = Math.min(d, maxD);
    const newBS = `${y}-${String(m).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`;
    const newAD = convertBSToAD(newBS);
    const fy = getFiscalYearFromBS(newBS);
    onChange(newBS, newAD, fy);
    setTempBSInput(newBS);
    setIsDropdownOpen(false);
  };

  const isToday = liveClock.isTodayBS(dateBS);
  const displayFormattedBS = formatBSDateFull(dateBS, true);

  // Available BS years in picker
  const yearsList = Array.from({ length: 31 }, (_, i) => 2065 + i); // 2065 to 2095

  return (
    <div className="space-y-3">
      {/* Header with Title & Auto-Set Today Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Calendar className="h-4 w-4 text-sky-400" />
          <span className="text-xs font-bold text-white tracking-wide">Nepali Dual Date System</span>
        </div>

        {/* Live Today Sync Button */}
        <button
          type="button"
          onClick={handleSetToday}
          className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-xl text-xs font-bold transition-all border shadow-sm ${
            isToday
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-emerald-500/10'
              : 'bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white border-sky-400/40 shadow-sky-500/20 animate-pulse'
          }`}
          title="Click to automatically set date to Today's date"
        >
          <Sparkles className="h-3.5 w-3.5 text-amber-300" />
          <span>{isToday ? '✓ Live Today' : '⚡ Set Today'}</span>
        </button>
      </div>

      {/* Inputs Grid: BS Date & AD Date */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {/* BS Date Input with Dropdown Toggle */}
        <div className="relative">
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] font-semibold text-slate-300">
              {labelBS} <span className="text-sky-400 font-mono text-[10px]">(वि.सं.)</span>
            </label>
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="text-[10px] text-sky-400 hover:text-sky-300 font-medium flex items-center space-x-0.5"
            >
              <span>Nepali Calendar</span>
              <ChevronDown className="h-3 w-3" />
            </button>
          </div>

          <div className="relative flex items-center">
            <input
              type="text"
              value={tempBSInput}
              onChange={handleBSInputChange}
              placeholder="2083-05-21"
              className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl px-3 py-2 text-xs text-sky-300 font-mono font-bold tracking-wider"
            />
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="absolute right-2.5 text-slate-400 hover:text-sky-300"
              title="Open Nepali Date Picker"
            >
              <Calendar className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* AD Date Input */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] font-semibold text-slate-300">
              {labelAD} <span className="text-slate-400 font-mono text-[10px]">(Gregorian)</span>
            </label>
          </div>
          <input
            type="date"
            value={dateAD}
            onChange={handleADInputChange}
            className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono"
          />
        </div>
      </div>

      {/* Date Devanagari Banner & Status */}
      <div className="px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between text-[11px]">
        <span className="text-sky-300 font-medium truncate">
          🇳🇵 {displayFormattedBS || formatBSDateFull(dateBS, true)}
        </span>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800 ml-2 shrink-0">
          FY {getFiscalYearFromBS(dateBS)}
        </span>
      </div>

      {/* Quick Presets Bar */}
      {showQuickPresets && (
        <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Quick:</span>
          
          <button
            type="button"
            onClick={handleSetToday}
            className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold transition-all border ${
              isToday
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border-slate-800'
            }`}
          >
            ⚡ आज (Today)
          </button>

          <button
            type="button"
            onClick={handleSetYesterday}
            className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-all"
          >
            हिजो (Yesterday)
          </button>

          <button
            type="button"
            onClick={handleSetFirstOfMonth}
            className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-all"
          >
            १ गते (1st Day)
          </button>
        </div>
      )}

      {/* Interactive Nepali Calendar Dropdown Popover */}
      {isDropdownOpen && (
        <div className="p-3.5 bg-slate-950 border border-sky-500/40 rounded-2xl shadow-2xl space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-bold text-white flex items-center space-x-1.5">
              <span>📅 नेपाली मिति छनोट (BS Selector)</span>
            </span>
            <button
              type="button"
              onClick={() => setIsDropdownOpen(false)}
              className="text-slate-400 hover:text-white text-xs px-1.5 py-0.5 rounded hover:bg-slate-800"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {/* Year Selector */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-1">वर्ष (Year)</label>
              <select
                value={selectedYear}
                onChange={(e) => {
                  const y = Number(e.target.value);
                  setSelectedYear(y);
                  handleApplyDropdown(y, selectedMonth, selectedDay);
                }}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2 py-1.5 text-xs text-sky-300 font-mono font-bold"
              >
                {yearsList.map((yr) => (
                  <option key={yr} value={yr}>
                    {yr} ({toNepaliDigits(yr)})
                  </option>
                ))}
              </select>
            </div>

            {/* Month Selector */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-1">महिना (Month)</label>
              <select
                value={selectedMonth}
                onChange={(e) => {
                  const m = Number(e.target.value);
                  setSelectedMonth(m);
                  handleApplyDropdown(selectedYear, m, selectedDay);
                }}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2 py-1.5 text-xs text-sky-300 font-semibold"
              >
                {NEPALI_MONTHS_NP.map((mName, idx) => (
                  <option key={idx + 1} value={idx + 1}>
                    {idx + 1}. {mName} ({NEPALI_MONTHS_EN[idx]})
                  </option>
                ))}
              </select>
            </div>

            {/* Day Selector */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-1">गते (Day)</label>
              <select
                value={Math.min(selectedDay, maxDaysInMonth)}
                onChange={(e) => {
                  const d = Number(e.target.value);
                  setSelectedDay(d);
                  handleApplyDropdown(selectedYear, selectedMonth, d);
                }}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2 py-1.5 text-xs text-sky-300 font-mono font-bold"
              >
                {Array.from({ length: maxDaysInMonth }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>
                    {String(d).padStart(2, '0')} ({toNepaliDigits(d)})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={handleSetToday}
              className="text-[11px] text-sky-400 hover:text-sky-300 font-bold flex items-center space-x-1"
            >
              <span>⚡ आजको मिति सेट गर्नुहोस्</span>
            </button>

            <button
              type="button"
              onClick={() => handleApplyDropdown(selectedYear, selectedMonth, selectedDay)}
              className="px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold transition-all shadow"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
