import type { DecodedFrame, ParsedFrame } from "./bi400-types.js";

export interface FrameDescription {
  type: string;
  description: string;
  payload: string;
  decoded?: DecodedFrame;
}

export function describeFrame(frame: ParsedFrame): FrameDescription {
  const { type, payload } = frame;

  switch (type) {
    case "RZE":
      return {
        type,
        description: "ClearScreen",
        payload: payload || "(no payload)",
        decoded: { kind: "rze" },
      };
    case "RZP": {
      const decoded = decodeRzp(payload);
      return {
        type,
        description: "ClearPartial",
        payload,
        decoded,
      };
    }
    case "FIL":
      return {
        type,
        description: "Filter",
        payload,
      };
    case "AFM": {
      const decoded = decodeAfm(payload);
      const description = decoded
        ? `DisplayLine pos=${decoded.position} size=${decoded.size} "${decoded.text}"`
        : "DisplayLine";
      return {
        type,
        description,
        payload,
        decoded,
      };
    }
    case "SCC": {
      const decoded = decodeSccPrompt(payload);
      const description = decoded
        ? `PromptUser "${decoded.prompt}" maxLen=${decoded.maxLen}`
        : "PromptUser";
      return {
        type,
        description,
        payload,
        decoded,
      };
    }
    case "AIB": {
      const decoded = decodeAibPrompt(payload);
      const description = decoded
        ? `DisplayButtons [${decoded.captions.join(", ")}]`
        : "DisplayButtons";
      return {
        type,
        description,
        payload,
        decoded,
      };
    }
    case "AMP": {
      const decoded = decodeAmp(payload);
      return {
        type,
        description: decoded.visible ? "DisplayWeight ON" : "DisplayWeight OFF",
        payload,
        decoded,
      };
    }
    case "PDD":
      return {
        type,
        description: "GetWeight (poll)",
        payload,
      };
    case "PDS":
      return {
        type,
        description: "GetStableWeight (poll)",
        payload,
      };
    case "IMP":
      return {
        type,
        description: "Print",
        payload,
      };
    case "OUT":
      return {
        type,
        description: "SetAccessoryState",
        payload,
      };
    default:
      return {
        type: type || "???",
        description: "Unknown frame",
        payload,
      };
  }
}

function decodeAfm(payload: string): Extract<DecodedFrame, { kind: "afm" }> | undefined {
  if (payload.length < 9) return undefined;
  const position = parseInt(payload.slice(0, 4), 10);
  const sizeChar = payload[4];
  const size: "G" | "M" | "P" =
    sizeChar === "G" || sizeChar === "M" || sizeChar === "P" ? sizeChar : "M";
  const lineLen = parseInt(payload.slice(5, 9), 10);
  if (!Number.isFinite(position) || !Number.isFinite(lineLen)) return undefined;
  const text = payload.slice(9, 9 + lineLen);
  return { kind: "afm", position, size, text };
}

function decodeRzp(payload: string): Extract<DecodedFrame, { kind: "rzp" }> {
  const flag = (c: string | undefined) => c === "Y";
  const clearList = flag(payload[0]);
  const clearSaisie = flag(payload[1]);
  const clearButtons = flag(payload[2]);
  const lengthStr = payload.slice(3, 7);
  const length = parseInt(lengthStr, 10);
  const lines = Number.isFinite(length) ? payload.slice(7, 7 + length) : "";
  return { kind: "rzp", clearList, clearSaisie, clearButtons, lines };
}

function decodeAmp(payload: string): Extract<DecodedFrame, { kind: "amp" }> {
  const head = payload.trim().toUpperCase()[0];
  return { kind: "amp", visible: head !== "M" };
}

function decodeSccPrompt(
  payload: string,
): Extract<DecodedFrame, { kind: "scc-prompt" }> | undefined {
  if (payload.length < 8) return undefined;
  const promptLen = parseInt(payload.slice(0, 4), 10);
  if (!Number.isFinite(promptLen)) return undefined;
  const prompt = payload.slice(4, 4 + promptLen);
  const maxLenStr = payload.slice(4 + promptLen, 4 + promptLen + 4);
  const maxLen = parseInt(maxLenStr, 10);
  if (!Number.isFinite(maxLen)) return undefined;
  return { kind: "scc-prompt", prompt, maxLen };
}

function decodeAibPrompt(
  payload: string,
): Extract<DecodedFrame, { kind: "aib-prompt" }> | undefined {
  if (payload.length < 4) return undefined;
  const count = parseInt(payload.slice(0, 4), 10);
  if (!Number.isFinite(count) || count <= 0) return undefined;
  const captions: string[] = [];
  let cursor = 4;
  for (let i = 0; i < count; i++) {
    if (cursor + 4 > payload.length) return undefined;
    const len = parseInt(payload.slice(cursor, cursor + 4), 10);
    if (!Number.isFinite(len)) return undefined;
    cursor += 4;
    captions.push(payload.slice(cursor, cursor + len));
    cursor += len;
  }
  return { kind: "aib-prompt", captions };
}
