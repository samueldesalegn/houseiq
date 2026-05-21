import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import {
  PropertyAnalysisRequest,
  PropertyAnalysisResponse,
} from '../models/property-analysis.model';

@Injectable({
  providedIn: 'root',
})
export class PropertyAnalysisService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = 'https://kqp9pu2evc.execute-api.us-east-1.amazonaws.com/Prod/property/analyze';

  analyzeProperty(payload: PropertyAnalysisRequest) {
    return this.http.post<PropertyAnalysisResponse>(this.apiUrl, payload);
  }
}
