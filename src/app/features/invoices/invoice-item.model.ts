import { Product } from "../products/product.model";

export interface InvoiceItem {
    id?: string;
    invoice_id?: string;
    product_id?: string | null; // Può essere null per items personalizzati
    product?: Product; // Dati del prodotto collegato (se presente)
    description: string;
    quantity: number;
    unit_price: number;
    tax_rate: number;
    total: number;
    unit?: string; // Unità di misura (pz, ore, kg, etc.)
    notes?: string; // Note specifiche per questa riga
    created_at?: string;
    updated_at?: string;
}

// Utility type per la creazione di nuovi items
export type CreateInvoiceItem = Omit<InvoiceItem, 'id' | 'invoice_id' | 'created_at' | 'updated_at'>;

// Type per items che derivano da prodotti
export interface ProductBasedInvoiceItem extends InvoiceItem {
    product_id: string;
    product: Product;
}

// Type per items personalizzati (senza prodotto collegato)
export interface CustomInvoiceItem extends InvoiceItem {
    product_id: null;
    product?: never;
}

// Type guard per verificare se un item è basato su prodotto
export function isProductBasedItem(item: InvoiceItem): item is ProductBasedInvoiceItem {
    return item.product_id !== null && item.product_id !== undefined;
}

// Type guard per verificare se un item è personalizzato
export function isCustomItem(item: InvoiceItem): item is CustomInvoiceItem {
    return item.product_id === null || item.product_id === undefined;
}

// Utility functions per il calcolo dei totali
export function calculateItemSubtotal(item: InvoiceItem): number {
    return item.quantity * item.unit_price;
}

export function calculateItemTax(item: InvoiceItem): number {
    const subtotal = calculateItemSubtotal(item);
    return subtotal * (item.tax_rate / 100);
}

export function calculateItemTotal(item: InvoiceItem): number {
    return calculateItemSubtotal(item) + calculateItemTax(item);
}

// Factory function per creare un item da un prodotto
export function createItemFromProduct(product: Product, quantity: number = 1): CreateInvoiceItem {
    const subtotal = quantity * product.unit_price;
    const tax = subtotal * (product.tax_rate / 100);

    return {
        product_id: product.id,
        description: product.name + (product.description ? ` - ${product.description}` : ''),
        quantity,
        unit_price: product.unit_price,
        tax_rate: product.tax_rate,
        total: subtotal + tax,
        unit: product.unit
    };
}

// Factory function per creare un item personalizzato
export function createCustomItem(
    description: string,
    quantity: number,
    unitPrice: number,
    taxRate: number = 22,
    unit: string = 'pz'
): CreateInvoiceItem {
    const subtotal = quantity * unitPrice;
    const tax = subtotal * (taxRate / 100);

    return {
        product_id: null,
        description,
        quantity,
        unit_price: unitPrice,
        tax_rate: taxRate,
        total: subtotal + tax,
        unit
    };
}

// Validation functions
export function validateInvoiceItem(item: InvoiceItem): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!item.description || item.description.trim().length === 0) {
        errors.push('La descrizione è obbligatoria');
    }

    if (!item.quantity || item.quantity <= 0) {
        errors.push('La quantità deve essere maggiore di 0');
    }

    if (item.unit_price === undefined || item.unit_price < 0) {
        errors.push('Il prezzo unitario deve essere maggiore o uguale a 0');
    }

    if (item.tax_rate === undefined || item.tax_rate < 0 || item.tax_rate > 100) {
        errors.push('L\'aliquota IVA deve essere compresa tra 0 e 100');
    }

    // Verifica che il totale calcolato corrisponda a quello salvato (con tolleranza per arrotondamenti)
    const calculatedTotal = calculateItemTotal(item);
    const tolerance = 0.01; // 1 centesimo di tolleranza
    if (Math.abs(calculatedTotal - item.total) > tolerance) {
        errors.push('Il totale dell\'item non corrisponde al calcolo');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

// Utility per formattare la visualizzazione di un item
export function formatItemDisplay(item: InvoiceItem): {
    displayName: string;
    priceDisplay: string;
    quantityDisplay: string;
    totalDisplay: string;
    taxDisplay: string;
} {
    return {
        displayName: item.description,
        priceDisplay: `€${item.unit_price.toFixed(2)}`,
        quantityDisplay: `${item.quantity} ${item.unit || 'pz'}`,
        totalDisplay: `€${item.total.toFixed(2)}`,
        taxDisplay: `${item.tax_rate}%`
    };
}

// Costanti per le unità di misura comuni
export const COMMON_UNITS = [
    { value: 'pz', label: 'Pezzo/i', abbreviation: 'pz' },
    { value: 'ore', label: 'Ore', abbreviation: 'h' },
    { value: 'giorni', label: 'Giorni', abbreviation: 'gg' },
    { value: 'mesi', label: 'Mesi', abbreviation: 'mesi' },
    { value: 'kg', label: 'Chilogrammi', abbreviation: 'kg' },
    { value: 'm', label: 'Metri', abbreviation: 'm' },
    { value: 'mq', label: 'Metro quadro', abbreviation: 'mq' },
    { value: 'mc', label: 'Metro cubo', abbreviation: 'mc' },
    { value: 'lt', label: 'Litri', abbreviation: 'lt' }
] as const;

// Type per le unità di misura
export type UnitType = typeof COMMON_UNITS[number]['value'];

// Costanti per le aliquote IVA comuni
export const COMMON_TAX_RATES = [
    { value: 0, label: '0% - Esente' },
    { value: 4, label: '4% - Ridotta' },
    { value: 10, label: '10% - Ridotta' },
    { value: 22, label: '22% - Ordinaria' }
] as const;

export type TaxRate = typeof COMMON_TAX_RATES[number]['value'];