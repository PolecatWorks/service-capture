import { AfterViewInit, Component, ViewChild } from '@angular/core';
import { UsersService } from '../../services/users.service';
import { CommonModule } from '@angular/common';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { User } from '../../structs/user';
import { PaginationDataSource } from '../../services/paginated-data-source.service';
import { PageOptions } from '../../services/pagination';
import { RouterLink, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';

@Component({
  imports: [CommonModule, MatTableModule, MatPaginatorModule, RouterOutlet, RouterLink, MatButtonModule, MatIconModule],
  templateUrl: './users.component.html',
  styleUrl: './users.component.scss',
})
export class UsersComponent implements AfterViewInit {
  displayedColumns: string[] = ['forename', 'surname'];
  data: PaginationDataSource<User>;

  constructor(private usersService: UsersService) {
    // console.log("fetch for dataSource");
    // this.data.fetch(1);

    this.data = new PaginationDataSource<User>(
      (request: PageOptions<User>) => this.usersService.getPagedDetail(request),
      this.usersService.sourceUpdate(),
      { property: 'surname', order: 'asc' },
      0
    );
  }
  ngAfterViewInit(): void {
    this.data.sortBy({ property: 'surname', order: 'asc' });
    this.data.fetch(0);
    this.usersService.sourceRefresh(Date.now());
    console.log('Have send sortBy and fetch');
    // throw new Error('Method not implemented.');
  }

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  usersCreate(user: User) {
    this.usersService.create(user).subscribe({
      next: data => {
        console.log('create: ', data);
        this.data.fetch(0);
      },
      error: error => {
        console.error('Error:', error);
        // this.userIds = -1;
      },
    });
  }
}
