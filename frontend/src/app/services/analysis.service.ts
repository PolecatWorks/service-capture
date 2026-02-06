import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { CaptureService } from './capture.service';

export interface DependencyGroup {
  group_type: string;
  group_availability: number;
  dependencies: AnalysisReport[];
}

export interface AnalysisReport {
  entity_id: number;
  name: string;
  entity_type: string;
  self_availability: number;
  derived_availability: number;
  dependency_breakdown: DependencyGroup[];
}

@Injectable({
  providedIn: 'root'
})
export class AnalysisService {
  private endpoint = '/analysis/availability';

  constructor(private captureService: CaptureService) { }

  getAnalysis(id: number): Observable<AnalysisReport> {
    return this.captureService.http.get<AnalysisReport>(`${this.captureService.prefix}${this.endpoint}/${id}`);
  }
}
