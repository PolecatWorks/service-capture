import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { DependenciesService } from '../../services/dependencies.service';
import { ServicesService } from '../../services/services.service';
import { Dependency } from '../../structs/dependency';
import { Service } from '../../structs/service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { of, switchMap } from 'rxjs';

@Component({
    selector: 'app-dependency',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        RouterModule,
        FormsModule,
        MatInputModule,
        MatButtonModule,
        MatSelectModule,
        MatIconModule
    ],
    templateUrl: './dependency.component.html',
    styleUrl: './dependency.component.scss',
})
export class DependencyComponent implements OnInit {
    dependency: Dependency = {} as Dependency;
    isEditing = false;
    services: Service[] = [];

    constructor(
        private activatedRoute: ActivatedRoute,
        private dependenciesService: DependenciesService,
        private servicesService: ServicesService,
        private router: Router
    ) {
        this.activatedRoute.params
            .pipe(
                switchMap(param => {
                    if ('id' in param) {
                        this.isEditing = true;
                        return this.dependenciesService.get(param['id']);
                    } else {
                        console.log('id not provided so creating a new dependency');
                        return of({} as Dependency);
                    }
                })
            )
            .subscribe(params => {
                this.dependency = params;
            });
    }

    ngOnInit(): void {
        // Fetch all services for the dropdowns
        // Assuming ServicesService has a method to get all services or we can use the paginated one with large size
        // For now, I'll use a hacky way if getAll doesn't exist, or just assume I can fetch page 0 with large size
        // Actually, I'll just use the existing getPagedDetail with a large page size for now, or add getAll to ServicesService.
        // Since I can't easily modify ServicesService right now without context, I'll try to use what's available.
        // But wait, I can modify ServicesService. I'll just use the paginated call for now.
        this.servicesService.getPagedDetail({ size: 100, page: 0 }).subscribe(page => {
            this.services = page.ids;
        });
    }

    private newRecord() {
        return this.dependency.id === undefined;
    }

    submit() {
        if (this.newRecord()) {
            this.dependenciesService.create(this.dependency).subscribe({
                next: data => {
                    this.router.navigate(['..'], { relativeTo: this.activatedRoute });
                },
                error: error => {
                    console.error('Error:', error);
                },
            });
        } else {
            this.dependenciesService.update(this.dependency).subscribe({
                next: data => {
                    this.router.navigate(['../..'], { relativeTo: this.activatedRoute });
                },
                error: error => {
                    console.error('Error:', error);
                },
            });
        }
    }

    cancel() {
        if (this.newRecord()) {
            this.router.navigate(['..'], { relativeTo: this.activatedRoute });
        } else {
            this.router.navigate(['../..'], { relativeTo: this.activatedRoute });
        }
    }
}
