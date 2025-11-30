import { Injectable } from '@angular/core';
import { RestGeneric } from './rest-generic';
import { Dependency } from '../structs/dependency';
import { CaptureService } from './capture.service';

@Injectable({
    providedIn: 'root',
})
export class DependenciesService extends RestGeneric<Dependency> {
    constructor(captureService: CaptureService) {
        super(captureService.http, captureService.prefix + '/dependencies', 'Dependencies');
    }
}
