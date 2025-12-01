import { Injectable } from '@angular/core';
import { Service } from '../structs/service';

export interface ServiceNode extends Service {
    x: number;
    y: number;
    originalX: number;
    originalY: number;
}

@Injectable({
    providedIn: 'root'
})
export class LayoutService {
    private readonly GRID_SIZE = 20;
    private readonly COLS = 5; // Adjust based on expected screen width / grid size

    constructor() { }

    calculatePositions(services: Service[]): ServiceNode[] {
        const occupied = new Set<string>();
        const nodes: ServiceNode[] = [];
        const unpositioned: Service[] = [];

        // 1. Place services with existing coordinates
        services.forEach(service => {
            if (service.x != null && service.y != null) {
                const x = service.x;
                const y = service.y;
                nodes.push({
                    ...service,
                    x,
                    y,
                    originalX: x,
                    originalY: y
                });
                // Mark occupied slots (approximate grid snapping for collision check)
                // We might want to snap them or just mark the area.
                // For simplicity, let's assume if they are close to a grid point, that point is taken.
                // Or better, just store the exact positions and check distance later?
                // The requirement says "consider where services with coordinates are currently placed".
                // Let's use a simple grid reservation system.
                const gridX = Math.round((x - 10) / this.GRID_SIZE);
                const gridY = Math.round((y - 10) / this.GRID_SIZE);
                occupied.add(`${gridX},${gridY}`);
            } else {
                unpositioned.push(service);
            }
        });

        // 2. Place unpositioned services
        let currentGridX = 0;
        let currentGridY = 0;

        unpositioned.forEach(service => {
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
                ...service,
                x,
                y,
                originalX: x,
                originalY: y
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
