"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IPC_CHANNELS = void 0;
exports.registerMockIpc = registerMockIpc;
const electron_1 = require("electron");
const bi400_server_js_1 = require("../tcp/bi400-server.js");
const bi400_frame_builder_js_1 = require("../tcp/bi400-frame-builder.js");
const log_store_js_1 = require("../logging/log-store.js");
const ipc_channels_js_1 = require("./ipc-channels.js");
Object.defineProperty(exports, "IPC_CHANNELS", { enumerable: true, get: function () { return ipc_channels_js_1.IPC_CHANNELS; } });
function registerMockIpc() {
    const server = new bi400_server_js_1.Bi400Server();
    const store = new log_store_js_1.LogStore(1000);
    const broadcast = (channel, payload) => {
        for (const win of electron_1.BrowserWindow.getAllWindows()) {
            if (!win.isDestroyed()) {
                win.webContents.send(channel, payload);
            }
        }
    };
    server.on("status", (status) => {
        broadcast(ipc_channels_js_1.IPC_CHANNELS.evtStatus, status);
    });
    server.on("frame", (entry) => {
        store.pushFrame(entry);
        broadcast(ipc_channels_js_1.IPC_CHANNELS.evtFrame, entry);
    });
    server.on("console", (line) => {
        store.pushConsole(line);
        broadcast(ipc_channels_js_1.IPC_CHANNELS.evtConsole, line);
    });
    const safeSend = (raw, options) => server.send(raw, options);
    electron_1.ipcMain.handle(ipc_channels_js_1.IPC_CHANNELS.getInitialState, () => ({
        status: server.getStatus(),
        frames: store.getFrames(),
        console: store.getConsole(),
    }));
    electron_1.ipcMain.handle(ipc_channels_js_1.IPC_CHANNELS.getStatus, () => server.getStatus());
    electron_1.ipcMain.handle(ipc_channels_js_1.IPC_CHANNELS.start, async (_evt, config) => {
        try {
            return await server.start(config);
        }
        catch (error) {
            return server.getStatus();
        }
    });
    electron_1.ipcMain.handle(ipc_channels_js_1.IPC_CHANNELS.stop, () => server.stop());
    electron_1.ipcMain.handle(ipc_channels_js_1.IPC_CHANNELS.restart, async (_evt, config) => {
        try {
            return await server.restart(config);
        }
        catch (error) {
            return server.getStatus();
        }
    });
    electron_1.ipcMain.handle(ipc_channels_js_1.IPC_CHANNELS.sendPve, () => safeSend((0, bi400_frame_builder_js_1.buildPresenceVehicle)(), {
        type: "PVE",
        description: "Presence vehicle",
    }));
    electron_1.ipcMain.handle(ipc_channels_js_1.IPC_CHANNELS.sendDve, () => safeSend((0, bi400_frame_builder_js_1.buildDepartureVehicle)(), {
        type: "DVE",
        description: "Departure vehicle",
    }));
    electron_1.ipcMain.handle(ipc_channels_js_1.IPC_CHANNELS.sendBadge, (_evt, badge) => safeSend((0, bi400_frame_builder_js_1.buildBadge)(badge ?? ""), {
        type: "BDG",
        description: `Badge ${badge ?? ""}`,
    }));
    electron_1.ipcMain.handle(ipc_channels_js_1.IPC_CHANNELS.sendTour, (_evt, value) => safeSend((0, bi400_frame_builder_js_1.buildScc)(value ?? ""), {
        type: "SCC",
        description: `Tour ${value ?? ""}`,
    }));
    electron_1.ipcMain.handle(ipc_channels_js_1.IPC_CHANNELS.sendSite, (_evt, value) => safeSend((0, bi400_frame_builder_js_1.buildScc)(value ?? ""), {
        type: "SCC",
        description: `Site ${value ?? ""}`,
    }));
    electron_1.ipcMain.handle(ipc_channels_js_1.IPC_CHANNELS.sendButton, (_evt, index) => safeSend((0, bi400_frame_builder_js_1.buildAib)(Number(index) || 0), {
        type: "AIB",
        description: `Button ${index}`,
    }));
    electron_1.ipcMain.handle(ipc_channels_js_1.IPC_CHANNELS.sendOk, () => safeSend((0, bi400_frame_builder_js_1.buildOk)(), { type: "AIB", description: "OK (button 2)" }));
    electron_1.ipcMain.handle(ipc_channels_js_1.IPC_CHANNELS.sendCancel, () => safeSend((0, bi400_frame_builder_js_1.buildCancel)(), { type: "AIB", description: "Cancel (button 1)" }));
    const normalizeWeight = (payload) => ({
        gross: Number(payload?.gross) || 0,
        tare: Number(payload?.tare) || 0,
        net: Number(payload?.net) || 0,
        dsd: Number(payload?.dsd) || 0,
        stable: !!payload?.stable,
    });
    electron_1.ipcMain.handle(ipc_channels_js_1.IPC_CHANNELS.sendWeight, (_evt, payload) => {
        const normalized = normalizeWeight(payload);
        server.setStoredWeight(normalized);
        const raw = normalized.stable
            ? (0, bi400_frame_builder_js_1.buildPds)(normalized)
            : (0, bi400_frame_builder_js_1.buildPdd)(normalized);
        return safeSend(raw, {
            type: normalized.stable ? "PDS" : "PDD",
            description: normalized.stable ? "Stable weight" : "Unstable weight",
        });
    });
    electron_1.ipcMain.handle(ipc_channels_js_1.IPC_CHANNELS.setWeight, (_evt, payload) => {
        server.setStoredWeight(normalizeWeight(payload));
        return true;
    });
    electron_1.ipcMain.handle(ipc_channels_js_1.IPC_CHANNELS.sendRaw, (_evt, raw) => safeSend((0, bi400_frame_builder_js_1.buildRaw)(raw ?? ""), {
        type: "RAW",
        description: "Raw debug frame",
    }));
    electron_1.ipcMain.handle(ipc_channels_js_1.IPC_CHANNELS.clearLogs, () => {
        store.clear();
        return true;
    });
    return {
        dispose: async () => {
            for (const channel of Object.values(ipc_channels_js_1.IPC_CHANNELS)) {
                electron_1.ipcMain.removeHandler(channel);
            }
            await server.stop();
        },
    };
}
//# sourceMappingURL=mock-ipc.js.map