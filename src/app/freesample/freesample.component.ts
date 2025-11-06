import { Component, Input, OnInit, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { ApiService } from '../services/api.service';
import Swal from 'sweetalert2';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-freesample',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatCardModule],
  templateUrl: './freesample.component.html',
  styleUrls: ['./freesample.component.css'],

})
export class FreesampleComponent implements OnInit, OnChanges {
  @Input() freesampledata: any;

  freeSampleOrderData: any = [];

  constructor(
    private cdr: ChangeDetectorRef,
    private apiService: ApiService,
  ) { }

  ngOnInit(): void {
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.cdr.detectChanges();
  }

  buyFreeSample() {
    let form_data = this.freesampledata.form_data;
    let productId = this.freesampledata.product_id;
    let api_url = this.freesampledata.api_url;
    let cartproductName = this.freesampledata.productname;
    let priceData = this.freesampledata.free_sample_price;
    let vatpercentage = Number(this.freesampledata.vatpercentage);
    let vatname = this.freesampledata.vatname;
    let current_url = this.freesampledata.current_url;
    let productname = this.freesampledata.productname;
    let categoryId = Number(this.freesampledata.catagory_id);
    let visualizer_url = this.freesampledata.pei_ecomImage;
    let action = this.freesampledata.type;



    this.apiService.addToCart(
      form_data,
      productId,
      api_url,
      cartproductName,
      priceData,
      vatpercentage,
      vatname,
      current_url,
      productname,
      categoryId,
      visualizer_url,
      action
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
                   window.location.href = environment.site + '/cart';
                 });
       
               } 

      },
      error: (err) => {
        console.log(err, "error");
      }
    });
  }

}
