import { TestBed } from '@angular/core/testing';
import { LayoutService } from './layout.service';
import { Service } from '../structs/service';

describe('LayoutService', () => {
    let service: LayoutService;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(LayoutService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should preserve positions of services with coordinates', () => {
        const services: Service[] = [
            { name: 'S1', p99_millis: 100, x: 50, y: 50 },
            { name: 'S2', p99_millis: 100, x: 100, y: 100 }
        ];
        const nodes = service.calculatePositions(services);
        expect(nodes.length).toBe(2);
        expect(nodes[0].x).toBe(50);
        expect(nodes[0].y).toBe(50);
        expect(nodes[1].x).toBe(100);
        expect(nodes[1].y).toBe(100);
    });

    it('should position services without coordinates', () => {
        const services: Service[] = [
            { name: 'S1', p99_millis: 100, x: null, y: null },
            { name: 'S2', p99_millis: 100, x: null, y: null }
        ];
        const nodes = service.calculatePositions(services);
        expect(nodes.length).toBe(2);
        expect(nodes[0].x).toBeDefined();
        expect(nodes[0].y).toBeDefined();
        expect(nodes[1].x).toBeDefined();
        expect(nodes[1].y).toBeDefined();
        // Should not overlap (simple check if they are different)
        expect(nodes[0].x !== nodes[1].x || nodes[0].y !== nodes[1].y).toBeTrue();
    });

    it('should avoid collisions with existing services', () => {
        // Place a service at 10,10 (grid 0,0)
        const services: Service[] = [
            { name: 'Fixed', p99_millis: 100, x: 10, y: 10 },
            { name: 'Dynamic', p99_millis: 100, x: null, y: null }
        ];
        const nodes = service.calculatePositions(services);
        const fixed = nodes.find(n => n.name === 'Fixed')!;
        const dynamic = nodes.find(n => n.name === 'Dynamic')!;

        expect(fixed.x).toBe(10);
        expect(fixed.y).toBe(10);

        // Dynamic should not be at 10,10
        expect(dynamic.x !== 10 || dynamic.y !== 10).toBeTrue();
    });
});
