import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PreciaMockService } from '../../../core/services/precia-mock.service';

@Component({
  selector: 'app-weight-card',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './weight-card.component.html',
  styleUrls: ['./weight-card.component.scss'],
})
export class WeightCardComponent {
  private readonly mock = inject(PreciaMockService);

  readonly disabled = computed(() => !this.mock.isClientConnected());
  readonly weight = this.mock.weight;
  readonly autoCalcNet = signal(true);

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

  sendPds(): void {
    if (this.disabled()) return;
    this.mock.sendWeight({ ...this.weight(), stable: true });
  }
  sendPdd(): void {
    if (this.disabled()) return;
    this.mock.sendWeight({ ...this.weight(), stable: false });
  }
}

function round2(n: number): number {
  return Number(n.toFixed(2));
}
