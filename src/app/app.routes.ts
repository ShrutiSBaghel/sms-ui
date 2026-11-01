import { Routes } from '@angular/router';
import { DashboardShell } from './dashboard-shell/dashboard-shell';
import { authGuard, guestGuard } from './login/auth.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    canActivate: [guestGuard],
    loadComponent: () => import('./login/login').then((m) => m.Login),
  },
  {
    path: '',
    component: DashboardShell,
    canActivate: [authGuard],
    canActivateChild: [authGuard],
    children: [
      {
        path: 'report',
        loadComponent: () => import('./report/report').then((m) => m.Report),
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'employee/:departmentId',
        loadComponent: () => import('./employee/employee').then((m) => m.Employee),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
