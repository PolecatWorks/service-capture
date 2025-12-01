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
    originalX: number;
    originalY: number;
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

    // Drag state
    draggingService: ServiceNode | null = null;
    dragStartX = 0;
    dragStartY = 0;
    initialServiceX = 0;
    initialServiceY = 0;

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
            this.services = page.ids.map((service, i) => {
                const x = service.x ?? (i % 5) * 20 + 10;
                const y = service.y ?? Math.floor(i / 5) * 20 + 10;
                return {
                    ...service,
                    x,
                    y,
                    originalX: x,
                    originalY: y
                };
            });

            this.dependenciesService.getPagedDetail(pageOptions).subscribe(depPage => {
                this.dependencies = depPage.ids;
                this.calculateConnections(this.dependencies);
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

    // Drag and Drop Handlers
    onMouseDown(event: MouseEvent, service: ServiceNode) {
        this.draggingService = service;
        this.dragStartX = event.clientX;
        this.dragStartY = event.clientY;
        this.initialServiceX = service.x;
        this.initialServiceY = service.y;
        event.stopPropagation(); // Prevent event bubbling
    }

    onMouseMove(event: MouseEvent) {
        if (this.draggingService) {
            const dx = (event.clientX - this.dragStartX) / this.getSvgScale(event); // Adjust for SVG scaling if needed
            const dy = (event.clientY - this.dragStartY) / this.getSvgScale(event);

            this.draggingService.x = this.initialServiceX + dx;
            this.draggingService.y = this.initialServiceY + dy;

            // Update connections
            this.updateConnections();
        }
    }

    onMouseUp() {
        this.draggingService = null;
    }

    onMouseLeave() {
        this.draggingService = null;
    }

    // Helper to handle SVG scaling if the SVG is responsive and not 1:1 with screen pixels
    // For now, assuming 1:1 or handling via viewBox mapping could be complex.
    // A simple approximation if viewBox is 100x100 and mapped to screen size:
    private getSvgScale(event: MouseEvent): number {
        const svgElement = (event.target as Element).closest('svg');
        if (svgElement) {
            const rect = svgElement.getBoundingClientRect();
            // viewBox width is 100
            return rect.width / 100;
        }
        return 1;
    }

    updateConnections() {
        // Re-calculate connections based on new service positions
        // We can just re-run calculateConnections but we need the dependencies list.
        // Since we don't store dependencies permanently in a property that is easy to access without re-fetching or storing,
        // let's store dependencies or just update existing connections if we can map them back.
        // Easier approach: Store dependencies in the component.
        if (this.dependencies) {
            this.calculateConnections(this.dependencies);
        }
    }

    // Store dependencies to re-calculate connections
    dependencies: Dependency[] = [];

    // Save and Reset
    get hasChanges(): boolean {
        return this.services.some(s => s.x !== s.originalX || s.y !== s.originalY);
    }

    save() {
        const modifiedServices = this.services.filter(s => s.x !== s.originalX || s.y !== s.originalY);
        modifiedServices.forEach(s => {
            // Update the service object with new coordinates
            const update: Service = {
                ...s,
                x: Math.round(s.x), // Round to integer if desired, or keep float
                y: Math.round(s.y)
            };
            this.servicesService.update(update).subscribe({
                next: () => {
                    s.originalX = s.x;
                    s.originalY = s.y;
                },
                error: (err) => console.error('Failed to save service position', err)
            });
        });
    }

    reset() {
        this.services.forEach(s => {
            s.x = s.originalX;
            s.y = s.originalY;
        });
        this.updateConnections();
    }
}
