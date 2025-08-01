import { Component, inject, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';

import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatRippleModule } from '@angular/material/core';
import { MenuItem } from './menu-item.model';

@Component({
  selector: 'app-sidebar',
  imports: [
    CommonModule,
    RouterModule,
    MatListModule,
    MatIconModule,
    MatDividerModule,
    MatRippleModule
  ],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss'
})
export class SidebarComponent {

  router = inject(Router);

  menuItemClick = output<MenuItem>();

  menuItems = signal<MenuItem[]>([
    {
      icon: 'dashboard',
      label: 'Dashboard',
      route: '/dashboard'
    },
    {
      icon: 'receipt_long',
      label: 'Fatture',
      route: '/invoices',
      badge: 5
    },
    {
      icon: 'people',
      label: 'Clienti',
      route: '/customers'
    },
    {
      icon: 'inventory_2',
      label: 'Prodotti',
      route: '/products'
    },
    {
      icon: 'analytics',
      label: 'Statistiche',
      route: '/reports'
    }
  ]);

  settingsItems = signal<MenuItem[]>([
    {
      icon: 'settings',
      label: 'Impostazioni',
      route: '/settings'
    },
    {
      icon: 'help',
      label: 'Aiuto',
      route: '/help'
    }
  ]);

  constructor() { }

  onMenuItemClick(item: MenuItem) {
    this.menuItemClick.emit(item);
  }

}