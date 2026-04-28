"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IPC_CHANNELS = void 0;
exports.IPC_CHANNELS = {
    start: "mock:start",
    stop: "mock:stop",
    restart: "mock:restart",
    getStatus: "mock:get-status",
    getInitialState: "mock:get-initial-state",
    sendPve: "mock:send-pve",
    sendDve: "mock:send-dve",
    sendBadge: "mock:send-badge",
    sendTour: "mock:send-tour",
    sendSite: "mock:send-site",
    sendButton: "mock:send-button",
    sendOk: "mock:send-ok",
    sendCancel: "mock:send-cancel",
    sendWeight: "mock:send-weight",
    setWeight: "mock:set-weight",
    sendRaw: "mock:send-raw",
    clearLogs: "mock:clear-logs",
    evtStatus: "mock:status-changed",
    evtFrame: "mock:frame",
    evtConsole: "mock:console",
    windowMinimize: "window:minimize",
    windowMaximizeToggle: "window:maximize-toggle",
    windowClose: "window:close",
    windowGetState: "window:get-state",
    evtWindowState: "window:state-changed",
};
//# sourceMappingURL=ipc-channels.js.map