import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

function scannerRelayPlugin(): Plugin {
  return {
    name: 'scanner-relay-server',
    configureServer(server) {
      try {
        const { startScannerServer } = require('./server/scannerServer.cjs');
        startScannerServer(8090);
      } catch (err) {
        console.error('Failed to start scanner relay server in Vite:', err);
      }

      // Serve local payment QR from "payment qr" folder dynamically
      server.middlewares.use('/api/payment-qr', (req, res) => {
        try {
          const fs = require('fs');
          const path = require('path');
          const qrDir = path.join(process.cwd(), 'payment qr');
          if (fs.existsSync(qrDir)) {
            const files = fs.readdirSync(qrDir);
            const imageFile = files.find((f: string) => /\.(png|jpe?g|webp|svg)$/i.test(f));
            if (imageFile) {
              const filePath = path.join(qrDir, imageFile);
              const ext = path.extname(imageFile).slice(1).toLowerCase();
              const mime = ext === 'svg' ? 'image/svg+xml' : (ext === 'jpg' ? 'image/jpeg' : `image/${ext}`);
              const buf = fs.readFileSync(filePath);
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                success: true,
                dataUrl: `data:${mime};base64,${buf.toString('base64')}`,
                fileName: imageFile
              }));
              return;
            }
          }
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: false, error: 'No QR found' }));
        } catch (e: any) {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: false, error: e.message }));
        }
      });
    }
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), scannerRelayPlugin()],
  base: './',
  server: {
    port: 3000,
    host: true,
    open: true,
    watch: {
      ignored: [
        '**/release/**',
        '**/dist/**',
        '**/dist-electron/**',
        '**/exe file for client/**',
        '**/final/**',
        '**/ffinal/**',
        '**/logo/**',
        '**/android_src/**',
        '**/*.exe',
        '**/*.apk',
        '**/*.jfif',
        '**/*.png',
        '**/*.jpg',
        '**/*.jpeg'
      ]
    }
  }
});

