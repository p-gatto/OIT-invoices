import { Customer } from "../customers/customer.model";
import { InvoiceItem } from "./invoice-item.model";

export interface Invoice {
    id?: string;
    invoice_number: string;
    customer_id: string;
    customer?: Customer;
    issue_date: string;
    due_date?: string;
    subtotal: number;
    tax_amount: number;
    total: number;
    status: 'draft' | 'sent' | 'paid' | 'overdue';
    notes?: string;
    items: InvoiceItem[];
    created_at?: string;
    updated_at?: string;
}