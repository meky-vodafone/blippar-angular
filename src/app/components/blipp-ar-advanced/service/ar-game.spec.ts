import { TestBed } from '@angular/core/testing';

import { ArGame } from './ar-game';

describe('ArGame', () => {
  let service: ArGame;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ArGame);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
