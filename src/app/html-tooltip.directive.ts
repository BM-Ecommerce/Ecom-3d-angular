import {
  Directive,
  Input,
  ElementRef,
  HostListener,
  ViewContainerRef,
  OnDestroy
} from '@angular/core';
import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { HtmlTooltipComponent } from './html-tooltip.component';

@Directive({
  selector: '[appHtmlTooltip]',
  standalone: true
})
export class HtmlTooltipDirective implements OnDestroy {
  @Input('appHtmlTooltip') htmlContent: string = '';
  @Input() hideDelay: number = 0; 

  private overlayRef?: OverlayRef | null;
  private hideTimeout?: any;

  constructor(
    private el: ElementRef,
    private viewContainerRef: ViewContainerRef,
    private overlay: Overlay
  ) {}

  @HostListener('mouseenter') onMouseEnter() {
    // Cancel any pending hide timer if re-entered
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = null;
    }

    // Show tooltip
    if (!this.overlayRef && this.htmlContent) {
      const positionStrategy = this.overlay.position()
        .flexibleConnectedTo(this.el)
        .withPositions([{
          originX: 'center',
          originY: 'top',
          overlayX: 'center',
          overlayY: 'bottom',
          offsetY: -8,
        }]);

      this.overlayRef = this.overlay.create({ positionStrategy });
      const tooltipPortal = new ComponentPortal(HtmlTooltipComponent, this.viewContainerRef);
      const tooltipRef = this.overlayRef.attach(tooltipPortal);
      tooltipRef.instance.htmlContent = this.htmlContent;
    }
  }

  @HostListener('mouseleave') onMouseLeave() {
    // Delay hiding instead of immediately removing
    this.hideTimeout = setTimeout(() => this.hide(), this.hideDelay);
  }

  ngOnDestroy() {
    this.hide();
  }

  private hide() {
    if (this.overlayRef) {
      this.overlayRef.dispose();
      this.overlayRef = null;
    }
  }
}
