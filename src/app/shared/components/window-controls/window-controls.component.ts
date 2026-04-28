import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';

@Component({
  selector: 'app-window-controls',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './window-controls.component.html',
  styleUrls: ['./window-controls.component.scss'],
  host: {
    '[attr.aria-hidden]': '!available()',
  },
})
export class WindowControlsComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly api =
    typeof window !== 'undefined' ? window.preciaMock : undefined;

  readonly available = signal<boolean>(!!this.api);
  readonly isMaximized = signal<boolean>(false);

  constructor() {
    if (!this.api) return;

    this.api.windowGetState().then((state) => {
      if (state) this.isMaximized.set(state.isMaximized);
    });

    const off = this.api.onWindowStateChanged((state) => {
      this.isMaximized.set(state.isMaximized);
    });

    this.destroyRef.onDestroy(off);
  }

  minimize(): void {
    this.api?.windowMinimize();
  }

  toggleMaximize(): void {
    this.api?.windowMaximizeToggle();
  }

  close(): void {
    this.api?.windowClose();
  }
}
