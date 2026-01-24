import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { EntitiesService } from '../../services/entities.service';
import { Entity } from '../../structs/entity';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { of, switchMap } from 'rxjs';

@Component({
  selector: 'app-entity',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, FormsModule, MatInputModule, MatButtonModule, MatIconModule],
  templateUrl: './entity.component.html',
  styleUrl: './entity.component.scss',
})
export class EntityComponent {
  entity: Entity = {} as Entity;

  isEditing = false;

  constructor(
    private activatedRoute: ActivatedRoute,
    private entitiesService: EntitiesService,
    private router: Router
  ) {
    this.activatedRoute.params
      .pipe(
        switchMap(param => {
          if ('id' in param) {
            return this.entitiesService.get(param['id']);
          } else {
            console.log('id not provided so creating a new entity');
            return of({} as Entity);
          }
        })
      )
      .subscribe(params => {
        this.entity = params;
      });
  }

  private newRecord() {
    return this.entity.id === undefined;
  }

  submit() {
    if (this.newRecord()) {
      this.entitiesService.create(this.entity).subscribe({
        next: data => {
          this.router.navigate(['..'], { relativeTo: this.activatedRoute });
        },
        error: error => {
          console.error('Error:', error);
        },
      });
    } else {
      this.entitiesService.update(this.entity).subscribe({
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

  resetCoordinates() {
    this.entity.x = null;
    this.entity.y = null;
  }
}
