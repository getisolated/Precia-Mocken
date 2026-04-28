import {
  AfterViewChecked,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  input,
  signal,
  viewChild,
} from '@angular/core';
import type { ConsoleLine } from '../../../core/models/frame-log-entry.model';

@Component({
  selector: 'app-console-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './console-panel.component.html',
  styleUrls: ['./console-panel.component.scss'],
})
export class ConsolePanelComponent implements AfterViewChecked {
  readonly lines = input.required<ConsoleLine[]>();
  readonly visible = signal(true);

  readonly count = computed(() => this.lines().length);

  private readonly terminalRef = viewChild<ElementRef<HTMLDivElement>>('terminal');
  private lastCount = 0;

  toggle(): void {
    this.visible.update((v) => !v);
  }

  ngAfterViewChecked(): void {
    if (this.lines().length !== this.lastCount) {
      this.lastCount = this.lines().length;
      this.scrollToBottom();
    }
  }

  private scrollToBottom(): void {
    const el = this.terminalRef()?.nativeElement;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }

  formatLine(line: ConsoleLine): string {
    const prefix = `[${line.channel}]`.padEnd(8, ' ');
    return `${prefix} ${line.text}`;
  }
}
