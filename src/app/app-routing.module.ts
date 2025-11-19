import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { OrderformComponent } from './orderform/orderform.component';

const routes: Routes = [
  { path: '', component: OrderformComponent },
  { path: ':product_id/:product/:fabric/:fabric_id/:color_id/:pricing_group/:supplier/:cart_productid', component: OrderformComponent },
  { path: ':product_id/:fabric_id/:cart_productid', component: OrderformComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}