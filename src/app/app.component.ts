import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { environment } from '../environments/environment';
import { LoadingService } from './services/loading.service';

@Component({
  selector: 'app-root',
  template: `
    <!-- Global topbar progress (toggle via environment.loaderMode) -->
    <ng-container *ngIf="loaderEnabled && loaderMode === 'topbar' && (loading.visible$ | async) as isVisible">
      <ng-container *ngIf="loading.progress$ | async as progress">
        <div class="topbar-progress" [class.visible]="isVisible" aria-hidden="true">
          <mat-progress-bar
            mode="determinate"
            color="primary"
            [value]="progress || 0">
          </mat-progress-bar>
          <div class="visually-hidden">Loading... {{ progress || 0 }} percent</div>
        </div>
      </ng-container>
    </ng-container>
    <router-outlet></router-outlet>
  `,
  styleUrls: ['./app.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent {
  title = 'visualization';
  loaderMode: 'overlay' | 'topbar' = environment.loaderMode;
  loaderEnabled = environment.loaderEnabled;

  constructor(@Inject(LoadingService) public loading: LoadingService) {}
}
