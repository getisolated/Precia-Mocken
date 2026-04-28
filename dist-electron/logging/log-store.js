"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogStore = void 0;
class LogStore {
    maxLogs;
    frames = [];
    console = [];
    constructor(maxLogs = 1000) {
        this.maxLogs = maxLogs;
    }
    pushFrame(entry) {
        this.frames.push(entry);
        if (this.frames.length > this.maxLogs) {
            this.frames.splice(0, this.frames.length - this.maxLogs);
        }
    }
    pushConsole(line) {
        this.console.push(line);
        if (this.console.length > this.maxLogs) {
            this.console.splice(0, this.console.length - this.maxLogs);
        }
    }
    getFrames() {
        return [...this.frames];
    }
    getConsole() {
        return [...this.console];
    }
    clear() {
        this.frames = [];
        this.console = [];
    }
}
exports.LogStore = LogStore;
//# sourceMappingURL=log-store.js.map