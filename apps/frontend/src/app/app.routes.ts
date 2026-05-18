import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'screener', pathMatch: 'full' },
  {
    path: 'screener',
    loadComponent: () =>
      import('./features/screener/screener.component').then(m => m.ScreenerComponent),
  },
  {
    path: 'guide',
    loadComponent: () =>
      import('./features/guide/guide.component').then(m => m.GuideComponent),
  },
  { path: '**', redirectTo: 'screener' },
];
