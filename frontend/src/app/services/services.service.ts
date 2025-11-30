import { Injectable } from '@angular/core';
import { RestGeneric } from './rest-generic';
import { Service } from '../structs/service';
import { CaptureService } from './capture.service';

@Injectable({
    providedIn: 'root',
})
export class ServicesService extends RestGeneric<Service> {
    constructor(captureService: CaptureService) {
        super(captureService.http, captureService.prefix + '/services', 'Services');
    }


}
