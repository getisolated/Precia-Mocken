import { BrowserWindow, ipcMain } from "electron";
import { IPC_CHANNELS } from "./ipc-channels.js";

export interface WindowState {
  isMaximized: boolean;
  isFullScreen: boolean;
}

function getState(win: BrowserWindow): WindowState {
  return {
    isMaximized: win.isMaximized(),
    isFullScreen: win.isFullScreen(),
  };
}

export function registerWindowIpc(getWindow: () => BrowserWindow | null): {
  attachWindow: (win: BrowserWindow) => void;
  dispose: () => void;
} {
  ipcMain.handle(IPC_CHANNELS.windowMinimize, () => {
    const win = getWindow();
    if (win && !win.isDestroyed()) win.minimize();
  });

  ipcMain.handle(IPC_CHANNELS.windowMaximizeToggle, () => {
    const win = getWindow();
    if (!win || win.isDestroyed()) return null;
    if (win.isMaximized()) {
      win.unmaximize();
    } else {
      win.maximize();
    }
    return getState(win);
  });

  ipcMain.handle(IPC_CHANNELS.windowClose, () => {
    const win = getWindow();
    if (win && !win.isDestroyed()) win.close();
  });

  ipcMain.handle(IPC_CHANNELS.windowGetState, (): WindowState | null => {
    const win = getWindow();
    if (!win || win.isDestroyed()) return null;
    return getState(win);
  });

  const attachWindow = (win: BrowserWindow): void => {
    const broadcast = () => {
      if (win.isDestroyed() || win.webContents.isDestroyed()) return;
      win.webContents.send(IPC_CHANNELS.evtWindowState, getState(win));
    };
    win.on("maximize", broadcast);
    win.on("unmaximize", broadcast);
    win.on("enter-full-screen", broadcast);
    win.on("leave-full-screen", broadcast);
  };

  return {
    attachWindow,
    dispose: () => {
      ipcMain.removeHandler(IPC_CHANNELS.windowMinimize);
      ipcMain.removeHandler(IPC_CHANNELS.windowMaximizeToggle);
      ipcMain.removeHandler(IPC_CHANNELS.windowClose);
      ipcMain.removeHandler(IPC_CHANNELS.windowGetState);
    },
  };
}
