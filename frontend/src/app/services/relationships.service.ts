import { Injectable } from '@angular/core';
import { RestGeneric } from './rest-generic';
import { Relationship } from '../structs/relationship';
import { CaptureService } from './capture.service';

@Injectable({
  providedIn: 'root',
})
export class RelationshipsService extends RestGeneric<Relationship> {
  constructor(captureService: CaptureService) {
    super(captureService.http, captureService.prefix + '/relationships', 'Relationships');
  }
}
