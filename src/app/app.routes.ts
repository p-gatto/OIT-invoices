import { Routes } from '@angular/router';

import { publicGuard } from './core/auth/public.guard';
import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
    {
        path: 'login',
        loadComponent: () => import('./core/auth/login/login.component').then(c => c.LoginComponent),
        canActivate: [publicGuard]
    },
    {
        path: 'register',
        loadComponent: () => import('./core/auth/register/register.component').then(c => c.RegisterComponent),
        canActivate: [publicGuard]
    },
    {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component').then(c => c.DashboardComponent),
        canActivate: [authGuard]
    },
    {
        path: 'invoices',
        children: [
            {
                path: '',
                loadComponent: () => import('./features/invoices/invoices.component').then(c => c.InvoicesComponent)
            },
            {
                path: 'new',
                loadComponent: () => import('./features/invoices/invoice-form/invoice-form.component').then(c => c.InvoiceFormComponent)
            },
            {
                path: ':id',
                loadComponent: () => import('./features/invoices/invoice-detail/invoice-detail.component').then(c => c.InvoiceDetailComponent)
            },
            {
                path: ':id/edit',
                loadComponent: () => import('./features/invoices/invoice-form/invoice-form.component').then(c => c.InvoiceFormComponent)
            }
        ],
        canActivate: [authGuard]
    },
    {
        path: 'customers',
        loadComponent: () => import('./features/customers/customers.component').then(c => c.CustomersComponent),
        canActivate: [authGuard]
    },
    {
        path: 'products',
        loadComponent: () => import('./features/products/products.component').then(c => c.ProductsComponent),
        canActivate: [authGuard]
    },
    {
        path: 'reports',
        loadComponent: () => import('./features/reports/reports.component').then(c => c.ReportsComponent),
        canActivate: [authGuard]
    },
    {
        path: 'settings',
        loadComponent: () => import('./core/settings/settings.component').then(c => c.SettingsComponent),
        canActivate: [authGuard]
    },
    {
        path: 'help',
        loadComponent: () => import('./features/help/help.component').then(c => c.HelpComponent),
        canActivate: [authGuard]
    },
    {
        path: 'home',
        loadComponent: () => import('./features/home/home.component').then(m => m.default)
    },
    {
        path: '',
        redirectTo: 'home',
        pathMatch: 'full'
    },
    {
        path: '**',
        loadComponent: () => import('./core/not-found/not-found.component').then(c => c.NotFoundComponent)
    }
];