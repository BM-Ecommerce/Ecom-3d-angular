import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { ReactiveFormsModule } from '@angular/forms';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { RouterModule } from '@angular/router';

import { AppComponent } from './app.component';
import { OrderformComponent } from './orderform/orderform.component';
import { ApiService } from './services/api.service';
import { AppRoutingModule } from './app-routing.module';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NotFoundComponent } from './not-found/not-found.component';
import { HttpLoadingInterceptor } from './services/http-loading.interceptor';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ProductListingComponent } from './product-listing/product-listing.component';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    ReactiveFormsModule,
    HttpClientModule,
    RouterModule,
    AppRoutingModule,
    OrderformComponent,
    ProductListingComponent,
    NotFoundComponent,
    BrowserAnimationsModule,
    MatProgressBarModule
  ],
  providers: [
    ApiService,
    { provide: HTTP_INTERCEPTORS, useClass: HttpLoadingInterceptor, multi: true }
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}
