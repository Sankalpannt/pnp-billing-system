import { getElectronIpc } from './googleDriveBackup';

/**
 * Universal print handler that triggers native OS print dialog in Electron,
 * and falls back to window.print() in standard web browsers.
 */
export const triggerAppPrint = () => {
  const ipc = getElectronIpc();
  if (ipc) {
    try {
      ipc.send('trigger-native-print');
      return;
    } catch (err) {
      console.warn('Native Electron print IPC failed, falling back to window.print():', err);
    }
  }
  window.print();
};
