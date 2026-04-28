import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { HeaderComponent } from '../../shared/components/header/header.component';
import { TcpStatusCardComponent } from '../../shared/components/tcp-status-card/tcp-status-card.component';
import { TerminalBi400Component } from '../../shared/components/terminal-bi400/terminal-bi400.component';
import { QuickActionsCardComponent } from '../../shared/components/quick-actions-card/quick-actions-card.component';
import { SimulationFormComponent } from '../../shared/components/simulation-form/simulation-form.component';
import { FrameLogComponent } from '../../shared/components/frame-log/frame-log.component';
import { ConsolePanelComponent } from '../../shared/components/console-panel/console-panel.component';
import { PreciaMockService } from '../../core/services/precia-mock.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    HeaderComponent,
    TcpStatusCardComponent,
    TerminalBi400Component,
    QuickActionsCardComponent,
    SimulationFormComponent,
    FrameLogComponent,
    ConsolePanelComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent {
  protected readonly mock = inject(PreciaMockService);

  readonly host = signal('127.0.0.1');
  readonly port = signal(4001);

  onStart(): void {
    this.mock.start({ host: this.host(), port: this.port() });
  }

  onStop(): void {
    this.mock.stop();
  }

  onClearLogs(): void {
    this.mock.clearLogs();
  }

  onSettings(): void {
    /* TODO: open settings dialog */
  }
}
