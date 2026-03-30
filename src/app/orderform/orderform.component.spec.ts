import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OrderformComponent } from './orderform.component';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('OrderformComponent', () => {
  let component: OrderformComponent;
  let fixture: ComponentFixture<OrderformComponent>;

  const mockProductData = [{
    data: [
      {
        fieldid: 1,
        fieldname: 'Test Field',
        labelnamecode: 'test_field',
        fieldtypeid: 3,
        showfieldecomonjob: '1',
        optionsvalue: []
      }
    ]
  }];

  const mockFilterData = [{
    data: {
      optionarray: {
        1: ['option1', 'option2']
      }
    }
  }];

  const mockOptionData = [{
    data: [{
      optionsvalue: [
        { optionid: '1', optionname: 'Option 1' },
        { optionid: '2', optionname: 'Option 2' }
      ]
    }]
  }];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        ReactiveFormsModule,
        RouterTestingModule,
        HttpClientTestingModule,
        NoopAnimationsModule,
        OrderformComponent,
      ],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            queryParams: of({ recipeid: '123', productid: '456' })
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(OrderformComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with default values', () => {
    expect(component.orderForm).toBeDefined();
    expect(component.orderForm.get('unit')?.value).toBe('mm');
    expect(component.orderForm.get('qty')?.value).toBe(1);
  });



  it('should detect form changes', () => {
    spyOn(console, 'log');
    component.orderForm.get('width')?.setValue('100');
    expect(console.log).toHaveBeenCalled();
  });

  it('should update parameters_data on option selection change', () => {
    // 1. Setup mock data
    const fieldId = 1365;
    const selectedOption = { optionid: '4634', optionname: 'Affordable Hybrawood', optionimage: '' };



    // Have to manually add the control because initializeFormControls is complex
    component.orderForm.addControl(`field_${fieldId}`, new FormControl(''));
    component.previousFormValue = component.orderForm.value;


    // 2. Trigger value change
    const control = component.orderForm.get(`field_${fieldId}`);
    control?.setValue(selectedOption.optionid);

    // 3. Assert
    const updatedField = component.parameters_data.find(f => f.fieldid === fieldId);
    expect(updatedField).toBeDefined();
    expect(updatedField?.value).toBe(selectedOption.optionname);
    expect(updatedField?.valueid).toBe(selectedOption.optionid);
    expect(updatedField?.optionid).toBe(selectedOption.optionid);
  });
});