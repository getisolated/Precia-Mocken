"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerWindowIpc = registerWindowIpc;
const electron_1 = require("electron");
const ipc_channels_js_1 = require("./ipc-channels.js");
function getState(win) {
    return {
        isMaximized: win.isMaximized(),
        isFullScreen: win.isFullScreen(),
    };
}
function registerWindowIpc(getWindow) {
    electron_1.ipcMain.handle(ipc_channels_js_1.IPC_CHANNELS.windowMinimize, () => {
        const win = getWindow();
        if (win && !win.isDestroyed())
            win.minimize();
    });
    electron_1.ipcMain.handle(ipc_channels_js_1.IPC_CHANNELS.windowMaximizeToggle, () => {
        const win = getWindow();
        if (!win || win.isDestroyed())
            return null;
        if (win.isMaximized()) {
            win.unmaximize();
        }
        else {
            win.maximize();
        }
        return getState(win);
    });
    electron_1.ipcMain.handle(ipc_channels_js_1.IPC_CHANNELS.windowClose, () => {
        const win = getWindow();
        if (win && !win.isDestroyed())
            win.close();
    });
    electron_1.ipcMain.handle(ipc_channels_js_1.IPC_CHANNELS.windowGetState, () => {
        const win = getWindow();
        if (!win || win.isDestroyed())
            return null;
        return getState(win);
    });
    const attachWindow = (win) => {
        const broadcast = () => {
            if (win.isDestroyed() || win.webContents.isDestroyed())
                return;
            win.webContents.send(ipc_channels_js_1.IPC_CHANNELS.evtWindowState, getState(win));
        };
        win.on("maximize", broadcast);
        win.on("unmaximize", broadcast);
        win.on("enter-full-screen", broadcast);
        win.on("leave-full-screen", broadcast);
    };
    return {
        attachWindow,
        dispose: () => {
            electron_1.ipcMain.removeHandler(ipc_channels_js_1.IPC_CHANNELS.windowMinimize);
            electron_1.ipcMain.removeHandler(ipc_channels_js_1.IPC_CHANNELS.windowMaximizeToggle);
            electron_1.ipcMain.removeHandler(ipc_channels_js_1.IPC_CHANNELS.windowClose);
            electron_1.ipcMain.removeHandler(ipc_channels_js_1.IPC_CHANNELS.windowGetState);
        },
    };
}
//# sourceMappingURL=window-ipc.js.map