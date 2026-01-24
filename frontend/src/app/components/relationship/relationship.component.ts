import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { RelationshipsService } from '../../services/relationships.service';
import { EntitiesService } from '../../services/entities.service';
import { Relationship } from '../../structs/relationship';
import { Entity } from '../../structs/entity';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { of, switchMap } from 'rxjs';

@Component({
  selector: 'app-relationship',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, FormsModule, MatInputModule, MatButtonModule, MatSelectModule, MatIconModule],
  templateUrl: './relationship.component.html',
  styleUrl: './relationship.component.scss',
})
export class RelationshipComponent implements OnInit {
  relationship: Relationship = {} as Relationship;
  isEditing = false;
  entities: Entity[] = [];

  constructor(
    private activatedRoute: ActivatedRoute,
    private relationshipsService: RelationshipsService,
    private entitiesService: EntitiesService,
    private router: Router
  ) {
    this.activatedRoute.params
      .pipe(
        switchMap(param => {
          if ('id' in param) {
            this.isEditing = true;
            return this.relationshipsService.get(param['id']);
          } else {
            console.log('id not provided so creating a new relationship');
            return of({} as Relationship);
          }
        })
      )
      .subscribe(params => {
        this.relationship = params;
      });
  }

  ngOnInit(): void {
    // Fetch all entities for the dropdowns
    this.entitiesService.getPagedDetail({ size: 100, page: 0 }).subscribe(page => {
      this.entities = page.ids;
    });
  }

  private newRecord() {
    return this.relationship.id === undefined;
  }

  submit() {
    if (this.newRecord()) {
      this.relationshipsService.create(this.relationship).subscribe({
        next: data => {
          this.router.navigate(['..'], { relativeTo: this.activatedRoute });
        },
        error: error => {
          console.error('Error:', error);
        },
      });
    } else {
      this.relationshipsService.update(this.relationship).subscribe({
        next: data => {
          this.router.navigate(['../..'], { relativeTo: this.activatedRoute });
        },
        error: error => {
          console.error('Error:', error);
        },
      });
    }
  }

  cancel() {
    if (this.newRecord()) {
      this.router.navigate(['..'], { relativeTo: this.activatedRoute });
    } else {
      this.router.navigate(['../..'], { relativeTo: this.activatedRoute });
    }
  }
}
