import { Routes } from '@angular/router';
import { DashboardShell } from './dashboard-shell/dashboard-shell';

export const routes: Routes = [
  {
    path: '',
    component: DashboardShell,
    children: [
      {
        path: '',
        pathMatch: 'full',
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
