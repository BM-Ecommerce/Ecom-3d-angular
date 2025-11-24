import { Component, Input, OnInit, ChangeDetectorRef, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../services/api.service';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
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
    CarouselModule
  ],
  templateUrl: './relatedproduct.component.html',
  styleUrls: ['./relatedproduct.component.css'],
})
export class RelatedproductComponent implements OnInit, OnChanges {
  @Input() relatedproducts: any;

  private destroy$ = new Subject<void>();
  public related_products: any[] = [];
  gridView = false;
  currencySymbol: string = '£';
  relatedframeimage: string = '';
  showframe: boolean = true;

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
      0: { items: 1 },
      400: { items: 2 },
      740: { items: 3 },
      940: { items: 5 }
    },
    nav: false
  };

  constructor(
    private apiService: ApiService,
    private cd: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['relatedproducts'] && changes['relatedproducts'].currentValue) {
      this.relatedframeimage = this.relatedproducts.relatedframeimage;
      this.currencySymbol = this.relatedproducts.currencySymbol;
      this.getRelatedProducts();
    }
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
        this.gridView = this.related_products.length <= 4;
        this.cd.markForCheck();
      });
  }

  relatedProductsView() {
    this.gridView = !this.gridView;
  }

  showframeView() {
    this.showframe = !this.showframe;
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
}
