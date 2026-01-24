import { Injectable } from '@angular/core';
import { RestGeneric } from './rest-generic';
import { Entity } from '../structs/entity';
import { CaptureService } from './capture.service';

@Injectable({
  providedIn: 'root',
})
export class EntitiesService extends RestGeneric<Entity> {
  constructor(captureService: CaptureService) {
    super(captureService.http, captureService.prefix + '/entities', 'Entities');
  }
}
