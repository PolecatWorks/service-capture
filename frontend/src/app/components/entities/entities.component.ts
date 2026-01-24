import { Component, AfterViewInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { EntitiesService } from '../../services/entities.service';
import { Entity } from '../../structs/entity';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatIconModule } from '@angular/material/icon';
import { PaginationDataSource } from '../../services/paginated-data-source.service';
import { PageOptions } from '../../services/pagination';

@Component({
  selector: 'app-entities',
  standalone: true,
  imports: [CommonModule, RouterModule, MatTableModule, MatPaginatorModule, MatButtonModule, MatIconModule],
  templateUrl: './entities.component.html',
  styleUrl: './entities.component.scss',
})
export class EntitiesComponent implements AfterViewInit {
  displayedColumns: string[] = ['id', 'name', 'type', 'p99_millis', 'p95_millis', 'availability', 'throughput_rps', 'actions'];
  data: PaginationDataSource<Entity>;

  constructor(private entitiesService: EntitiesService) {
    this.data = new PaginationDataSource<Entity>(
      (request: PageOptions<Entity>) => this.entitiesService.getPagedDetail(request),
      this.entitiesService.sourceUpdate(),
      { property: 'name', order: 'asc' },
      0
    );
  }

  getIcon(type: string): string {
    switch (type.toLowerCase()) {
      case 'host':
        return 'dns';
      case 'availability_zone':
        return 'cloud';
      case 'service':
        return 'lan';
      case 'database':
        return 'storage';
      case 'region':
        return 'public';
      default:
        return 'help_outline';
    }
  }

  ngAfterViewInit(): void {
    this.data.sortBy({ property: 'name', order: 'asc' });
    this.data.fetch(0);
    this.entitiesService.sourceRefresh(Date.now());
    console.log('Have send sortBy and fetch');
  }

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  delete(id: number) {
    if (confirm('Are you sure you want to delete this entity?')) {
      this.entitiesService.delete(id).subscribe({
        next: () => {
          this.data.fetch(0);
        },
        error: (err) => console.error('Error deleting entity:', err)
      });
    }
  }
}
