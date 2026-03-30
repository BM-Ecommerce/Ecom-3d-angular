import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OrderformComponent } from './orderform.component';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { ThreeService } from '../services/three.service';
import { ApiService } from '../services/api.service';
import { LoadingService } from '../services/loading.service';

// ── Mock heavy dependencies ───────────────────────────────────────
const mockThreeService = {
  init: jasmine.createSpy('init'),
  loadModel: jasmine.createSpy('loadModel'),
  updateConfig: jasmine.createSpy('updateConfig'),
  destroy: jasmine.createSpy('destroy'),
};

const mockApiService = {
  getProductFields: () => of([]),
  getProductDetails: () => of([]),
  submitOrder: () => of({}),
};

const mockActivatedRoute = {
  queryParams: of({ recipeid: '123', productid: '456' }),
  params: of({}),
  snapshot: {
    queryParams: { recipeid: '123', productid: '456' },
    paramMap: convertToParamMap({}),
    queryParamMap: convertToParamMap({ recipeid: '123', productid: '456' }),
  },
};

describe('OrderformComponent', () => {
  let component: OrderformComponent;
  let fixture: ComponentFixture<OrderformComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        OrderformComponent,
        ReactiveFormsModule,
        RouterTestingModule,
        HttpClientTestingModule,
        NoopAnimationsModule,
      ],
      providers: [
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: ThreeService, useValue: mockThreeService },
        { provide: ApiService, useValue: mockApiService },
        LoadingService,
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(OrderformComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have a form defined', () => {
    expect(component.orderForm).toBeDefined();
  });
});
