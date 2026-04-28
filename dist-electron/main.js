"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const electron_1 = require("electron");
const node_path_1 = tslib_1.__importDefault(require("node:path"));
const mock_ipc_js_1 = require("./ipc/mock-ipc.js");
const window_ipc_js_1 = require("./ipc/window-ipc.js");
let mainWindow = null;
let mockIpc = null;
let windowIpc = null;
function createWindow() {
    mainWindow = new electron_1.BrowserWindow({
        width: 1440,
        height: 960,
        minWidth: 1200,
        minHeight: 850,
        backgroundColor: "#0f172a",
        frame: false,
        titleBarStyle: "hidden",
        webPreferences: {
            preload: node_path_1.default.join(__dirname, "preload.js"),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false,
        },
    });
    if (windowIpc) {
        windowIpc.attachWindow(mainWindow);
    }
    mainWindow.on("closed", () => {
        mainWindow = null;
    });
    const startUrl = process.env["ELECTRON_START_URL"];
    if (startUrl) {
        mainWindow.loadURL(startUrl);
    }
    else {
        mainWindow.loadFile(node_path_1.default.join(__dirname, "../dist/PreciaMocken/browser/index.html"));
    }
}
electron_1.app.whenReady().then(() => {
    mockIpc = (0, mock_ipc_js_1.registerMockIpc)();
    windowIpc = (0, window_ipc_js_1.registerWindowIpc)(() => mainWindow);
    createWindow();
    electron_1.app.on("activate", () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});
electron_1.app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        electron_1.app.quit();
    }
});
electron_1.app.on("before-quit", async (event) => {
    if (mockIpc) {
        event.preventDefault();
        const ipc = mockIpc;
        mockIpc = null;
        try {
            await ipc.dispose();
        }
        finally {
            if (windowIpc) {
                windowIpc.dispose();
                windowIpc = null;
            }
            electron_1.app.quit();
        }
    }
});
//# sourceMappingURL=main.js.map