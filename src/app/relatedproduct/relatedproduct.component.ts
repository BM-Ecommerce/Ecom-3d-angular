import { Component, Input, OnInit, ChangeDetectorRef, OnChanges, SimpleChanges, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../services/api.service';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatIconModule } from '@angular/material/icon';
import { CarouselModule } from 'ngx-owl-carousel-o';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-relatedproduct',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonToggleModule,
    MatIconModule,
    CarouselModule,
    MatTooltipModule
  ],
  templateUrl: './relatedproduct.component.html',
  styleUrls: ['./relatedproduct.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RelatedproductComponent implements OnInit, OnChanges, OnDestroy {
  @Input() relatedproducts: any;

  private destroy$ = new Subject<void>();
  public related_products: any[] = [];
  gridView = false;
  currencySymbol: string = '£';
  relatedframeimage: string = '';
  showframe: boolean = true;
  isDesktop = false;

  // Composited thumbnails cache: key -> dataURL
  private composedMap: Record<string, string> = {};
  private composingSet = new Set<string>();
  private resizeHandler = () => this.checkDevice();

  imgpath = `${environment.apiUrl}/api/public/storage/attachments/${environment.apiName}/material/colour/`;

  customOptions2: any = {
    loop: true,
    mouseDrag: true,
    touchDrag: true,
    pullDrag: true,
    dots: false,
    autoplay: true,
    navSpeed: 700,
    autoplayTimeout: 2500,
    autoplayHoverPause: true,
    autoplaySpeed: 800,
    navText: ['<', '>'],
    responsive: {
      0: { items: 1, center: true },      
      400: { items: 2, center: true },   
      740: { items: 3, center: true },    
      940: { items: 5 }                   
    },
    nav: false
  };

  constructor(
    private apiService: ApiService,
    private cd: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.checkDevice();
    window.addEventListener('resize', this.resizeHandler);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['relatedproducts'] && changes['relatedproducts'].currentValue) {
      this.relatedframeimage = this.relatedproducts.relatedframeimage;
      this.currencySymbol = this.relatedproducts.currencySymbol;
      this.getRelatedProducts();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    window.removeEventListener('resize', this.resizeHandler);
  }

  private getRelatedProducts(): void {
    const relatedFabricId = this.relatedproducts.fabricid;
    let colorId = 0;

    if (this.relatedproducts.fabricFieldType === 5 || this.relatedproducts.fabricFieldType === 20) {
      colorId = this.relatedproducts.colorid;
    }

    this.apiService
      .relatedProducts(
        this.relatedproducts.routeParams,
        this.relatedproducts.fabricFieldType,
        relatedFabricId,
        colorId
      )
      .pipe(takeUntil(this.destroy$))
      .subscribe((response: any) => {
        this.related_products = response?.result || [];

        if (this.isDesktop) {
          this.gridView = this.related_products.length <= 4;
        }
        // Prepare thumbnails when data arrives
        this.prepareThumbnails();
        this.cd.markForCheck();
      });
  }

  relatedProductsView() {
    this.gridView = !this.gridView;
  }

  showframeView() {
    this.showframe = !this.showframe;
    if (this.showframe) {
      this.prepareThumbnails();
    }
  }
  checkDevice() {
    this.isDesktop = window.innerWidth >= 1024; // Desktop breakpoint
  }

  trackByRelatedProduct(index: number, product: any): any {
    return product?.productid ?? product?.pei_productid ?? index;
  }
  onImageError(event: Event) {
    const img = event.target as HTMLImageElement;
    img.src = 'assets/no-image.jpg';
  }

  buildVisualizerUrl(product: any): string {
    const slug1 = product.productname.toLowerCase().replace(/ /g, '-');
    const slug2 = `${product.fabricname}-${product.colorname}`.toLowerCase().replace(/ /g, '-');

    return `${this.relatedproducts.siteurl}/visualizer/${this.relatedproducts.product_id}/${slug1}/${slug2}/${product.fd_id}/${product.cd_id}/${product.groupid}/${product.supplierid}/${this.relatedproducts.routeParams.cart_productid}`;
  }

  // Thumbnail composition helpers
  getRelatedImage(product: any): string {
    const colorUrl = this.imgpath + product.colorimage;
    if (!this.showframe) return colorUrl;

    const key = this.composeKey(this.relatedframeimage, colorUrl);
    return this.composedMap[key] || this.relatedframeimage || colorUrl;
  }

  private composeKey(frameUrl: string, bgUrl: string): string {
    return `${frameUrl}::${bgUrl}`;
  }

  private prepareThumbnails(): void {
    if (!this.showframe || !this.relatedframeimage || !this.related_products?.length) return;

    for (const product of this.related_products) {
      const bgUrl = this.imgpath + product.colorimage;
      const key = this.composeKey(this.relatedframeimage, bgUrl);
      if (this.composedMap[key] || this.composingSet.has(key)) continue;
      this.composingSet.add(key);
      this.composeFrameAndBackground(this.relatedframeimage, bgUrl)
        .then((dataUrl) => {
          if (dataUrl) this.composedMap[key] = dataUrl;
        })
        .catch(() => {/* ignore */})
        .finally(() => {
          this.composingSet.delete(key);
          this.cd.markForCheck();
        });
    }
  }

  private loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
  }

  private async composeFrameAndBackground(
    frameUrl: string,
    backgroundUrl: string
  ): Promise<string | null> {
    try {
      const [frameImg, bgImg] = await Promise.all([
        this.loadImage(frameUrl),
        this.loadImage(backgroundUrl)
      ]);

      const hole = this.detectTransparentRegion(frameImg, 40);

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      canvas.width = frameImg.width;
      canvas.height = frameImg.height;

      const holeW = (hole.maxX - hole.minX) || frameImg.width;
      const holeH = (hole.maxY - hole.minY) || frameImg.height;
      const scale = Math.max(holeW / bgImg.width, holeH / bgImg.height);
      const drawW = bgImg.width * scale;
      const drawH = bgImg.height * scale;
      const dx = hole.minX + (holeW - drawW) / 2;
      const dy = hole.minY + (holeH - drawH) / 2;

      ctx.drawImage(bgImg, 0, 0, bgImg.width, bgImg.height, dx, dy, drawW, drawH);
      ctx.drawImage(frameImg, 0, 0);

      try {
        return canvas.toDataURL('image/png');
      } catch {
        return null;
      }
    } catch {
      return null;
    }
  }

  private detectTransparentRegion(
    image: HTMLImageElement,
    alphaThreshold = 10
  ) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = image.width;
    canvas.height = image.height;
    ctx.drawImage(image, 0, 0);

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

    let minX = canvas.width;
    let minY = canvas.height;
    let maxX = 0;
    let maxY = 0;
    let foundAny = false;

    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const i = (y * canvas.width + x) * 4;
        const alpha = imgData[i + 3];
        if (alpha < alphaThreshold) {
          foundAny = true;
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (!foundAny) {
      return {
        minX: 0,
        minY: 0,
        maxX: image.width,
        maxY: image.height,
        width: image.width,
        height: image.height,
        found: false,
      };
    }

    return {
      minX,
      minY,
      maxX,
      maxY,
      width: image.width,
      height: image.height,
      found: true,
    };
  }
}
