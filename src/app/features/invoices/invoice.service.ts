import { inject, Injectable, signal } from '@angular/core';

import { Observable, from, map, catchError, of, switchMap } from 'rxjs';

import { SupabaseService } from '../../../app/core/database/supabase.service';

import { Customer } from '../customers/customer.model';
import { Invoice } from './invoice.model';

@Injectable({
    providedIn: 'root'
})
export class InvoiceService {

    supabase = inject(SupabaseService);

    private invoicesSignal = signal<Invoice[]>([]);
    private customersSignal = signal<Customer[]>([]);

    invoices = this.invoicesSignal.asReadonly();
    customers = this.customersSignal.asReadonly();

    constructor() {
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

    getInvoiceById(id: string): Observable<Invoice | null> {
        return from(
            this.supabase.client
                .from('invoices')
                .select(`
                *,
                customer:customers(*),
                items:invoice_items(*)
            `)
                .eq('id', id)
                .single()
        ).pipe(
            map(({ data, error }) => {
                if (error) {
                    if (error.code === 'PGRST116') { // No rows found
                        return null;
                    }
                    throw error;
                }
                return data as Invoice;
            }),
            catchError(error => {
                console.error(`Error loading invoice with ID ${id}:`, error);
                return of(null);
            })
        );
    }

    createInvoice(invoice: Omit<Invoice, 'id' | 'created_at'>): Observable<Invoice> {
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
            switchMap(({ data: newInvoice, error: invoiceError }) => {
                if (invoiceError) throw invoiceError;

                // Inserisci anche gli items
                if (invoice.items && invoice.items.length > 0) {
                    const itemsToInsert = invoice.items.map(item => ({
                        invoice_id: newInvoice.id,
                        description: item.description,
                        quantity: item.quantity,
                        unit_price: item.unit_price,
                        tax_rate: item.tax_rate,
                        total: item.total
                    }));
                    return from(this.supabase.client.from('invoice_items').insert(itemsToInsert)).pipe(
                        map(() => {
                            this.loadInvoices(); // Ricarica tutte le fatture dopo l'inserimento
                            return { ...newInvoice, items: invoice.items } as Invoice;
                        })
                    );
                } else {
                    this.loadInvoices();
                    return of({ ...newInvoice, items: [] } as Invoice);
                }
            }),
            catchError(error => {
                console.error('Error creating invoice:', error);
                throw error;
            })
        );
    }

    updateInvoice(invoice: Invoice): Observable<Invoice> {
        return from(
            this.supabase.client
                .from('invoices')
                .update({
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
                .eq('id', invoice.id)
                .select()
                .single()
        ).pipe(
            switchMap(({ data: updatedInvoice, error: invoiceError }) => {
                if (invoiceError) throw invoiceError;

                // Gestisci gli elementi della fattura: elimina i vecchi e inserisci i nuovi
                return from(this.supabase.client.from('invoice_items').delete().eq('invoice_id', invoice.id)).pipe(
                    switchMap(() => {
                        if (invoice.items && invoice.items.length > 0) {
                            const itemsToInsert = invoice.items.map(item => ({
                                invoice_id: updatedInvoice.id,
                                description: item.description,
                                quantity: item.quantity,
                                unit_price: item.unit_price,
                                tax_rate: item.tax_rate,
                                total: item.total
                            }));
                            return from(this.supabase.client.from('invoice_items').insert(itemsToInsert)).pipe(
                                map(() => {
                                    this.loadInvoices(); // Ricarica tutte le fatture dopo l'aggiornamento
                                    return { ...updatedInvoice, items: invoice.items } as Invoice;
                                })
                            );
                        } else {
                            this.loadInvoices();
                            return of({ ...updatedInvoice, items: [] } as Invoice);
                        }
                    })
                );
            }),
            catchError(error => {
                console.error('Error updating invoice:', error);
                throw error;
            })
        );
    }

    deleteInvoice(id: string): Observable<void> {
        return from(
            this.supabase.client
                .from('invoices')
                .delete()
                .eq('id', id)
        ).pipe(
            map(({ error }) => {
                if (error) throw error;
                this.loadInvoices(); // Ricarica tutte le fatture dopo l'eliminazione
                return;
            }),
            catchError(error => {
                console.error(`Error deleting invoice with ID ${id}:`, error);
                throw error;
            })
        );
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
            }),
            catchError(error => {
                console.error('Error loading customers:', error);
                return of([]);
            })
        );
    }

    createCustomer(customer: Omit<Customer, 'id' | 'created_at'>): Observable<Customer> {
        return from(
            this.supabase.client
                .from('customers')
                .insert(customer)
                .select()
                .single()
        ).pipe(
            map(({ data, error }) => {
                if (error) throw error;
                this.loadCustomers(); // Ricarica tutti i clienti dopo l'inserimento
                return data;
            }),
            catchError(error => {
                console.error('Error creating customer:', error);
                throw error;
            })
        );
    }

    updateCustomer(customer: Customer): Observable<Customer> {
        return from(
            this.supabase.client
                .from('customers')
                .update(customer)
                .eq('id', customer.id)
                .select()
                .single()
        ).pipe(
            map(({ data, error }) => {
                if (error) throw error;
                this.loadCustomers(); // Ricarica tutti i clienti dopo l'aggiornamento
                return data;
            }),
            catchError(error => {
                console.error('Error updating customer:', error);
                throw error;
            })
        );
    }

    deleteCustomer(id: string): Observable<void> {
        return from(
            this.supabase.client
                .from('customers')
                .delete()
                .eq('id', id)
        ).pipe(
            map(({ error }) => {
                if (error) throw error;
                this.loadCustomers(); // Ricarica tutti i clienti dopo l'eliminazione
                return;
            }),
            catchError(error => {
                console.error(`Error deleting customer with ID ${id}:`, error);
                throw error;
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