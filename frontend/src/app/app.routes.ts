import { Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { LoginUserComponent } from './components/login-user/login-user.component';
import { UsersComponent } from './components/users/users.component';
import { UserComponent } from './components/user/user.component';
import { EntityComponent } from './components/entity/entity.component';

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
        path: 'entities',
        loadComponent: () => import('./components/entities/entities.component').then(m => m.EntitiesComponent),
        children: [
          {
            path: 'new',
            component: EntityComponent,
          },
          {
            path: 'edit/:id',
            component: EntityComponent,
          },
        ],
      },
      {
        path: 'relationships',
        loadComponent: () => import('./components/relationships/relationships.component').then(m => m.RelationshipsComponent),
        children: [
          {
            path: 'new',
            loadComponent: () => import('./components/relationship/relationship.component').then(m => m.RelationshipComponent),
          },
          {
            path: 'edit/:id',
            loadComponent: () => import('./components/relationship/relationship.component').then(m => m.RelationshipComponent),
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
