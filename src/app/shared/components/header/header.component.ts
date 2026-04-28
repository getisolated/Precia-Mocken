import {
  ChangeDetectionStrategy,
  Component,
  inject,
  output,
} from '@angular/core';
import { PreciaMockService } from '../../../core/services/precia-mock.service';
import { StatusPillComponent } from '../status-pill/status-pill.component';
import { WindowControlsComponent } from '../window-controls/window-controls.component';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [StatusPillComponent, WindowControlsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
})
export class HeaderComponent {
  protected readonly mock = inject(PreciaMockService);

  readonly start = output<void>();
  readonly stop = output<void>();
  readonly clearLogs = output<void>();
  readonly settings = output<void>();

  protected onStart() {
    this.start.emit();
  }
  protected onStop() {
    this.stop.emit();
  }
  protected onClearLogs() {
    this.clearLogs.emit();
  }
  protected onSettings() {
    this.settings.emit();
  }
}
