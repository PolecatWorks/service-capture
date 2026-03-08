import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { EntitiesService } from '../../services/entities.service';
import { Entity } from '../../structs/entity';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { of, switchMap } from 'rxjs';

@Component({
  selector: 'app-entity',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule
  ],
  templateUrl: './entity.component.html',
  styleUrl: './entity.component.scss',
})
export class EntityComponent {
  entity: Entity = {} as Entity;
  isEditing = false;

  attributeList: {key: string, value: string}[] = [];

  entityTypes = [
    'service',
    'server',
    'cluster',
    'database',
    'region',
    'zone',
    'provider'
  ];

  constructor(
    private activatedRoute: ActivatedRoute,
    private entitiesService: EntitiesService,
    private router: Router
  ) {
    this.activatedRoute.params
      .pipe(
        switchMap(param => {
          if ('id' in param) {
            this.isEditing = true;
            return this.entitiesService.get(param['id']);
          } else {
            console.log('id not provided so creating a new entity');
            this.isEditing = false;
            return of({
              name: '',
              type: 'service',
              p99_millis: 0,
              p95_millis: 0,
              availability: 0,
              throughput_rps: 0,
              attributes: {}
            } as Entity);
          }
        })
      )
      .subscribe(params => {
        this.entity = params;
        this.initAttributeList();
      });
  }

  private initAttributeList() {
    this.attributeList = [];
    if (this.entity.attributes && typeof this.entity.attributes === 'object') {
      Object.entries(this.entity.attributes).forEach(([key, value]) => {
        this.attributeList.push({ key, value: String(value) });
      });
    }
  }

  private updateEntityAttributes() {
    this.entity.attributes = {};
    this.attributeList.forEach(attr => {
      if (attr.key) {
        this.entity.attributes[attr.key] = attr.value;
      }
    });
  }

  addAttribute() {
    this.attributeList.push({ key: '', value: '' });
  }

  removeAttribute(index: number) {
    this.attributeList.splice(index, 1);
  }

  private newRecord() {
    return this.entity.id === undefined;
  }

  submit() {
    this.updateEntityAttributes();

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
