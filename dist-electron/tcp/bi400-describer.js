"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.describeFrame = describeFrame;
function describeFrame(frame) {
    const { type, payload } = frame;
    switch (type) {
        case "RZE":
            return {
                type,
                description: "Effacement écran",
                payload: payload || "(aucun contenu)",
                decoded: { kind: "rze" },
            };
        case "RZP": {
            const decoded = decodeRzp(payload);
            return {
                type,
                description: "Effacement partiel",
                payload,
                decoded,
            };
        }
        case "FIL":
            return {
                type,
                description: "Filtre",
                payload,
            };
        case "AFM": {
            const decoded = decodeAfm(payload);
            const description = decoded
                ? `Affichage ligne pos=${decoded.position} taille=${decoded.size} "${decoded.text}"`
                : "Affichage ligne";
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
                ? `Invite saisie "${decoded.prompt}" max=${decoded.maxLen}`
                : "Invite saisie";
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
                ? `Affichage boutons [${decoded.captions.join(", ")}]`
                : "Affichage boutons";
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
                description: decoded.visible ? "Affichage poids ON" : "Affichage poids OFF",
                payload,
                decoded,
            };
        }
        case "PDD":
            return {
                type,
                description: "Demande poids (poll)",
                payload,
            };
        case "PDS":
            return {
                type,
                description: "Demande poids stable (poll)",
                payload,
            };
        case "IMP":
            return {
                type,
                description: "Impression",
                payload,
            };
        case "OUT":
            return {
                type,
                description: "État accessoire",
                payload,
            };
        default:
            return {
                type: type || "???",
                description: "Trame inconnue",
                payload,
            };
    }
}
function decodeAfm(payload) {
    if (payload.length < 9)
        return undefined;
    const position = parseInt(payload.slice(0, 4), 10);
    const sizeChar = payload[4];
    const size = sizeChar === "G" || sizeChar === "M" || sizeChar === "P" ? sizeChar : "M";
    const lineLen = parseInt(payload.slice(5, 9), 10);
    if (!Number.isFinite(position) || !Number.isFinite(lineLen))
        return undefined;
    const text = payload.slice(9, 9 + lineLen);
    return { kind: "afm", position, size, text };
}
function decodeRzp(payload) {
    const flag = (c) => c === "Y";
    const clearList = flag(payload[0]);
    const clearSaisie = flag(payload[1]);
    const clearButtons = flag(payload[2]);
    const lengthStr = payload.slice(3, 7);
    const length = parseInt(lengthStr, 10);
    const lines = Number.isFinite(length) ? payload.slice(7, 7 + length) : "";
    return { kind: "rzp", clearList, clearSaisie, clearButtons, lines };
}
function decodeAmp(payload) {
    const head = payload.trim().toUpperCase()[0];
    return { kind: "amp", visible: head !== "M" };
}
function decodeSccPrompt(payload) {
    if (payload.length < 8)
        return undefined;
    const promptLen = parseInt(payload.slice(0, 4), 10);
    if (!Number.isFinite(promptLen))
        return undefined;
    const prompt = payload.slice(4, 4 + promptLen);
    const maxLenStr = payload.slice(4 + promptLen, 4 + promptLen + 4);
    const maxLen = parseInt(maxLenStr, 10);
    if (!Number.isFinite(maxLen))
        return undefined;
    return { kind: "scc-prompt", prompt, maxLen };
}
function decodeAibPrompt(payload) {
    if (payload.length < 4)
        return undefined;
    const count = parseInt(payload.slice(0, 4), 10);
    if (!Number.isFinite(count) || count <= 0)
        return undefined;
    const captions = [];
    let cursor = 4;
    for (let i = 0; i < count; i++) {
        if (cursor + 4 > payload.length)
            return undefined;
        const len = parseInt(payload.slice(cursor, cursor + 4), 10);
        if (!Number.isFinite(len))
            return undefined;
        cursor += 4;
        captions.push(payload.slice(cursor, cursor + len));
        cursor += len;
    }
    return { kind: "aib-prompt", captions };
}
//# sourceMappingURL=bi400-describer.js.map