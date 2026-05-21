import { TestBed } from '@angular/core/testing';

import { PropertyAnalysisService } from './property-analysis.service';

describe('PropertyAnalysisService', () => {
  let service: PropertyAnalysisService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PropertyAnalysisService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
