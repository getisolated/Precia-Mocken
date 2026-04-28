import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { PreciaMockService } from '../../../core/services/precia-mock.service';

@Component({
  selector: 'app-quick-actions-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './quick-actions-card.component.html',
  styleUrls: ['./quick-actions-card.component.scss'],
})
export class QuickActionsCardComponent {
  private readonly mock = inject(PreciaMockService);

  readonly disabled = computed(() => !this.mock.isClientConnected());

  pve(): void {
    if (this.disabled()) return;
    this.mock.sendPresenceVehicle();
  }

  dve(): void {
    if (this.disabled()) return;
    this.mock.sendDepartureVehicle();
  }
}
