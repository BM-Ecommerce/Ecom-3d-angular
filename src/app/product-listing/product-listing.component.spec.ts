import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { ProductListingComponent } from './product-listing.component';
import { ApiService } from '../services/api.service';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

function buildFabricVariants(total: number): any[] {
  return Array.from({ length: total }, (_, index) => ({
    pei_productid: 101,
    productname: 'Roller Blinds',
    fabricname: 'Linen',
    fd_id: 500,
    colorname: `Color ${index + 1}`,
    cd_id: index + 1,
    groupid: 10,
    supplierid: 1,
    matmapid: index + 1,
    minprice: 100
  }));
}

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
              params: { product_id: '101', cart_productid: '101' },
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

  it('should cap fabric color preview to mobile limit', () => {
    const products = buildFabricVariants(24);
    component.isMobileViewport = true;
    component.gridColumns = 3;

    (component as any).rebuildFabricGroups(products);

    expect(component.fabricGroups.length).toBe(1);
    expect(component.fabricGroups[0].previewVariants.length).toBe(10);
    expect(component.fabricGroups[0].hiddenVariantCount).toBe(14);
  });

  it('should cap fabric color preview to desktop grid limit', () => {
    const products = buildFabricVariants(24);
    component.isMobileViewport = false;
    component.gridColumns = 3;

    (component as any).rebuildFabricGroups(products);

    expect(component.fabricGroups.length).toBe(1);
    expect(component.fabricGroups[0].previewVariants.length).toBe(10);
    expect(component.fabricGroups[0].hiddenVariantCount).toBe(14);
  });

  it('should cap fabric color preview to desktop list limit', () => {
    const products = buildFabricVariants(24);
    component.isMobileViewport = false;
    component.gridColumns = 1;

    (component as any).rebuildFabricGroups(products);

    expect(component.fabricGroups.length).toBe(1);
    expect(component.fabricGroups[0].previewVariants.length).toBe(18);
    expect(component.fabricGroups[0].hiddenVariantCount).toBe(6);
  });
});
