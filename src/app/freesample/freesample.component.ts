import { Component, Input, OnInit, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../services/api.service';
import Swal from 'sweetalert2';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-freesample',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatCardModule, MatIconModule],
  templateUrl: './freesample.component.html',
  styleUrls: ['./freesample.component.css'],

})
export class FreesampleComponent implements OnInit, OnChanges {
  @Input() freesampledata: any;
  @Input() swatchSizeLabel: string = 'Approx. 10 × 10 cm';

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

  buyFreeSample() {
    this.button_disable = true;

    let form_data = this.freesampledata.form_data;
    let cartproductId = this.freesampledata.cart_productid;
    let product_id = this.freesampledata.product_id;
    let api_url = this.freesampledata.api_url;
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
    ).subscribe({
      next: (data) => {
        if (data.success) {
          Swal.fire({
            title: 'Added to Cart!',
            text: 'Free Sample has been added successfully.',
            icon: 'success',
            showConfirmButton: false,
            timer: 3000,
            background: '#fefefe',
            color: '#333',
            customClass: {
              popup: 'small-toast'
            }
          }).then(() => {
            this.button_disable = false;
             window.location.href = environment.site + '/cart';
            this.cdr.detectChanges();
          });
        }

      },
      error: (err) => {
        console.log(err, "error");
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
