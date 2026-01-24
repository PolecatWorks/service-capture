export interface Relationship {
  id?: number;
  from_id: number;
  to_id: number;
  relationship_type: string;
  attributes: any;
}
