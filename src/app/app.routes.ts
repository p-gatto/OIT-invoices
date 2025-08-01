import { Routes } from '@angular/router';

export const routes: Routes = [
    {
        path: '',
        redirectTo: '/dashboard',
        pathMatch: 'full'
    },
    /* {
        path: 'dashboard',
        loadComponent: () => import('./pages/dashboard/dashboard.component').then(c => c.DashboardComponent)
    }, */
    /*  {
         path: 'invoices',
         loadChildren: () => import('./features//invoices/invoices.routes').then(r => r.invoicesRoutes)
     },
     {
         path: 'customers',
         loadComponent: () => import('./pages/customers/customers.component').then(c => c.CustomersComponent)
     }, */
    /* {
        path: 'products',
        loadComponent: () => import('./pages/products/products.component').then(c => c.ProductsComponent)
    },
    {
        path: 'reports',
        loadComponent: () => import('./pages/reports/reports.component').then(c => c.ReportsComponent)
    },
    {
        path: 'settings',
        loadComponent: () => import('./pages/settings/settings.component').then(c => c.SettingsComponent)
    },
    {
        path: 'help',
        loadComponent: () => import('./pages/help/help.component').then(c => c.HelpComponent)
    },
    {
        path: '**',
        loadComponent: () => import('./pages/not-found/not-found.component').then(c => c.NotFoundComponent)
    } */
];
