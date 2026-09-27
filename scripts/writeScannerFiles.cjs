const fs = require('fs');
const path = require('path');

const scannerDir = path.resolve('E:/parichiya scanner');

// 1. Write src/services/pcSyncService.ts
const pcSyncServiceContent = `import { soundService } from './soundService';
import { type ParsedCCTVData } from '../utils/parser';

export type SyncStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

class PCSyncService {
  private socket: WebSocket | null = null;
  private serverIp: string = '';
  private serverPort: number = 8090;
  private status: SyncStatus = 'disconnected';
  private reconnectTimer: any = null;
  private shouldReconnect: boolean = true;
  private listeners: Array<(status: SyncStatus, ip: string) => void> = [];
  private ackListeners: Array<(ack: { rawText: string; receivedAt: number }) => void> = [];

  // Duplicate Debounce Buffer (1.5 seconds)
  private lastScannedText: string = '';
  private lastScannedTimestamp: number = 0;
  private readonly DEBOUNCE_TIME_MS = 1500;

  constructor() {
    // Load last saved IP from localStorage
    try {
      const savedIp = localStorage.getItem('parichiya_paired_pc_ip');
      if (savedIp) {
        this.serverIp = savedIp;
      }
    } catch (e) {}
  }

  // Get current device name for desktop identification
  private getDeviceName(): string {
    const ua = navigator.userAgent;
    if (/iPhone/i.test(ua)) return 'Apple iPhone';
    if (/iPad/i.test(ua)) return 'Apple iPad';
    if (/Android/i.test(ua)) {
      const match = ua.match(/Android\\s([0-9.]+);?\\s?([^;)]+)?/);
      return match && match[2] ? match[2].trim() : 'Android Device';
    }
    return 'Mobile Phone Scanner';
  }

  // Set or update PC target IP & connect
  connectToPC(ipOrWsUrl: string, port = 8090) {
    let cleanIp = ipOrWsUrl.trim();
    
    // If user passed a full ws:// or http:// URL or JSON
    if (cleanIp.startsWith('{')) {
      try {
        const parsed = JSON.parse(cleanIp);
        if (parsed.ip) cleanIp = parsed.ip;
        if (parsed.port) port = parsed.port;
      } catch (e) {}
    } else if (cleanIp.includes('://')) {
      try {
        const url = new URL(cleanIp);
        cleanIp = url.hostname;
        if (url.port) port = parseInt(url.port, 10);
      } catch (e) {}
    } else if (cleanIp.includes(':')) {
      const parts = cleanIp.split(':');
      cleanIp = parts[0];
      port = parseInt(parts[1], 10) || 8090;
    }

    this.serverIp = cleanIp;
    this.serverPort = port;
    this.shouldReconnect = true;

    // Save to localStorage
    try {
      localStorage.setItem('parichiya_paired_pc_ip', cleanIp);
      localStorage.setItem('parichiya_paired_pc_port', String(port));
    } catch (e) {}

    this.initSocket();
  }

  // Initialize WebSocket connection
  private initSocket() {
    if (!this.serverIp) return;

    if (this.socket) {
      try {
        this.socket.close();
      } catch (e) {}
      this.socket = null;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.updateStatus('connecting');

    try {
      const wsUrl = \`ws://\${this.serverIp}:\${this.serverPort}?type=mobile&device=\${encodeURIComponent(this.getDeviceName())}\`;
      const ws = new WebSocket(wsUrl);
      this.socket = ws;

      ws.onopen = () => {
        this.updateStatus('connected');
        ws.send(JSON.stringify({
          type: 'REGISTER_MOBILE',
          deviceName: this.getDeviceName(),
          connectedAt: new Date().toISOString()
        }));
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.type === 'SCAN_ACK') {
            // Successful delivery ACK from PC!
            soundService.playScanBeep();
            soundService.triggerVibration(150);

            // Notify ACK subscribers
            this.ackListeners.forEach(listener => listener({
              rawText: msg.rawText,
              receivedAt: msg.receivedAt || Date.now()
            }));
          }
        } catch (e) {
          console.error('Error handling WebSocket message in mobile sync:', e);
        }
      };

      ws.onclose = () => {
        this.updateStatus('disconnected');
        if (this.shouldReconnect && this.serverIp) {
          this.reconnectTimer = setTimeout(() => this.initSocket(), 3500);
        }
      };

      ws.onerror = () => {
        this.updateStatus('error');
        try { ws.close(); } catch (e) {}
      };
    } catch (err) {
      console.error('Failed to instantiate WebSocket:', err);
      this.updateStatus('error');
    }
  }

  // Disconnect from PC
  disconnect() {
    this.shouldReconnect = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.socket) {
      try {
        this.socket.close();
      } catch (e) {}
      this.socket = null;
    }
    this.updateStatus('disconnected');
  }

  // Transmit scanned code payload to PC with 1.5-second duplicate debounce
  sendScan(data: ParsedCCTVData | { rawText: string; serialNumber?: string; model?: string; brand?: string }): boolean {
    const textToCompare = (data.rawText || data.serialNumber || '').trim();
    if (!textToCompare) return false;

    const now = Date.now();

    // 1.5-second Duplicate Debounce Check
    if (
      this.lastScannedText === textToCompare &&
      (now - this.lastScannedTimestamp) < this.DEBOUNCE_TIME_MS
    ) {
      console.log(\`[Debounce] Ignored duplicate scan within \${this.DEBOUNCE_TIME_MS}ms:\`, textToCompare);
      return false;
    }

    this.lastScannedText = textToCompare;
    this.lastScannedTimestamp = now;

    // Send payload over WebSocket if connected
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      try {
        this.socket.send(JSON.stringify({
          type: 'SCAN_EVENT',
          payload: {
            rawText: data.rawText || textToCompare,
            serialNumber: data.serialNumber || (('serialNumber' in data) ? data.serialNumber : textToCompare),
            model: ('model' in data) ? data.model : '',
            brand: ('detectedBrand' in data) ? (data as any).detectedBrand : ('brand' in data) ? data.brand : '',
            timestamp: now
          }
        }));
        return true;
      } catch (err) {
        console.error('Error sending scan payload over WebSocket:', err);
        return false;
      }
    }

    return false;
  }

  // Subscribe to connection status changes
  subscribeStatus(listener: (status: SyncStatus, ip: string) => void): () => void {
    this.listeners.push(listener);
    listener(this.status, this.serverIp);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  // Subscribe to scan ACK delivery confirmations
  subscribeAck(listener: (ack: { rawText: string; receivedAt: number }) => void): () => void {
    this.ackListeners.push(listener);
    return () => {
      this.ackListeners = this.ackListeners.filter(l => l !== listener);
    };
  }

  private updateStatus(newStatus: SyncStatus) {
    this.status = newStatus;
    this.listeners.forEach(listener => listener(newStatus, this.serverIp));
  }

  getStatus(): SyncStatus {
    return this.status;
  }

  getServerIp(): string {
    return this.serverIp;
  }

  isConnected(): boolean {
    return this.status === 'connected' && this.socket?.readyState === WebSocket.OPEN;
  }
}

export const pcSyncService = new PCSyncService();
`;

// 2. Write src/components/PairPCModal.tsx
const pairPCModalContent = `import React, { useState, useEffect } from 'react';
import { 
  Laptop, Wifi, WifiOff, X, CheckCircle2, 
  Send, RefreshCw, QrCode, Power, ShieldCheck 
} from 'lucide-react';
import { pcSyncService, type SyncStatus } from '../services/pcSyncService';

interface PairPCModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenQRScanner: () => void;
}

export const PairPCModal: React.FC<PairPCModalProps> = ({
  isOpen,
  onClose,
  onOpenQRScanner
}) => {
  const [pcIp, setPcIp] = useState(pcSyncService.getServerIp() || '');
  const [status, setStatus] = useState<SyncStatus>(pcSyncService.getStatus());
  const [activeServerIp, setActiveServerIp] = useState<string>(pcSyncService.getServerIp() || '');
  const [testSent, setTestSent] = useState(false);

  useEffect(() => {
    const unsub = pcSyncService.subscribeStatus((newStatus, ip) => {
      setStatus(newStatus);
      setActiveServerIp(ip);
    });
    return unsub;
  }, []);

  if (!isOpen) return null;

  const handleConnect = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!pcIp.trim()) return;
    pcSyncService.connectToPC(pcIp.trim());
  };

  const handleDisconnect = () => {
    pcSyncService.disconnect();
  };

  const handleSendTest = () => {
    const success = pcSyncService.sendScan({
      rawText: 'TEST-BARCODE-9999 S/N:DEMO8819',
      serialNumber: 'DEMO8819',
      model: 'Test Camera',
      brand: 'Test'
    });
    if (success) {
      setTestSent(true);
      setTimeout(() => setTestSent(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center space-x-3">
            <div className={\`p-2.5 rounded-2xl border transition-all \${
              status === 'connected'
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 shadow-lg shadow-emerald-500/10'
                : 'bg-sky-500/20 text-sky-400 border-sky-500/30'
            }\`}>
              <Laptop className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Pair with Billing PC</h2>
              <p className="text-[11px] text-slate-400">Stream barcode scans wirelessly over Wi-Fi</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          
          {/* Live Connection Status Badge */}
          <div className={\`p-4 rounded-2xl border flex items-center justify-between \${
            status === 'connected'
              ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
              : status === 'connecting'
              ? 'bg-amber-950/40 border-amber-500/30 text-amber-300'
              : 'bg-slate-950 border-slate-800 text-slate-300'
          }\`}>
            <div className="flex items-center space-x-3">
              <div className={\`p-2 rounded-xl \${
                status === 'connected' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'
              }\`}>
                {status === 'connected' ? <CheckCircle2 className="h-5 w-5" /> : <WifiOff className="h-5 w-5" />}
              </div>
              <div>
                <div className="text-xs font-bold">
                  {status === 'connected'
                    ? 'Connected to PC'
                    : status === 'connecting'
                    ? 'Connecting to PC...'
                    : 'Not Connected'}
                </div>
                <div className="text-[11px] font-mono opacity-80">
                  {activeServerIp ? \`IP: \${activeServerIp}\` : 'Enter PC IP or Scan QR'}
                </div>
              </div>
            </div>

            {status === 'connected' && (
              <button
                type="button"
                onClick={handleDisconnect}
                className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 transition-all text-xs flex items-center space-x-1"
                title="Disconnect"
              >
                <Power className="h-3.5 w-3.5" />
                <span className="font-bold text-[10px]">Disconnect</span>
              </button>
            )}
          </div>

          {/* Quick Option 1: Scan PC Screen QR Code */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenQRScanner();
              }}
              className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center space-x-2"
            >
              <QrCode className="h-4 w-4" />
              <span>Scan PC Screen QR Code</span>
            </button>
            <p className="text-[10px] text-center text-slate-400">
              Click &quot;Mobile Scanner&quot; on your PC billing screen to show the pairing QR code
            </p>
          </div>

          <div className="flex items-center my-3">
            <div className="flex-1 border-t border-slate-800" />
            <span className="px-3 text-[10px] uppercase font-bold text-slate-500 tracking-wider">OR ENTER IP</span>
            <div className="flex-1 border-t border-slate-800" />
          </div>

          {/* Option 2: Manual IP Input Form */}
          <form onSubmit={handleConnect} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                PC Local IP Address / Host
              </label>
              <div className="relative">
                <Wifi className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  value={pcIp}
                  onChange={(e) => setPcIp(e.target.value)}
                  placeholder="e.g. 192.168.1.15"
                  className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl pl-9 pr-3 py-2 text-xs text-white font-mono placeholder-slate-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={!pcIp.trim() || status === 'connecting'}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white font-bold text-xs border border-slate-700 transition-all flex items-center justify-center space-x-2"
            >
              <RefreshCw className={\`h-3.5 w-3.5 \${status === 'connecting' ? 'animate-spin' : ''}\`} />
              <span>{status === 'connected' ? 'Re-Connect' : 'Connect to PC'}</span>
            </button>
          </form>

          {/* Test Ping Button */}
          {status === 'connected' && (
            <div className="pt-2">
              <button
                type="button"
                onClick={handleSendTest}
                className="w-full py-2 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-xs font-bold transition-all flex items-center justify-center space-x-2"
              >
                <Send className="h-3.5 w-3.5" />
                <span>{testSent ? '✓ Test Barcode Sent to PC!' : 'Send Test Barcode to PC'}</span>
              </button>
            </div>
          )}

          {/* Instructions Box */}
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-[11px] text-slate-400 space-y-1">
            <div className="font-semibold text-slate-300 flex items-center space-x-1">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              <span>Wi-Fi Requirement:</span>
            </div>
            <p>Ensure both your phone and PC are connected to the same Wi-Fi router / mobile hotspot.</p>
          </div>

        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-950 border-t border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-all"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
`;

// 3. Write src/components/CameraScanner.tsx
const cameraScannerContent = `import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Camera as CapCamera } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import {
  Camera,
  Zap,
  ZapOff,
  RefreshCw,
  X,
  Volume2,
  VolumeX,
  AlertTriangle,
  ShieldCheck,
  Laptop,
  CheckCircle2
} from 'lucide-react';
import { soundService } from '../services/soundService';
import { parseScannedCode } from '../utils/parser';
import { pcSyncService, type SyncStatus } from '../services/pcSyncService';

interface CameraScannerProps {
  onScanResult: (result: { serialNumber: string; model: string; brand?: string; rawText: string }) => void;
  onClose: () => void;
  soundEnabled: boolean;
  vibrateEnabled: boolean;
  onOpenPairModal?: () => void;
}

type PermState = 'checking' | 'granted' | 'denied' | 'prompt' | 'error';

export const CameraScanner: React.FC<CameraScannerProps> = ({
  onScanResult,
  onClose,
  soundEnabled,
  vibrateEnabled,
  onOpenPairModal
}) => {
  const [permState, setPermState] = useState<PermState>('checking');
  const [permError, setPermError] = useState<string | null>(null);

  const [isScanning, setIsScanning] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const [soundActive, setSoundActive] = useState(soundEnabled);
  const [lastScannedText, setLastScannedText] = useState<string | null>(null);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const [scannerError, setScannerError] = useState<string | null>(null);

  // PC Sync Status
  const [pcStatus, setPcStatus] = useState<SyncStatus>(pcSyncService.getStatus());
  const [pairedPcIp, setPairedPcIp] = useState<string>(pcSyncService.getServerIp());
  const [continuousPcMode, setContinuousPcMode] = useState<boolean>(true);

  const html5QrcodeRef = useRef<Html5Qrcode | null>(null);
  const elementId = 'html5-qrcode-reader';

  // Monitor PC Sync Status
  useEffect(() => {
    const unsub = pcSyncService.subscribeStatus((status, ip) => {
      setPcStatus(status);
      setPairedPcIp(ip);
    });
    return unsub;
  }, []);

  // Monitor ACK confirmations from PC
  useEffect(() => {
    const unsubAck = pcSyncService.subscribeAck((ack) => {
      setSyncFeedback(\`✓ Delivered to PC: \${ack.rawText}\`);
      setTimeout(() => setSyncFeedback(null), 3000);
    });
    return unsubAck;
  }, []);

  // Permission Check
  useEffect(() => {
    let cancelled = false;

    const handlePermission = async () => {
      try {
        if (Capacitor.isNativePlatform()) {
          const status = await CapCamera.checkPermissions();
          if (status.camera === 'granted') {
            if (!cancelled) setPermState('granted');
            return;
          }
          if (status.camera === 'denied') {
            if (!cancelled) {
              setPermState('denied');
              setPermError('Camera permission was denied. Please open App Settings and grant Camera access.');
            }
            return;
          }
          const requested = await CapCamera.requestPermissions({ permissions: ['camera'] });
          if (cancelled) return;
          if (requested.camera === 'granted') {
            setPermState('granted');
          } else {
            setPermState('denied');
            setPermError('Camera access was denied.');
          }
        } else {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' }
          });
          stream.getTracks().forEach((t) => t.stop());
          if (!cancelled) setPermState('granted');
        }
      } catch (err) {
        if (cancelled) return;
        setPermState('denied');
        setPermError('Camera access denied or unavailable.');
      }
    };

    handlePermission();
    return () => {
      cancelled = true;
    };
  }, []);

  // Enumerate Cameras
  useEffect(() => {
    if (permState !== 'granted') return;
    let cancelled = false;

    Html5Qrcode.getCameras()
      .then((devices) => {
        if (cancelled || !devices?.length) return;
        setCameras(devices);
        const backCam = devices.find(
          (d) =>
            d.label.toLowerCase().includes('back') ||
            d.label.toLowerCase().includes('rear') ||
            d.label.toLowerCase().includes('environment')
        );
        setSelectedCameraId(backCam ? backCam.id : devices[0].id);
      })
      .catch((err) => {
        if (!cancelled) {
          setScannerError('Failed to enumerate cameras: ' + (err instanceof Error ? err.message : String(err)));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [permState]);

  // Start Scanner
  useEffect(() => {
    if (permState !== 'granted' || !selectedCameraId) return;
    let isMounted = true;
    let scanner: Html5Qrcode | null = null;

    const startScanner = async () => {
      setScannerError(null);
      try {
        scanner = new Html5Qrcode(elementId, {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.DATA_MATRIX,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.AZTEC
          ],
          verbose: false
        });

        html5QrcodeRef.current = scanner;

        const config = {
          fps: 20,
          qrbox: (w: number, h: number) => {
            const min = Math.min(w, h);
            return { width: Math.floor(min * 0.8), height: Math.floor(min * 0.8) };
          },
          aspectRatio: 1.0
        };

        await scanner.start(
          { deviceId: { exact: selectedCameraId } },
          config,
          (decodedText) => {
            if (!isMounted) return;

            // Check if scanned code is PC Pairing QR Code
            if (decodedText.startsWith('{"app":"parichiya-scanner"') || decodedText.startsWith('ws://')) {
              pcSyncService.connectToPC(decodedText);
              soundService.playScanBeep();
              soundService.triggerVibration(150);
              setSyncFeedback('🟢 Pairing with Billing PC...');
              return;
            }

            const parsed = parseScannedCode(decodedText);
            setLastScannedText(decodedText);

            // If PC is connected and Sync mode is on:
            if (pcSyncService.isConnected() && continuousPcMode) {
              const sent = pcSyncService.sendScan(parsed);
              if (sent) {
                setSyncFeedback(\`⚡ Sent to PC: \${parsed.model || parsed.serialNumber || decodedText}\`);
              }
              // Keep camera running for continuous scanning!
            } else {
              if (soundActive) soundService.playScanBeep();
              if (vibrateEnabled) soundService.triggerVibration(100);
              onScanResult(parsed);
            }
          },
          () => {}
        );

        if (isMounted) {
          setIsScanning(true);
          try {
            const caps = scanner.getRunningTrackCapabilities();
            if (caps && 'torch' in caps) setHasTorch(true);
          } catch {
            setHasTorch(false);
          }
        }
      } catch (err: unknown) {
        if (!isMounted) return;
        setScannerError('Scanner could not start: ' + (err instanceof Error ? err.message : String(err)));
      }
    };

    startScanner();

    return () => {
      isMounted = false;
      if (scanner) {
        scanner.stop().then(() => scanner?.clear()).catch(() => {});
      }
    };
  }, [permState, selectedCameraId, soundActive, vibrateEnabled, continuousPcMode, onScanResult]);

  const handleToggleTorch = async () => {
    if (!html5QrcodeRef.current || !hasTorch) return;
    try {
      await html5QrcodeRef.current.applyVideoConstraints({
        advanced: [{ torch: !torchOn } as any]
      });
      setTorchOn(!torchOn);
    } catch {
      setTorchOn(false);
    }
  };

  const handleSwitchCamera = () => {
    if (cameras.length <= 1) return;
    const currentIdx = cameras.findIndex((c) => c.id === selectedCameraId);
    const nextIdx = (currentIdx + 1) % cameras.length;
    setSelectedCameraId(cameras[nextIdx].id);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/95 backdrop-blur-md animate-in fade-in duration-200">
      
      {/* Top Bar with Live PC Sync Badge */}
      <TopBar
        soundActive={soundActive}
        onSoundToggle={() => setSoundActive(!soundActive)}
        hasTorch={hasTorch}
        torchOn={torchOn}
        onTorch={handleToggleTorch}
        cameraCount={cameras.length}
        onSwitchCamera={handleSwitchCamera}
        onClose={onClose}
        pcStatus={pcStatus}
        pairedPcIp={pairedPcIp}
        onOpenPairModal={onOpenPairModal}
        continuousPcMode={continuousPcMode}
        onToggleContinuousPcMode={() => setContinuousPcMode(!continuousPcMode)}
      />

      {/* Main Viewfinder Section */}
      <div className="relative flex-1 flex flex-col items-center justify-center p-4 overflow-hidden">
        {scannerError ? (
          <div className="max-w-md p-6 rounded-2xl bg-rose-950/40 border border-rose-800/60 text-center space-y-4">
            <AlertTriangle className="w-12 h-12 text-rose-400 mx-auto" />
            <h3 className="text-lg font-bold text-rose-200">Camera Unavailable</h3>
            <p className="text-sm text-rose-300/80">{scannerError || permError}</p>
            <div className="flex gap-2 justify-center">
              <button
                type="button"
                onClick={() => setScannerError(null)}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-lg transition-all"
              >
                Retry
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium shadow-lg transition-all"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <div className="relative w-full max-w-sm aspect-square rounded-3xl overflow-hidden shadow-2xl border-2 border-emerald-500/40 bg-black">
            {/* HTML5 QR Code Container */}
            <div id={elementId} className="w-full h-full object-cover" />

            {/* Futuristic Overlay Frame */}
            <div className="absolute inset-0 pointer-events-none border-2 border-dashed border-emerald-400/30 rounded-3xl m-3">
              <div className="absolute top-2 left-2 w-8 h-8 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
              <div className="absolute top-2 right-2 w-8 h-8 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
              <div className="absolute bottom-2 left-2 w-8 h-8 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
              <div className="absolute bottom-2 right-2 w-8 h-8 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />

              {/* Laser Scanning Line */}
              {isScanning && (
                <div className="absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_15px_#10b981] animate-laser" />
              )}
            </div>

            {/* Guidance Overlay */}
            <div className="absolute bottom-3 inset-x-3 py-1.5 px-3 rounded-xl bg-slate-950/80 backdrop-blur-md text-center border border-slate-800/60 pointer-events-none">
              <span className="text-xs text-emerald-400 font-medium flex items-center justify-center space-x-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>
                  {pcStatus === 'connected'
                    ? 'Streaming direct to PC • Align barcode in frame'
                    : 'Point at CCTV Box Barcode or PC Pairing QR'}
                </span>
              </span>
            </div>
          </div>
        )}

        {/* Live Delivery HUD Feedback */}
        {syncFeedback && (
          <div className="mt-4 px-4 py-2 rounded-2xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 text-xs font-mono max-w-sm text-center shadow-2xl animate-in zoom-in-95 font-bold flex items-center space-x-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span className="truncate">{syncFeedback}</span>
          </div>
        )}

        {/* Scanned Text Fallback Feedback */}
        {!syncFeedback && lastScannedText && (
          <div className="mt-4 px-4 py-1.5 rounded-2xl bg-slate-900/80 border border-slate-700 text-slate-300 text-xs font-mono max-w-sm truncate text-center shadow-lg">
            Captured: <span className="font-bold text-white">{lastScannedText}</span>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};

interface TopBarProps {
  soundActive: boolean;
  onSoundToggle: () => void;
  hasTorch: boolean;
  torchOn: boolean;
  onTorch: () => void;
  cameraCount: number;
  onSwitchCamera: () => void;
  onClose: () => void;
  pcStatus: SyncStatus;
  pairedPcIp: string;
  onOpenPairModal?: () => void;
  continuousPcMode: boolean;
  onToggleContinuousPcMode: () => void;
}

const TopBar: React.FC<TopBarProps> = ({
  soundActive,
  onSoundToggle,
  hasTorch,
  torchOn,
  onTorch,
  cameraCount,
  onSwitchCamera,
  onClose,
  pcStatus,
  pairedPcIp,
  onOpenPairModal,
  continuousPcMode,
  onToggleContinuousPcMode
}) => (
  <div className="relative z-20 flex flex-col bg-slate-900/90 border-b border-slate-800/80">
    <div className="flex items-center justify-between px-4 py-2.5">
      <div className="flex items-center space-x-2">
        <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <Camera className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-slate-100 font-outfit leading-tight">CCTV Scanner</h2>
          <p className="text-[11px] text-slate-400">Barcode &amp; Serial Sync</p>
        </div>
      </div>

      <div className="flex items-center space-x-1.5">
        {/* Sound toggle */}
        <button
          type="button"
          onClick={onSoundToggle}
          className={\`p-2 rounded-xl border transition-all \${
            soundActive
              ? 'bg-slate-800 text-emerald-400 border-slate-700'
              : 'bg-slate-800/50 text-slate-500 border-slate-800'
          }\`}
          title={soundActive ? 'Sound On' : 'Muted'}
        >
          {soundActive ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>

        {/* Torch toggle */}
        {hasTorch && (
          <button
            type="button"
            onClick={onTorch}
            className={\`p-2 rounded-xl border transition-all \${
              torchOn
                ? 'bg-amber-500 text-slate-950 border-amber-400'
                : 'bg-slate-800 text-slate-300 border-slate-700'
            }\`}
            title="Toggle Torch"
          >
            {torchOn ? <Zap className="w-4 h-4 fill-current" /> : <ZapOff className="w-4 h-4" />}
          </button>
        )}

        {/* Switch Camera */}
        {cameraCount > 1 && (
          <button
            type="button"
            onClick={onSwitchCamera}
            className="p-2 rounded-xl bg-slate-800 text-slate-300 border border-slate-700"
            title="Switch Camera"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        )}

        {/* Close */}
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20"
          title="Close Scanner"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>

    {/* PC Connection Status Sub-Bar */}
    <div className="px-4 py-1.5 bg-slate-950/80 border-t border-slate-800/60 flex items-center justify-between text-xs">
      <button
        type="button"
        onClick={onOpenPairModal}
        className="flex items-center space-x-1.5 hover:opacity-80 transition-opacity"
      >
        <Laptop className={\`w-3.5 h-3.5 \${pcStatus === 'connected' ? 'text-emerald-400' : 'text-slate-500'}\`} />
        <span className="text-[11px] font-medium text-slate-300">
          {pcStatus === 'connected' ? (
            <span className="text-emerald-400 font-bold">Linked to PC ({pairedPcIp})</span>
          ) : (
            <span className="text-slate-400">PC Sync: <strong className="text-amber-400">Tap to Pair</strong></span>
          )}
        </span>
      </button>

      {pcStatus === 'connected' && (
        <button
          type="button"
          onClick={onToggleContinuousPcMode}
          className={\`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-all \${
            continuousPcMode
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              : 'bg-slate-800 text-slate-400 border-slate-700'
          }\`}
        >
          {continuousPcMode ? '⚡ Continuous Stream ON' : '1-by-1 Entry'}
        </button>
      )}
    </div>
  </div>
);

const Footer: React.FC = () => (
  <div className="p-3 bg-slate-900/80 border-t border-slate-800 text-center text-[11px] text-slate-400">
    Supports Hikvision, Dahua, CP Plus, Imou, Uniview &amp; 1D Barcodes
  </div>
);
`;

// 4. Write src/App.tsx
const appContent = `import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  Camera, Settings, Download, WifiOff, ShieldCheck, 
  Box, RefreshCw, BarChart2, Hash, Layers, Laptop
} from 'lucide-react';
import { db, getAppSettings, type CCTVItem, type AppSettings } from './db/database';
import { CameraScanner } from './components/CameraScanner';
import { EntryForm } from './components/EntryForm';
import { InventoryList } from './components/InventoryList';
import { VatSettingsModal } from './components/VatSettingsModal';
import { ExportImportModal } from './components/ExportImportModal';
import { PairPCModal } from './components/PairPCModal';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import { pcSyncService, type SyncStatus } from './services/pcSyncService';

export function App() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showScanner, setShowScanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showPairPC, setShowPairPC] = useState(false);

  // PC Sync state
  const [pcStatus, setPcStatus] = useState<SyncStatus>(pcSyncService.getStatus());
  const [pairedPcIp, setPairedPcIp] = useState<string>(pcSyncService.getServerIp());

  // Monitor PC Sync Status
  useEffect(() => {
    const unsub = pcSyncService.subscribeStatus((status, ip) => {
      setPcStatus(status);
      setPairedPcIp(ip);
    });
    return unsub;
  }, []);

  // Live Dexie query for database records
  const inventoryItems = useLiveQuery(() => db.inventory.orderBy('id').reverse().toArray(), []) || [];
  const settingsData = useLiveQuery(() => db.settings.get('vat_config'), []);

  // Local settings state with defaults
  const [appSettings, setAppSettings] = useState<AppSettings>({
    id: 'vat_config',
    startingVatNumber: 1,
    currentVatNumber: 1,
    vatPrefix: '',
    vatPadding: 0,
    continuousScan: false,
    soundEnabled: true,
    vibrateEnabled: true,
  });

  // Scanned data passed to form
  const [scannedData, setScannedData] = useState<{ serialNumber: string; model: string; brand?: string } | null>(null);

  // Sync settings from IndexedDB
  useEffect(() => {
    getAppSettings().then((s) => setAppSettings(s));
  }, [settingsData]);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Handle scanned result from Camera
  const handleScanResult = (result: { serialNumber: string; model: string; brand?: string }) => {
    setScannedData(result);
    setShowScanner(false);
  };

  // Handle record saved in EntryForm
  const handleRecordSaved = async (newItem: CCTVItem, scanNext: boolean = false) => {
    // 1. Insert into Dexie
    await db.inventory.add(newItem);

    // 2. Increment VAT current counter
    const nextVat = newItem.vatNo + 1;
    const updatedSettings = { ...appSettings, currentVatNumber: nextVat };
    await db.settings.put(updatedSettings);
    setAppSettings(updatedSettings);

    // Clear scanned data after save
    setScannedData(null);

    // If continuous scan requested, re-open camera scanner
    if (scanNext) {
      setTimeout(() => setShowScanner(true), 200);
    }
  };

  // Calculate quick analytics
  const totalScanned = inventoryItems.length;
  const todayScanned = inventoryItems.filter(item => {
    const itemDate = new Date(item.scannedAt).toDateString();
    const today = new Date().toDateString();
    return itemDate === today;
  }).length;
  const uniqueBrands = new Set(inventoryItems.map(i => i.brand)).size;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950 pb-20">
      {/* PWA Install Banner */}
      <PWAInstallPrompt />

      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/80">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          {/* Logo & Title */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 shadow-lg shadow-emerald-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
            <div>
              <h1 className="text-base md:text-lg font-extrabold text-white font-outfit tracking-tight flex items-center space-x-2">
                <span>CCTV Inventory</span>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  VAT TRACKER
                </span>
              </h1>
              <p className="text-[11px] text-slate-400 hidden sm:block">Sequential Invoice &amp; Serial Number Mobile PWA</p>
            </div>
          </div>

          {/* Top Actions: PC Sync, Settings & Export */}
          <div className="flex items-center space-x-2">
            {!isOnline && (
              <div className="flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs">
                <WifiOff className="w-3.5 h-3.5" />
                <span className="hidden md:inline font-medium">Offline</span>
              </div>
            )}

            {/* Pair PC / Sync Button */}
            <button
              type="button"
              onClick={() => setShowPairPC(true)}
              className={\`px-3 py-2 rounded-2xl border text-xs font-bold transition-all flex items-center space-x-1.5 \${
                pcStatus === 'connected'
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300 shadow-lg shadow-emerald-500/10'
                  : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700/60'
              }\`}
              title="Pair with PC Billing Software over Wi-Fi"
            >
              <Laptop className={\`w-4 h-4 \${pcStatus === 'connected' ? 'text-emerald-400' : 'text-sky-400'}\`} />
              <span className="hidden sm:inline">
                {pcStatus === 'connected' ? \`PC: \${pairedPcIp}\` : 'Pair PC'}
              </span>
              <span className={\`w-1.5 h-1.5 rounded-full \${
                pcStatus === 'connected' ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'
              }\`} />
            </button>

            {/* Counter Settings Button */}
            <button
              type="button"
              onClick={() => setShowSettings(true)}
              className="p-2.5 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700/60 transition-all"
              title="VAT Counter &amp; Audio Settings"
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* Export / Excel Download Button */}
            <button
              type="button"
              onClick={() => setShowExport(true)}
              className="p-2.5 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 transition-all flex items-center space-x-1.5"
              title="Export to Excel / Download CSV"
            >
              <Download className="w-4 h-4" />
              <span className="text-xs font-bold hidden sm:inline">Export</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 space-y-6">
        {/* KPI Stats Overview Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
          {/* Card 1: Total Scanned */}
          <div className="glass-card p-4 rounded-2xl border border-slate-800/80 flex items-center space-x-3">
            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Box className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] text-slate-400 font-medium">Total Scanned</div>
              <div className="text-lg md:text-xl font-bold font-mono text-white">{totalScanned}</div>
            </div>
          </div>

          {/* Card 2: Next VAT Entry Sequence */}
          <div className="glass-card p-4 rounded-2xl border border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-3 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
                <Hash className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[11px] text-slate-400 font-medium">Next VAT No.</div>
                <div className="text-lg md:text-xl font-bold font-mono text-emerald-400">
                  #{appSettings.currentVatNumber}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowSettings(true)}
              className="p-1 text-slate-500 hover:text-emerald-400"
              title="Change Counter"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Card 3: Today's Scanned */}
          <div className="glass-card p-4 rounded-2xl border border-slate-800/80 flex items-center space-x-3">
            <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <BarChart2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] text-slate-400 font-medium">Today&apos;s Entries</div>
              <div className="text-lg md:text-xl font-bold font-mono text-white">{todayScanned}</div>
            </div>
          </div>

          {/* Card 4: Brands Tracked */}
          <div className="glass-card p-4 rounded-2xl border border-slate-800/80 flex items-center space-x-3">
            <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] text-slate-400 font-medium">Active Brands</div>
              <div className="text-lg md:text-xl font-bold font-mono text-white">{uniqueBrands}</div>
            </div>
          </div>
        </div>

        {/* Entry Form Section */}
        <EntryForm
          currentVatNumber={appSettings.currentVatNumber}
          vatPrefix={appSettings.vatPrefix}
          vatPadding={appSettings.vatPadding}
          initialScannedData={scannedData}
          onOpenScanner={() => setShowScanner(true)}
          onSaved={handleRecordSaved}
          soundEnabled={appSettings.soundEnabled}
        />

        {/* Inventory Data Table Section */}
        <InventoryList
          items={inventoryItems}
          onItemUpdated={() => {}}
          onItemDeleted={() => {}}
        />
      </main>

      {/* Floating Action Button (FAB) for Mobile Scanner Trigger */}
      <div className="fixed bottom-6 right-6 z-30 sm:hidden">
        <button
          type="button"
          onClick={() => setShowScanner(true)}
          className="w-14 h-14 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 flex items-center justify-center shadow-2xl shadow-emerald-500/40 border-2 border-emerald-400 active:scale-95 transition-transform glow-emerald"
          title="Open Camera Scanner"
        >
          <Camera className="w-7 h-7" />
        </button>
      </div>

      {/* Camera Live Scanner Overlay */}
      {showScanner && (
        <CameraScanner
          onScanResult={handleScanResult}
          onClose={() => setShowScanner(false)}
          soundEnabled={appSettings.soundEnabled}
          vibrateEnabled={appSettings.vibrateEnabled}
          onOpenPairModal={() => setShowPairPC(true)}
        />
      )}

      {/* Pair PC Modal */}
      {showPairPC && (
        <PairPCModal
          isOpen={showPairPC}
          onClose={() => setShowPairPC(false)}
          onOpenQRScanner={() => setShowScanner(true)}
        />
      )}

      {/* Settings Modal */}
      {showSettings && (
        <VatSettingsModal
          settings={appSettings}
          onClose={() => setShowSettings(false)}
          onSettingsUpdated={(newSettings) => setAppSettings(newSettings)}
        />
      )}

      {/* Export / Import Modal */}
      {showExport && (
        <ExportImportModal
          items={inventoryItems}
          onClose={() => setShowExport(false)}
          onDataRestored={() => {}}
        />
      )}
    </div>
  );
}

export default App;
`;

fs.writeFileSync(path.join(scannerDir, 'src/services/pcSyncService.ts'), pcSyncServiceContent, 'utf-8');
fs.writeFileSync(path.join(scannerDir, 'src/components/PairPCModal.tsx'), pairPCModalContent, 'utf-8');
fs.writeFileSync(path.join(scannerDir, 'src/components/CameraScanner.tsx'), cameraScannerContent, 'utf-8');
fs.writeFileSync(path.join(scannerDir, 'src/App.tsx'), appContent, 'utf-8');

console.log('Successfully wrote all mobile scanner files cleanly!');
