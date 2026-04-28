import { app, BrowserWindow } from "electron";
import path from "node:path";
import { registerMockIpc } from "./ipc/mock-ipc.js";
import { registerWindowIpc } from "./ipc/window-ipc.js";

let mainWindow: BrowserWindow | null = null;
let mockIpc: { dispose: () => Promise<void> } | null = null;
let windowIpc: {
  attachWindow: (win: BrowserWindow) => void;
  dispose: () => void;
} | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1200,
    minHeight: 760,
    backgroundColor: "#0f172a",
    frame: false,
    titleBarStyle: "hidden",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
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
  } else {
    mainWindow.loadFile(
      path.join(__dirname, "../dist/PreciaMocken/browser/index.html"),
    );
  }
}

app.whenReady().then(() => {
  mockIpc = registerMockIpc();
  windowIpc = registerWindowIpc(() => mainWindow);
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", async (event) => {
  if (mockIpc) {
    event.preventDefault();
    const ipc = mockIpc;
    mockIpc = null;
    try {
      await ipc.dispose();
    } finally {
      if (windowIpc) {
        windowIpc.dispose();
        windowIpc = null;
      }
      app.quit();
    }
  }
});
