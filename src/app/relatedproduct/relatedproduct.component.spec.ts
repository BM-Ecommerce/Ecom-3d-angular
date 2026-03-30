import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';

import { RelatedproductComponent } from './relatedproduct.component';

describe('RelatedproductComponent', () => {
  let component: RelatedproductComponent;
  let fixture: ComponentFixture<RelatedproductComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        RelatedproductComponent,
        NoopAnimationsModule,
        HttpClientTestingModule,
        RouterTestingModule,
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RelatedproductComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
