"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const ipc_channels_js_1 = require("./ipc/ipc-channels.js");
function subscribe(channel, callback) {
    const handler = (_event, payload) => callback(payload);
    electron_1.ipcRenderer.on(channel, handler);
    return () => electron_1.ipcRenderer.removeListener(channel, handler);
}
const api = {
    getInitialState: () => electron_1.ipcRenderer.invoke(ipc_channels_js_1.IPC_CHANNELS.getInitialState),
    getStatus: () => electron_1.ipcRenderer.invoke(ipc_channels_js_1.IPC_CHANNELS.getStatus),
    startServer: (config) => electron_1.ipcRenderer.invoke(ipc_channels_js_1.IPC_CHANNELS.start, config),
    stopServer: () => electron_1.ipcRenderer.invoke(ipc_channels_js_1.IPC_CHANNELS.stop),
    restartServer: (config) => electron_1.ipcRenderer.invoke(ipc_channels_js_1.IPC_CHANNELS.restart, config),
    sendPresenceVehicle: () => electron_1.ipcRenderer.invoke(ipc_channels_js_1.IPC_CHANNELS.sendPve),
    sendDepartureVehicle: () => electron_1.ipcRenderer.invoke(ipc_channels_js_1.IPC_CHANNELS.sendDve),
    sendBadge: (badge) => electron_1.ipcRenderer.invoke(ipc_channels_js_1.IPC_CHANNELS.sendBadge, badge),
    sendTour: (value) => electron_1.ipcRenderer.invoke(ipc_channels_js_1.IPC_CHANNELS.sendTour, value),
    sendSite: (value) => electron_1.ipcRenderer.invoke(ipc_channels_js_1.IPC_CHANNELS.sendSite, value),
    sendButton: (index) => electron_1.ipcRenderer.invoke(ipc_channels_js_1.IPC_CHANNELS.sendButton, index),
    sendOk: () => electron_1.ipcRenderer.invoke(ipc_channels_js_1.IPC_CHANNELS.sendOk),
    sendCancel: () => electron_1.ipcRenderer.invoke(ipc_channels_js_1.IPC_CHANNELS.sendCancel),
    sendWeight: (payload) => electron_1.ipcRenderer.invoke(ipc_channels_js_1.IPC_CHANNELS.sendWeight, payload),
    setWeight: (payload) => electron_1.ipcRenderer.invoke(ipc_channels_js_1.IPC_CHANNELS.setWeight, payload),
    sendRaw: (raw) => electron_1.ipcRenderer.invoke(ipc_channels_js_1.IPC_CHANNELS.sendRaw, raw),
    clearLogs: () => electron_1.ipcRenderer.invoke(ipc_channels_js_1.IPC_CHANNELS.clearLogs),
    onStatusChanged: (callback) => subscribe(ipc_channels_js_1.IPC_CHANNELS.evtStatus, callback),
    onFrameLog: (callback) => subscribe(ipc_channels_js_1.IPC_CHANNELS.evtFrame, callback),
    onConsoleLine: (callback) => subscribe(ipc_channels_js_1.IPC_CHANNELS.evtConsole, callback),
    windowMinimize: () => electron_1.ipcRenderer.invoke(ipc_channels_js_1.IPC_CHANNELS.windowMinimize),
    windowMaximizeToggle: () => electron_1.ipcRenderer.invoke(ipc_channels_js_1.IPC_CHANNELS.windowMaximizeToggle),
    windowClose: () => electron_1.ipcRenderer.invoke(ipc_channels_js_1.IPC_CHANNELS.windowClose),
    windowGetState: () => electron_1.ipcRenderer.invoke(ipc_channels_js_1.IPC_CHANNELS.windowGetState),
    onWindowStateChanged: (callback) => subscribe(ipc_channels_js_1.IPC_CHANNELS.evtWindowState, callback),
};
electron_1.contextBridge.exposeInMainWorld("preciaMock", api);
//# sourceMappingURL=preload.js.map