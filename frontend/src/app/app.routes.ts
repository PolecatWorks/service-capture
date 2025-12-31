import { Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { LoginUserComponent } from './components/login-user/login-user.component';
import { UsersComponent } from './components/users/users.component';
import { UserComponent } from './components/user/user.component';
import { ServiceComponent } from './components/service/service.component';

export const routes: Routes = [
  {
    path: 'home',
    component: HomeComponent,
    children: [
      {
        path: 'user',
        component: LoginUserComponent,
      },
      {
        path: 'users',
        component: UsersComponent,
        children: [
          {
            path: 'edit/:id',
            component: UserComponent,
          },
          {
            path: 'new',
            component: UserComponent,
          },
        ],
      },
      {
        path: 'services',
        loadComponent: () => import('./components/services/services.component').then(m => m.ServicesComponent),
        children: [
          {
            path: 'new',
            component: ServiceComponent,
          },
          {
            path: 'edit/:id',
            component: ServiceComponent,
          },
        ],
      },
      {
        path: 'dependencies',
        loadComponent: () => import('./components/dependencies/dependencies.component').then(m => m.DependenciesComponent),
        children: [
          {
            path: 'new',
            loadComponent: () => import('./components/dependency/dependency.component').then(m => m.DependencyComponent),
          },
          {
            path: 'edit/:id',
            loadComponent: () => import('./components/dependency/dependency.component').then(m => m.DependencyComponent),
          },
        ],
      },
      {
        path: 'view',
        loadComponent: () => import('./components/service-view/service-view.component').then(m => m.ServiceViewComponent),
      },
    ],
  },
  { path: '**', pathMatch: 'full', redirectTo: 'home' },
];
