export {};

export type ServerState =
  | "stopped"
  | "listening"
  | "client-connected"
  | "error";

export interface ServerConfig {
  host: string;
  port: number;
  autoStart?: boolean;
}

export interface ServerStatus {
  state: ServerState;
  host: string;
  port: number;
  endpoint: string;
  clientEndpoint?: string;
  startedAt?: string;
  lastConnectionAt?: string;
  lastMessageAt?: string;
  errorMessage?: string;
  frameCount: number;
}

export interface WeightPayload {
  gross: number;
  tare: number;
  net: number;
  dsd: number;
  stable: boolean;
}

export type FrameDirection = "incoming" | "outgoing" | "system" | "error";

export type DecodedFrame =
  | { kind: "afm"; position: number; size: "G" | "M" | "P"; text: string }
  | { kind: "rze" }
  | {
      kind: "rzp";
      clearList: boolean;
      clearSaisie: boolean;
      clearButtons: boolean;
      lines: string;
    }
  | { kind: "amp"; visible: boolean }
  | { kind: "scc-prompt"; prompt: string; maxLen: number }
  | { kind: "aib-prompt"; captions: string[] };

export interface FrameLogEntry {
  id: string;
  timestamp: string;
  direction: FrameDirection;
  type?: string;
  description: string;
  payload?: string;
  raw?: string;
  clientEndpoint?: string;
  decoded?: DecodedFrame;
}

export interface ConsoleLine {
  timestamp: string;
  channel: "system" | "tcp" | "in" | "out" | "error";
  text: string;
}

export interface SendResult {
  ok: boolean;
  raw?: string;
  error?: string;
}

export interface InitialState {
  status: ServerStatus;
  frames: FrameLogEntry[];
  console: ConsoleLine[];
}

export type Unsubscribe = () => void;

export interface WindowState {
  isMaximized: boolean;
  isFullScreen: boolean;
}

export interface PreciaMockApi {
  getInitialState(): Promise<InitialState>;
  getStatus(): Promise<ServerStatus>;
  startServer(config: ServerConfig): Promise<ServerStatus>;
  stopServer(): Promise<ServerStatus>;
  restartServer(config: ServerConfig): Promise<ServerStatus>;
  sendPresenceVehicle(): Promise<SendResult>;
  sendDepartureVehicle(): Promise<SendResult>;
  sendBadge(badge: string): Promise<SendResult>;
  sendTour(value: string): Promise<SendResult>;
  sendSite(value: string): Promise<SendResult>;
  sendButton(index: number): Promise<SendResult>;
  sendOk(): Promise<SendResult>;
  sendCancel(): Promise<SendResult>;
  sendWeight(payload: WeightPayload): Promise<SendResult>;
  setWeight(payload: WeightPayload): Promise<boolean>;
  sendRaw(raw: string): Promise<SendResult>;
  clearLogs(): Promise<boolean>;
  onStatusChanged(callback: (status: ServerStatus) => void): Unsubscribe;
  onFrameLog(callback: (entry: FrameLogEntry) => void): Unsubscribe;
  onConsoleLine(callback: (line: ConsoleLine) => void): Unsubscribe;
  windowMinimize(): Promise<void>;
  windowMaximizeToggle(): Promise<WindowState | null>;
  windowClose(): Promise<void>;
  windowGetState(): Promise<WindowState | null>;
  onWindowStateChanged(callback: (state: WindowState) => void): Unsubscribe;
}

declare global {
  interface Window {
    preciaMock: PreciaMockApi;
  }
}
