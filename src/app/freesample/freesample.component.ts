import { Component, Input, OnInit, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { ApiService } from '../services/api.service';
import { AlertService } from '../services/alert.service';
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
  button_disable: boolean = false;

  constructor(
    private cdr: ChangeDetectorRef,
    private apiService: ApiService,
    private alert: AlertService,
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
          this.alert.toast('Added to Cart!', 'Free Sample has been added successfully.', 'success', 3000).then(() => {
            this.button_disable = false;
            this.cdr.detectChanges();
          });
        }

      },
      error: (err) => {
        console.log(err, "error");
      }
    });
  }

}
