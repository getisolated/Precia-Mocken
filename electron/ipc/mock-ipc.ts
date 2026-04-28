import { BrowserWindow, ipcMain, type IpcMainInvokeEvent } from "electron";
import { Bi400Server } from "../tcp/bi400-server.js";
import {
  buildAib,
  buildBadge,
  buildCancel,
  buildDepartureVehicle,
  buildOk,
  buildPdd,
  buildPds,
  buildPresenceVehicle,
  buildRaw,
  buildScc,
  buildWeight,
} from "../tcp/bi400-frame-builder.js";
import { LogStore } from "../logging/log-store.js";
import type {
  ConsoleLine,
  FrameLogEntry,
  SendResult,
  ServerConfig,
  ServerStatus,
  WeightPayload,
} from "../tcp/bi400-types.js";
import { IPC_CHANNELS } from "./ipc-channels.js";

export { IPC_CHANNELS };

export interface InitialState {
  status: ServerStatus;
  frames: FrameLogEntry[];
  console: ConsoleLine[];
}

export function registerMockIpc(): { dispose: () => Promise<void> } {
  const server = new Bi400Server();
  const store = new LogStore(1000);

  const broadcast = (channel: string, payload: unknown) => {
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) {
        win.webContents.send(channel, payload);
      }
    }
  };

  server.on("status", (status) => {
    broadcast(IPC_CHANNELS.evtStatus, status);
  });

  server.on("frame", (entry) => {
    store.pushFrame(entry);
    broadcast(IPC_CHANNELS.evtFrame, entry);
  });

  server.on("console", (line) => {
    store.pushConsole(line);
    broadcast(IPC_CHANNELS.evtConsole, line);
  });

  const safeSend = (
    raw: string,
    options: { type: string; description: string },
  ): SendResult => server.send(raw, options);

  ipcMain.handle(IPC_CHANNELS.getInitialState, (): InitialState => ({
    status: server.getStatus(),
    frames: store.getFrames(),
    console: store.getConsole(),
  }));

  ipcMain.handle(IPC_CHANNELS.getStatus, () => server.getStatus());

  ipcMain.handle(
    IPC_CHANNELS.start,
    async (_evt: IpcMainInvokeEvent, config: ServerConfig) => {
      try {
        return await server.start(config);
      } catch (error) {
        return server.getStatus();
      }
    },
  );

  ipcMain.handle(IPC_CHANNELS.stop, () => server.stop());

  ipcMain.handle(
    IPC_CHANNELS.restart,
    async (_evt, config: ServerConfig) => {
      try {
        return await server.restart(config);
      } catch (error) {
        return server.getStatus();
      }
    },
  );

  ipcMain.handle(IPC_CHANNELS.sendPve, (): SendResult =>
    safeSend(buildPresenceVehicle(), {
      type: "PVE",
      description: "Présence véhicule",
    }),
  );

  ipcMain.handle(IPC_CHANNELS.sendDve, (): SendResult =>
    safeSend(buildDepartureVehicle(), {
      type: "DVE",
      description: "Départ véhicule",
    }),
  );

  ipcMain.handle(
    IPC_CHANNELS.sendBadge,
    (_evt, badge: string): SendResult =>
      safeSend(buildBadge(badge ?? ""), {
        type: "BDG",
        description: `Badge ${badge ?? ""}`,
      }),
  );

  ipcMain.handle(
    IPC_CHANNELS.sendTour,
    (_evt, value: string): SendResult =>
      safeSend(buildScc(value ?? ""), {
        type: "SCC",
        description: `Tournée ${value ?? ""}`,
      }),
  );

  ipcMain.handle(
    IPC_CHANNELS.sendSite,
    (_evt, value: string): SendResult =>
      safeSend(buildScc(value ?? ""), {
        type: "SCC",
        description: `Site ${value ?? ""}`,
      }),
  );

  ipcMain.handle(
    IPC_CHANNELS.sendButton,
    (_evt, index: number): SendResult =>
      safeSend(buildAib(Number(index) || 0), {
        type: "AIB",
        description: `Bouton ${index}`,
      }),
  );

  ipcMain.handle(IPC_CHANNELS.sendOk, (): SendResult =>
    safeSend(buildOk(), { type: "AIB", description: "OK (bouton 2)" }),
  );

  ipcMain.handle(IPC_CHANNELS.sendCancel, (): SendResult =>
    safeSend(buildCancel(), { type: "AIB", description: "Annuler (bouton 1)" }),
  );

  const normalizeWeight = (payload: WeightPayload): WeightPayload => ({
    gross: Number(payload?.gross) || 0,
    tare: Number(payload?.tare) || 0,
    net: Number(payload?.net) || 0,
    dsd: Number(payload?.dsd) || 0,
    stable: !!payload?.stable,
  });

  ipcMain.handle(
    IPC_CHANNELS.sendWeight,
    (_evt, payload: WeightPayload): SendResult => {
      const normalized = normalizeWeight(payload);
      server.setStoredWeight(normalized);
      const raw = normalized.stable
        ? buildPds(normalized)
        : buildPdd(normalized);
      return safeSend(raw, {
        type: normalized.stable ? "PDS" : "PDD",
        description: normalized.stable ? "Poids stable" : "Poids instable",
      });
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.setWeight,
    (_evt, payload: WeightPayload): boolean => {
      server.setStoredWeight(normalizeWeight(payload));
      return true;
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.sendRaw,
    (_evt, raw: string): SendResult =>
      safeSend(buildRaw(raw ?? ""), {
        type: "RAW",
        description: "Trame brute (debug)",
      }),
  );

  ipcMain.handle(IPC_CHANNELS.clearLogs, () => {
    store.clear();
    return true;
  });

  return {
    dispose: async () => {
      for (const channel of Object.values(IPC_CHANNELS)) {
        ipcMain.removeHandler(channel);
      }
      await server.stop();
    },
  };
}
