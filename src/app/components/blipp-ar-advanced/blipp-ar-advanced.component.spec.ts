import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BlippArAdvancedComponent } from './blipp-ar-advanced.component';

describe('BlippArAdvancedComponent', () => {
  let component: BlippArAdvancedComponent;
  let fixture: ComponentFixture<BlippArAdvancedComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BlippArAdvancedComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BlippArAdvancedComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
