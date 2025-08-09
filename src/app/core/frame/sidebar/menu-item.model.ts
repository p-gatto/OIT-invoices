export interface MenuItem {
    icon: string;
    label: string;
    route: string;
    badge?: number;
    badgeType?: 'info' | 'warning' | 'urgent' | 'success';
    badgeTooltip?: string;
    children?: MenuItem[];
    isExternal?: boolean;
    disabled?: boolean;
    hidden?: boolean;
}

// Tipi per le statistiche della sidebar
export interface SidebarStats {
    pendingInvoices: number;
    overdueInvoices: number;
    totalCustomers: number;
    activeProducts: number;
    lastUpdate?: Date;
}

// Enum per i tipi di badge
export enum BadgeType {
    INFO = 'info',
    WARNING = 'warning',
    URGENT = 'urgent',
    SUCCESS = 'success'
}

// Interfaccia per la configurazione dei badge
export interface BadgeConfig {
    count: number;
    type: BadgeType;
    tooltip?: string;
    clickable?: boolean;
    animated?: boolean;
}

// Utility functions per i badge
export const BadgeUtils = {
    /**
     * Determina il tipo di badge in base al contesto e al conteggio
     */
    determineBadgeType(route: string, count: number, context?: any): BadgeType {
        if (count === 0) return BadgeType.INFO;

        switch (route) {
            case '/invoices':
                if (context?.overdueCount > 0) return BadgeType.URGENT;
                if (context?.pendingCount > 0) return BadgeType.WARNING;
                return BadgeType.INFO;

            case '/customers':
                return count > 100 ? BadgeType.SUCCESS : BadgeType.INFO;

            case '/products':
                return count > 50 ? BadgeType.SUCCESS : BadgeType.INFO;

            default:
                return BadgeType.INFO;
        }
    },

    /**
     * Formatta il numero per il badge (es. 999+ per numeri grandi)
     */
    formatBadgeNumber(count: number): string {
        if (count > 999) return '999+';
        if (count > 99) return '99+';
        return count.toString();
    },

    /**
     * Genera tooltip descrittivo per il badge
     */
    generateTooltip(route: string, count: number, context?: any): string {
        switch (route) {
            case '/invoices':
                if (context?.overdueCount > 0) {
                    return `${context.overdueCount} fattura/e scaduta/e`;
                }
                if (context?.pendingCount > 0) {
                    return `${context.pendingCount} fattura/e in attesa`;
                }
                return `${count} fatture totali`;

            case '/customers':
                return `${count} clienti attivi`;

            case '/products':
                return `${count} prodotti disponibili`;

            default:
                return `${count} elementi`;
        }
    }
};

// Factory per creare menu items con badge
export class MenuItemFactory {
    static createInvoicesMenuItem(stats: { pending: number; overdue: number; total: number }): MenuItem {
        const badgeCount = stats.overdue > 0 ? stats.overdue : stats.pending;
        const badgeType = stats.overdue > 0 ? BadgeType.URGENT : BadgeType.WARNING;

        return {
            icon: 'receipt_long',
            label: 'Fatture',
            route: '/invoices',
            badge: badgeCount > 0 ? badgeCount : undefined,
            badgeType: badgeCount > 0 ? badgeType : undefined,
            badgeTooltip: BadgeUtils.generateTooltip('/invoices', badgeCount, {
                overdueCount: stats.overdue,
                pendingCount: stats.pending
            })
        };
    }

    static createCustomersMenuItem(activeCount: number): MenuItem {
        return {
            icon: 'people',
            label: 'Clienti',
            route: '/customers',
            badge: activeCount > 0 ? activeCount : undefined,
            badgeType: BadgeUtils.determineBadgeType('/customers', activeCount),
            badgeTooltip: BadgeUtils.generateTooltip('/customers', activeCount)
        };
    }

    static createProductsMenuItem(activeCount: number): MenuItem {
        return {
            icon: 'inventory_2',
            label: 'Prodotti',
            route: '/products',
            badge: activeCount > 0 ? activeCount : undefined,
            badgeType: BadgeUtils.determineBadgeType('/products', activeCount),
            badgeTooltip: BadgeUtils.generateTooltip('/products', activeCount)
        };
    }

    static createDashboardMenuItem(): MenuItem {
        return {
            icon: 'dashboard',
            label: 'Dashboard',
            route: '/dashboard'
        };
    }

    static createReportsMenuItem(): MenuItem {
        return {
            icon: 'analytics',
            label: 'Statistiche',
            route: '/reports'
        };
    }
}

// Interfaccia per il servizio di notifiche della sidebar
export interface SidebarNotificationService {
    getBadgeCount(route: string): number;
    getBadgeType(route: string): BadgeType;
    getBadgeTooltip(route: string): string;
    refreshBadges(): void;
    subscribeToBadgeUpdates(callback: (route: string, count: number) => void): void;
}