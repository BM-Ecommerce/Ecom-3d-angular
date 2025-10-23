
import { Component, Input } from '@angular/core';
import { SafeHtmlPipe } from './safe-html.pipe';

@Component({
  selector: 'app-html-tooltip',
  template: `
    <div class="tooltip-container-sub" [innerHTML]="htmlContent | safeHtml"></div>
  `,
  styles: [`
    .tooltip-container-sub {
      background-color: #333;
      color: #fff;
      padding: 10px;
      border-radius: 5px;
      z-index: 1000;
      font-size: 12px;
      max-width: 300px;
      word-wrap: break-word;
    }
  `],
  standalone: true,
  imports: [SafeHtmlPipe]
})
export class HtmlTooltipComponent {
  @Input() htmlContent: string = '';
}
