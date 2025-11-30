import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ServicesService } from '../../services/services.service';
import { DependenciesService } from '../../services/dependencies.service';
import { Service } from '../../structs/service';
import { Dependency } from '../../structs/dependency';
import { PageOptions } from '../../services/pagination';

interface ServiceNode extends Service {
    x: number;
    y: number;
}

interface Connection {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    name?: string;
}

@Component({
    selector: 'app-service-view',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './service-view.component.html',
    styleUrl: './service-view.component.scss',
})
export class ServiceViewComponent implements OnInit {
    services: ServiceNode[] = [];
    connections: Connection[] = [];
    Math = Math;

    constructor(
        private servicesService: ServicesService,
        private dependenciesService: DependenciesService
    ) { }

    ngOnInit(): void {
        const pageOptions: PageOptions<any> = {
            page: 0,
            size: 100,
            sort: { property: 'name', order: 'asc' }
        };

        this.servicesService.getPagedDetail(pageOptions).subscribe(page => {
            this.services = page.ids.map((service, i) => ({
                ...service,
                x: service.x ?? (i % 5) * 20 + 10,
                y: service.y ?? Math.floor(i / 5) * 20 + 10
            }));

            this.dependenciesService.getPagedDetail(pageOptions).subscribe(depPage => {
                const dependencies = depPage.ids;
                this.calculateConnections(dependencies);
            });
        });
    }

    calculateConnections(dependencies: Dependency[]) {
        this.connections = dependencies.map(dep => {
            const source = this.services.find(s => s.id === dep.source_id);
            const target = this.services.find(s => s.id === dep.target_id);

            if (source && target) {
                return {
                    x1: source.x,
                    y1: source.y,
                    x2: target.x,
                    y2: target.y,
                    name: dep.name
                } as Connection;
            }
            return null;
        }).filter((c): c is Connection => c !== null);
    }
}
