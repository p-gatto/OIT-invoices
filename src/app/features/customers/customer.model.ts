export interface Customer {
    id?: string;
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    tax_code?: string;
    vat_number?: string;
    notes?: string;
    is_active?: boolean; // Per soft delete
    deactivation_reason?: string; // Motivo disattivazione
    deactivated_at?: string; // Data disattivazione
    created_at?: string;
    updated_at?: string;
}

// Tipi di utilità per la gestione dell'eliminazione
export type CustomerDeleteType = 'soft' | 'hard';

export interface CustomerDeleteOperation {
    customerId: string;
    customerName: string;
    type: CustomerDeleteType;
    hasInvoices: boolean;
    invoiceCount: number;
    reason?: string;
    timestamp: string;
}

// Type guards per verificare lo stato del cliente
export function isActiveCustomer(customer: Customer): boolean {
    return customer.is_active !== false;
}

export function isInactiveCustomer(customer: Customer): boolean {
    return customer.is_active === false;
}

export function canBeHardDeleted(customer: Customer, hasInvoices: boolean): boolean {
    return !hasInvoices;
}

// Interfaccia per le opzioni di filtro
export interface CustomerFilterOptions {
    includeInactive?: boolean;
    onlyActive?: boolean;
    onlyInactive?: boolean;
}