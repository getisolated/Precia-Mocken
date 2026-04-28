import {
  Injectable,
  signal,
  computed,
  effect,
  DestroyRef,
  inject,
} from '@angular/core';
import type {
  ConsoleLine,
  DecodedFrame,
  FrameLogEntry,
  PreciaMockApi,
  SendResult,
  ServerConfig,
  ServerStatus,
  WeightPayload,
} from '../../../types/precia-mock-api';

const FRAMES_LIMIT = 1000;
const CONSOLE_LIMIT = 1000;
const TOTAL_LCD_LINES = 10;
const WEIGHT_FRAME_LINES = 3;
const PROMPT_UI_LINES = 4;

const FALLBACK_STATUS: ServerStatus = {
  state: 'stopped',
  host: '127.0.0.1',
  port: 4001,
  endpoint: '127.0.0.1:4001',
  frameCount: 0,
};

function createOfflineApi(): PreciaMockApi {
  const noop = () => () => undefined;
  const reject = (): Promise<never> =>
    Promise.reject(new Error('preciaMock API is not available outside Electron.'));
  return {
    getInitialState: () =>
      Promise.resolve({ status: FALLBACK_STATUS, frames: [], console: [] }),
    getStatus: () => Promise.resolve(FALLBACK_STATUS),
    startServer: reject,
    stopServer: reject,
    restartServer: reject,
    sendPresenceVehicle: reject,
    sendDepartureVehicle: reject,
    sendBadge: reject,
    sendTour: reject,
    sendSite: reject,
    sendButton: reject,
    sendOk: reject,
    sendCancel: reject,
    sendWeight: reject,
    setWeight: () => Promise.resolve(true),
    sendRaw: reject,
    clearLogs: () => Promise.resolve(false),
    onStatusChanged: noop,
    onFrameLog: noop,
    onConsoleLine: noop,
    windowMinimize: () => Promise.resolve(),
    windowMaximizeToggle: () => Promise.resolve(null),
    windowClose: () => Promise.resolve(),
    windowGetState: () => Promise.resolve(null),
    onWindowStateChanged: noop,
  };
}

@Injectable({ providedIn: 'root' })
export class PreciaMockService {
  private readonly api: PreciaMockApi =
    typeof window !== 'undefined' && window.preciaMock
      ? window.preciaMock
      : createOfflineApi();
  private readonly destroyRef = inject(DestroyRef);

  readonly status = signal<ServerStatus>(FALLBACK_STATUS);
  readonly frames = signal<FrameLogEntry[]>([]);
  readonly console = signal<ConsoleLine[]>([]);

  readonly isElectron = typeof window !== 'undefined' && !!window.preciaMock;
  readonly isRunning = computed(() => this.status().state !== 'stopped');
  readonly isClientConnected = computed(
    () => this.status().state === 'client-connected',
  );

  readonly weight = signal<WeightPayload>({
    gross: 1000,
    tare: 200,
    net: 800,
    dsd: 1,
    stable: true,
  });

  readonly lastSentWeightType = signal<'PDS' | 'PDD' | null>(null);
  readonly vehiclePresent = signal<boolean>(false);

  // LCD state driven by incoming AFM/RZE/AMP frames.
  readonly lcdLines = signal<Map<number, { size: 'G' | 'M' | 'P'; text: string }>>(
    new Map(),
  );
  readonly lcdWeightVisible = signal<boolean>(true);
  readonly lcdPrompt = signal<string | null>(null);
  readonly saisieBuffer = signal<string>('');
  readonly aibCaptions = signal<string[]>([]);

  /**
   * LCD content rendered below the weight frame:
   *  - `textRows`: AFM lines positioned 1..maxPos (with empty placeholders for unset positions),
   *     followed by the SCC prompt and saisie buffer if any
   *  - `visibleCaptions`: AIB captions that fit in the remaining vertical room (2 lines per row, 2 per row)
   */
  readonly lcdContent = computed(() => {
    const lines = this.lcdLines();
    const captions = this.aibCaptions();
    const hasPrompt = this.lcdPrompt() !== null;
    const promptBudget = hasPrompt ? PROMPT_UI_LINES : 0;
    const total = this.lcdWeightVisible()
      ? TOTAL_LCD_LINES - WEIGHT_FRAME_LINES
      : TOTAL_LCD_LINES;

    let maxPos = 0;
    for (const k of lines.keys()) if (k > maxPos) maxPos = k;

    const textRows: string[] = [];
    for (let p = 1; p <= maxPos; p++) {
      textRows.push(lines.get(p)?.text ?? '');
    }

    const available = Math.max(0, total - promptBudget);
    const visibleText = textRows.slice(0, available);
    const leadingBlank =
      !hasPrompt &&
      this.lcdWeightVisible() &&
      visibleText.length === 0 &&
      captions.length > 0;
    const skip = leadingBlank ? 1 : 0;
    const linesLeft = Math.max(0, total - visibleText.length - skip - promptBudget);
    const captionsFit = Math.floor(linesLeft / 2) * 2;
    const visibleCaptions = hasPrompt ? [] : captions.slice(0, captionsFit);

    return { textRows: visibleText, visibleCaptions, leadingBlank };
  });

  constructor() {
    this.api.getInitialState().then((state) => {
      this.status.set(state.status);
      this.frames.set(state.frames.slice(-FRAMES_LIMIT));
      this.console.set(state.console.slice(-CONSOLE_LIMIT));
    });

    const offStatus = this.api.onStatusChanged((next) => this.status.set(next));
    const offFrame = this.api.onFrameLog((entry) => {
      this.applyDecodedToLcd(entry);
      this.frames.update((list) => {
        const merged = [...list, entry];
        return merged.length > FRAMES_LIMIT
          ? merged.slice(merged.length - FRAMES_LIMIT)
          : merged;
      });
    });
    const offConsole = this.api.onConsoleLine((line) => {
      this.console.update((list) => {
        const merged = [...list, line];
        return merged.length > CONSOLE_LIMIT
          ? merged.slice(merged.length - CONSOLE_LIMIT)
          : merged;
      });
    });

    this.destroyRef.onDestroy(() => {
      offStatus();
      offFrame();
      offConsole();
    });

    // Keep backend storedWeight in sync with the local signal so PDS/PDD polls auto-reply.
    effect(() => {
      this.api.setWeight(this.weight());
    });
  }

  private applyDecodedToLcd(entry: FrameLogEntry): void {
    if (entry.direction !== 'incoming' || !entry.decoded) return;
    const decoded: DecodedFrame = entry.decoded;
    switch (decoded.kind) {
      case 'afm': {
        this.lcdLines.update((m) => {
          const next = new Map(m);
          next.set(decoded.position, { size: decoded.size, text: decoded.text });
          return next;
        });
        break;
      }
      case 'rze': {
        this.lcdLines.set(new Map());
        this.lcdPrompt.set(null);
        this.saisieBuffer.set('');
        this.aibCaptions.set([]);
        break;
      }
      case 'rzp': {
        if (decoded.clearSaisie) {
          this.lcdPrompt.set(null);
          this.saisieBuffer.set('');
        }
        if (decoded.clearButtons) {
          this.aibCaptions.set([]);
        }
        if (decoded.lines && decoded.lines !== '') {
          if (decoded.lines === '0') {
            this.lcdLines.set(new Map());
          } else {
            const positions = decoded.lines.split('').map((c) => parseInt(c, 10));
            this.lcdLines.update((m) => {
              const next = new Map(m);
              for (const p of positions) {
                if (Number.isFinite(p)) next.delete(p);
              }
              return next;
            });
          }
        }
        break;
      }
      case 'amp':
        this.lcdWeightVisible.set(decoded.visible);
        break;
      case 'scc-prompt':
        this.lcdPrompt.set(decoded.prompt);
        this.saisieBuffer.set('');
        break;
      case 'aib-prompt':
        this.aibCaptions.set(decoded.captions);
        break;
    }
  }

  start(config: ServerConfig) {
    return this.api.startServer(config);
  }
  stop() {
    return this.api.stopServer();
  }
  restart(config: ServerConfig) {
    return this.api.restartServer(config);
  }

  sendPresenceVehicle(): Promise<SendResult> {
    this.vehiclePresent.set(true);
    return this.api.sendPresenceVehicle();
  }
  sendDepartureVehicle(): Promise<SendResult> {
    this.vehiclePresent.set(false);
    return this.api.sendDepartureVehicle();
  }
  sendBadge(value: string): Promise<SendResult> {
    return this.api.sendBadge(value);
  }
  sendTour(value: string): Promise<SendResult> {
    return this.api.sendTour(value);
  }
  sendSite(value: string): Promise<SendResult> {
    return this.api.sendSite(value);
  }
  sendButton(index: number): Promise<SendResult> {
    return this.api.sendButton(index);
  }
  sendOk(): Promise<SendResult> {
    return this.api.sendOk();
  }
  sendCancel(): Promise<SendResult> {
    return this.api.sendCancel();
  }
  sendWeight(payload: WeightPayload): Promise<SendResult> {
    this.weight.set(payload);
    this.lastSentWeightType.set(payload.stable ? 'PDS' : 'PDD');
    return this.api.sendWeight(payload);
  }
  setWeight(payload: WeightPayload): Promise<boolean> {
    this.weight.set(payload);
    return this.api.setWeight(payload);
  }
  sendRaw(raw: string): Promise<SendResult> {
    return this.api.sendRaw(raw);
  }

  clearLogs(): void {
    this.frames.set([]);
    this.console.set([]);
    this.api.clearLogs();
  }

  appendSaisie(char: string): void {
    if (this.lcdPrompt() === null) return;
    this.saisieBuffer.update((s) => s + char);
  }

  backspaceSaisie(): void {
    if (this.lcdPrompt() === null) return;
    this.saisieBuffer.update((s) => s.slice(0, -1));
  }

  submitSaisie(): void {
    if (this.lcdPrompt() === null) return;
    const value = this.saisieBuffer();
    this.lcdPrompt.set(null);
    this.saisieBuffer.set('');
    this.api.sendSite(value);
  }
}
