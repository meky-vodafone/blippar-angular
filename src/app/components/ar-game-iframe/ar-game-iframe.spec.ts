import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ArGameIframe } from './ar-game-iframe';

describe('ArGameIframe', () => {
  let component: ArGameIframe;
  let fixture: ComponentFixture<ArGameIframe>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ArGameIframe]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ArGameIframe);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
