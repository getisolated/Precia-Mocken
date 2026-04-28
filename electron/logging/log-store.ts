import type { ConsoleLine, FrameLogEntry } from "../tcp/bi400-types.js";

export class LogStore {
  private frames: FrameLogEntry[] = [];
  private console: ConsoleLine[] = [];

  constructor(private readonly maxLogs = 1000) {}

  pushFrame(entry: FrameLogEntry): void {
    this.frames.push(entry);
    if (this.frames.length > this.maxLogs) {
      this.frames.splice(0, this.frames.length - this.maxLogs);
    }
  }

  pushConsole(line: ConsoleLine): void {
    this.console.push(line);
    if (this.console.length > this.maxLogs) {
      this.console.splice(0, this.console.length - this.maxLogs);
    }
  }

  getFrames(): FrameLogEntry[] {
    return [...this.frames];
  }

  getConsole(): ConsoleLine[] {
    return [...this.console];
  }

  clear(): void {
    this.frames = [];
    this.console = [];
  }
}
