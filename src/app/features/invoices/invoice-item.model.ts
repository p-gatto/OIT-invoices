export interface InvoiceItem {
    id?: string;
    invoice_id?: string;
    description: string;
    quantity: number;
    unit_price: number;
    tax_rate: number;
    total: number;
}