import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EntitiesService } from '../../services/entities.service';
import { RelationshipsService } from '../../services/relationships.service';
import { Entity } from '../../structs/entity';
import { Relationship } from '../../structs/relationship';
import { PageOptions } from '../../services/pagination';
import { LayoutService, EntityNode } from '../../services/layout.service';

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
  entities: EntityNode[] = [];
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
  draggingEntity: EntityNode | null = null;
  isPanning = false;
  dragStartX = 0;
  dragStartY = 0;
  initialEntityX = 0;
  initialEntityY = 0;
  initialVbX = 0;
  initialVbY = 0;

  constructor(
    private entitiesService: EntitiesService,
    private relationshipsService: RelationshipsService,
    private layoutService: LayoutService
  ) { }

  ngOnInit(): void {
    const pageOptions: PageOptions<any> = {
      page: 0,
      size: 100,
      sort: { property: 'name', order: 'asc' },
    };

    this.entitiesService.getPagedDetail(pageOptions).subscribe(page => {
      this.entities = this.layoutService.calculatePositions(page.ids);
      this.updateViewBox();

      this.relationshipsService.getPagedDetail(pageOptions).subscribe(depPage => {
        this.relationships = depPage.ids;
        this.calculateConnections(this.relationships);
      });
    });
  }

  calculateConnections(relationships: Relationship[]) {
    this.connections = relationships
      .map(rel => {
        const source = this.entities.find(s => s.id === rel.from_id);
        const target = this.entities.find(s => s.id === rel.to_id);

        if (source && target) {
          return {
            x1: source.x,
            y1: source.y,
            x2: target.x,
            y2: target.y,
            name: rel.relationship_type, // Was dep.name
          } as Connection;
        }
        return null;
      })
      .filter((c): c is Connection => c !== null);
  }

  // Drag and Drop Handlers
  onMouseDown(event: MouseEvent, entity?: EntityNode) {
    this.dragStartX = event.clientX;
    this.dragStartY = event.clientY;

    if (entity) {
      this.draggingEntity = entity;
      this.initialEntityX = entity.x;
      this.initialEntityY = entity.y;
      event.stopPropagation(); // Prevent event bubbling to SVG background
    } else {
      this.isPanning = true;
      this.initialVbX = this.vbX;
      this.initialVbY = this.vbY;
    }
  }

  onMouseMove(event: MouseEvent) {
    if (this.draggingEntity) {
      // We need to map screen delta to SVG coordinates delta
      // The scale factor is vbW / svgWidth
      const svgElement = (event.target as Element).closest('svg');
      if (!svgElement) return;

      const rect = svgElement.getBoundingClientRect();
      const scaleX = this.vbW / rect.width;
      const scaleY = this.vbH / rect.height;

      const dx = (event.clientX - this.dragStartX) * scaleX;
      const dy = (event.clientY - this.dragStartY) * scaleY;

      this.draggingEntity.x = this.initialEntityX + dx;
      this.draggingEntity.y = this.initialEntityY + dy;

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
    this.draggingEntity = null;
    this.isPanning = false;
  }

  onMouseLeave() {
    this.draggingEntity = null;
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
    // Re-calculate connections based on new entity positions
    if (this.relationships) {
      this.calculateConnections(this.relationships);
    }
    this.updateViewBox();
  }

  updateViewBox() {
    if (this.entities.length === 0) {
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

    this.entities.forEach(s => {
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

  // Store relationships to re-calculate connections
  relationships: Relationship[] = [];

  // Save and Reset
  get hasChanges(): boolean {
    return this.entities.some(s => s.x !== s.originalX || s.y !== s.originalY);
  }

  save() {
    const modifiedEntities = this.entities.filter(s => s.x !== s.originalX || s.y !== s.originalY);
    modifiedEntities.forEach(s => {
      // Update the entity object with new coordinates
      const update: Entity = {
        ...s,
        x: Math.round(s.x), // Round to integer if desired, or keep float
        y: Math.round(s.y),
      };
      this.entitiesService.update(update).subscribe({
        next: () => {
          s.originalX = s.x;
          s.originalY = s.y;
        },
        error: err => console.error('Failed to save entity position', err),
      });
    });
  }

  reset() {
    this.entities.forEach(s => {
      s.x = s.originalX;
      s.y = s.originalY;
    });
    this.updateConnections();
  }
}
