import { Component, computed, inject, OnInit, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';

import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatRippleModule } from '@angular/material/core';
import { MatTooltipModule } from '@angular/material/tooltip';

import { MenuItem } from './menu-item.model';
import { InvoiceService } from '../../../features/invoices/invoice.service';
import { CustomerService } from '../../../features/customers/customer.service';
import { ProductService } from '../../../features/products/product.service';

@Component({
  selector: 'app-sidebar',
  imports: [
    CommonModule,
    RouterModule,
    MatListModule,
    MatIconModule,
    MatDividerModule,
    MatRippleModule,
    MatTooltipModule
  ],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss'
})
export class SidebarComponent implements OnInit {

  router = inject(Router);
  invoiceService = inject(InvoiceService);
  customerService = inject(CustomerService);
  productService = inject(ProductService);

  // Signal per le statistiche
  pendingInvoicesCount = signal(0);
  totalCustomersCount = signal(0);
  activeCustomersCount = signal(0);
  overdueInvoicesCount = signal(0);
  totalProductsCount = signal(0);
  activeProductsCount = signal(0);
  lowStockProductsCount = signal(0);

  // Computed per i menu items con badge dinamici
  menuItems = computed<MenuItem[]>(() => [
    {
      icon: 'dashboard',
      label: 'Dashboard',
      route: '/dashboard'
    },
    {
      icon: 'receipt_long',
      label: 'Fatture',
      route: '/invoices',
      badge: this.calculateInvoicesBadge() // Badge dinamico per fatture
    },
    {
      icon: 'people',
      label: 'Clienti',
      route: '/customers',
      badge: this.calculateCustomersBadge() // Badge dinamico per clienti
    },
    {
      icon: 'inventory_2',
      label: 'Prodotti',
      route: '/products',
      badge: this.calculateProductsBadge() // Badge dinamico per prodotti
    },
    {
      icon: 'analytics',
      label: 'Statistiche',
      route: '/reports'
    }
  ]);

  settingsItems = signal<MenuItem[]>([
    {
      icon: 'help',
      label: 'Aiuto',
      route: '/help'
    }
  ]);

  constructor() { }

  ngOnInit() {
    this.loadBadgeData();

    // Aggiorna i badge ogni 5 minuti
    setInterval(() => {
      this.loadBadgeData();
    }, 5 * 60 * 1000);
  }

  onMenuItemClick(item: MenuItem) {
    // Emetti l'evento per chiudere la sidebar su mobile
    // this.menuItemClick.emit(item);
  }

  /**
   * Carica i dati per i badge
   */
  private loadBadgeData() {
    // Carica statistiche fatture
    this.invoiceService.getInvoiceStats().subscribe({
      next: (stats) => {
        this.pendingInvoicesCount.set(stats.sent || 0);
        this.overdueInvoicesCount.set(stats.overdue || 0);
      },
      error: (error) => {
        console.error('Error loading invoice stats for sidebar:', error);
      }
    });

    // Carica conteggio clienti
    this.customerService.getCustomers().subscribe({
      next: (customers) => {
        const activeCustomers = customers.filter(c => c.is_active !== false);
        this.totalCustomersCount.set(customers.length);
        this.activeCustomersCount.set(activeCustomers.length);
      },
      error: (error) => {
        console.error('Error loading customers count for sidebar:', error);
      }
    });

    // Carica conteggio prodotti usando il nuovo metodo ottimizzato
    this.productService.getProductCountsForSidebar().subscribe({
      next: (stats) => {
        this.activeProductsCount.set(stats.active);
        this.totalProductsCount.set(stats.total);
        this.lowStockProductsCount.set(stats.lowStock);
      },
      error: (error) => {
        console.error('Error loading product counts for sidebar:', error);
      }
    });
  }

  /**
   * Calcola il badge per le fatture basato sulla priorità
   * Mostra prima le scadute, poi quelle in attesa
   */
  private calculateInvoicesBadge(): number | undefined {
    const overdue = this.overdueInvoicesCount();
    const pending = this.pendingInvoicesCount();

    // Priorità: fatture scadute > fatture in attesa > nessun badge
    if (overdue > 0) {
      return overdue;
    } else if (pending > 0) {
      return pending;
    }

    return undefined; // Nessun badge se non ci sono fatture in attesa
  }

  /**
   * Calcola il badge per i clienti
   * Mostra il numero di clienti attivi se > 0
   */
  private calculateCustomersBadge(): number | undefined {
    const activeCustomers = this.activeCustomersCount();
    return activeCustomers > 0 ? activeCustomers : undefined;
  }

  /**
   * Calcola il badge per i prodotti basato su diverse priorità
   * Priorità: prodotti a basso stock > prodotti attivi totali
   */
  private calculateProductsBadge(): number | undefined {
    const lowStock = this.lowStockProductsCount();
    const activeProducts = this.activeProductsCount();

    // Se ci sono prodotti a basso stock, mostra quelli (priorità)
    if (lowStock > 0) {
      return lowStock;
    }

    // Altrimenti mostra il numero di prodotti attivi se significativo
    if (activeProducts > 0) {
      return activeProducts;
    }

    return undefined;
  }

  /**
   * Ottiene la classe CSS per il badge in base al tipo di notifica
   */
  getBadgeClass(route: string): string {
    if (route === '/invoices') {
      const overdue = this.overdueInvoicesCount();
      if (overdue > 0) {
        return 'badge-urgent'; // Rosso per fatture scadute
      }
      return 'badge-warning'; // Arancione per fatture in attesa
    }

    if (route === '/products') {
      const lowStock = this.lowStockProductsCount();
      if (lowStock > 0) {
        return 'badge-warning'; // Arancione per prodotti a basso stock
      }
      return 'badge-success'; // Verde per prodotti in stock normale
    }

    if (route === '/customers') {
      const activeCustomers = this.activeCustomersCount();
      if (activeCustomers > 50) {
        return 'badge-success'; // Verde per molti clienti attivi
      }
      return 'badge-info'; // Blu per numero normale di clienti
    }

    return 'badge-info'; // Blu per altre notifiche
  }

  /**
   * Ottiene il tooltip per il badge
   */
  getBadgeTooltip(route: string): string {
    if (route === '/invoices') {
      const overdue = this.overdueInvoicesCount();
      const pending = this.pendingInvoicesCount();

      if (overdue > 0) {
        return `${overdue} fattura/e scaduta/e`;
      } else if (pending > 0) {
        return `${pending} fattura/e in attesa di pagamento`;
      }
    } else if (route === '/customers') {
      const activeCount = this.activeCustomersCount();
      const totalCount = this.totalCustomersCount();

      if (totalCount > activeCount) {
        return `${activeCount} clienti attivi (${totalCount} totali)`;
      }
      return `${activeCount} clienti attivi`;
    } else if (route === '/products') {
      const lowStock = this.lowStockProductsCount();
      const activeProducts = this.activeProductsCount();
      const totalProducts = this.totalProductsCount();

      if (lowStock > 0) {
        return `${lowStock} prodotti a basso stock`;
      } else if (totalProducts > activeProducts) {
        return `${activeProducts} prodotti attivi (${totalProducts} totali)`;
      }
      return `${activeProducts} prodotti disponibili`;
    }

    return '';
  }

  /**
   * Gestisce il click sui badge per navigazioni rapide
   */
  onBadgeClick(event: Event, route: string) {
    event.stopPropagation();

    if (route === '/invoices') {
      const overdue = this.overdueInvoicesCount();
      if (overdue > 0) {
        // Naviga alle fatture scadute
        this.router.navigate(['/invoices'], { queryParams: { status: 'overdue' } });
      } else {
        // Naviga alle fatture in attesa
        this.router.navigate(['/invoices'], { queryParams: { status: 'sent' } });
      }
    } else if (route === '/products') {
      const lowStock = this.lowStockProductsCount();
      if (lowStock > 0) {
        // In futuro potresti aggiungere un filtro per prodotti a basso stock
        // Per ora naviga ai prodotti normalmente
        this.router.navigate(['/products']);
      } else {
        // Navigazione normale ai prodotti
        this.router.navigate(['/products']);
      }
    } else if (route === '/customers') {
      // Naviga ai clienti attivi
      this.router.navigate(['/customers']);
    } else {
      // Navigazione normale
      this.router.navigate([route]);
    }
  }

  /**
   * Forza il refresh dei badge (utile per test o aggiornamenti manuali)
   */
  refreshBadges() {
    this.loadBadgeData();
  }
}