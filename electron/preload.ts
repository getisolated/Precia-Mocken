import { contextBridge, ipcRenderer, type IpcRendererEvent } from "electron";
import { IPC_CHANNELS } from "./ipc/ipc-channels.js";
import type {
  ConsoleLine,
  FrameLogEntry,
  SendResult,
  ServerConfig,
  ServerStatus,
  WeightPayload,
} from "./tcp/bi400-types.js";
import type { InitialState } from "./ipc/mock-ipc.js";
import type { WindowState } from "./ipc/window-ipc.js";

type Unsubscribe = () => void;

function subscribe<T>(
  channel: string,
  callback: (payload: T) => void,
): Unsubscribe {
  const handler = (_event: IpcRendererEvent, payload: T) => callback(payload);
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.removeListener(channel, handler);
}

const api = {
  getInitialState: (): Promise<InitialState> =>
    ipcRenderer.invoke(IPC_CHANNELS.getInitialState),
  getStatus: (): Promise<ServerStatus> =>
    ipcRenderer.invoke(IPC_CHANNELS.getStatus),

  startServer: (config: ServerConfig): Promise<ServerStatus> =>
    ipcRenderer.invoke(IPC_CHANNELS.start, config),
  stopServer: (): Promise<ServerStatus> =>
    ipcRenderer.invoke(IPC_CHANNELS.stop),
  restartServer: (config: ServerConfig): Promise<ServerStatus> =>
    ipcRenderer.invoke(IPC_CHANNELS.restart, config),

  sendPresenceVehicle: (): Promise<SendResult> =>
    ipcRenderer.invoke(IPC_CHANNELS.sendPve),
  sendDepartureVehicle: (): Promise<SendResult> =>
    ipcRenderer.invoke(IPC_CHANNELS.sendDve),
  sendBadge: (badge: string): Promise<SendResult> =>
    ipcRenderer.invoke(IPC_CHANNELS.sendBadge, badge),
  sendTour: (value: string): Promise<SendResult> =>
    ipcRenderer.invoke(IPC_CHANNELS.sendTour, value),
  sendSite: (value: string): Promise<SendResult> =>
    ipcRenderer.invoke(IPC_CHANNELS.sendSite, value),
  sendButton: (index: number): Promise<SendResult> =>
    ipcRenderer.invoke(IPC_CHANNELS.sendButton, index),
  sendOk: (): Promise<SendResult> => ipcRenderer.invoke(IPC_CHANNELS.sendOk),
  sendCancel: (): Promise<SendResult> =>
    ipcRenderer.invoke(IPC_CHANNELS.sendCancel),
  sendWeight: (payload: WeightPayload): Promise<SendResult> =>
    ipcRenderer.invoke(IPC_CHANNELS.sendWeight, payload),
  setWeight: (payload: WeightPayload): Promise<boolean> =>
    ipcRenderer.invoke(IPC_CHANNELS.setWeight, payload),
  sendRaw: (raw: string): Promise<SendResult> =>
    ipcRenderer.invoke(IPC_CHANNELS.sendRaw, raw),

  clearLogs: (): Promise<boolean> => ipcRenderer.invoke(IPC_CHANNELS.clearLogs),

  onStatusChanged: (callback: (status: ServerStatus) => void): Unsubscribe =>
    subscribe(IPC_CHANNELS.evtStatus, callback),
  onFrameLog: (callback: (entry: FrameLogEntry) => void): Unsubscribe =>
    subscribe(IPC_CHANNELS.evtFrame, callback),
  onConsoleLine: (callback: (line: ConsoleLine) => void): Unsubscribe =>
    subscribe(IPC_CHANNELS.evtConsole, callback),

  windowMinimize: (): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.windowMinimize),
  windowMaximizeToggle: (): Promise<WindowState | null> =>
    ipcRenderer.invoke(IPC_CHANNELS.windowMaximizeToggle),
  windowClose: (): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.windowClose),
  windowGetState: (): Promise<WindowState | null> =>
    ipcRenderer.invoke(IPC_CHANNELS.windowGetState),
  onWindowStateChanged: (
    callback: (state: WindowState) => void,
  ): Unsubscribe => subscribe(IPC_CHANNELS.evtWindowState, callback),
};

contextBridge.exposeInMainWorld("preciaMock", api);

export type PreciaMockApi = typeof api;
