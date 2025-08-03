import { Routes } from '@angular/router';

export const routes: Routes = [
    {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component').then(c => c.DashboardComponent)
    },
    {
        path: 'home',
        loadComponent: () => import('./features/home/home.component')
    },
    {
        path: '',
        redirectTo: 'home',
        pathMatch: 'full'
    },
    {
        path: '**',
        redirectTo: 'home'
    },

    /*     {
           path: 'login',
           loadComponent: () => import('./pages/auth/login/login.component').then(c => c.LoginComponent),
           canActivate: [publicGuard]
       },
       {
           path: 'register',
           loadComponent: () => import('./pages/auth/register/register.component').then(c => c.RegisterComponent),
           canActivate: [publicGuard]
       }, */
    /* {
        path: '',
        loadComponent: () => import('./invoice-list/invoice-list.component').then(c => c.InvoiceListComponent),
        canActivate: [authGuard]
    },
    {
        path: 'new',
        loadComponent: () => import('./invoice-form/invoice-form.component').then(c => c.InvoiceFormComponent),
        canActivate: [authGuard]
    },
    {
        path: ':id',
        loadComponent: () => import('./invoice-detail/invoice-detail.component').then(c => c.InvoiceDetailComponent),
        canActivate: [authGuard]
    },
    {
        path: ':id/edit',
        loadComponent: () => import('./invoice-form/invoice-form.component').then(c => c.InvoiceFormComponent),
        canActivate: [authGuard]
    } */
    /* {
        path: 'dashboard',
        loadComponent: () => import('./pages/dashboard/dashboard.component').then(c => c.DashboardComponent),
        canActivate: [authGuard]
    }, */
    /*  {
        path: 'invoices',
        loadChildren: () => import('./features//invoices/invoices.routes').then(r => r.invoicesRoutes),
        canActivate: [authGuard]
     },
     {
        path: 'customers',
        loadComponent: () => import('./pages/customers/customers.component').then(c => c.CustomersComponent),
        canActivate: [authGuard]
     }, */
    /* {
        path: 'products',
        loadComponent: () => import('./pages/products/products.component').then(c => c.ProductsComponent),
        canActivate: [authGuard]
    },
    {
        path: 'reports',
        loadComponent: () => import('./pages/reports/reports.component').then(c => c.ReportsComponent),
        canActivate: [authGuard]
    },
    {
        path: 'settings',
        loadComponent: () => import('./pages/settings/settings.component').then(c => c.SettingsComponent),
        canActivate: [authGuard]
    },
    {
        path: 'help',
        loadComponent: () => import('./pages/help/help.component').then(c => c.HelpComponent),
        canActivate: [authGuard]
    },
    {
        path: '**',
        loadComponent: () => import('./pages/not-found/not-found.component').then(c => c.NotFoundComponent)
    } */
];