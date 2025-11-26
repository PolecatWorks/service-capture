import { Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { LoginUserComponent } from './components/login-user/login-user.component';
import { UsersComponent } from './components/users/users.component';
import { UserComponent } from './components/user/user.component';

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
    ],
  },
  { path: '**', pathMatch: 'full', redirectTo: 'home' },
];
