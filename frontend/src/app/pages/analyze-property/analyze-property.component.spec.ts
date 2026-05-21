import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AnalyzePropertyComponent } from './analyze-property.component';

describe('AnalyzePropertyComponent', () => {
  let component: AnalyzePropertyComponent;
  let fixture: ComponentFixture<AnalyzePropertyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnalyzePropertyComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AnalyzePropertyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
