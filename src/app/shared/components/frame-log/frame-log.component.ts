import {
  AfterViewChecked,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PreciaMockService } from '../../../core/services/precia-mock.service';
import type {
  FrameDirection,
  FrameLogEntry,
} from '../../../core/models/frame-log-entry.model';

const TYPE_OPTIONS = [
  'all',
  'PVE',
  'DVE',
  'BDG',
  'SCC',
  'AIB',
  'PDD',
  'PDS',
  'AMP',
  'RZE',
  'RZP',
  'FIL',
  'AFM',
  'IMP',
  'OUT',
  'TCP',
];

@Component({
  selector: 'app-frame-log',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './frame-log.component.html',
  styleUrls: ['./frame-log.component.scss'],
})
export class FrameLogComponent implements AfterViewChecked {
  private readonly mock = inject(PreciaMockService);
  private readonly rowsRef = viewChild<ElementRef<HTMLDivElement>>('rows');
  private lastCount = 0;

  readonly entries = input.required<FrameLogEntry[]>();

  readonly directions: Array<FrameDirection | 'all'> = [
    'all',
    'incoming',
    'outgoing',
    'system',
    'error',
  ];
  readonly typeOptions = TYPE_OPTIONS;

  readonly directionFilter = signal<FrameDirection | 'all'>('all');
  readonly typeFilter = signal<string>('all');
  readonly search = signal<string>('');
  readonly expanded = signal<Set<string>>(new Set());

  readonly filtered = computed(() => {
    const dir = this.directionFilter();
    const type = this.typeFilter();
    const term = this.search().toLowerCase().trim();
    return this.entries().filter((e) => {
      if (dir !== 'all' && e.direction !== dir) return false;
      if (type !== 'all' && e.type !== type) return false;
      if (term) {
        const hay = [e.description, e.payload, e.raw, e.type, e.clientEndpoint]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  });

  readonly count = computed(() => this.filtered().length);

  ngAfterViewChecked(): void {
    const c = this.entries().length;
    if (c !== this.lastCount) {
      this.lastCount = c;
      const el = this.rowsRef()?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    }
  }

  formatTime(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    const t = d.toLocaleTimeString('fr-FR', { hour12: false });
    const ms = String(d.getMilliseconds()).padStart(3, '0');
    return `${t}.${ms}`;
  }

  toggle(id: string): void {
    this.expanded.update((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  isExpanded(id: string): boolean {
    return this.expanded().has(id);
  }

  badge(dir: FrameDirection): { label: string; cls: string } {
    switch (dir) {
      case 'incoming':
        return { label: 'IN', cls: 'in' };
      case 'outgoing':
        return { label: 'OUT', cls: 'out' };
      case 'system':
        return { label: 'SYS', cls: 'sys' };
      case 'error':
        return { label: 'ERR', cls: 'err' };
      default:
        return { label: dir, cls: 'sys' };
    }
  }

  rowClass(dir: FrameDirection): string {
    return `row-${dir}`;
  }

  async copy(raw: string | undefined, evt?: Event): Promise<void> {
    evt?.stopPropagation();
    if (!raw || !navigator?.clipboard) return;
    try {
      await navigator.clipboard.writeText(raw);
    } catch {
      /* ignore */
    }
  }

  clear(): void {
    this.mock.clearLogs();
    this.expanded.set(new Set());
  }

  trackById(_: number, entry: FrameLogEntry): string {
    return entry.id;
  }
}
