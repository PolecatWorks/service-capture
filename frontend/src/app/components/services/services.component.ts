import { Component, AfterViewInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ServicesService } from '../../services/services.service';
import { Service } from '../../structs/service';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatIconModule } from '@angular/material/icon';
import { PaginationDataSource } from '../../services/paginated-data-source.service';
import { PageOptions } from '../../services/pagination';


@Component({
  selector: 'app-services',
  standalone: true,
  imports: [CommonModule, RouterModule, MatTableModule, MatPaginatorModule, MatButtonModule, MatIconModule],
  templateUrl: './services.component.html',
  styleUrl: './services.component.scss',
})
export class ServicesComponent implements AfterViewInit {
  displayedColumns: string[] = ['id', 'name', 'p99_millis', 'actions'];
  data: PaginationDataSource<Service>;

  constructor(private servicesService: ServicesService) {
    this.data = new PaginationDataSource<Service>(
      (request: PageOptions<Service>) => this.servicesService.getPagedDetail(request),
      this.servicesService.sourceUpdate(),
      { property: 'name', order: 'asc' },
      0
    );
  }

  ngAfterViewInit(): void {
    this.data.sortBy({ property: 'name', order: 'asc' });
    this.data.fetch(0);
    this.servicesService.sourceRefresh(Date.now());
    console.log('Have send sortBy and fetch');
    // throw new Error('Method not implemented.');
  }

  @ViewChild(MatPaginator) paginator!: MatPaginator;




}
