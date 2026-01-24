import { Component, AfterViewInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { RelationshipsService } from '../../services/relationships.service';
import { Relationship } from '../../structs/relationship';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatIconModule } from '@angular/material/icon';
import { PaginationDataSource } from '../../services/paginated-data-source.service';
import { PageOptions } from '../../services/pagination';

@Component({
  selector: 'app-relationships',
  standalone: true,
  imports: [CommonModule, RouterModule, MatTableModule, MatPaginatorModule, MatButtonModule, MatIconModule],
  templateUrl: './relationships.component.html',
  styleUrl: './relationships.component.scss',
})
export class RelationshipsComponent implements AfterViewInit {
  displayedColumns: string[] = ['id', 'relationship_type', 'from_id', 'to_id', 'actions'];
  data: PaginationDataSource<Relationship>;

  constructor(private relationshipsService: RelationshipsService) {
    this.data = new PaginationDataSource<Relationship>(
      (request: PageOptions<Relationship>) => this.relationshipsService.getPagedDetail(request),
      this.relationshipsService.sourceUpdate(),
      { property: 'relationship_type', order: 'asc' }, // default sort by type or id
      0
    );
  }

  getRelIcon(type: string): string {
    switch (type.toUpperCase()) {
      case 'CONTAINS':
        return 'folder';
      case 'CALLS':
        return 'call_made';
      case 'HOSTED_ON':
        return 'dns';
      default:
        return 'compare_arrows';
    }
  }

  ngAfterViewInit(): void {
    this.data.sortBy({ property: 'id', order: 'asc' });
    this.data.fetch(0);
    this.relationshipsService.sourceRefresh(Date.now());
  }

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  delete(id: number) {
    if (confirm('Are you sure you want to delete this relationship?')) {
      this.relationshipsService.delete(id).subscribe({
        next: () => {
          this.data.fetch(0);
        },
        error: (err) => console.error('Error deleting relationship:', err)
      });
    }
  }
}
