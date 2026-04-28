import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { PreciaMockService } from '../../../core/services/precia-mock.service';
import { StatusPillComponent } from '../status-pill/status-pill.component';

@Component({
  selector: 'app-tcp-status-card',
  standalone: true,
  imports: [StatusPillComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tcp-status-card.component.html',
  styleUrls: ['./tcp-status-card.component.scss'],
})
export class TcpStatusCardComponent {
  private readonly mock = inject(PreciaMockService);

  readonly status = this.mock.status;
  readonly host = signal('127.0.0.1');
  readonly port = signal(4001);
  readonly busy = signal(false);

  readonly listening = computed(
    () => this.status().state === 'listening' || this.status().state === 'client-connected',
  );
  readonly connected = computed(() => this.status().state === 'client-connected');
  readonly canStart = computed(
    () => this.status().state === 'stopped' || this.status().state === 'error',
  );

  readonly clientEndpoint = computed(() => this.status().clientEndpoint ?? '—');
  readonly lastConnection = computed(() => formatTime(this.status().lastConnectionAt));
  readonly lastMessage = computed(() => formatTime(this.status().lastMessageAt));
  readonly frameCount = computed(() => this.status().frameCount ?? 0);

  async start(): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    try {
      await this.mock.start({
        host: this.host().trim() || '127.0.0.1',
        port: Number(this.port()) || 4001,
      });
    } finally {
      this.busy.set(false);
    }
  }

  async stop(): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    try {
      await this.mock.stop();
    } finally {
      this.busy.set(false);
    }
  }

  async restart(): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    try {
      await this.mock.restart({
        host: this.host().trim() || '127.0.0.1',
        port: Number(this.port()) || 4001,
      });
    } finally {
      this.busy.set(false);
    }
  }

  async copyEndpoint(): Promise<void> {
    const endpoint = this.status().endpoint;
    if (!endpoint || !navigator?.clipboard) return;
    try {
      await navigator.clipboard.writeText(endpoint);
    } catch {
      /* ignore */
    }
  }
}

function formatTime(iso: string | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString('fr-FR', { hour12: false });
}
