import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ServicesService } from '../../services/services.service';
import { Service } from '../../structs/service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { of, switchMap } from 'rxjs';


@Component({
  selector: 'app-service',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    FormsModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatIconModule,
    MatListModule
  ],
  templateUrl: './service.component.html',
  styleUrl: './service.component.scss',
})
export class ServiceComponent {
  service: Service = {} as Service;


  isEditing = false;
  serviceId?: number;
  dependencies: Service[] = [];
  allServices: Service[] = [];


  constructor(
    private activatedRoute: ActivatedRoute,
    private servicesService: ServicesService,
    private router: Router
  ) {

    this.activatedRoute.params
      .pipe(
        switchMap(param => {
          if ('id' in param) {
            return this.servicesService.get(param['id']);
          } else {
            console.log('id not provided so creating a new service');
            return of({} as Service);
          }
        })
      )
      .subscribe(params => {
        this.service = params;
      });
  }


  private newRecord() {
    return this.service.id === undefined;
  }

  submit() {
    if (this.newRecord()) {
      this.servicesService.create(this.service).subscribe({
        next: data => {
          this.router.navigate(['..'], { relativeTo: this.activatedRoute });
        },
        error: error => {
          console.error('Error:', error);
        },
      });
    } else {
      this.servicesService.update(this.service).subscribe({
        next: data => {
          this.router.navigate(['..'], { relativeTo: this.activatedRoute });
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





  // addDependency() {
  //   if (this.serviceId && this.dependencyControl.value) {
  //     this.servicesService.addDependency(this.serviceId, this.dependencyControl.value).subscribe(() => {
  //       this.loadDependencies(this.serviceId!);
  //       this.dependencyControl.reset();
  //     });
  //   }
  // }

  // isDependency(id: number): boolean {
  //   return this.dependencies.some(d => d.id === id);
  // }


}
