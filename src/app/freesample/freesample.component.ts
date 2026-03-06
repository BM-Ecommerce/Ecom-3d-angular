import { Component, Input, ChangeDetectorRef } from '@angular/core';
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
export class FreesampleComponent {
  @Input() freesampledata: any = {};
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

    const sampleData = this.freesampledata || {};
    if (!sampleData?.form_data || !sampleData?.product_id) {
      this.button_disable = false;
      this.cdr.markForCheck();
      Swal.fire({
        icon: 'info',
        title: 'Sample Not Ready',
        text: 'Sample data is still loading. Please try again.'
      });
      return;
    }

    let form_data = sampleData.form_data;
    let cartproductId = sampleData.cart_productid;
    let product_id = sampleData.product_id;
    let api_url = this.resolveSiteBaseUrl() || environment.site;
    let cartproductName = sampleData.cartproductName;
    let priceData = sampleData.free_sample_price;
    let vatpercentage = Number(sampleData.vatpercentage);
    let vatname = sampleData.vatname;
    let current_url = sampleData.current_url;
    let productname = sampleData.productname;
    let categoryId = Number(sampleData.catagory_id);
    let visualizer_url = sampleData.pei_ecomImage;
    let action = sampleData.type;
    let colorid = sampleData.color_id;
    let fabricid = sampleData.fabric_id;



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
