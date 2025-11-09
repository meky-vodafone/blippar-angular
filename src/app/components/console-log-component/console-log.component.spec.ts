import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConsoleLogComponentComponent } from './console-log.component';

describe('ConsoleLogComponentComponent', () => {
  let component: ConsoleLogComponentComponent;
  let fixture: ComponentFixture<ConsoleLogComponentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConsoleLogComponentComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ConsoleLogComponentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
