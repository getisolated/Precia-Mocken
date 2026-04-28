import type { WeightPayload } from "./bi400-types.js";

const LENGTH_DIGITS = 4;
const SEP = "  ";

function padNumber(value: number, width: number): string {
  const intValue = Math.max(0, Math.trunc(value));
  return intValue.toString().padStart(width, "0").slice(-width);
}

function padDecimal(value: number, width: number, fractionDigits = 2): string {
  const safe = Number.isFinite(value) ? value : 0;
  const formatted = safe.toFixed(fractionDigits);
  return formatted.padStart(width, "0").slice(-width);
}

function wrapBody(body: string): string {
  const length = body.length.toString().padStart(LENGTH_DIGITS, "0");
  if (length.length > LENGTH_DIGITS) {
    throw new Error(`Frame body too long: ${body.length}`);
  }
  return `${length}${body}`;
}

export function buildSimple(type: string): string {
  return wrapBody(type);
}

export function buildPresenceVehicle(): string {
  return buildSimple("PVE");
}

export function buildDepartureVehicle(): string {
  return buildSimple("DVE");
}

export function buildBadge(badge: string): string {
  const value = badge ?? "";
  const length = value.length.toString().padStart(LENGTH_DIGITS, "0");
  const body = `BDG0${length}${value}`;
  return wrapBody(body);
}

export function buildScc(value: string): string {
  const text = value ?? "";
  const length = text.length.toString().padStart(LENGTH_DIGITS, "0");
  const body = `SCC${length}${text}`;
  return wrapBody(body);
}

export function buildAib(index: number): string {
  const idx = padNumber(index, 4);
  return wrapBody(`AIB${idx}`);
}

export function buildOk(): string {
  return buildAib(2);
}

export function buildCancel(): string {
  return buildAib(1);
}

export function buildWeight(payload: WeightPayload): string {
  const type = payload.stable ? "PDS" : "PDD";
  const gross = padDecimal(payload.gross, 8);
  const tare = padDecimal(payload.tare, 8);
  const net = padDecimal(payload.net, 8);
  const dsd = padNumber(payload.dsd, 6);
  const body = `${type}0${gross}${SEP}${tare}${SEP}${net}${SEP}${dsd}`;
  return wrapBody(body);
}

export function buildPdd(payload: Omit<WeightPayload, "stable">): string {
  return buildWeight({ ...payload, stable: false });
}

export function buildPds(payload: Omit<WeightPayload, "stable">): string {
  return buildWeight({ ...payload, stable: true });
}

export function buildRaw(raw: string): string {
  return raw ?? "";
}
