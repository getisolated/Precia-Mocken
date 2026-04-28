import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PreciaMockService } from '../../../core/services/precia-mock.service';

type Tab = 'Badge' | 'Tour' | 'Site' | 'Button' | 'Weight' | 'Raw';

@Component({
  selector: 'app-simulation-form',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './simulation-form.component.html',
  styleUrls: ['./simulation-form.component.scss'],
})
export class SimulationFormComponent {
  private readonly mock = inject(PreciaMockService);

  readonly tabs: Tab[] = ['Badge', 'Tour', 'Site', 'Button', 'Weight', 'Raw'];
  readonly tab = signal<Tab>('Weight');

  readonly disabled = computed(() => !this.mock.isClientConnected());

  readonly badge = signal('ABC123');
  readonly tour = signal('00042');
  readonly site = signal('SITE01');
  readonly buttonIndex = signal('2');
  readonly autoCalcNet = signal(true);
  readonly rawFrame = signal('0003PVE');

  readonly weight = this.mock.weight;

  setTab(t: Tab): void {
    this.tab.set(t);
  }

  updateGross(value: string): void {
    const num = parseFloat(value) || 0;
    this.weight.update((w) => {
      const next = { ...w, gross: num };
      if (this.autoCalcNet()) next.net = round2(num - (Number(w.tare) || 0));
      return next;
    });
  }

  updateTare(value: string): void {
    const num = parseFloat(value) || 0;
    this.weight.update((w) => {
      const next = { ...w, tare: num };
      if (this.autoCalcNet()) next.net = round2((Number(w.gross) || 0) - num);
      return next;
    });
  }

  updateNet(value: string): void {
    const num = parseFloat(value) || 0;
    this.weight.update((w) => ({ ...w, net: num }));
  }

  updateDsd(value: string): void {
    const num = Math.max(0, Math.trunc(parseFloat(value) || 0));
    this.weight.update((w) => ({ ...w, dsd: num }));
  }

  toggleAutoCalc(value: boolean): void {
    this.autoCalcNet.set(value);
    if (value) {
      this.weight.update((w) => ({ ...w, net: round2(w.gross - w.tare) }));
    }
  }

  sendBadge(): void {
    if (this.disabled()) return;
    this.mock.sendBadge(this.badge());
  }
  sendTour(): void {
    if (this.disabled()) return;
    this.mock.sendTour(this.tour());
  }
  sendSite(): void {
    if (this.disabled()) return;
    this.mock.sendSite(this.site());
  }
  sendButton(index: number): void {
    if (this.disabled()) return;
    this.mock.sendButton(index);
  }
  sendButtonField(): void {
    if (this.disabled()) return;
    this.mock.sendButton(parseInt(this.buttonIndex(), 10) || 0);
  }
  sendPds(): void {
    if (this.disabled()) return;
    this.mock.sendWeight({ ...this.weight(), stable: true });
  }
  sendPdd(): void {
    if (this.disabled()) return;
    this.mock.sendWeight({ ...this.weight(), stable: false });
  }
  sendRaw(): void {
    if (this.disabled() || !this.rawFrame()) return;
    this.mock.sendRaw(this.rawFrame());
  }
}

function round2(n: number): number {
  return Number(n.toFixed(2));
}
