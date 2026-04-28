"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Bi400FrameParser = void 0;
exports.parseFrame = parseFrame;
const LENGTH_DIGITS = 4;
const TYPE_DIGITS = 3;
const LENGTH_REGEX = /^\d{4}$/;
class Bi400FrameParser {
    buffer = Buffer.alloc(0);
    reset() {
        this.buffer = Buffer.alloc(0);
    }
    push(chunk) {
        this.buffer = this.buffer.length === 0
            ? Buffer.from(chunk)
            : Buffer.concat([this.buffer, chunk]);
        const frames = [];
        const errors = [];
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
    get bufferedBytes() {
        return this.buffer.length;
    }
}
exports.Bi400FrameParser = Bi400FrameParser;
function parseFrame(frame) {
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
//# sourceMappingURL=bi400-parser.js.map