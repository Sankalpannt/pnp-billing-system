import { useState, useEffect, useRef, useCallback } from 'react';
import { useInvoiceStore } from '../store/useInvoiceStore';

export interface ScannedPayload {
  rawText: string;
  serialNumber?: string;
  tagNumber?: string;
  sectionName?: string;
  model?: string;
  brand?: string;
  timestamp?: number;
}

export interface TagRecord {
  tagNumber: string;
  sectionName?: string;
  serials: string[];
  items: Array<ScannedPayload & { receivedAt: string }>;
  createdAt: string;
  updatedAt: string;
}

export interface NetworkInterface {
  interface: string;
  ip: string;
}

export interface MobileDevice {
  id: string;
  deviceName: string;
  connectedAt: string;
}

// Crisp modern Web Audio chime for successful wireless scan receipt
function playDesktopScanChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') ctx.resume();

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    // 2-tone melodic chirp
    osc.frequency.setValueAtTime(1320, now); // E6
    osc.frequency.exponentialRampToValueAtTime(2640, now + 0.08); // E7

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.18);
  } catch (e) {
    // ignore audio block before user interaction
  }
}

// React-compatible DOM input value injector with simulated Enter keypress
export function injectIntoFocusedInput(text: string): boolean {
  let active = document.activeElement;

  // If no editable input is focused, fall back to dedicated #active-bill-scan-input or the latest item description input
  if (
    !active ||
    !(active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) ||
    active.readOnly ||
    active.disabled
  ) {
    const fallback = (
      document.querySelector('#active-bill-scan-input') ||
      document.querySelector('input[data-scanner-input="true"]') ||
      document.querySelector('tbody tr:last-child input[type="text"]')
    ) as HTMLInputElement | null;

    if (fallback && !fallback.readOnly && !fallback.disabled) {
      active = fallback;
      fallback.focus();
    }
  }

  if (
    active &&
    (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) &&
    !active.readOnly &&
    !active.disabled
  ) {
    const isInput = active instanceof HTMLInputElement;
    const prototype = isInput ? window.HTMLInputElement.prototype : window.HTMLTextAreaElement.prototype;
    const valueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;

    const isDedicatedScanBar = active.id === 'active-bill-scan-input' || active.dataset.scannerInput === 'true';
    const currentVal = active.value || '';
    const newVal = isDedicatedScanBar ? text : (currentVal ? `${currentVal} ${text}` : text);

    if (valueSetter) {
      valueSetter.call(active, newVal);
    } else {
      active.value = newVal;
    }

    // Trigger React controlled input onChange and onInput
    active.dispatchEvent(new Event('input', { bubbles: true }));
    active.dispatchEvent(new Event('change', { bubbles: true }));

    // Emulate full Enter keydown, keypress, and keyup event cycle
    const keyEventInit = { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true };
    active.dispatchEvent(new KeyboardEvent('keydown', keyEventInit));
    active.dispatchEvent(new KeyboardEvent('keypress', keyEventInit));
    active.dispatchEvent(new KeyboardEvent('keyup', keyEventInit));
    return true;
  }
  return false;
}

export function useWirelessScanner() {
  const [isServerOnline, setIsServerOnline] = useState(false);
  const [isPhoneConnected, setIsPhoneConnected] = useState(false);
  const [phoneDevices, setPhoneDevices] = useState<MobileDevice[]>([]);
  const [networkInterfaces, setNetworkInterfaces] = useState<NetworkInterface[]>([]);
  const [selectedIp, setSelectedIp] = useState<string>('127.0.0.1');
  const [lastScannedData, setLastScannedData] = useState<ScannedPayload | null>(null);
  const [scanHistory, setScanHistory] = useState<Array<ScannedPayload & { receivedAt: string }>>(() => {
    try {
      const saved = localStorage.getItem('pnp_scanner_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Persistent Tag Number records: Tag Number -> TagRecord
  const [tagRecords, setTagRecords] = useState<Record<string, TagRecord>>(() => {
    try {
      const saved = localStorage.getItem('pnp_scanner_tag_records');
      return saved ? JSON.parse(saved) : {
        'TAG-01': {
          tagNumber: 'TAG-01',
          sectionName: 'Main Entrance & Gate Cameras',
          serials: ['HK20839218', 'HK20839219', 'HK20839220', 'HK20839221'],
          items: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        'BOX-A': {
          tagNumber: 'BOX-A',
          sectionName: '8CH 4K NVR & Storage Unit',
          serials: ['DH7719283-NVR', 'WD-PURPLE-4TB'],
          items: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      };
    } catch {
      return {};
    }
  });

  const [toastMessage, setToastMessage] = useState<{ title: string; subtitle: string; id: number; tagNumber?: string } | null>(null);

  // Persist history & tag records
  useEffect(() => {
    try {
      localStorage.setItem('pnp_scanner_history', JSON.stringify(scanHistory.slice(0, 50)));
    } catch {}
  }, [scanHistory]);

  useEffect(() => {
    try {
      localStorage.setItem('pnp_scanner_tag_records', JSON.stringify(tagRecords));
    } catch {}
  }, [tagRecords]);

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);
  const isComponentMounted = useRef(true);

  // Access invoice store actions
  const {
    activeTab,
    currentInvoice,
    catalog,
    addLineItem,
    setCctvDetails
  } = useInvoiceStore();

  // Fetch local network IP addresses from relay server HTTP endpoint
  const fetchNetworkInfo = useCallback(async () => {
    try {
      const res = await fetch('http://localhost:8090/api/network-info');
      if (res.ok) {
        const data = await res.json();
        if (data.interfaces && Array.isArray(data.interfaces)) {
          setNetworkInterfaces(data.interfaces);
          // Pick first non-loopback IP or default
          const nonLoop = data.interfaces.find((i: NetworkInterface) => i.ip !== '127.0.0.1');
          setSelectedIp(nonLoop ? nonLoop.ip : data.primaryIp || '127.0.0.1');
        }
      }
    } catch (e) {
      // Server might still be booting
    }
  }, []);

  // Process incoming scanned barcode payload
  const handleIncomingScan = useCallback((payload: ScannedPayload, deviceName = 'Mobile Phone') => {
    const rawText = payload.rawText || payload.serialNumber || '';
    if (!rawText.trim()) return;

    // 1. Play audio confirmation chime
    playDesktopScanChime();

    // 2. Record to history
    const historyItem = {
      ...payload,
      receivedAt: new Date().toLocaleTimeString()
    };
    setLastScannedData(payload);
    setScanHistory(prev => [historyItem, ...prev.slice(0, 49)]);

    // 3. Update Tag records mapping if tagNumber is provided
    const tag = payload.tagNumber?.trim();
    const sn = payload.serialNumber || rawText;

    if (tag) {
      setTagRecords(prev => {
        const existing = prev[tag] || {
          tagNumber: tag,
          sectionName: payload.sectionName || `Section ${tag}`,
          serials: [],
          items: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        const updatedSerials = Array.from(new Set([...existing.serials, sn]));
        const updatedItems = [historyItem, ...(existing.items || [])].slice(0, 30);

        return {
          ...prev,
          [tag]: {
            ...existing,
            sectionName: payload.sectionName || existing.sectionName,
            serials: updatedSerials,
            items: updatedItems,
            updatedAt: new Date().toISOString()
          }
        };
      });
    }

    // 4. Attempt direct DOM injection into the currently focused input
    const wasInjected = injectIntoFocusedInput(rawText);

    // 5. If not focused on an active input, perform smart ingestion into the Invoice Store
    let actionDesc = 'Injected into active field';
    if (!wasInjected) {
      if (activeTab === 'create') {
        // Check if item matches any catalog item description or code
        const matchedCat = catalog.find(c =>
          (c.code && rawText.includes(c.code)) ||
          (c.description && rawText.toLowerCase().includes(c.description.toLowerCase())) ||
          (payload.model && c.description.toLowerCase().includes(payload.model.toLowerCase()))
        );

        if (matchedCat) {
          addLineItem({
            description: matchedCat.description,
            unit: matchedCat.unit,
            listPrice: matchedCat.price,
            qty: 1
          });
          actionDesc = `Added "${matchedCat.description}" to bill items`;
        } else if (payload.model) {
          addLineItem({
            description: `${payload.brand ? payload.brand + ' ' : ''}${payload.model}`,
            unit: 'Pcs',
            listPrice: 0,
            qty: 1
          });
          actionDesc = `Added "${payload.model}" to bill items`;
        }

        // If serial number present, append to invoice serial numbers
        if (sn && (payload.model || sn !== rawText || currentInvoice.docType === 'cctv_invoice')) {
          const existingSN = currentInvoice.serialNumbers || '';
          const snWithTag = tag ? `[${tag}] ${sn}` : sn;
          const updatedSN = existingSN.trim()
            ? `${existingSN.trim()}, ${snWithTag}`
            : snWithTag;
          setCctvDetails(
            currentInvoice.installationSite || '',
            currentInvoice.warrantyInfo || '',
            updatedSN
          );
          if (!matchedCat && !payload.model) {
            actionDesc = tag ? `Saved S/N under tag "${tag}"` : `Appended S/N "${sn}" to invoice`;
          }
        }
      } else {
        actionDesc = tag ? `Tagged [${tag}]: ${rawText}` : `Scanned: ${rawText}`;
      }
    }

    // 6. Display floating notification toast
    const toastId = Date.now();
    setToastMessage({
      title: tag ? `🏷️ [${tag}] ${payload.model || rawText}` : payload.model ? `📷 ${payload.model}` : `⚡ Scanned: ${rawText}`,
      subtitle: `${deviceName} • ${actionDesc}`,
      id: toastId,
      tagNumber: tag
    });

    // Auto dismiss toast after 4.5s
    setTimeout(() => {
      setToastMessage(current => (current && current.id === toastId ? null : current));
    }, 4500);
  }, [activeTab, catalog, currentInvoice, addLineItem, setCctvDetails]);

  // Tag helper actions
  const addCustomTagRecord = useCallback((tagNumber: string, sectionName: string, serials: string[]) => {
    if (!tagNumber.trim()) return;
    const cleanTag = tagNumber.trim().toUpperCase();
    setTagRecords(prev => ({
      ...prev,
      [cleanTag]: {
        tagNumber: cleanTag,
        sectionName: sectionName.trim() || `Tag ${cleanTag}`,
        serials: Array.from(new Set(serials.map(s => s.trim()).filter(Boolean))),
        items: prev[cleanTag]?.items || [],
        createdAt: prev[cleanTag]?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    }));
  }, []);

  const deleteTagRecord = useCallback((tagNumber: string) => {
    setTagRecords(prev => {
      const copy = { ...prev };
      delete copy[tagNumber];
      return copy;
    });
  }, []);

  const getSerialsByTag = useCallback((tagNumber: string): string[] => {
    if (!tagNumber) return [];
    const clean = tagNumber.trim().toUpperCase();
    return tagRecords[clean]?.serials || [];
  }, [tagRecords]);

  // Connect to WebSocket relay server
  const connectWebSocket = useCallback(() => {
    if (socketRef.current) {
      try { socketRef.current.close(); } catch (e) {}
    }

    const ws = new WebSocket('ws://localhost:8090?type=desktop&name=DesktopBilling');
    socketRef.current = ws;

    ws.onopen = () => {
      if (!isComponentMounted.current) return;
      setIsServerOnline(true);
      ws.send(JSON.stringify({ type: 'REGISTER_DESKTOP', deviceName: 'PNP Desktop Billing' }));
      fetchNetworkInfo();
    };

    ws.onmessage = (event) => {
      if (!isComponentMounted.current) return;
      try {
        const msg = JSON.parse(event.data);

        if (msg.type === 'STATUS') {
          setIsPhoneConnected(!!msg.isMobileConnected);
          if (Array.isArray(msg.mobileDevices)) {
            setPhoneDevices(msg.mobileDevices);
          }
        } else if (msg.type === 'INIT_GREETING') {
          if (Array.isArray(msg.interfaces)) {
            setNetworkInterfaces(msg.interfaces);
            const nonLoop = msg.interfaces.find((i: NetworkInterface) => i.ip !== '127.0.0.1');
            if (nonLoop) setSelectedIp(nonLoop.ip);
          }
        } else if (msg.type === 'SCAN_DATA') {
          handleIncomingScan(msg.data, msg.deviceName || 'Mobile Phone');
        }
      } catch (err) {
        console.error('Error parsing WebSocket message:', err);
      }
    };

    ws.onclose = () => {
      if (!isComponentMounted.current) return;
      setIsServerOnline(false);
      setIsPhoneConnected(false);
      // Try to reconnect every 3 seconds
      reconnectTimeoutRef.current = setTimeout(connectWebSocket, 3000);
    };

    ws.onerror = () => {
      if (!isComponentMounted.current) return;
      setIsServerOnline(false);
      try { ws.close(); } catch (e) {}
    };
  }, [fetchNetworkInfo, handleIncomingScan]);

  useEffect(() => {
    isComponentMounted.current = true;
    fetchNetworkInfo();
    connectWebSocket();

    return () => {
      isComponentMounted.current = false;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (socketRef.current) {
        try { socketRef.current.close(); } catch (e) {}
      }
    };
  }, [connectWebSocket, fetchNetworkInfo]);

  // Simulate a test scan from PC
  const simulateScan = (text: string) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'SIMULATE_SCAN',
        payload: {
          rawText: text,
          serialNumber: text.replace(/^SN:/i, ''),
          model: text.includes('DS-') ? text.split(' ')[0] : 'Simulated Item',
          brand: 'Simulator',
          timestamp: Date.now()
        }
      }));
    } else {
      // Local fallback
      handleIncomingScan({
        rawText: text,
        serialNumber: text,
        model: 'Simulated Item',
        timestamp: Date.now()
      }, 'Test Simulator');
    }
  };

  return {
    isServerOnline,
    isPhoneConnected,
    phoneDevices,
    networkInterfaces,
    selectedIp,
    setSelectedIp,
    lastScannedData,
    scanHistory,
    tagRecords,
    addCustomTagRecord,
    deleteTagRecord,
    getSerialsByTag,
    toastMessage,
    dismissToast: () => setToastMessage(null),
    simulateScan,
    refreshNetwork: fetchNetworkInfo
  };
}
