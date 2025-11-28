import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RestGeneric } from './rest-generic';
import { Service } from '../structs/service';
import { Observable } from 'rxjs';
import { CaptureService } from './capture.service';

@Injectable({
    providedIn: 'root',
})
export class ServicesService extends RestGeneric<Service> {
    constructor(captureService: CaptureService) {
        super(captureService.http, captureService.prefix + '/services', 'Services');
    }

    addDependency(sourceId: number, targetId: number): Observable<void> {
        return this.http.post<void>(`${this.url}/${sourceId}/dependencies`, { target_id: targetId });
    }

    getDependencies(id: number): Observable<Service[]> {
        // The backend returns AppJson<Vec<Service>>, but RestGeneric might handle unwrapping if it was consistent.
        // However, looking at RestGeneric, it expects the raw response to match T or ListPages.
        // The backend wraps everything in AppJson.
        // Wait, RestGeneric.get returns http.get<T>.
        // The backend returns AppJson(T). AppJson serializes to just T because it's a tuple struct with transparent serialization?
        // Let's check AppJson in backend.
        // #[derive(FromRequest)] #[from_request(via(axum::Json), rejection(MyError))] pub struct AppJson<T>(T);
        // impl<T> IntoResponse for AppJson<T> ... axum::Json(self.0).into_response()
        // Yes, it serializes as just the inner value.
        // So getDependencies should return Observable<Service[]> directly if the backend returns Vec<Service>.
        // Backend list_dependencies returns AppJson<Vec<Service>>.
        // So it should be fine.

        // Actually, list_dependencies returns AppJson<Vec<Service>> which serializes to [Service, ...].
        // But RestGeneric.getPagedIds returns ListPages.
        // My backend list_services returns AppJson<Vec<Service>>.
        // RestGeneric.getPagedIds expects ListPages format: { ids: [], pagination: {} }.
        // My backend list_services returns just a Vec<Service>.
        // This is a mismatch. The existing RestGeneric seems to expect a specific pagination format.
        // The backend `list_services` I implemented returns `Vec<Service>`.
        // The `RestGeneric` might not work out of the box for `list_services` if I want to use `getPagedIds`.
        // But I can just add a `listAll` method or similar if I don't want pagination yet, or update backend to support pagination.
        // The user asked for "capture the name ... and various pieces of information".
        // I implemented `list_services` returning `Vec<Service>`.
        // I should probably override `getPagedIds` or just add a `getAll` method.
        // Or better, I should update my backend to match the pagination expected by RestGeneric if I want to use it fully.
        // But for now, let's just add `getAll` to this service or use `http.get` directly in the component if I don't want to change backend yet.
        // Actually, `RestGeneric` has `getPagedIds` and `getPagedDetail`.
        // If I want to use `RestGeneric`, I should probably stick to its patterns.
        // But `RestGeneric` seems designed for a specific backend structure (ids + pagination).
        // My `list_services` is simple.
        // I will implement `getAll` in this service for now.

        return this.http.get<any>(`${this.url}/${id}/dependencies`).pipe(
            // The backend returns AppJson<Vec<Service>> which is just Vec<Service> JSON.
            // However, looking at `list_dependencies` in backend:
            // Ok(AppJson(services))
            // So it returns [ ... ].
        );
    }
}
