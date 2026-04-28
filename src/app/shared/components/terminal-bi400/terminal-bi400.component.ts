import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { PreciaMockService } from '../../../core/services/precia-mock.service';

@Component({
  selector: 'app-terminal-bi400',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './terminal-bi400.component.html',
  styleUrls: ['./terminal-bi400.component.scss'],
})
export class TerminalBi400Component {
  private readonly mock = inject(PreciaMockService);

  readonly pressedIndex = signal<number | null>(null);

  readonly content = this.mock.lcdContent;
  readonly grossDisplay = computed(() => {
    const g = this.mock.weight().gross;
    return Number.isFinite(g) ? g.toFixed(0) : '0';
  });

  readonly weightVisible = computed(() => this.mock.lcdWeightVisible());
  readonly vehiclePresent = computed(() => this.mock.vehiclePresent());

  pressCaption(index: number): void {
    this.pressedIndex.set(index);
    setTimeout(() => this.pressedIndex.set(null), 120);
    this.mock.sendButton(index + 1);
  }
}
