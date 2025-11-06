import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FreesampleComponent } from './freesample.component';

describe('FreesampleComponent', () => {
  let component: FreesampleComponent;
  let fixture: ComponentFixture<FreesampleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ FreesampleComponent ]
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
