import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Service } from '../structs/service';
import { CollectionViewer, DataSource } from '@angular/cdk/collections';
import { CaptureService } from './capture.service';

@Injectable({
  providedIn: 'root',
})
export class ServicesDataSource extends DataSource<Service> {
  services = new BehaviorSubject<Service[]>([]);
  isLoading = new BehaviorSubject<boolean>(false);

  constructor(private captureService: CaptureService) {
    super();
  }

  override connect(): Observable<Service[]> {
    console.log('connecting to services');
    return this.services.asObservable();
  }

  override disconnect(collectionViewer: CollectionViewer): void {
    this.services.complete();
  }
}
