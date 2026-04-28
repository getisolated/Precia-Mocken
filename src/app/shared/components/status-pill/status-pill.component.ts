import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { ServerState } from '../../../core/models/server-status.model';

const CLASS_BY_STATE: Record<ServerState, string> = {
  stopped: 'pill-stopped',
  listening: 'pill-listening',
  'client-connected': 'pill-connected',
  error: 'pill-error',
};

const LABEL_BY_STATE: Record<ServerState, string> = {
  stopped: 'STOPPED',
  listening: 'LISTENING',
  'client-connected': 'CLIENT CONNECTED',
  error: 'ERROR',
};

@Component({
  selector: 'app-status-pill',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="pill" [class]="cssClass()">{{ label() }}</span>`,
})
export class StatusPillComponent {
  readonly state = input.required<ServerState>();
  readonly cssClass = computed(() => CLASS_BY_STATE[this.state()] ?? 'pill-stopped');
  readonly label = computed(() => LABEL_BY_STATE[this.state()] ?? this.state());
}
