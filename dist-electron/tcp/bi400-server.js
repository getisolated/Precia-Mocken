"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Bi400Server = void 0;
const tslib_1 = require("tslib");
const node_events_1 = require("node:events");
const net = tslib_1.__importStar(require("node:net"));
const bi400_parser_js_1 = require("./bi400-parser.js");
const bi400_describer_js_1 = require("./bi400-describer.js");
const bi400_frame_builder_js_1 = require("./bi400-frame-builder.js");
class Bi400Server extends node_events_1.EventEmitter {
    server = null;
    client = null;
    parser = new bi400_parser_js_1.Bi400FrameParser();
    storedWeight = {
        gross: 0,
        tare: 0,
        net: 0,
        dsd: 0,
        stable: true,
    };
    status = {
        state: "stopped",
        host: "127.0.0.1",
        port: 4001,
        endpoint: "127.0.0.1:4001",
        frameCount: 0,
    };
    setStoredWeight(payload) {
        this.storedWeight = { ...payload };
    }
    on(event, listener) {
        return super.on(event, listener);
    }
    emit(event, ...args) {
        return super.emit(event, ...args);
    }
    getStatus() {
        return { ...this.status };
    }
    async start(config) {
        await this.stop();
        return new Promise((resolve, reject) => {
            const server = net.createServer((socket) => this.handleConnection(socket));
            const onError = (error) => {
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
                server.on("error", (error) => {
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
                this.emitConsole("tcp", `Listening on ${config.host}:${config.port}`);
                this.emitFrame({
                    direction: "system",
                    description: `TCP server listening on ${config.host}:${config.port}`,
                    type: "TCP",
                });
                resolve(this.getStatus());
            });
        });
    }
    async stop() {
        if (this.client) {
            try {
                this.client.destroy();
            }
            catch {
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
        return new Promise((resolve) => {
            const server = this.server;
            this.server = null;
            server?.close(() => {
                this.updateStatus({
                    ...this.status,
                    state: "stopped",
                    clientEndpoint: undefined,
                    errorMessage: undefined,
                });
                this.emitConsole("tcp", "Server stopped");
                this.emitFrame({
                    direction: "system",
                    description: "TCP server stopped",
                    type: "TCP",
                });
                resolve(this.getStatus());
            });
        });
    }
    async restart(config) {
        await this.stop();
        return this.start(config);
    }
    send(raw, options) {
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
                description: options?.description ?? `Sent ${options?.type ?? "frame"}`,
                type: options?.type,
                raw,
                payload: raw,
                clientEndpoint: this.status.clientEndpoint,
            });
            this.emitConsole("out", raw);
            return { ok: true, raw };
        }
        catch (error) {
            const message = error.message ?? "Failed to send frame";
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
    handleConnection(socket) {
        if (this.client && !this.client.destroyed) {
            const message = `Rejected secondary client ${socket.remoteAddress}:${socket.remotePort} (single-client MVP)`;
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
        this.emitConsole("tcp", `Client connected: ${endpoint}`);
        this.emitFrame({
            direction: "system",
            description: `Client connected: ${endpoint}`,
            type: "TCP",
            clientEndpoint: endpoint,
        });
        socket.on("data", (chunk) => {
            const buf = typeof chunk === "string" ? Buffer.from(chunk) : chunk;
            this.handleData(buf, endpoint);
        });
        socket.on("close", () => {
            if (this.client === socket) {
                this.client = null;
                this.parser.reset();
                const next = {
                    ...this.status,
                    state: this.server ? "listening" : "stopped",
                    clientEndpoint: undefined,
                };
                this.updateStatus(next);
                this.emitConsole("tcp", `Client disconnected: ${endpoint}`);
                this.emitFrame({
                    direction: "system",
                    description: `Client disconnected: ${endpoint}`,
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
    handleData(chunk, endpoint) {
        const lastMessageAt = new Date().toISOString();
        this.updateStatus({ ...this.status, lastMessageAt });
        const { frames, errors } = this.parser.push(chunk);
        for (const frame of frames) {
            const description = (0, bi400_describer_js_1.describeFrame)(frame);
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
                    ? (0, bi400_frame_builder_js_1.buildPds)(this.storedWeight)
                    : (0, bi400_frame_builder_js_1.buildPdd)(this.storedWeight);
                this.send(replyRaw, {
                    type: description.type,
                    description: `Auto reply to ${description.type} poll`,
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
    updateStatus(next) {
        const merged = {
            ...next,
            endpoint: `${next.host}:${next.port}`,
        };
        this.status = merged;
        this.emit("status", { ...merged });
    }
    emitFrame(entry) {
        const full = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            timestamp: new Date().toISOString(),
            ...entry,
        };
        this.emit("frame", full);
    }
    emitConsole(channel, text) {
        this.emit("console", {
            timestamp: new Date().toISOString(),
            channel,
            text,
        });
    }
}
exports.Bi400Server = Bi400Server;
function describeListenError(error, config) {
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
//# sourceMappingURL=bi400-server.js.map