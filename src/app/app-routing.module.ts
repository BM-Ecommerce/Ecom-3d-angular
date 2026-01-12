import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { NotFoundComponent } from './not-found/not-found.component';
import { OrderformComponent } from './orderform/orderform.component';

const routes: Routes = [
  { path: '', component: OrderformComponent },
  { path: ':product_id/:product/:fabric/:fabric_id/:color_id/:pricing_group/:supplier/:cart_productid', component: OrderformComponent },
  { path: ':product_id/:fabric_id/:cart_productid', component: OrderformComponent },
  { path: '404', component: NotFoundComponent },
  // For WooCommerce SEO URLs - load OrderformComponent and use window.blindmatrixConfig
  { path: '**', component: OrderformComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { initialNavigation: 'disabled' })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
