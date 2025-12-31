import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ServicesService } from '../../services/services.service';
import { DependenciesService } from '../../services/dependencies.service';
import { Service } from '../../structs/service';
import { Dependency } from '../../structs/dependency';
import { PageOptions } from '../../services/pagination';
import { LayoutService, ServiceNode } from '../../services/layout.service';

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

  // ViewBox state
  vbX = 0;
  vbY = 0;
  vbW = 100;
  vbH = 100;

  get viewBox(): string {
    return `${this.vbX} ${this.vbY} ${this.vbW} ${this.vbH}`;
  }

  Math = Math;

  // Drag state
  draggingService: ServiceNode | null = null;
  isPanning = false;
  dragStartX = 0;
  dragStartY = 0;
  initialServiceX = 0;
  initialServiceY = 0;
  initialVbX = 0;
  initialVbY = 0;

  constructor(
    private servicesService: ServicesService,
    private dependenciesService: DependenciesService,
    private layoutService: LayoutService
  ) {}

  ngOnInit(): void {
    const pageOptions: PageOptions<any> = {
      page: 0,
      size: 100,
      sort: { property: 'name', order: 'asc' },
    };

    this.servicesService.getPagedDetail(pageOptions).subscribe(page => {
      this.services = this.layoutService.calculatePositions(page.ids);
      this.updateViewBox();

      this.dependenciesService.getPagedDetail(pageOptions).subscribe(depPage => {
        this.dependencies = depPage.ids;
        this.calculateConnections(this.dependencies);
      });
    });
  }

  calculateConnections(dependencies: Dependency[]) {
    this.connections = dependencies
      .map(dep => {
        const source = this.services.find(s => s.id === dep.source_id);
        const target = this.services.find(s => s.id === dep.target_id);

        if (source && target) {
          return {
            x1: source.x,
            y1: source.y,
            x2: target.x,
            y2: target.y,
            name: dep.name,
          } as Connection;
        }
        return null;
      })
      .filter((c): c is Connection => c !== null);
  }

  // Drag and Drop Handlers
  onMouseDown(event: MouseEvent, service?: ServiceNode) {
    this.dragStartX = event.clientX;
    this.dragStartY = event.clientY;

    if (service) {
      this.draggingService = service;
      this.initialServiceX = service.x;
      this.initialServiceY = service.y;
      event.stopPropagation(); // Prevent event bubbling to SVG background
    } else {
      this.isPanning = true;
      this.initialVbX = this.vbX;
      this.initialVbY = this.vbY;
    }
  }

  onMouseMove(event: MouseEvent) {
    if (this.draggingService) {
      // We need to map screen delta to SVG coordinates delta
      // The scale factor is vbW / svgWidth
      const svgElement = (event.target as Element).closest('svg');
      if (!svgElement) return;

      const rect = svgElement.getBoundingClientRect();
      const scaleX = this.vbW / rect.width;
      const scaleY = this.vbH / rect.height;

      const dx = (event.clientX - this.dragStartX) * scaleX;
      const dy = (event.clientY - this.dragStartY) * scaleY;

      this.draggingService.x = this.initialServiceX + dx;
      this.draggingService.y = this.initialServiceY + dy;

      // Update connections
      this.updateConnections();
    } else if (this.isPanning) {
      const svgElement = (event.target as Element).closest('svg');
      if (!svgElement) return;

      const rect = svgElement.getBoundingClientRect();
      const scaleX = this.vbW / rect.width;
      const scaleY = this.vbH / rect.height;

      const dx = (event.clientX - this.dragStartX) * scaleX;
      const dy = (event.clientY - this.dragStartY) * scaleY;

      this.vbX = this.initialVbX - dx;
      this.vbY = this.initialVbY - dy;
    }
  }

  onMouseUp() {
    this.draggingService = null;
    this.isPanning = false;
  }

  onMouseLeave() {
    this.draggingService = null;
    this.isPanning = false;
  }

  onWheel(event: WheelEvent) {
    event.preventDefault();

    const zoomSpeed = 0.001;
    const delta = event.deltaY;
    const scale = 1 + delta * zoomSpeed;

    // Limit zoom
    if (this.vbW * scale < 10 || this.vbW * scale > 10000) return;

    const svgElement = (event.target as Element).closest('svg');
    if (!svgElement) return;

    const rect = svgElement.getBoundingClientRect();

    // Mouse position relative to SVG
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    // Mouse position in SVG coordinates (before zoom)
    const svgX = this.vbX + (mouseX / rect.width) * this.vbW;
    const svgY = this.vbY + (mouseY / rect.height) * this.vbH;

    // Update width and height
    const newW = this.vbW * scale;
    const newH = this.vbH * scale;

    // Update x and y to keep the point under mouse stationary
    // newSvgX = newVbX + (mouseX / rect.width) * newW
    // We want newSvgX == svgX
    // newVbX = svgX - (mouseX / rect.width) * newW

    this.vbX = svgX - (mouseX / rect.width) * newW;
    this.vbY = svgY - (mouseY / rect.height) * newH;
    this.vbW = newW;
    this.vbH = newH;
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
    this.updateViewBox();
  }

  updateViewBox() {
    if (this.services.length === 0) {
      this.vbX = 0;
      this.vbY = 0;
      this.vbW = 100;
      this.vbH = 100;
      return;
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    this.services.forEach(s => {
      minX = Math.min(minX, s.x);
      minY = Math.min(minY, s.y);
      maxX = Math.max(maxX, s.x);
      maxY = Math.max(maxY, s.y);
    });

    // Add padding
    const padding = 20;
    minX -= padding;
    minY -= padding;
    maxX += padding;
    maxY += padding;

    this.vbX = minX;
    this.vbY = minY;
    this.vbW = Math.max(100, maxX - minX);
    this.vbH = Math.max(100, maxY - minY);
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
        y: Math.round(s.y),
      };
      this.servicesService.update(update).subscribe({
        next: () => {
          s.originalX = s.x;
          s.originalY = s.y;
        },
        error: err => console.error('Failed to save service position', err),
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
