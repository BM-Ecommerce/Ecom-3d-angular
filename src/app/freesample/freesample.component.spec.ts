import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';

import { FreesampleComponent } from './freesample.component';

describe('FreesampleComponent', () => {
  let component: FreesampleComponent;
  let fixture: ComponentFixture<FreesampleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        FreesampleComponent,
        NoopAnimationsModule,
        HttpClientTestingModule,
        RouterTestingModule,
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FreesampleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
