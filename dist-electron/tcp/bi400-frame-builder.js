"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildSimple = buildSimple;
exports.buildPresenceVehicle = buildPresenceVehicle;
exports.buildDepartureVehicle = buildDepartureVehicle;
exports.buildBadge = buildBadge;
exports.buildScc = buildScc;
exports.buildAib = buildAib;
exports.buildOk = buildOk;
exports.buildCancel = buildCancel;
exports.buildWeight = buildWeight;
exports.buildPdd = buildPdd;
exports.buildPds = buildPds;
exports.buildRaw = buildRaw;
const LENGTH_DIGITS = 4;
const SEP = "  ";
function padNumber(value, width) {
    const intValue = Math.max(0, Math.trunc(value));
    return intValue.toString().padStart(width, "0").slice(-width);
}
function padDecimal(value, width, fractionDigits = 2) {
    const safe = Number.isFinite(value) ? value : 0;
    const formatted = safe.toFixed(fractionDigits);
    return formatted.padStart(width, "0").slice(-width);
}
function wrapBody(body) {
    const length = body.length.toString().padStart(LENGTH_DIGITS, "0");
    if (length.length > LENGTH_DIGITS) {
        throw new Error(`Frame body too long: ${body.length}`);
    }
    return `${length}${body}`;
}
function buildSimple(type) {
    return wrapBody(type);
}
function buildPresenceVehicle() {
    return buildSimple("PVE");
}
function buildDepartureVehicle() {
    return buildSimple("DVE");
}
function buildBadge(badge) {
    const value = badge ?? "";
    const length = value.length.toString().padStart(LENGTH_DIGITS, "0");
    const body = `BDG0${length}${value}`;
    return wrapBody(body);
}
function buildScc(value) {
    const text = value ?? "";
    const length = text.length.toString().padStart(LENGTH_DIGITS, "0");
    const body = `SCC${length}${text}`;
    return wrapBody(body);
}
function buildAib(index) {
    const idx = padNumber(index, 4);
    return wrapBody(`AIB${idx}`);
}
function buildOk() {
    return buildAib(2);
}
function buildCancel() {
    return buildAib(1);
}
function buildWeight(payload) {
    const type = payload.stable ? "PDS" : "PDD";
    const gross = padDecimal(payload.gross, 8);
    const tare = padDecimal(payload.tare, 8);
    const net = padDecimal(payload.net, 8);
    const dsd = padNumber(payload.dsd, 6);
    const body = `${type}0${gross}${SEP}${tare}${SEP}${net}${SEP}${dsd}`;
    return wrapBody(body);
}
function buildPdd(payload) {
    return buildWeight({ ...payload, stable: false });
}
function buildPds(payload) {
    return buildWeight({ ...payload, stable: true });
}
function buildRaw(raw) {
    return raw ?? "";
}
//# sourceMappingURL=bi400-frame-builder.js.map