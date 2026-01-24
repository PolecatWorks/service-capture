import { Injectable } from '@angular/core';
import { Entity } from '../structs/entity';

export interface EntityNode extends Entity {
  x: number;
  y: number;
  originalX: number;
  originalY: number;
}

@Injectable({
  providedIn: 'root',
})
export class LayoutService {
  private readonly GRID_SIZE = 20;
  private readonly COLS = 5; // Adjust based on expected screen width / grid size

  constructor() { }

  calculatePositions(entities: Entity[]): EntityNode[] {
    const occupied = new Set<string>();
    const nodes: EntityNode[] = [];
    const unpositioned: Entity[] = [];

    // 1. Place entities with existing coordinates
    entities.forEach(entity => {
      if (entity.x != null && entity.y != null) {
        const x = entity.x;
        const y = entity.y;
        nodes.push({
          ...entity,
          x,
          y,
          originalX: x,
          originalY: y,
        });
        const gridX = Math.round((x - 10) / this.GRID_SIZE);
        const gridY = Math.round((y - 10) / this.GRID_SIZE);
        occupied.add(`${gridX},${gridY}`);
      } else {
        unpositioned.push(entity);
      }
    });

    // 2. Place unpositioned entities
    let currentGridX = 0;
    let currentGridY = 0;

    unpositioned.forEach(entity => {
      // Find next available slot
      while (occupied.has(`${currentGridX},${currentGridY}`)) {
        currentGridX++;
        if (currentGridX >= this.COLS) {
          currentGridX = 0;
          currentGridY++;
        }
      }

      const x = currentGridX * this.GRID_SIZE + 10; // +10 for padding/centering
      const y = currentGridY * this.GRID_SIZE + 10;

      nodes.push({
        ...entity,
        x,
        y,
        originalX: x,
        originalY: y,
      });

      occupied.add(`${currentGridX},${currentGridY}`);

      // Move to next slot for the next iteration
      currentGridX++;
      if (currentGridX >= this.COLS) {
        currentGridX = 0;
        currentGridY++;
      }
    });

    return nodes;
  }
}
