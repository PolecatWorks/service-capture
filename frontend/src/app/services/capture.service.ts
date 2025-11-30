import { HttpClient, HttpParams } from '@angular/common/http';
import { RestGeneric } from './rest-generic'; // Adjust the path as needed
import { Injectable } from '@angular/core';
import { BehaviorSubject, catchError, forkJoin, map, Observable, Subject, switchMap, tap, throwError } from 'rxjs';
import { User } from '../structs/user';
import { asHttpParams, ListPages, PageOptions } from './pagination';
import { Service } from '../structs/service';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root',
})
export class CaptureService {


  constructor(
    public http: HttpClient,
    private authService: AuthService
  ) {

  }

  public prefix = '/capture';



  private servicesSource = new BehaviorSubject<number>(Date.now());


  // Define logs APIs



  // Define users APIs

}
