const http = require('http');
const os = require('os');
const { WebSocketServer, WebSocket } = require('ws');

const DEFAULT_PORT = 8090;

function getLocalIpAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        const lowerName = name.toLowerCase();
        let score = 50; // Default priority score

        // Demote virtual, container, and host-only adapters
        if (
          lowerName.includes('virtual') ||
          lowerName.includes('vbox') ||
          lowerName.includes('vmware') ||
          lowerName.includes('vethernet') ||
          lowerName.includes('wsl') ||
          lowerName.includes('hyper-v') ||
          lowerName.includes('tap') ||
          lowerName.includes('tun') ||
          lowerName.includes('hamachi') ||
          lowerName.includes('loopback') ||
          iface.address.startsWith('192.168.56.') ||
          iface.address.startsWith('169.254.')
        ) {
          score = 10;
        } else if (
          lowerName.includes('wi-fi') ||
          lowerName.includes('wifi') ||
          lowerName.includes('wlan') ||
          lowerName.includes('wireless')
        ) {
          score = 100; // Highest priority: Wi-Fi adapter
        } else if (
          lowerName.includes('ethernet') ||
          lowerName.includes('eth') ||
          lowerName.includes('local area')
        ) {
          score = 80; // Secondary priority: Physical Ethernet cable
        }

        addresses.push({
          interface: name,
          ip: iface.address,
          score
        });
      }
    }
  }

  // Sort descending by score so real Wi-Fi/LAN comes first
  addresses.sort((a, b) => b.score - a.score);

  // If no external IP found, fallback to localhost
  if (addresses.length === 0) {
    addresses.push({ interface: 'Loopback', ip: '127.0.0.1', score: 0 });
  }

  return addresses.map(({ interface: iface, ip }) => ({ interface: iface, ip }));
}

function getMobileScannerHtml(serverPort) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>PNP Tech Traders - Mobile Wireless Scanner</title>
  <meta name="theme-color" content="#0f172a">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="apple-mobile-web-app-title" content="PNP Scanner">
  <link rel="manifest" href="/manifest.json">
  <link rel="apple-touch-icon" href="/icon.png">
  <script src="https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    body { background-color: #0b0f19; color: #f8fafc; min-height: 100vh; display: flex; flex-direction: column; }
    
    header { background: #0f172a; border-bottom: 1px solid #1e293b; padding: 14px 16px; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 50; }
    .brand-title { font-size: 15px; font-weight: 800; color: #38bdf8; letter-spacing: 0.5px; }
    .brand-sub { font-size: 11px; color: #94a3b8; }
    
    .status-badge { display: inline-flex; align-items: center; padding: 5px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700; gap: 6px; }
    .status-online { background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); }
    .status-offline { background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3); }
    .status-dot { width: 8px; height: 8px; border-radius: 50%; }
    .dot-online { background: #10b981; box-shadow: 0 0 8px #10b981; animation: pulse 2s infinite; }
    .dot-offline { background: #ef4444; }
    
    @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.4; } 100% { opacity: 1; } }

    /* Install App Banner */
    .install-banner { background: linear-gradient(135deg, #0284c7, #4f46e5); color: white; padding: 10px 14px; border-radius: 14px; display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 2px; box-shadow: 0 4px 15px rgba(2, 132, 199, 0.3); }
    .install-info { display: flex; align-items: center; gap: 10px; }
    .install-icon { font-size: 22px; }
    .install-text { font-size: 12px; font-weight: 700; }
    .install-sub { font-size: 10px; opacity: 0.85; }
    .install-btn { background: white; color: #0f172a; padding: 6px 12px; border-radius: 10px; font-size: 11px; font-weight: 800; border: none; cursor: pointer; white-space: nowrap; }

    main { flex: 1; padding: 14px; display: flex; flex-direction: column; gap: 14px; max-width: 500px; margin: 0 auto; width: 100%; }

    /* Camera Viewfinder Card */
    .scanner-card { background: #0f172a; border: 1px solid #1e293b; border-radius: 20px; overflow: hidden; position: relative; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.5); }
    #reader { width: 100% !important; background: #000; min-height: 240px; border-radius: 18px 18px 0 0; overflow: hidden; }
    #reader video { width: 100% !important; height: auto !important; object-fit: cover; }
    
    .scan-controls { display: flex; align-items: center; justify-content: space-around; padding: 12px; background: #0f172a; border-top: 1px solid #1e293b; gap: 8px; }
    .btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 10px 14px; border-radius: 12px; font-size: 12px; font-weight: 700; border: none; cursor: pointer; transition: all 0.2s; }
    .btn-primary { background: #0284c7; color: white; flex: 1; }
    .btn-primary:active { background: #0369a1; transform: scale(0.98); }
    .btn-secondary { background: #1e293b; color: #cbd5e1; border: 1px solid #334155; }
    .btn-secondary:active { background: #334155; }
    .btn-success { background: #10b981; color: white; }

    /* Manual Input Card */
    .manual-card { background: #0f172a; border: 1px solid #1e293b; border-radius: 18px; padding: 14px; display: flex; flex-direction: column; gap: 10px; }
    .card-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #94a3b8; }
    .input-row { display: flex; gap: 8px; }
    .text-input { flex: 1; background: #0b0f19; border: 1px solid #334155; border-radius: 12px; padding: 10px 14px; font-size: 13px; color: white; font-family: monospace; outline: none; }
    .text-input:focus { border-color: #38bdf8; box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.2); }

    /* Scan History */
    .history-card { background: #0f172a; border: 1px solid #1e293b; border-radius: 18px; padding: 14px; display: flex; flex-direction: column; gap: 8px; }
    .history-header { display: flex; justify-content: space-between; align-items: center; }
    .history-list { display: flex; flex-direction: column; gap: 6px; max-height: 180px; overflow-y: auto; }
    .history-item { background: #0b0f19; border: 1px solid #1e293b; border-radius: 10px; padding: 8px 12px; display: flex; align-items: center; justify-content: space-between; font-size: 12px; }
    .history-code { font-family: monospace; font-weight: 700; color: #38bdf8; word-break: break-all; }
    .history-time { font-size: 10px; color: #64748b; font-family: monospace; margin-left: 8px; white-space: nowrap; }

    /* Quick Tag Chips */
    .tag-chip { background: #1e293b; color: #94a3b8; border: 1px solid #334155; padding: 4px 10px; border-radius: 9999px; font-size: 10px; font-weight: 700; font-family: monospace; white-space: nowrap; cursor: pointer; transition: all 0.2s; }
    .tag-chip:active, .tag-chip.active-chip { background: #0284c7; color: white; border-color: #38bdf8; }

    /* Flash Toast */
    .toast-overlay { position: fixed; top: 70px; left: 50%; transform: translateX(-50%); background: #10b981; color: white; padding: 10px 20px; border-radius: 9999px; font-weight: 700; font-size: 13px; box-shadow: 0 10px 25px rgba(16, 185, 129, 0.4); z-index: 100; display: none; align-items: center; gap: 6px; animation: bounceIn 0.3s ease; }
    @keyframes bounceIn { 0% { transform: translate(-50%, -20px); opacity: 0; } 100% { transform: translate(-50%, 0); opacity: 1; } }

    .help-hint { font-size: 11px; color: #64748b; text-align: center; margin-top: 4px; }
  </style>
</head>
<body>
  <header>
    <div>
      <div class="brand-title">PNP TECH TRADERS</div>
      <div class="brand-sub">Wireless Mobile Scanner</div>
    </div>
    <div id="connStatus" class="status-badge status-offline">
      <span class="status-dot dot-offline"></span>
      <span id="connText">Connecting...</span>
    </div>
  </header>

  <div id="toast" class="toast-overlay">
    <span>✓ Scanned & Sent to Desktop!</span>
  </div>

  <main>
    <!-- Install to Home Screen Prompt Card -->
    <div id="installBanner" class="install-banner" style="display: flex;">
      <div class="install-info">
        <span class="install-icon">📲</span>
        <div>
          <div class="install-text">Install as Phone App</div>
          <div class="install-sub">Open full-screen with 1-tap from Home Screen</div>
        </div>
      </div>
      <button id="installAppBtn" class="install-btn" onclick="handleInstallApp()">Install App</button>
    </div>
    <!-- Desktop PC Wi-Fi IP Configuration -->
    <div class="manual-card" style="background: #0f172a; border: 1px solid #1e293b; border-radius: 18px; padding: 14px; display: flex; flex-direction: column; gap: 8px;">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div class="card-title">🖥️ PC / Laptop Connection</div>
        <span style="font-size: 10px; color: #64748b;">Port: ${serverPort}</span>
      </div>
      
      <!-- Scan QR to Connect Button -->
      <button type="button" id="scanQrConnectBtn" class="btn" style="background: linear-gradient(135deg, #0284c7, #6366f1); color: #ffffff; font-weight: 800; width: 100%; padding: 10px 14px; border-radius: 12px; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 4px 14px rgba(2, 132, 199, 0.35); border: 1px solid rgba(255,255,255,0.15);" onclick="startPairingScan()">
        <span style="font-size: 16px;">📷</span>
        <span>Scan Laptop QR Code to Connect</span>
      </button>

      <div id="pairingHint" style="display: none; background: rgba(56, 189, 248, 0.15); border: 1px dashed #38bdf8; border-radius: 10px; padding: 8px; font-size: 11px; color: #38bdf8; text-align: center; font-weight: 600;">
        🔍 Point phone camera at the QR code on your Laptop screen to Auto-Pair!
      </div>

      <div class="input-row">
        <input type="text" id="pcIpInput" class="text-input" placeholder="e.g. 192.168.18.5" value="" style="font-size: 12px;">
        <button type="button" class="btn btn-primary" style="flex: 0 0 auto; padding: 8px 14px;" onclick="saveAndReconnect()">
          Connect ⚡
        </button>
      </div>
    </div>

    <!-- 🏷️ Tag Number / Section Name Card -->
    <div class="manual-card" style="border-color: rgba(56, 189, 248, 0.3); background: #0c1527;">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div class="card-title" style="color: #38bdf8; display: flex; align-items: center; gap: 5px;">
          🏷️ Tag Number / Section (ट्याग नं)
        </div>
        <span id="activeTagBadge" style="font-size: 10px; font-weight: 800; font-family: monospace; background: rgba(56, 189, 248, 0.2); color: #38bdf8; padding: 2px 8px; border-radius: 6px; border: 1px solid rgba(56, 189, 248, 0.4);">
          TAG-01
        </span>
      </div>

      <div class="input-row">
        <input 
          type="text" 
          id="tagNumberInput" 
          class="text-input" 
          placeholder="e.g. TAG-01, BOX-A, LOBBY-CAM..." 
          value="TAG-01"
          style="color: #38bdf8; font-weight: bold; text-transform: uppercase;"
          oninput="updateActiveTag()"
        >
        <button type="button" class="btn btn-secondary" onclick="incrementTag()" style="padding: 8px 12px; font-size: 11px; font-weight: bold;">
          + Next Tag
        </button>
      </div>

      <!-- Quick Preset Tag Chips -->
      <div style="display: flex; gap: 6px; overflow-x: auto; padding-top: 2px; padding-bottom: 2px;">
        <button type="button" class="tag-chip" onclick="selectTag('TAG-01')">TAG-01</button>
        <button type="button" class="tag-chip" onclick="selectTag('TAG-02')">TAG-02</button>
        <button type="button" class="tag-chip" onclick="selectTag('TAG-03')">TAG-03</button>
        <button type="button" class="tag-chip" onclick="selectTag('BOX-A')">BOX-A</button>
        <button type="button" class="tag-chip" onclick="selectTag('BOX-B')">BOX-B</button>
        <button type="button" class="tag-chip" onclick="selectTag('DVR-MAIN')">DVR-MAIN</button>
        <button type="button" class="tag-chip" onclick="selectTag('HOTEL-SITE')">SITE-01</button>
      </div>
    </div>

    <!-- Scanner Card -->
    <div class="scanner-card">
      <div id="reader"></div>
      <div class="scan-controls">
        <button id="toggleCameraBtn" class="btn btn-primary" onclick="toggleCamera()">
          📷 <span id="cameraBtnText">Start Camera Scanner</span>
        </button>
        <button id="torchBtn" class="btn btn-secondary" onclick="toggleTorch()" style="display: none;">
          🔦 Torch
        </button>
        <button id="switchCameraBtn" class="btn btn-secondary" onclick="switchCamera()" style="display: none;">
          🔄 Flip
        </button>
      </div>
    </div>

    <!-- Manual / Paste Input Card -->
    <div class="manual-card">
      <div class="card-title">⌨️ Manual Barcode / S/N Entry</div>
      <form onsubmit="handleManualSend(event)" class="input-row">
        <input type="text" id="manualInput" class="text-input" placeholder="Type or paste barcode / S/N..." autocomplete="off">
        <button type="submit" class="btn btn-primary">Send ➜</button>
      </form>
    </div>

    <!-- History Card -->
    <div class="history-card">
      <div class="history-header">
        <div class="card-title">📜 Scanned This Session (<span id="historyCount">0</span>)</div>
        <button onclick="clearHistory()" class="btn btn-secondary" style="padding: 4px 8px; font-size: 10px;">Clear</button>
      </div>
      <div id="historyList" class="history-list">
        <div style="font-size: 11px; color: #475569; text-align: center; padding: 12px;">No items scanned yet.</div>
      </div>
    </div>

    <p class="help-hint">
      1. Keep your phone connected to the same Wi-Fi as your PC.<br>
      2. Point camera at barcodes — they will type into your billing invoice in real-time!
    </p>
  </main>

  <script>
    let ws = null;
    let html5QrCode = null;
    let isCameraRunning = false;
    let currentFacingMode = 'environment';
    let isTorchOn = false;
    let lastScannedText = '';
    let lastScanTime = 0;
    let deferredPrompt = null;
    const historyItems = [];

    function updateActiveTag() {
      const val = (document.getElementById('tagNumberInput')?.value || 'TAG-01').trim().toUpperCase();
      const badge = document.getElementById('activeTagBadge');
      if (badge) badge.innerText = val || 'TAG-01';
    }

    function selectTag(tag) {
      const input = document.getElementById('tagNumberInput');
      if (input) {
        input.value = tag;
        updateActiveTag();
      }
    }

    function incrementTag() {
      const input = document.getElementById('tagNumberInput');
      if (!input) return;
      const current = input.value.trim().toUpperCase();
      const match = current.match(/^(.*?)(\d+)$/);
      if (match) {
        const prefix = match[1];
        const num = parseInt(match[2], 10) + 1;
        const formattedNum = match[2].startsWith('0') && match[2].length > 1 ? String(num).padStart(match[2].length, '0') : String(num);
        input.value = \`\${prefix}\${formattedNum}\`;
      } else {
        input.value = \`\${current}-2\`;
      }
      updateActiveTag();
    }

    // PWA Install Handling
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      const banner = document.getElementById('installBanner');
      if (banner) banner.style.display = 'flex';
    });

    function handleInstallApp() {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult) => {
          if (choiceResult.outcome === 'accepted') {
            document.getElementById('installBanner').style.display = 'none';
          }
          deferredPrompt = null;
        });
      } else {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        if (isIOS) {
          alert("To install on iPhone:\n1. Tap the Share button (square with arrow up)\n2. Scroll down & tap 'Add to Home Screen'\n3. Open PNP Scanner from your home screen!");
        } else {
          alert("To install as an app:\n1. Tap the 3 dots menu in your browser\n2. Tap 'Install app' or 'Add to Home screen'");
        }
      }
    }

    let isPairingMode = false;

    // Load saved IP from local storage
    const savedIp = localStorage.getItem('pnp_pc_ip');
    if (savedIp) {
      const ipEl = document.getElementById('pcIpInput');
      if (ipEl) ipEl.value = savedIp;
    }

    function saveAndReconnect() {
      const ip = document.getElementById('pcIpInput')?.value.trim();
      if (ip) {
        localStorage.setItem('pnp_pc_ip', ip);
        if (ws) {
          try { ws.close(); } catch(e) {}
        }
        connectRelay();
      }
    }

    function startPairingScan() {
      isPairingMode = true;
      const hint = document.getElementById('pairingHint');
      if (hint) hint.style.display = 'block';
      if (!isCameraRunning) {
        startCamera();
      }
      showToast('🔍 Point at Laptop Screen QR Code');
      const reader = document.getElementById('reader');
      if (reader) {
        reader.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }

    function extractIpFromQr(text) {
      if (!text) return null;
      const str = String(text).trim();
      // Match http://192.168.x.x:8090, ws://192.168.x.x:8090, 192.168.x.x, 10.x.x.x, 172.x.x.x
      const match = str.match(/(?:https?:\/\/|ws:\/\/)?((?:\d{1,3}\.){3}\d{1,3})(?::\d+)?/i);
      if (match && match[1]) {
        return match[1];
      }
      return null;
    }

    function playPairSuccessBeep() {
      try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
        osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.09); // E5
        osc.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.18); // G5
        osc.frequency.setValueAtTime(1046.50, audioCtx.currentTime + 0.27); // C6
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.4);
      } catch (e) {}
    }

    // Web Audio Beep Sound
    function playBeep() {
      try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(2400, audioCtx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.12);
      } catch (e) {}
    }

    function vibratePhone() {
      if (navigator.vibrate) {
        try { navigator.vibrate(80); } catch(e) {}
      }
    }

    function showToast(text) {
      const toast = document.getElementById('toast');
      toast.innerHTML = '<span>✓ ' + text + '</span>';
      toast.style.display = 'flex';
      setTimeout(() => { toast.style.display = 'none'; }, 2000);
    }

    // Connect WebSocket to Desktop Relay Server
    function connectRelay() {
      const host = window.location.hostname || 'localhost';
      const wsUrl = 'ws://' + host + ':${serverPort}?type=mobile&device=' + encodeURIComponent(navigator.userAgent.includes('iPhone') ? 'iPhone' : 'Android Mobile');
      
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        const badge = document.getElementById('connStatus');
        badge.className = 'status-badge status-online';
        badge.innerHTML = '<span class="status-dot dot-online"></span><span>Connected to PC</span>';
        ws.send(JSON.stringify({
          type: 'REGISTER_MOBILE',
          deviceName: navigator.userAgent.includes('iPhone') ? 'iPhone' : 'Android Mobile'
        }));
      };

      ws.onclose = () => {
        const badge = document.getElementById('connStatus');
        badge.className = 'status-badge status-offline';
        badge.innerHTML = '<span class="status-dot dot-offline"></span><span>Reconnecting...</span>';
        setTimeout(connectRelay, 2500);
      };

      ws.onerror = () => {
        try { ws.close(); } catch(e) {}
      };
    }

    // Send Scanned Item to Desktop PC with Tag Number
    function sendBarcode(code) {
      const cleanCode = String(code).trim();
      if (!cleanCode) return;

      const tagInput = document.getElementById('tagNumberInput');
      const tagNumber = (tagInput?.value || 'TAG-01').trim().toUpperCase();

      playBeep();
      vibratePhone();
      showToast('[' + tagNumber + '] Sent: ' + cleanCode);

      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'SCAN_EVENT',
          payload: {
            rawText: cleanCode,
            serialNumber: cleanCode.replace(/^SN:/i, ''),
            tagNumber: tagNumber,
            sectionName: 'Tag ' + tagNumber,
            timestamp: Date.now()
          }
        }));
      }

      // Add to UI history
      historyItems.unshift({ 
        code: cleanCode, 
        tag: tagNumber,
        time: new Date().toLocaleTimeString() 
      });
      renderHistory();
    }

    function renderHistory() {
      const countEl = document.getElementById('historyCount');
      const listEl = document.getElementById('historyList');
      countEl.innerText = historyItems.length;

      if (historyItems.length === 0) {
        listEl.innerHTML = '<div style="font-size: 11px; color: #475569; text-align: center; padding: 12px;">No items scanned yet.</div>';
        return;
      }

      listEl.innerHTML = historyItems.slice(0, 15).map(item => \`
        <div class="history-item">
          <span class="history-code">\${item.code}</span>
          <span class="history-time">\${item.time}</span>
        </div>
      \`).join('');
    }

    function clearHistory() {
      historyItems.length = 0;
      renderHistory();
    }

    function handleManualSend(e) {
      e.preventDefault();
      const input = document.getElementById('manualInput');
      const val = input.value.trim();
      if (val) {
        sendBarcode(val);
        input.value = '';
      }
    }

    // Camera Lifecycle
    async function startCamera() {
      try {
        if (!html5QrCode) {
          html5QrCode = new Html5Qrcode('reader');
        }

        const config = {
          fps: 15,
          qrbox: { width: 250, height: 180 },
          aspectRatio: 1.3333,
          formatsToSupport: [
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.ITF
          ]
        };

        await html5QrCode.start(
          { facingMode: currentFacingMode },
          config,
          (decodedText) => {
            const now = Date.now();

            // Check if this is a Laptop / PC Pairing QR Code
            const detectedIp = extractIpFromQr(decodedText);
            const isPairingQr = isPairingMode || (detectedIp && (decodedText.includes(':8090') || decodedText.includes(':3000') || decodedText.toLowerCase().includes('pnp')));
            
            if (isPairingQr && detectedIp) {
              if (now - lastScanTime < 2000) return;
              lastScanTime = now;
              isPairingMode = false;
              const hint = document.getElementById('pairingHint');
              if (hint) hint.style.display = 'none';
              const ipEl = document.getElementById('pcIpInput');
              if (ipEl) ipEl.value = detectedIp;
              localStorage.setItem('pnp_pc_ip', detectedIp);
              playPairSuccessBeep();
              vibratePhone();
              showToast('🎉 Connected to Laptop (' + detectedIp + ')!');
              connectRelay();
              return;
            }

            // Prevent rapid multi-firing of same barcode within 1.5 seconds
            if (decodedText === lastScannedText && (now - lastScanTime) < 1500) {
              return;
            }
            lastScannedText = decodedText;
            lastScanTime = now;
            sendBarcode(decodedText);
          },
          (errorMessage) => {
            // Ignored - frame without barcode
          }
        );

        isCameraRunning = true;
        document.getElementById('cameraBtnText').innerText = 'Stop Camera';
        document.getElementById('toggleCameraBtn').className = 'btn btn-secondary';
        document.getElementById('torchBtn').style.display = 'inline-flex';
        document.getElementById('switchCameraBtn').style.display = 'inline-flex';
      } catch (err) {
        console.error('Camera start error:', err);
        alert('Could not start camera. Please ensure camera permissions are granted in your browser settings.');
      }
    }

    async function stopCamera() {
      if (html5QrCode && isCameraRunning) {
        try {
          await html5QrCode.stop();
          isCameraRunning = false;
          document.getElementById('cameraBtnText').innerText = 'Start Camera Scanner';
          document.getElementById('toggleCameraBtn').className = 'btn btn-primary';
          document.getElementById('torchBtn').style.display = 'none';
          document.getElementById('switchCameraBtn').style.display = 'none';
        } catch (e) {
          console.error('Error stopping camera:', e);
        }
      }
    }

    function toggleCamera() {
      if (isCameraRunning) {
        stopCamera();
      } else {
        startCamera();
      }
    }

    async function switchCamera() {
      await stopCamera();
      currentFacingMode = (currentFacingMode === 'environment') ? 'user' : 'environment';
      await startCamera();
    }

    async function toggleTorch() {
      if (!html5QrCode || !isCameraRunning) return;
      try {
        isTorchOn = !isTorchOn;
        await html5QrCode.applyVideoConstraints({
          advanced: [{ torch: isTorchOn }]
        });
        document.getElementById('torchBtn').innerText = isTorchOn ? '🔦 Torch ON' : '🔦 Torch';
      } catch (e) {
        console.warn('Torch not supported on this device/browser');
      }
    }

    // Initialize on page load
    window.addEventListener('DOMContentLoaded', () => {
      connectRelay();
      // Auto-start camera after user taps page if supported
      document.getElementById('toggleCameraBtn').focus();
    });
  </script>
</body>
</html>`;
}

let serverInstance = null;
let wssInstance = null;

function startScannerServer(port = DEFAULT_PORT) {
  if (serverInstance) {
    return { server: serverInstance, wss: wssInstance, port };
  }

  const server = http.createServer((req, res) => {
    const fs = require('fs');
    const path = require('path');

    // Enable CORS for web clients
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    // PWA Web App Manifest endpoint
    if (req.url === '/manifest.json') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        name: 'PNP Tech Traders Mobile Scanner',
        short_name: 'PNP Scanner',
        description: 'Wireless Barcode & CCTV Serial Scanner for Desktop Billing',
        start_url: '/',
        display: 'standalone',
        background_color: '#0b0f19',
        theme_color: '#0f172a',
        icons: [
          {
            src: '/icon.png',
            sizes: '192x192 512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }));
      return;
    }

    // PWA Service Worker endpoint
    if (req.url === '/sw.js') {
      res.writeHead(200, { 'Content-Type': 'application/javascript' });
      res.end(`
        self.addEventListener('install', (e) => { self.skipWaiting(); });
        self.addEventListener('activate', (e) => { e.waitUntil(self.clients.claim()); });
        self.addEventListener('fetch', (e) => { e.respondWith(fetch(e.request).catch(() => new Response('Offline'))); });
      `);
      return;
    }

    // App Icon endpoint
    if (req.url === '/icon.png') {
      const possibleIconPaths = [
        path.join(__dirname, '../public/app_icon.png'),
        path.join(__dirname, '../app_icon.png'),
        path.join(__dirname, '../electron/icon.png')
      ];
      for (const iconPath of possibleIconPaths) {
        if (fs.existsSync(iconPath)) {
          res.writeHead(200, { 'Content-Type': 'image/png' });
          res.end(fs.readFileSync(iconPath));
          return;
        }
      }
    }

    // Serve Network IP diagnostic info
    if (req.url === '/api/network-info' || req.url === '/api/network-info/') {
      const addresses = getLocalIpAddresses();
      const primaryIp = addresses[0]?.ip || '127.0.0.1';
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        primaryIp,
        interfaces: addresses,
        port,
        wsUrl: `ws://${primaryIp}:${port}`
      }));
      return;
    }

    // Health check endpoint
    if (req.url === '/api/health') {
      const mobileCount = Array.from(wssInstance?.clients || []).filter(c => c.clientType === 'mobile').length;
      const desktopCount = Array.from(wssInstance?.clients || []).filter(c => c.clientType === 'desktop').length;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'ok',
        uptime: process.uptime(),
        mobileClients: mobileCount,
        desktopClients: desktopCount,
        totalClients: wssInstance?.clients?.size || 0
      }));
      return;
    }

    // Serve the Interactive Mobile Barcode Scanner Web App for phones
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(getMobileScannerHtml(port));
  });

  const wss = new WebSocketServer({ server });

  function broadcastStatus() {
    const mobileClients = Array.from(wss.clients).filter(c => c.readyState === WebSocket.OPEN && c.clientType === 'mobile');
    const desktopClients = Array.from(wss.clients).filter(c => c.readyState === WebSocket.OPEN && c.clientType === 'desktop');

    const statusPayload = JSON.stringify({
      type: 'STATUS',
      isMobileConnected: mobileClients.length > 0,
      isDesktopConnected: desktopClients.length > 0,
      mobileCount: mobileClients.length,
      desktopCount: desktopClients.length,
      mobileDevices: mobileClients.map(c => ({
        id: c.clientId,
        deviceName: c.deviceName || 'Mobile Scanner',
        connectedAt: c.connectedAt
      }))
    });

    for (const client of wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(statusPayload);
      }
    }
  }

  wss.on('connection', (ws, req) => {
    ws.isAlive = true;
    ws.clientId = 'client_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    ws.connectedAt = new Date().toISOString();
    ws.clientType = 'unknown';

    // Parse URL query params if present (e.g. ?type=desktop or ?type=mobile&device=iPhone)
    try {
      const url = new URL(req.url, `http://localhost:${port}`);
      const typeParam = url.searchParams.get('type') || url.searchParams.get('client');
      const nameParam = url.searchParams.get('name') || url.searchParams.get('device');
      if (typeParam === 'desktop' || typeParam === 'mobile') {
        ws.clientType = typeParam;
      }
      if (nameParam) {
        ws.deviceName = decodeURIComponent(nameParam);
      }
    } catch (e) {}

    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('message', (messageBuffer) => {
      try {
        const rawString = messageBuffer.toString();
        const data = JSON.parse(rawString);

        if (data.type === 'REGISTER_DESKTOP') {
          ws.clientType = 'desktop';
          ws.deviceName = data.deviceName || 'Desktop Billing App';
          ws.send(JSON.stringify({ type: 'REGISTER_ACK', role: 'desktop', success: true }));
          broadcastStatus();
          return;
        }

        if (data.type === 'REGISTER_MOBILE') {
          ws.clientType = 'mobile';
          ws.deviceName = data.deviceName || data.device || 'Mobile Phone Scanner';
          ws.send(JSON.stringify({ type: 'REGISTER_ACK', role: 'mobile', success: true }));
          broadcastStatus();
          return;
        }

        if (data.type === 'PING') {
          ws.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
          return;
        }

        // Handle Scan Event from Mobile (or simulator)
        if (data.type === 'SCAN_EVENT' || data.type === 'SIMULATE_SCAN') {
          const payload = data.payload || data.data || { rawText: String(data.text || '') };
          
          // Send instant ACK back to the scanning mobile client
          ws.send(JSON.stringify({
            type: 'SCAN_ACK',
            success: true,
            rawText: payload.rawText || payload.serialNumber || '',
            receivedAt: Date.now()
          }));

          // Relay scan data to all connected Desktop clients
          const scanMessage = JSON.stringify({
            type: 'SCAN_DATA',
            source: ws.clientType,
            deviceName: ws.deviceName || 'Mobile Scanner',
            data: payload,
            timestamp: Date.now()
          });

          for (const client of wss.clients) {
            if (client.readyState === WebSocket.OPEN && client.clientType === 'desktop') {
              client.send(scanMessage);
            }
          }
          return;
        }

        // Forward arbitrary custom messages between clients
        if (data.type === 'CUSTOM_EVENT') {
          for (const client of wss.clients) {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              client.send(rawString);
            }
          }
        }
      } catch (err) {
        console.error('Error handling WebSocket message:', err);
      }
    });

    ws.on('close', () => {
      broadcastStatus();
    });

    ws.on('error', (err) => {
      console.error('WebSocket client error:', err.message);
    });

    // Send initial greeting with network info and current status
    const addresses = getLocalIpAddresses();
    ws.send(JSON.stringify({
      type: 'INIT_GREETING',
      serverVersion: '1.0.0',
      port,
      interfaces: addresses
    }));

    broadcastStatus();
  });

  // Keep-alive heartbeat interval (ping clients every 20 seconds)
  const pingInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) {
        return ws.terminate();
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, 20000);

  wss.on('close', () => {
    clearInterval(pingInterval);
  });

  server.listen(port, '0.0.0.0', () => {
    const ips = getLocalIpAddresses();
    console.log(`\n======================================================`);
    console.log(`📱 PNP Wireless Scanner Relay Server LIVE on port ${port}`);
    ips.forEach(i => console.log(`   ➜ ws://${i.ip}:${port} (${i.interface})`));
    console.log(`======================================================\n`);
  });

  server.on('error', (e) => {
    if (e.code === 'EADDRINUSE') {
      console.warn(`Scanner server port ${port} is already in use. Existing instance will be used.`);
    } else {
      console.error('Scanner server error:', e);
    }
  });

  serverInstance = server;
  wssInstance = wss;

  return { server, wss, port };
}

// Auto-run if executed directly via node
if (require.main === module) {
  const port = process.env.SCANNER_PORT ? parseInt(process.env.SCANNER_PORT, 10) : DEFAULT_PORT;
  startScannerServer(port);
}

module.exports = {
  startScannerServer,
  getLocalIpAddresses,
  DEFAULT_PORT
};
