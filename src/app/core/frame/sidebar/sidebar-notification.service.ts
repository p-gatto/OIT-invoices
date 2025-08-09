import { Injectable, inject, signal, computed } from '@angular/core';
import { Observable, combineLatest, timer, startWith, switchMap, map } from 'rxjs';

import { InvoiceService } from '../../../features/invoices/invoice.service';
import { CustomerService } from '../../../features/customers/customer.service';
import { ProductService } from '../../../features/products/product.service';

export interface SidebarBadgeData {
    route: string;
    count: number;
    type: 'info' | 'warning' | 'urgent' | 'success';
    tooltip: string;
    priority: number; // 1 = highest priority
}

@Injectable({
    providedIn: 'root'
})
export class SidebarNotificationService {

    private invoiceService = inject(InvoiceService);
    private customerService = inject(CustomerService);
    private productService = inject(ProductService);

    // Signal per i conteggi delle notifiche
    private invoiceNotifications = signal<SidebarBadgeData | null>(null);
    private customerNotifications = signal<SidebarBadgeData | null>(null);
    private productNotifications = signal<SidebarBadgeData | null>(null);

    // Computed per tutte le notifiche ordinate per priorità
    allNotifications = computed(() => {
        const notifications = [
            this.invoiceNotifications(),
            this.customerNotifications(),
            this.productNotifications()
        ].filter(Boolean) as SidebarBadgeData[];

        return notifications.sort((a, b) => a.priority - b.priority);
    });

    // Computed per le notifiche urgenti
    urgentNotifications = computed(() => {
        return this.allNotifications().filter(n => n.type === 'urgent');
    });

    // Computed per il conteggio totale delle notifiche
    totalNotificationsCount = computed(() => {
        return this.allNotifications().reduce((sum, n) => sum + n.count, 0);
    });

    constructor() {
        this.startPeriodicUpdates();
    }

    /**
     * Avvia aggiornamenti periodici ogni 5 minuti
     */
    private startPeriodicUpdates() {
        timer(0, 5 * 60 * 1000).pipe(
            switchMap(() => this.refreshAllNotifications())
        ).subscribe();
    }

    /**
     * Aggiorna tutte le notifiche
     */
    refreshAllNotifications(): Observable<void> {
        return combineLatest([
            this.updateInvoiceNotifications(),
            this.updateCustomerNotifications(),
            this.updateProductNotifications()
        ]).pipe(
            map(() => void 0)
        );
    }

    /**
     * Aggiorna le notifiche delle fatture
     */
    private updateInvoiceNotifications(): Observable<void> {
        return this.invoiceService.getInvoiceStats().pipe(
            map(stats => {
                let notification: SidebarBadgeData | null = null;

                if (stats.overdue > 0) {
                    notification = {
                        route: '/invoices',
                        count: stats.overdue,
                        type: 'urgent',
                        tooltip: `${stats.overdue} fattura/e scaduta/e`,
                        priority: 1 // Massima priorità
                    };
                } else if (stats.sent > 0) {
                    notification = {
                        route: '/invoices',
                        count: stats.sent,
                        type: 'warning',
                        tooltip: `${stats.sent} fattura/e in attesa di pagamento`,
                        priority: 2
                    };
                }

                this.invoiceNotifications.set(notification);
                return void 0;
            })
        );
    }

    /**
     * Aggiorna le notifiche dei clienti
     */
    private updateCustomerNotifications(): Observable<void> {
        return this.customerService.getCustomers().pipe(
            map(customers => {
                const activeCustomers = customers.filter(c => c.is_active !== false);
                let notification: SidebarBadgeData | null = null;

                if (activeCustomers.length > 0) {
                    const type = activeCustomers.length > 50 ? 'success' : 'info';
                    const tooltip = customers.length > activeCustomers.length
                        ? `${activeCustomers.length} clienti attivi (${customers.length} totali)`
                        : `${activeCustomers.length} clienti attivi`;

                    notification = {
                        route: '/customers',
                        count: activeCustomers.length,
                        type,
                        tooltip,
                        priority: 4
                    };
                }

                this.customerNotifications.set(notification);
                return void 0;
            })
        );
    }

    /**
     * Aggiorna le notifiche dei prodotti
     */
    private updateProductNotifications(): Observable<void> {
        return this.productService.getProductCountsForSidebar().pipe(
            map(stats => {
                let notification: SidebarBadgeData | null = null;

                if (stats.lowStock > 0) {
                    notification = {
                        route: '/products',
                        count: stats.lowStock,
                        type: 'warning',
                        tooltip: `${stats.lowStock} prodotti a basso stock`,
                        priority: 3
                    };
                } else if (stats.active > 0) {
                    const type = stats.active > 50 ? 'success' : 'info';
                    const tooltip = stats.total > stats.active
                        ? `${stats.active} prodotti attivi (${stats.total} totali)`
                        : `${stats.active} prodotti disponibili`;

                    notification = {
                        route: '/products',
                        count: stats.active,
                        type,
                        tooltip,
                        priority: 5
                    };
                }

                this.productNotifications.set(notification);
                return void 0;
            })
        );
    }

    /**
     * Ottieni notifica per una specifica route
     */
    getNotificationForRoute(route: string): SidebarBadgeData | null {
        return this.allNotifications().find(n => n.route === route) || null;
    }

    /**
     * Verifica se ci sono notifiche urgenti
     */
    hasUrgentNotifications(): boolean {
        return this.urgentNotifications().length > 0;
    }

    /**
     * Ottieni il badge count per una route specifica
     */
    getBadgeCount(route: string): number {
        const notification = this.getNotificationForRoute(route);
        return notification?.count || 0;
    }

    /**
     * Ottieni il tipo di badge per una route specifica
     */
    getBadgeType(route: string): 'info' | 'warning' | 'urgent' | 'success' {
        const notification = this.getNotificationForRoute(route);
        return notification?.type || 'info';
    }

    /**
     * Ottieni il tooltip per una route specifica
     */
    getBadgeTooltip(route: string): string {
        const notification = this.getNotificationForRoute(route);
        return notification?.tooltip || '';
    }

    /**
     * Forza un refresh immediato
     */
    forceRefresh(): Observable<void> {
        return this.refreshAllNotifications();
    }

    /**
     * Sottoscrivi a cambiamenti delle notifiche per una route specifica
     */
    /* subscribeToRouteNotifications(route: string, callback: (notification: SidebarBadgeData | null) => void) {
        // Implementa la logica di sottoscrizione basata sulla route
        switch (route) {
            case '/invoices':
                return this.invoiceNotifications.subscribe(callback);
            case '/customers':
                return this.customerNotifications.subscribe(callback);
            case '/products':
                return this.productNotifications.subscribe(callback);
            default:
                callback(null);
        }
    } */

    /**
     * Statistiche generali per debug/monitoraggio
     */
    getStats() {
        return {
            totalNotifications: this.totalNotificationsCount(),
            urgentCount: this.urgentNotifications().length,
            lastUpdate: new Date(),
            notifications: this.allNotifications()
        };
    }
}