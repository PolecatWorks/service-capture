import { Injectable } from '@angular/core';
import { RestGeneric } from './rest-generic';
import { User } from '../structs/user';
import { CaptureService } from './capture.service';

@Injectable({
  providedIn: 'root',
})
export class UsersService extends RestGeneric<User> {
  constructor(captureService: CaptureService) {
    super(captureService.http, captureService.prefix + '/users', 'Users');
  }
}
