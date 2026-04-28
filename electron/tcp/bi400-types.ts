export interface ServerConfig {
  host: string;
  port: number;
  autoStart?: boolean;
}

export type ServerState =
  | "stopped"
  | "listening"
  | "client-connected"
  | "error";

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

export interface ParsedFrame {
  raw: string;
  type: string;
  body: string;
  payload: string;
  length: number;
}
