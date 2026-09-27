import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { 
  Smartphone, Wifi, X, CheckCircle2, Copy, Check, 
  Send, RefreshCw, Layers, Zap, Laptop, Globe, Tag, Plus, Search, Trash2 
} from 'lucide-react';
import { NetworkInterface, MobileDevice, ScannedPayload, TagRecord } from '../hooks/useWirelessScanner';
import { useInvoiceStore } from '../store/useInvoiceStore';

interface WirelessScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  isServerOnline: boolean;
  isPhoneConnected: boolean;
  phoneDevices: MobileDevice[];
  networkInterfaces: NetworkInterface[];
  selectedIp: string;
  onSelectIp: (ip: string) => void;
  scanHistory: Array<ScannedPayload & { receivedAt: string }>;
  tagRecords?: Record<string, TagRecord>;
  onSimulateScan: (text: string) => void;
  onRefreshNetwork: () => void;
}

export const WirelessScannerModal: React.FC<WirelessScannerModalProps> = ({
  isOpen,
  onClose,
  isServerOnline,
  isPhoneConnected,
  phoneDevices,
  networkInterfaces,
  selectedIp,
  onSelectIp,
  scanHistory,
  tagRecords: propTagRecords,
  onSimulateScan,
  onRefreshNetwork
}) => {
  const { currentInvoice, setCctvDetails } = useInvoiceStore();
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedWs, setCopiedWs] = useState(false);
  const [copiedWeb, setCopiedWeb] = useState(false);
  const [customTestInput, setCustomTestInput] = useState('');
  const [customTestTag, setCustomTestTag] = useState('TAG-01');
  const [activeTab, setActiveTab] = useState<'qr' | 'tags' | 'test' | 'history'>('qr');
  const [tagModalSearch, setTagModalSearch] = useState('');
  const [selectedTagInModal, setSelectedTagInModal] = useState<string>('TAG-01');
  const [tagCopyFeedback, setTagCopyFeedback] = useState<string | null>(null);

  // Get live tag records
  const [localTags, setLocalTags] = useState<Record<string, TagRecord>>(() => {
    try {
      const saved = localStorage.getItem('pnp_scanner_tag_records');
      return saved ? JSON.parse(saved) : propTagRecords || {};
    } catch {
      return propTagRecords || {};
    }
  });

  useEffect(() => {
    if (propTagRecords) setLocalTags(propTagRecords);
  }, [propTagRecords]);

  // Direct mobile scanner web app URL served on port 8090
  const mobileScannerUrl = `http://${selectedIp}:8090`;
  const wsUrl = `ws://${selectedIp}:8090`;

  // Render QR Code encoding the direct Mobile Scanner URL
  useEffect(() => {
    if (!isOpen) return;

    QRCode.toDataURL(mobileScannerUrl, {
      width: 260,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      },
      errorCorrectionLevel: 'M'
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('Error generating QR code:', err));
  }, [isOpen, mobileScannerUrl]);

  if (!isOpen) return null;

  const handleCopyMobileUrl = () => {
    navigator.clipboard.writeText(mobileScannerUrl);
    setCopiedWeb(true);
    setTimeout(() => setCopiedWeb(false), 2000);
  };

  const handleCopyWs = () => {
    navigator.clipboard.writeText(wsUrl);
    setCopiedWs(true);
    setTimeout(() => setCopiedWs(false), 2000);
  };

  const handleTestSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!customTestInput.trim()) return;
    onSimulateScan(customTestInput.trim());
    setCustomTestInput('');
  };

  const handleDeleteTag = (tagToDelete: string) => {
    const updated = { ...localTags };
    delete updated[tagToDelete.toUpperCase()];
    delete updated[tagToDelete];
    setLocalTags(updated);
    try {
      localStorage.setItem('pnp_scanner_tag_records', JSON.stringify(updated));
      window.dispatchEvent(new Event('storage'));
    } catch {}

    const remaining = Object.keys(updated);
    if ((selectedTagInModal || '').toUpperCase() === tagToDelete.toUpperCase()) {
      setSelectedTagInModal(remaining.length > 0 ? remaining[0] : '');
    }
  };

  const handleDeleteSerial = (tagNumber: string, serialToDelete: string) => {
    const tagKey = Object.keys(localTags).find(k => k.toUpperCase() === tagNumber.toUpperCase()) || tagNumber;
    const currentRecord = localTags[tagKey];
    if (!currentRecord) return;

    const updatedSerials = currentRecord.serials.filter(s => s !== serialToDelete);
    const updated = {
      ...localTags,
      [tagKey]: {
        ...currentRecord,
        serials: updatedSerials
      }
    };
    setLocalTags(updated);
    try {
      localStorage.setItem('pnp_scanner_tag_records', JSON.stringify(updated));
      window.dispatchEvent(new Event('storage'));
    } catch {}
  };

  const handleClearAllTags = () => {
    if (window.confirm('Are you sure you want to remove all scanned tags? (सबै ट्याग हटाउन चाहनुहुन्छ?)')) {
      setLocalTags({});
      setSelectedTagInModal('');
      try {
        localStorage.setItem('pnp_scanner_tag_records', JSON.stringify({}));
        window.dispatchEvent(new Event('storage'));
      } catch {}
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center space-x-3">
            <div className={`p-2.5 rounded-2xl border transition-all ${
              isPhoneConnected 
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 shadow-lg shadow-emerald-500/10'
                : 'bg-sky-500/20 text-sky-400 border-sky-500/30'
            }`}>
              <Smartphone className={`h-6 w-6 ${isPhoneConnected ? 'animate-bounce' : ''}`} />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-white tracking-tight">Wireless Mobile Scanner</h2>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono border ${
                  isPhoneConnected
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : isServerOnline
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                    isPhoneConnected ? 'bg-emerald-400 animate-ping' : isServerOnline ? 'bg-amber-400' : 'bg-rose-400'
                  }`} />
                  {isPhoneConnected ? 'Phone Connected' : isServerOnline ? 'Ready for Phone' : 'Relay Offline'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Scan barcodes & serials with your phone camera to auto-type into bills
              </p>
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

        {/* Navigation Tabs */}
        <div className="flex items-center px-6 pt-3 border-b border-slate-800 bg-slate-900 gap-2 overflow-x-auto scrollbar-none">
          {[
            { id: 'qr', label: 'Pairing QR Code', icon: Zap },
            { id: 'tags', label: `🏷️ Tag & S/N Manager (${Object.keys(localTags).length})`, icon: Tag },
            { id: 'test', label: 'Test Simulator', icon: Laptop },
            { id: 'history', label: `Scan Activity (${scanHistory.length})`, icon: Layers },
          ].map(tab => {
            const Icon = tab.icon;
            const isTabActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all border-b-2 shrink-0 ${
                  isTabActive
                    ? 'border-sky-500 text-sky-400 bg-slate-800/60'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* TAB 1: PAIRING QR CODE */}
          {activeTab === 'qr' && (
            <div className="space-y-6">
              
              {/* Connected Phone Status Banner */}
              {isPhoneConnected && (
                <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-emerald-300">
                        {phoneDevices[0]?.deviceName || 'Mobile Scanner'} Active & Linked
                      </h4>
                      <p className="text-[11px] text-emerald-400/80 font-mono">
                        Connected at {phoneDevices[0]?.connectedAt ? new Date(phoneDevices[0].connectedAt).toLocaleTimeString() : 'Now'}
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-xl border border-emerald-500/20">
                    Live Real-Time
                  </span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                
                {/* Left: QR Code Card */}
                <div className="flex flex-col items-center justify-center p-5 bg-slate-950 rounded-2xl border border-slate-800 text-center space-y-3">
                  <div className="p-3 bg-white rounded-2xl shadow-xl shadow-sky-500/10 border-2 border-sky-400/30">
                    {qrDataUrl ? (
                      <img
                        src={qrDataUrl}
                        alt="Pairing QR Code"
                        className="w-48 h-48 object-contain rounded-lg"
                      />
                    ) : (
                      <div className="w-48 h-48 bg-slate-100 flex items-center justify-center text-slate-600 text-xs font-mono">
                        Generating QR...
                      </div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-white">Scan with Phone Camera</p>
                    <p className="text-[11px] text-slate-400">
                      Open camera app or browser to launch scanner
                    </p>
                  </div>
                </div>

                {/* Right: Network & Direct Links Card */}
                <div className="space-y-4">
                  {/* IP Selector */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-300 flex items-center space-x-1.5">
                        <Wifi className="h-3.5 w-3.5 text-sky-400" />
                        <span>PC Wi-Fi / IP Address:</span>
                      </label>
                      <button
                        type="button"
                        onClick={onRefreshNetwork}
                        className="text-[11px] text-sky-400 hover:text-sky-300 flex items-center space-x-1"
                      >
                        <RefreshCw className="h-3 w-3" />
                        <span>Refresh IPs</span>
                      </button>
                    </div>

                    <select
                      value={selectedIp}
                      onChange={(e) => onSelectIp(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-mono text-white focus:border-sky-500"
                    >
                      {networkInterfaces.map((iface, idx) => (
                        <option key={idx} value={iface.ip}>
                          {iface.ip} ({iface.interface})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Direct Mobile Web Link Box */}
                  <div className="p-3 bg-emerald-950/30 border border-emerald-500/30 rounded-xl space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center space-x-1.5">
                        <Globe className="h-3.5 w-3.5 text-emerald-400" />
                        <span className="font-bold text-emerald-400">Mobile Scanner Web App:</span>
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyMobileUrl}
                        className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center space-x-1"
                      >
                        {copiedWeb ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                        <span>{copiedWeb ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                    <div className="font-mono text-xs text-emerald-300 bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-800 select-all break-all">
                      {mobileScannerUrl}
                    </div>
                  </div>

                  {/* Relay WebSocket Box */}
                  <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800/80 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">WebSocket Endpoint: <span className="font-mono text-slate-300">{wsUrl}</span></span>
                    <button
                      type="button"
                      onClick={handleCopyWs}
                      className="text-sky-400 hover:text-sky-300 text-[10px] font-bold"
                    >
                      {copiedWs ? '✓ Copied' : 'Copy'}
                    </button>
                  </div>

                  {/* Instructions Callout */}
                  <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-1.5 text-xs">
                    <p className="font-semibold text-slate-200">How to Connect / Transfer:</p>
                    <ol className="list-decimal list-inside text-slate-400 space-y-1 text-[11px]">
                      <li>Connect PC & phone to the <strong>same Wi-Fi network</strong>.</li>
                      <li><strong>Option A (Fastest)</strong>: Scan the QR code or open the green link in phone Chrome/Safari.</li>
                      <li><strong>Option B (Tag Scans)</strong>: Set a Tag Number (e.g. <code>TAG-01</code>) on the phone before scanning to group serials automatically!</li>
                    </ol>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 2: 🏷️ TAG & S/N MANAGER */}
          {activeTab === 'tags' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div>
                    <h4 className="text-xs font-bold text-white flex items-center space-x-2">
                      <Tag className="h-4 w-4 text-sky-400" />
                      <span>Tag Number & CCTV Serial Number Directory</span>
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      View all hardware serial numbers grouped by Tag Number from mobile phone scans.
                    </p>
                  </div>

                  {/* Search Tag & Clear All */}
                  <div className="flex items-center space-x-2">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-500" />
                      <input
                        type="text"
                        value={tagModalSearch}
                        onChange={(e) => setTagModalSearch(e.target.value)}
                        placeholder="Search Tag Number..."
                        className="bg-slate-900 border border-slate-700/80 focus:border-sky-400 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 font-mono"
                      />
                    </div>
                    {Object.keys(localTags).length > 0 && (
                      <button
                        type="button"
                        onClick={handleClearAllTags}
                        title="Clear all saved tags (सबै ट्याग हटाउनुहोस्)"
                        className="px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/30 rounded-xl text-xs font-semibold flex items-center space-x-1 transition-all"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Clear All</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Available Tag Chips with scroll constraint */}
                <div className="flex items-center gap-2 flex-wrap max-h-36 overflow-y-auto pr-1">
                  {Object.keys(localTags).length === 0 ? (
                    <div className="text-center py-6 w-full text-slate-500 text-xs">
                      No tags created yet. Scan with mobile scanner using a Tag Number or simulate below.
                    </div>
                  ) : (
                    Object.entries(localTags)
                      .filter(([tag]) => !tagModalSearch || tag.toLowerCase().includes(tagModalSearch.toLowerCase()))
                      .map(([tag, record]) => {
                        const isSelected = (selectedTagInModal || '').toUpperCase() === tag.toUpperCase();
                        return (
                          <div
                            key={tag}
                            className={`group/modaltag inline-flex items-center rounded-xl text-xs font-mono font-bold transition-all border ${
                              isSelected
                                ? 'bg-sky-600 text-white border-sky-400 shadow-md shadow-sky-600/30 ring-1 ring-sky-300'
                                : 'bg-slate-900 hover:bg-slate-800 text-sky-400 border-slate-800 hover:border-sky-500/50'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => setSelectedTagInModal(tag)}
                              className="px-3 py-1.5 flex items-center space-x-2"
                            >
                              <span>🏷️ {tag}</span>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full ${isSelected ? 'bg-white/20 text-white' : 'bg-sky-500/20 text-sky-300'}`}>
                                {record.serials.length} S/N
                              </span>
                            </button>
                            <button
                              type="button"
                              title={`Delete ${tag}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteTag(tag);
                              }}
                              className={`px-2 py-1.5 transition-colors border-l ${
                                isSelected
                                  ? 'border-sky-400/40 text-sky-200 hover:text-white hover:bg-sky-700'
                                  : 'border-slate-800 text-slate-500 hover:text-rose-400 hover:bg-rose-500/20'
                              }`}
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        );
                      })
                  )}
                </div>

                {/* Selected Tag Detail Card */}
                {selectedTagInModal && localTags[selectedTagInModal.toUpperCase()] && (
                  <div className="p-4 bg-slate-900 rounded-2xl border border-sky-500/30 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-bold text-sky-300 font-mono">
                            🏷️ {selectedTagInModal.toUpperCase()}
                          </span>
                          <span className="text-xs text-slate-400 font-medium">
                            • {localTags[selectedTagInModal.toUpperCase()].sectionName || 'Hardware Unit'}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                          Total {localTags[selectedTagInModal.toUpperCase()].serials.length} serial numbers recorded
                        </p>
                      </div>

                      <div className="flex items-center space-x-2 flex-wrap">
                        {/* Copy button */}
                        <button
                          type="button"
                          onClick={() => {
                            const allSn = localTags[selectedTagInModal.toUpperCase()].serials.join(', ');
                            navigator.clipboard.writeText(allSn);
                            setTagCopyFeedback(selectedTagInModal);
                            setTimeout(() => setTagCopyFeedback(null), 2000);
                          }}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl border border-slate-700 flex items-center space-x-1.5"
                        >
                          {tagCopyFeedback === selectedTagInModal ? (
                            <>
                              <Check className="h-3.5 w-3.5 text-emerald-400" />
                              <span className="text-emerald-400">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3.5 w-3.5" />
                              <span>Copy All</span>
                            </>
                          )}
                        </button>

                        {/* Insert into active invoice */}
                        <button
                          type="button"
                          onClick={() => {
                            const serialsList = localTags[selectedTagInModal.toUpperCase()].serials;
                            if (serialsList.length === 0) return;
                            const formattedSn = `[${selectedTagInModal.toUpperCase()}] ${serialsList.join(', ')}`;
                            const currentSn = currentInvoice.serialNumbers?.trim() || '';
                            const updated = currentSn ? `${currentSn}, ${formattedSn}` : formattedSn;
                            setCctvDetails(currentInvoice.installationSite || '', currentInvoice.warrantyInfo || '', updated);
                            onClose();
                          }}
                          className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center space-x-1.5"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Insert to Bill</span>
                        </button>

                        {/* Delete Tag button */}
                        <button
                          type="button"
                          onClick={() => handleDeleteTag(selectedTagInModal)}
                          title="Delete this tag (ट्याग हटाउनुहोस्)"
                          className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/30 text-xs font-bold rounded-xl flex items-center space-x-1.5 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Delete Tag</span>
                        </button>
                      </div>
                    </div>

                    {/* Serial Numbers Grid with scroll constraint */}
                    {localTags[selectedTagInModal.toUpperCase()].serials.length === 0 ? (
                      <div className="flex items-center justify-between py-2 text-slate-500 text-xs italic">
                        <span>No serial numbers remaining in this tag.</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteTag(selectedTagInModal)}
                          className="text-xs text-rose-400 hover:underline not-italic"
                        >
                          Remove empty tag
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                        {localTags[selectedTagInModal.toUpperCase()].serials.map((sn, idx) => (
                          <div
                            key={idx}
                            className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between font-mono text-xs text-slate-200 group/snitem hover:border-sky-500/40 transition-colors"
                          >
                            <div className="flex items-center space-x-2">
                              <span className="text-[10px] text-slate-500">#{idx + 1}</span>
                              <span className="font-bold text-sky-300">{sn}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <button
                                type="button"
                                title="Insert this single S/N into invoice"
                                onClick={() => {
                                  const currentSn = currentInvoice.serialNumbers?.trim() || '';
                                  const updated = currentSn ? `${currentSn}, ${sn}` : sn;
                                  setCctvDetails(currentInvoice.installationSite || '', currentInvoice.warrantyInfo || '', updated);
                                }}
                                className="text-[10px] px-2 py-0.5 rounded-md bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 font-bold border border-sky-500/20"
                              >
                                + Add S/N
                              </button>
                              <button
                                type="button"
                                title={`Remove ${sn} from tag`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteSerial(selectedTagInModal, sn);
                                }}
                                className="p-1 rounded-md text-slate-500 hover:text-rose-400 hover:bg-rose-500/20 transition-colors"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: TEST SIMULATOR */}
          {activeTab === 'test' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-white flex items-center space-x-2">
                  <Laptop className="h-4 w-4 text-sky-400" />
                  <span>Simulate Barcode / Serial Scan with Tag Number</span>
                </h4>
                <p className="text-xs text-slate-400">
                  Click on an invoice field behind this dialog, then click any test button below to verify instant typing.
                </p>

                {/* Quick Predefined Scans */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {[
                    { label: 'Hikvision 4MP IP Camera', val: 'DS-2CD2143G0-I S/N:HK20839218', tag: 'TAG-01' },
                    { label: 'Dahua 8CH DVR', val: 'DH-XVR5108HS S/N:DH7719283', tag: 'BOX-A' },
                    { label: 'CP Plus Dome Camera', val: 'CP-UNC-TA21PL3 S/N:CP819230', tag: 'TAG-02' },
                    { label: 'Standard Barcode (Item 101)', val: '8901234567890', tag: 'TAG-03' },
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        onSimulateScan(preset.val);
                      }}
                      className="p-2.5 rounded-xl bg-slate-900 hover:bg-sky-950/60 hover:border-sky-500/50 text-left border border-slate-800 transition-all text-xs group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-slate-200 group-hover:text-sky-300">{preset.label}</div>
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-400 border border-sky-500/30">
                          {preset.tag}
                        </span>
                      </div>
                      <div className="font-mono text-[10px] text-slate-400 truncate mt-0.5">{preset.val}</div>
                    </button>
                  ))}
                </div>

                {/* Custom Test Field */}
                <form onSubmit={handleTestSend} className="flex flex-col sm:flex-row items-center gap-2 pt-2">
                  <input
                    type="text"
                    value={customTestTag}
                    onChange={(e) => setCustomTestTag(e.target.value.toUpperCase())}
                    placeholder="Tag # (e.g. TAG-01)"
                    className="w-full sm:w-28 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-sky-300 placeholder-slate-500 focus:border-sky-500"
                  />
                  <input
                    type="text"
                    value={customTestInput}
                    onChange={(e) => setCustomTestInput(e.target.value)}
                    placeholder="Type test barcode / serial number..."
                    className="flex-1 w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-sky-500"
                  />
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center space-x-1.5 shrink-0"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>Send Test</span>
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TAB 4: SCAN ACTIVITY */}
          {activeTab === 'history' && (
            <div className="space-y-3">
              {scanHistory.length === 0 ? (
                <div className="text-center py-12 text-slate-500 space-y-2">
                  <Layers className="h-8 w-8 mx-auto opacity-40" />
                  <p className="text-xs">No scans received yet in this session.</p>
                  <p className="text-[11px] text-slate-600">Scanned items from your phone will appear here in real-time.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-800 rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden">
                  {scanHistory.map((item, idx) => (
                    <div key={idx} className="p-3.5 flex items-center justify-between hover:bg-slate-900/60 transition-colors">
                      <div className="space-y-0.5">
                        <div className="flex items-center space-x-2">
                          {item.tagNumber && (
                            <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-400 text-[10px] font-bold font-mono border border-sky-500/30">
                              🏷️ {item.tagNumber}
                            </span>
                          )}
                          <span className="text-xs font-bold text-white font-mono">{item.rawText}</span>
                          {item.model && (
                            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-medium">
                              {item.model}
                            </span>
                          )}
                        </div>
                        {item.serialNumber && item.serialNumber !== item.rawText && (
                          <div className="text-[11px] text-slate-400 font-mono">
                            S/N: <span className="text-slate-300">{item.serialNumber}</span>
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">{item.receivedAt}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center space-x-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
            <span>Relay Port: <strong>8090</strong></span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition-all text-xs"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
