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
  services: RestGeneric<Service>;

  constructor(
    public http: HttpClient,
    private authService: AuthService
  ) {
    this.services = new RestGeneric(this.http, this.prefix + '/services', 'Service');
  }

  public prefix = '/capture';

  private usersSource = new Subject<number>();




  usersSourceUpdate() {
    return this.usersSource.asObservable();
  }
  usersSourceRefresh(now: number) {
    this.usersSource.next(now);
  }

  private servicesSource = new BehaviorSubject<number>(Date.now());

  servicesSourceUpdate() {
    return this.servicesSource.asObservable();
  }

  // Define logs APIs

  servicesGetPagedDetail(query: PageOptions<Service>): Observable<ListPages<Service, Service>> {
    return this.servicesGetPagedIds(query).pipe(
      switchMap(idsPage => {
        const detailRequests = idsPage.ids.map(id => this.servicesGet(Number(id)));
        return forkJoin(detailRequests).pipe(
          map(details => ({
            ids: details,
            pagination: idsPage.pagination,
          }))
        );
      })
    );
  }

  servicesGetPagedIds(query: PageOptions<Service>) {
    const params = new HttpParams({ fromObject: query as any });

    return this.http.get<ListPages<number, Service>>(this.prefix + '/services', { params: params }).pipe(
      catchError(error => {
        console.error('Error:', error);
        return throwError(() => new Error('Could not process request: ' + error.message + ' (Status code: ' + error.status + ')'));
      })
    );
  }

  servicesGet(id: number) {
    return this.http.get<Service>(this.prefix + '/services/' + id).pipe(
      catchError(error => {
        console.error('Error:', error);
        return throwError(() => new Error('Could not process request: ' + error.message + ' (Status code: ' + error.status + ')'));
      })
    );
  }

  servicesCreate(service: Service) {
    return this.http.post(this.prefix + '/services', service).pipe(
      catchError(error => {
        console.error('Error:', error);
        return throwError(() => new Error('Could not create new service: ' + error.message + ' (Status code: ' + error.status + ')'));
      })
    );
  }

  // Define users APIs
  usersCreate(user: User) {
    return this.http.post(this.prefix + '/users', user).pipe(
      tap(newUser => {
        console.log('I DID A Create');
        this.usersSource.next(Date.now());
      }),
      catchError(error => {
        console.error('Error:', error);
        return throwError(() => new Error('Could not create new user: ' + error.message + ' (Status code: ' + error.status + ')'));
      })
    );
  }

  usersGetPagedDetail(query: PageOptions<User>): Observable<ListPages<User, User>> {
    return this.usersGetPagedIds(query).pipe(
      switchMap(idsPage => {
        const detailRequests = idsPage.ids.map(id => this.usersGet(Number(id)));
        return forkJoin(detailRequests).pipe(
          map(details => ({
            ids: details,
            pagination: idsPage.pagination,
          }))
        );
      })
    );
  }

  usersGetPagedIds(query: PageOptions<User>) {
    const params = asHttpParams(query);

    return this.http.get<ListPages<number, User>>(this.prefix + '/users', { params: params }).pipe(
      catchError(error => {
        console.error('Error:', error);
        return throwError(() => new Error('Could not process request: ' + error.message + ' (Status code: ' + error.status + ')'));
      })
    );
  }

  usersGet(id: number) {
    return this.http.get<User>(this.prefix + '/users/' + id).pipe(
      catchError(error => {
        console.error('Error:', error);
        return throwError(() => new Error('Could not process request: ' + error.message + ' (Status code: ' + error.status + ')'));
      })
    );
  }

  usersUpdate(user: User): Observable<User> {
    return this.http.put<User>(this.prefix + `/users/${user.id}`, user).pipe(
      tap(updatedUser => {
        console.log('I DID AN UPDATE');
        this.usersSource.next(Date.now());
      })
    );
  }
}
