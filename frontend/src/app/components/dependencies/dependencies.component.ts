import { Component, AfterViewInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DependenciesService } from '../../services/dependencies.service';
import { Dependency } from '../../structs/dependency';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatIconModule } from '@angular/material/icon';
import { PaginationDataSource } from '../../services/paginated-data-source.service';
import { PageOptions } from '../../services/pagination';

@Component({
  selector: 'app-dependencies',
  standalone: true,
  imports: [CommonModule, RouterModule, MatTableModule, MatPaginatorModule, MatButtonModule, MatIconModule],
  templateUrl: './dependencies.component.html',
  styleUrl: './dependencies.component.scss',
})
export class DependenciesComponent implements AfterViewInit {
  displayedColumns: string[] = ['id', 'name', 'source_id', 'target_id', 'actions'];
  data: PaginationDataSource<Dependency>;

  constructor(private dependenciesService: DependenciesService) {
    this.data = new PaginationDataSource<Dependency>(
      (request: PageOptions<Dependency>) => this.dependenciesService.getPagedDetail(request),
      this.dependenciesService.sourceUpdate(),
      { property: 'name', order: 'asc' },
      0
    );
  }

  ngAfterViewInit(): void {
    this.data.sortBy({ property: 'name', order: 'asc' });
    this.data.fetch(0);
    this.dependenciesService.sourceRefresh(Date.now());
  }

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  delete(id: number) {
    if (confirm('Are you sure you want to delete this dependency?')) {
      this.dependenciesService.delete(id).subscribe({
        next: () => {
          this.data.fetch(0);
        },
        error: (err) => console.error('Error deleting dependency:', err)
      });
    }
  }
}
