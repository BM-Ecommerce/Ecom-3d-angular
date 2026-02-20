import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { ProductListingComponent } from './product-listing.component';
import { ApiService } from '../services/api.service';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('ProductListingComponent', () => {
  let component: ProductListingComponent;
  let fixture: ComponentFixture<ProductListingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductListingComponent, NoopAnimationsModule],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            params: of({ product_id: '101', product: 'roller-blinds', cart_productid: '101' }),
            snapshot: {
              queryParams: {}
            }
          }
        },
        {
          provide: ApiService,
          useValue: {
            getProductData: () => of({
              result: {
                EcomProductlist: [
                  {
                    pei_productid: 101,
                    pei_ecomProductName: 'Roller Blinds',
                    label: 'Roller Blinds',
                    pi_productdescription: 'Sample description',
                    pi_category: 3
                  }
                ]
              }
            }),
            getCategoryList: () => of({ result: [] }),
            getBrands: () => of({ result: [] }),
            getFabricListView: () => of({ result: [] })
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ProductListingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should map product title from API response', () => {
    expect(component.productTitle).toBe('Roller Blinds');
  });
});
