import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ServicesService } from '../../services/services.service';
import { Service } from '../../structs/service';
import { PageOptions } from '../../services/pagination';

@Component({
    selector: 'app-service-view',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './service-view.component.html',
    styleUrl: './service-view.component.scss',
})
export class ServiceViewComponent implements OnInit {
    services: Service[] = [];
    Math = Math;

    constructor(private servicesService: ServicesService) { }

    ngOnInit(): void {
        // Fetch the first page of services for now
        const pageOptions: PageOptions<Service> = {
            page: 0,
            size: 100, // Fetch a good amount to show
            sort: { property: 'name', order: 'asc' }
        };

        this.servicesService.getPagedDetail(pageOptions).subscribe(page => {
            this.services = page.ids;
        });
    }
}
