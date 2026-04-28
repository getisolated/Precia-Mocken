import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PreciaMockService } from '../../../core/services/precia-mock.service';

type Tab = 'Badge' | 'Clavier' | 'Button' | 'Raw';

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

  readonly tabs: Tab[] = ['Badge', 'Clavier', 'Button', 'Raw'];
  readonly tab = signal<Tab>('Clavier');

  readonly disabled = computed(() => !this.mock.isClientConnected());

  readonly badge = signal('ABC123');
  readonly buttonIndex = signal('2');
  readonly rawFrame = signal('0003PVE');
  readonly clavierLocal = signal('');

  readonly promptActive = computed(() => this.mock.lcdPrompt() !== null);
  readonly clavierInput = computed(() =>
    this.promptActive() ? this.mock.saisieBuffer() : this.clavierLocal(),
  );

  setTab(t: Tab): void {
    this.tab.set(t);
  }

  onClavierInput(value: string): void {
    if (this.promptActive()) {
      this.mock.saisieBuffer.set(value);
    } else {
      this.clavierLocal.set(value);
    }
  }

  sendClavier(): void {
    if (this.disabled()) return;
    this.mock.sendSite(this.clavierLocal());
  }

  sendBadge(): void {
    if (this.disabled()) return;
    this.mock.sendBadge(this.badge());
  }
  sendButton(index: number): void {
    if (this.disabled()) return;
    this.mock.sendButton(index);
  }
  sendButtonField(): void {
    if (this.disabled()) return;
    this.mock.sendButton(parseInt(this.buttonIndex(), 10) || 0);
  }
  sendRaw(): void {
    if (this.disabled() || !this.rawFrame()) return;
    this.mock.sendRaw(this.rawFrame());
  }
}
