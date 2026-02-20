import { NgModule } from '@angular/core';
import { ExtraOptions, RouterModule, Routes } from '@angular/router';
import { NotFoundComponent } from './not-found/not-found.component';
import { OrderformComponent } from './orderform/orderform.component';
import { ProductListingComponent } from './product-listing/product-listing.component';

const routes: Routes = [
  { path: 'listing/:product_id/:product/:cart_productid', component: ProductListingComponent },
  { path: 'listing/:product_id/:product', component: ProductListingComponent },
  { path: '', component: OrderformComponent },
  { path: ':product_id/:product/:fabric/:fabric_id/:color_id/:pricing_group/:supplier/:cart_productid', component: OrderformComponent },
  { path: ':product_id/:fabric_id/:cart_productid', component: OrderformComponent },
  { path: '404', component: NotFoundComponent },
  { path: '**', redirectTo: '404' }
];

const routerOptions: ExtraOptions = {
  scrollPositionRestoration: 'enabled',
  anchorScrolling: 'enabled'
};

@NgModule({
  imports: [RouterModule.forRoot(routes, routerOptions)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
