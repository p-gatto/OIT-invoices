import { Injectable, signal } from '@angular/core';

import { Observable, from, map, catchError, of } from 'rxjs';

import { SupabaseService } from '../../../app/core/database/supabase.service';

import { Customer } from './customer.model';
import { Invoice } from './invoice.model';
import { InvoiceItem } from './invoice-item.model';

@Injectable({
    providedIn: 'root'
})
export class InvoiceService {

    private invoicesSignal = signal<Invoice[]>([]);
    private customersSignal = signal<Customer[]>([]);

    invoices = this.invoicesSignal.asReadonly();
    customers = this.customersSignal.asReadonly();

    constructor(private supabase: SupabaseService) {
        this.loadInvoices();
        this.loadCustomers();
    }

    // CRUD Operazioni per Fatture
    getInvoices(): Observable<Invoice[]> {
        return from(
            this.supabase.client
                .from('invoices')
                .select(`
          *,
          customer:customers(*),
          items:invoice_items(*)
        `)
                .order('created_at', { ascending: false })
        ).pipe(
            map(({ data, error }) => {
                if (error) throw error;
                this.invoicesSignal.set(data || []);
                return data || [];
            }),
            catchError(error => {
                console.error('Error loading invoices:', error);
                return of([]);
            })
        );
    }

    createInvoice(invoice: Omit<Invoice, 'id'>): Observable<Invoice> {
        return from(
            this.supabase.client
                .from('invoices')
                .insert({
                    invoice_number: invoice.invoice_number,
                    customer_id: invoice.customer_id,
                    issue_date: invoice.issue_date,
                    due_date: invoice.due_date,
                    subtotal: invoice.subtotal,
                    tax_amount: invoice.tax_amount,
                    total: invoice.total,
                    status: invoice.status,
                    notes: invoice.notes
                })
                .select()
                .single()
        ).pipe(
            map(({ data, error }) => {
                if (error) throw error;
                // Inserisci anche gli items
                this.insertInvoiceItems(data.id, invoice.items);
                this.loadInvoices();
                return data;
            })
        );
    }

    private async insertInvoiceItems(invoiceId: string, items: InvoiceItem[]) {
        const itemsToInsert = items.map(item => ({
            invoice_id: invoiceId,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            tax_rate: item.tax_rate,
            total: item.total
        }));

        await this.supabase.client
            .from('invoice_items')
            .insert(itemsToInsert);
    }

    // CRUD Operazioni per Clienti
    getCustomers(): Observable<Customer[]> {
        return from(
            this.supabase.client
                .from('customers')
                .select('*')
                .order('name')
        ).pipe(
            map(({ data, error }) => {
                if (error) throw error;
                this.customersSignal.set(data || []);
                return data || [];
            })
        );
    }

    createCustomer(customer: Omit<Customer, 'id'>): Observable<Customer> {
        return from(
            this.supabase.client
                .from('customers')
                .insert(customer)
                .select()
                .single()
        ).pipe(
            map(({ data, error }) => {
                if (error) throw error;
                this.loadCustomers();
                return data;
            })
        );
    }

    private loadInvoices() {
        this.getInvoices().subscribe();
    }

    private loadCustomers() {
        this.getCustomers().subscribe();
    }

    generateInvoiceNumber(): string {
        const year = new Date().getFullYear();
        const timestamp = Date.now();
        return `INV-${year}-${timestamp.toString().slice(-6)}`;
    }
}