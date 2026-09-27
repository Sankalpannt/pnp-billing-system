import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  getTodayDates, 
  toNepaliDigits, 
  parseBSDate 
} from '../utils/nepaliDate';

export interface LiveClockState {
  dateAD: string;         // '2026-09-03'
  dateBS: string;         // '2083-05-19'
  fiscalYear: string;     // '2083-84'
  dayNameEN: string;      // 'Thursday'
  dayNameNP: string;      // 'बिहीबार'
  monthNameEN: string;    // 'Bhadra'
  monthNameNP: string;    // 'भदौ'
  formattedBS: string;    // '19 Bhadra 2083'
  formattedBSDevanagari: string; // '१९ भाद्र २०८३, बिहीबार'
  time12: string;         // '08:35:10 PM'
  time24: string;         // '20:35:10'
  timeDevanagari: string; // '०८:३५:१०'
  hours: number;
  minutes: number;
  seconds: number;
  isLive: boolean;
}

export const useLiveClock = (intervalMs = 1000): LiveClockState & {
  refreshNow: () => void;
  isTodayBS: (bsDate: string) => boolean;
  isTodayAD: (adDate: string) => boolean;
} => {
  const getSnapshot = (): LiveClockState => {
    const today = getTodayDates();
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();

    const hh = String(hours % 12 || 12).padStart(2, '0');
    const mm = String(minutes).padStart(2, '0');
    const ss = String(seconds).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const time12 = `${hh}:${mm}:${ss} ${ampm}`;

    const hh24 = String(hours).padStart(2, '0');
    const time24 = `${hh24}:${mm}:${ss}`;
    const timeDevanagari = `${toNepaliDigits(hh)}:${toNepaliDigits(mm)}:${toNepaliDigits(ss)} ${ampm === 'PM' ? 'अपराह्न' : 'पूर्वाह्न'}`;

    return {
      ...today,
      time12,
      time24,
      timeDevanagari,
      hours,
      minutes,
      seconds,
      isLive: true
    };
  };

  const [clockState, setClockState] = useState<LiveClockState>(getSnapshot);
  const previousDateAD = useRef(clockState.dateAD);

  const refreshNow = useCallback(() => {
    setClockState(getSnapshot());
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      const current = getSnapshot();
      setClockState(current);

      // Auto-Detect Midnight / Day Rollover
      if (previousDateAD.current && previousDateAD.current !== current.dateAD) {
        previousDateAD.current = current.dateAD;
        window.dispatchEvent(new CustomEvent('pnp_date_rollover', {
          detail: { dateAD: current.dateAD, dateBS: current.dateBS, fiscalYear: current.fiscalYear }
        }));
      }
    }, intervalMs);

    return () => clearInterval(timer);
  }, [intervalMs]);

  const isTodayBS = useCallback((bsDate: string) => {
    if (!bsDate) return false;
    const p1 = parseBSDate(bsDate);
    const p2 = parseBSDate(clockState.dateBS);
    if (!p1 || !p2) return bsDate.trim() === clockState.dateBS;
    return p1.year === p2.year && p1.month === p2.month && p1.day === p2.day;
  }, [clockState.dateBS]);

  const isTodayAD = useCallback((adDate: string) => {
    if (!adDate) return false;
    return adDate.trim() === clockState.dateAD;
  }, [clockState.dateAD]);

  return {
    ...clockState,
    refreshNow,
    isTodayBS,
    isTodayAD
  };
};
