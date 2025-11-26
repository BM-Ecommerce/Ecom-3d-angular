import { Component } from '@angular/core';
import { environment } from '../environments/environment';
import { LoadingService } from './services/loading.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'visualization';
  loaderMode: 'overlay' | 'topbar' = environment.loaderMode;

  constructor(public loading: LoadingService) {}
}
