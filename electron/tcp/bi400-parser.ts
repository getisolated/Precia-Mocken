import type { ParsedFrame } from "./bi400-types.js";

const LENGTH_DIGITS = 4;
const TYPE_DIGITS = 3;
const LENGTH_REGEX = /^\d{4}$/;

export interface ParseOutcome {
  frames: ParsedFrame[];
  errors: string[];
}

export class Bi400FrameParser {
  private buffer: Buffer = Buffer.alloc(0);

  reset(): void {
    this.buffer = Buffer.alloc(0);
  }

  push(chunk: Buffer): ParseOutcome {
    this.buffer = this.buffer.length === 0
      ? Buffer.from(chunk)
      : Buffer.concat([this.buffer, chunk]);

    const frames: ParsedFrame[] = [];
    const errors: string[] = [];

    while (this.buffer.length >= LENGTH_DIGITS) {
      const lenText = this.buffer.subarray(0, LENGTH_DIGITS).toString("ascii");

      if (!LENGTH_REGEX.test(lenText)) {
        errors.push(this.buffer.toString("ascii"));
        this.buffer = Buffer.alloc(0);
        break;
      }

      const bodyLength = Number(lenText);
      const totalLength = LENGTH_DIGITS + bodyLength;

      if (this.buffer.length < totalLength) {
        break;
      }

      const frameBuffer = this.buffer.subarray(0, totalLength);
      const parsed = parseFrame(frameBuffer);
      frames.push(parsed);

      this.buffer = this.buffer.subarray(totalLength);
    }

    return { frames, errors };
  }

  get bufferedBytes(): number {
    return this.buffer.length;
  }
}

export function parseFrame(frame: Buffer | string): ParsedFrame {
  const raw = typeof frame === "string" ? frame : frame.toString("ascii");
  const length = Number(raw.slice(0, LENGTH_DIGITS));
  const body = raw.slice(LENGTH_DIGITS, LENGTH_DIGITS + length);
  const type = body.slice(0, TYPE_DIGITS);
  const payload = body.slice(TYPE_DIGITS);

  return {
    raw,
    type,
    body,
    payload,
    length,
  };
}
