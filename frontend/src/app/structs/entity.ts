export interface Entity {
  id?: number;
  name: string;
  type: string;
  p99_millis: number;
  p95_millis: number;
  availability: number;
  throughput_rps: number;
  x?: number | null;
  y?: number | null;
  attributes: any;
}
