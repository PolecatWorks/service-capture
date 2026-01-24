import { TestBed } from '@angular/core/testing';
import { LayoutService } from './layout.service';
import { Entity } from '../structs/entity';

describe('LayoutService', () => {
  let service: LayoutService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LayoutService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should preserve positions of entities with coordinates', () => {
    const entities: Entity[] = [
      { name: 'S1', p99_millis: 100, x: 50, y: 50, type: 'service', p95_millis: 100, availability: 99.9, throughput_rps: 10, attributes: '{}' },
      { name: 'S2', p99_millis: 100, x: 100, y: 100, type: 'service', p95_millis: 100, availability: 99.9, throughput_rps: 10, attributes: '{}' },
    ];
    const nodes = service.calculatePositions(entities);
    expect(nodes.length).toBe(2);
    expect(nodes[0].x).toBe(50);
    expect(nodes[0].y).toBe(50);
    expect(nodes[1].x).toBe(100);
    expect(nodes[1].y).toBe(100);
  });

  it('should position entities without coordinates', () => {
    const entities: Entity[] = [
      { name: 'S1', p99_millis: 100, x: null, y: null, type: 'service', p95_millis: 100, availability: 99.9, throughput_rps: 10, attributes: '{}' },
      { name: 'S2', p99_millis: 100, x: null, y: null, type: 'service', p95_millis: 100, availability: 99.9, throughput_rps: 10, attributes: '{}' },
    ];
    const nodes = service.calculatePositions(entities);
    expect(nodes.length).toBe(2);
    expect(nodes[0].x).toBeDefined();
    expect(nodes[0].y).toBeDefined();
    expect(nodes[1].x).toBeDefined();
    expect(nodes[1].y).toBeDefined();
    // Should not overlap (simple check if they are different)
    expect(nodes[0].x !== nodes[1].x || nodes[0].y !== nodes[1].y).toBeTrue();
  });

  it('should avoid collisions with existing entities', () => {
    const entities: Entity[] = [
      { name: 'Fixed', p99_millis: 100, x: 10, y: 10, type: 'service', p95_millis: 100, availability: 99.9, throughput_rps: 10, attributes: '{}' },
      { name: 'Dynamic', p99_millis: 100, x: null, y: null, type: 'service', p95_millis: 100, availability: 99.9, throughput_rps: 10, attributes: '{}' },
    ];
    const nodes = service.calculatePositions(entities);
    const fixed = nodes.find(n => n.name === 'Fixed')!;
    const dynamic = nodes.find(n => n.name === 'Dynamic')!;

    expect(fixed.x).toBe(10);
    expect(fixed.y).toBe(10);

    // Dynamic should not be at 10,10
    expect(dynamic.x !== 10 || dynamic.y !== 10).toBeTrue();
  });
});
