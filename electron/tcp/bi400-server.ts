import { EventEmitter } from "node:events";
import * as net from "node:net";
import { Bi400FrameParser } from "./bi400-parser.js";
import { describeFrame } from "./bi400-describer.js";
import { buildDepartureVehicle, buildPdd, buildPds } from "./bi400-frame-builder.js";
import type {
  ConsoleLine,
  FrameLogEntry,
  ServerConfig,
  ServerStatus,
  ServerState,
  SendResult,
  WeightPayload,
} from "./bi400-types.js";

export interface Bi400ServerEvents {
  status: (status: ServerStatus) => void;
  frame: (entry: FrameLogEntry) => void;
  console: (line: ConsoleLine) => void;
}

export class Bi400Server extends EventEmitter {
  private server: net.Server | null = null;
  private client: net.Socket | null = null;
  private parser = new Bi400FrameParser();
  private storedWeight: WeightPayload = {
    gross: 0,
    tare: 0,
    net: 0,
    dsd: 0,
    stable: true,
  };
  private status: ServerStatus = {
    state: "stopped",
    host: "127.0.0.1",
    port: 4001,
    endpoint: "127.0.0.1:4001",
    frameCount: 0,
  };

  setStoredWeight(payload: WeightPayload): void {
    this.storedWeight = { ...payload };
  }

  override on<K extends keyof Bi400ServerEvents>(
    event: K,
    listener: Bi400ServerEvents[K],
  ): this {
    return super.on(event, listener);
  }

  override emit<K extends keyof Bi400ServerEvents>(
    event: K,
    ...args: Parameters<Bi400ServerEvents[K]>
  ): boolean {
    return super.emit(event, ...args);
  }

  getStatus(): ServerStatus {
    return { ...this.status };
  }

  async start(config: ServerConfig): Promise<ServerStatus> {
    await this.stop();

    return new Promise<ServerStatus>((resolve, reject) => {
      const server = net.createServer((socket) => this.handleConnection(socket));

      const onError = (error: NodeJS.ErrnoException) => {
        const message = describeListenError(error, config);
        this.updateStatus({
          state: "error",
          host: config.host,
          port: config.port,
          endpoint: `${config.host}:${config.port}`,
          errorMessage: message,
          frameCount: 0,
        });
        this.emitConsole("error", message);
        this.emitFrame({
          direction: "error",
          description: message,
          type: "TCP",
        });
        server.close();
        this.server = null;
        reject(new Error(message));
      };

      server.once("error", onError);

      server.listen(config.port, config.host, () => {
        server.removeListener("error", onError);
        server.on("error", (error: Error) => {
          const message = error.message ?? "Unknown TCP server error";
          this.emitConsole("error", message);
          this.emitFrame({
            direction: "error",
            description: message,
            type: "TCP",
          });
        });

        this.server = server;
        const startedAt = new Date().toISOString();
        this.updateStatus({
          state: "listening",
          host: config.host,
          port: config.port,
          endpoint: `${config.host}:${config.port}`,
          startedAt,
          frameCount: 0,
        });
        this.emitConsole("tcp", `Écoute sur ${config.host}:${config.port}`);        this.emitFrame({
          direction: "system",
          description: `Serveur TCP en écoute sur ${config.host}:${config.port}`,
          type: "TCP",
        });
        resolve(this.getStatus());
      });
    });
  }

  async stop(): Promise<ServerStatus> {
    if (this.client) {
      try {
        this.client.destroy();
      } catch {
        /* ignore */
      }
      this.client = null;
    }
    this.parser.reset();

    if (!this.server) {
      this.updateStatus({
        ...this.status,
        state: "stopped",
        clientEndpoint: undefined,
        errorMessage: undefined,
      });
      return this.getStatus();
    }

    return new Promise<ServerStatus>((resolve) => {
      const server = this.server;
      this.server = null;
      server?.close(() => {
        this.updateStatus({
          ...this.status,
          state: "stopped",
          clientEndpoint: undefined,
          errorMessage: undefined,
        });
        this.emitConsole("tcp", "Serveur arrêté");
        this.emitFrame({
          direction: "system",
          description: "Serveur TCP arrêté",
          type: "TCP",
        });
        resolve(this.getStatus());
      });
    });
  }

  async restart(config: ServerConfig): Promise<ServerStatus> {
    await this.stop();
    return this.start(config);
  }

  send(raw: string, options?: { type?: string; description?: string }): SendResult {
    if (!this.client || this.client.destroyed) {
      const message = "No client connected. Frame was not sent.";
      this.emitFrame({
        direction: "error",
        description: message,
        type: options?.type,
        raw,
      });
      this.emitConsole("error", message);
      return { ok: false, error: message };
    }

    try {
      this.client.write(raw);
      this.emitFrame({
        direction: "outgoing",
        description: options?.description ?? `Envoyé ${options?.type ?? "trame"}`,
        type: options?.type,
        raw,
        payload: raw,
        clientEndpoint: this.status.clientEndpoint,
      });
      this.emitConsole("out", raw);
      return { ok: true, raw };
    } catch (error) {
      const message = (error as Error).message ?? "Failed to send frame";
      this.emitFrame({
        direction: "error",
        description: message,
        type: options?.type,
        raw,
      });
      this.emitConsole("error", message);
      return { ok: false, error: message };
    }
  }

  private handleConnection(socket: net.Socket): void {
    if (this.client && !this.client.destroyed) {
      const message = `Client secondaire refusé ${socket.remoteAddress}:${socket.remotePort} (client unique)`;
      this.emitConsole("tcp", message);
      this.emitFrame({
        direction: "system",
        description: message,
        type: "TCP",
      });
      socket.destroy();
      return;
    }

    this.client = socket;
    this.parser.reset();
    const endpoint = `${socket.remoteAddress}:${socket.remotePort}`;
    const lastConnectionAt = new Date().toISOString();

    this.updateStatus({
      ...this.status,
      state: "client-connected",
      clientEndpoint: endpoint,
      lastConnectionAt,
      frameCount: 0,
    });
    this.emitConsole("tcp", `Client connecté : ${endpoint}`);    this.emitFrame({
      direction: "system",
      description: `Client connecté : ${endpoint}`,
      type: "TCP",
      clientEndpoint: endpoint,
    });

    this.send(buildDepartureVehicle(), {
      type: "DVE",
      description: "DVE auto à la connexion",
    });

    socket.on("data", (chunk: Buffer | string) => {
      const buf = typeof chunk === "string" ? Buffer.from(chunk) : chunk;
      this.handleData(buf, endpoint);
    });

    socket.on("close", () => {
      if (this.client === socket) {
        this.client = null;
        this.parser.reset();
        const next: ServerStatus = {
          ...this.status,
          state: this.server ? "listening" : "stopped",
          clientEndpoint: undefined,
        };
        this.updateStatus(next);
        this.emitConsole("tcp", `Client déconnecté : ${endpoint}`);        this.emitFrame({
          direction: "system",
          description: `Client déconnecté : ${endpoint}`,
          type: "TCP",
          clientEndpoint: endpoint,
        });
      }
    });

    socket.on("error", (error) => {
      const message = error.message ?? "Socket error";
      this.emitConsole("error", message);
      this.emitFrame({
        direction: "error",
        description: message,
        type: "TCP",
        clientEndpoint: endpoint,
      });
    });
  }

  private handleData(chunk: Buffer, endpoint: string): void {
    const lastMessageAt = new Date().toISOString();
    this.updateStatus({ ...this.status, lastMessageAt });

    const { frames, errors } = this.parser.push(chunk);

    for (const frame of frames) {
      const description = describeFrame(frame);
      this.updateStatus({
        ...this.status,
        frameCount: (this.status.frameCount ?? 0) + 1,
      });
      this.emitFrame({
        direction: "incoming",
        description: description.description,
        type: description.type,
        payload: description.payload,
        raw: frame.raw,
        clientEndpoint: endpoint,
        decoded: description.decoded,
      });
      this.emitConsole("in", frame.raw);

      if (description.type === "PDS" || description.type === "PDD") {
        const stable = description.type === "PDS";
        const replyRaw = stable
          ? buildPds(this.storedWeight)
          : buildPdd(this.storedWeight);
        this.send(replyRaw, {
          type: description.type,
          description: `Réponse auto à ${description.type}`,
        });
      }
    }

    for (const errorRaw of errors) {
      const message = `Invalid incoming frame length`;
      this.emitFrame({
        direction: "error",
        description: message,
        raw: errorRaw,
        clientEndpoint: endpoint,
      });
      this.emitConsole("error", `${message}: ${errorRaw}`);
    }
  }

  private updateStatus(next: ServerStatus): void {
    const merged: ServerStatus = {
      ...next,
      endpoint: `${next.host}:${next.port}`,
    };
    this.status = merged;
    this.emit("status", { ...merged });
  }

  private emitFrame(entry: Omit<FrameLogEntry, "id" | "timestamp">): void {
    const full: FrameLogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
      ...entry,
    };
    this.emit("frame", full);
  }

  private emitConsole(channel: ConsoleLine["channel"], text: string): void {
    this.emit("console", {
      timestamp: new Date().toISOString(),
      channel,
      text,
    });
  }
}

function describeListenError(
  error: NodeJS.ErrnoException,
  config: ServerConfig,
): string {
  switch (error.code) {
    case "EADDRINUSE":
      return `Cannot start TCP server: port ${config.port} is already in use.`;
    case "EADDRNOTAVAIL":
      return `Cannot start TCP server: host ${config.host} is not available on this machine.`;
    case "EACCES":
      return `Cannot start TCP server: permission denied for port ${config.port}.`;
    default:
      return `Cannot start TCP server: ${error.message ?? error.code ?? "unknown error"}.`;
  }
}
