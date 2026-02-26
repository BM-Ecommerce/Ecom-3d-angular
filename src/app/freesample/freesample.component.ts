import { Component, Input, OnInit, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../services/api.service';
import Swal from 'sweetalert2';
import { environment } from '../../environments/environment';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-freesample',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatCardModule, MatIconModule],
  templateUrl: './freesample.component.html',
  styleUrls: ['./freesample.component.css'],

})
export class FreesampleComponent implements OnInit, OnChanges {
  @Input() freesampledata: any;
  @Input() swatchSizeLabel: string = 'Approx. 10 × 10';
  @Input() mode: 'card' | 'button' = 'card';
  @Input() buttonStyle: 'raised' | 'stroked' = 'raised';
  @Input() buttonClass = '';
  @Input() buttonLabel = '';
  @Input() buttonLoadingLabel = 'Adding...';
  @Input() buttonIcon = 'shopping_bag';

  freeSampleOrderData: any = [];
  button_disable: boolean = false;

  constructor(
    private cdr: ChangeDetectorRef,
    private apiService: ApiService,
  ) { }

  ngOnInit(): void {
  }

  ngOnChanges(changes: SimpleChanges): void {
    // console.log(changes);
    this.cdr.detectChanges();
  }

  get isPaidSample(): boolean {
    return Number(this.freesampledata?.free_sample_price ?? 0) > 0;
  }

  get activeButtonLabel(): string {
    const configuredLabel = String(this.buttonLabel || '').trim();
    if (configuredLabel) {
      return configuredLabel;
    }
    return this.isPaidSample ? 'Buy Sample' : 'Get Free Sample';
  }

  get activeLoadingLabel(): string {
    const configuredLoadingLabel = String(this.buttonLoadingLabel || '').trim();
    return configuredLoadingLabel || 'Adding...';
  }

  private isTruthySuccess(value: any): boolean {
    if (value === true || value === 1) {
      return true;
    }
    const normalized = String(value ?? '').trim().toLowerCase();
    return normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'success';
  }

  private resolveSiteBaseUrl(): string {
    const candidate = String(this.freesampledata?.api_url || environment.site || '').trim();
    return candidate.replace(/\/+$/, '');
  }

  buyFreeSample(event?: Event) {
    event?.preventDefault();
    event?.stopPropagation();
    if (this.button_disable) {
      return;
    }
    this.button_disable = true;

    let form_data = this.freesampledata.form_data;
    let cartproductId = this.freesampledata.cart_productid;
    let product_id = this.freesampledata.product_id;
    let api_url = this.resolveSiteBaseUrl() || environment.site;
    let cartproductName = this.freesampledata.cartproductName;
    let priceData = this.freesampledata.free_sample_price;
    let vatpercentage = Number(this.freesampledata.vatpercentage);
    let vatname = this.freesampledata.vatname;
    let current_url = this.freesampledata.current_url;
    let productname = this.freesampledata.productname;
    let categoryId = Number(this.freesampledata.catagory_id);
    let visualizer_url = this.freesampledata.pei_ecomImage;
    let action = this.freesampledata.type;
    let colorid = this.freesampledata.color_id;
    let fabricid = this.freesampledata.fabric_id;



    this.apiService.addToCart(
      form_data,
      cartproductId,
      product_id,
      api_url,
      cartproductName,
      priceData,
      vatpercentage,
      vatname,
      current_url,
      productname,
      categoryId,
      visualizer_url,
      action,
      colorid,
      fabricid
    ).pipe(
      finalize(() => {
        this.button_disable = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: (data) => {
        const isSuccess = this.isTruthySuccess(data?.success);
        const responseMessage = data?.message || data?.['value'];
        const nextUrl = String(data?.['link_source'] || `${api_url}/cart`).trim();

        if (isSuccess) {
          Swal.fire({
            title: 'Added to Cart!',
            text: responseMessage || 'Free Sample has been added successfully.',
            icon: 'success',
            showConfirmButton: false,
            timer: 3000,
            background: '#fefefe',
            color: '#333',
            customClass: {
              popup: 'small-toast'
            }
          }).then(() => {
            window.location.href = nextUrl;
          });
          return;
        }

        Swal.fire({
          icon: 'info',
          title: 'Sample Not Added',
          text: responseMessage || 'Unable to add this sample right now.'
        });

      },
      error: (err) => {
        console.log(err, "error");
        Swal.fire({
          icon: 'error',
          title: 'Failed',
          text: err?.message || 'Unable to add free sample right now. Please try again.'
        });
      }
    });
  }

  onImageError(event: Event) {
    const target = event?.target as HTMLImageElement | null;
    if (target) {
      target.style.display = 'none';
    }
  }

}
