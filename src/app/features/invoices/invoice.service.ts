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
                const invoices = (data || []).map(invoice => ({
                    ...invoice,
                    items: invoice.items || []
                })) as Invoice[];
                this.invoicesSignal.set(invoices);
                return invoices;
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
                    items:invoice_items(
                        *,
                        product:products(*)
                    )
                `)
                .eq('id', id)
                .single()
        ).pipe(
            map(({ data, error }) => {
                if (error) {
                    if (error.code === 'PGRST116') return null;
                    throw error;
                }

                // Assicura che items sia sempre un array
                const invoice = {
                    ...data,
                    items: data.items || []
                } as Invoice;

                return invoice;
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
                    due_date: invoice.due_date || null,
                    subtotal: invoice.subtotal,
                    tax_amount: invoice.tax_amount,
                    total: invoice.total,
                    status: invoice.status,
                    notes: invoice.notes || null
                })
                .select()
                .single()
        ).pipe(
            switchMap(({ data: newInvoice, error: invoiceError }) => {
                if (invoiceError) throw invoiceError;

                // Inserisci anche gli items se presenti
                if (invoice.items && invoice.items.length > 0) {
                    const itemsToInsert = invoice.items.map(item => ({
                        invoice_id: newInvoice.id,
                        product_id: item.product_id || null, // Può essere null se è un item personalizzato
                        description: item.description,
                        quantity: item.quantity,
                        unit_price: item.unit_price,
                        tax_rate: item.tax_rate,
                        total: item.total
                    }));

                    return from(
                        this.supabase.client
                            .from('invoice_items')
                            .insert(itemsToInsert)
                            .select(`
                                *,
                                product:products(*)
                            `)
                    ).pipe(
                        map(({ data: insertedItems, error: itemsError }) => {
                            if (itemsError) throw itemsError;

                            this.loadInvoices(); // Ricarica tutte le fatture

                            return {
                                ...newInvoice,
                                items: insertedItems || []
                            } as Invoice;
                        })
                    );
                } else {
                    this.loadInvoices();
                    return of({
                        ...newInvoice,
                        items: []
                    } as Invoice);
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
                    due_date: invoice.due_date || null,
                    subtotal: invoice.subtotal,
                    tax_amount: invoice.tax_amount,
                    total: invoice.total,
                    status: invoice.status,
                    notes: invoice.notes || null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', invoice.id)
                .select()
                .single()
        ).pipe(
            switchMap(({ data: updatedInvoice, error: invoiceError }) => {
                if (invoiceError) throw invoiceError;

                // Prima elimina tutti gli items esistenti
                return from(
                    this.supabase.client
                        .from('invoice_items')
                        .delete()
                        .eq('invoice_id', invoice.id)
                ).pipe(
                    switchMap(() => {
                        // Poi inserisci i nuovi items se presenti
                        if (invoice.items && invoice.items.length > 0) {
                            const itemsToInsert = invoice.items.map(item => ({
                                invoice_id: updatedInvoice.id,
                                product_id: item.product_id || null,
                                description: item.description,
                                quantity: item.quantity,
                                unit_price: item.unit_price,
                                tax_rate: item.tax_rate,
                                total: item.total
                            }));

                            return from(
                                this.supabase.client
                                    .from('invoice_items')
                                    .insert(itemsToInsert)
                                    .select(`
                                        *,
                                        product:products(*)
                                    `)
                            ).pipe(
                                map(({ data: insertedItems, error: itemsError }) => {
                                    if (itemsError) throw itemsError;

                                    this.loadInvoices();

                                    return {
                                        ...updatedInvoice,
                                        items: insertedItems || []
                                    } as Invoice;
                                })
                            );
                        } else {
                            this.loadInvoices();
                            return of({
                                ...updatedInvoice,
                                items: []
                            } as Invoice);
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
                this.loadInvoices();
                return;
            }),
            catchError(error => {
                console.error(`Error deleting invoice with ID ${id}:`, error);
                throw error;
            })
        );
    }

    // Duplica una fattura esistente
    duplicateInvoice(sourceInvoiceId: string): Observable<Invoice> {
        return this.getInvoiceById(sourceInvoiceId).pipe(
            switchMap(sourceInvoice => {
                if (!sourceInvoice) {
                    throw new Error('Fattura sorgente non trovata');
                }

                const { id, created_at, updated_at, ...invoiceData } = sourceInvoice;

                const duplicatedInvoice: Omit<Invoice, 'id' | 'created_at'> = {
                    ...invoiceData,
                    invoice_number: this.generateInvoiceNumber(),
                    status: 'draft',
                    issue_date: new Date().toISOString().split('T')[0],
                    due_date: null,
                    items: sourceInvoice.items.map(({ id, invoice_id, ...item }) => ({
                        ...item,
                        product_id: item.product_id // Mantieni il riferimento al prodotto se presente
                    }))
                };

                return this.createInvoice(duplicatedInvoice);
            })
        );
    }

    // Cambia lo stato di una fattura
    updateInvoiceStatus(invoiceId: string, status: Invoice['status']): Observable<Invoice> {
        return from(
            this.supabase.client
                .from('invoices')
                .update({
                    status,
                    updated_at: new Date().toISOString()
                })
                .eq('id', invoiceId)
                .select(`
                    *,
                    customer:customers(*),
                    items:invoice_items(*)
                `)
                .single()
        ).pipe(
            map(({ data, error }) => {
                if (error) throw error;
                this.loadInvoices();
                return {
                    ...data,
                    items: data.items || []
                } as Invoice;
            }),
            catchError(error => {
                console.error('Error updating invoice status:', error);
                throw error;
            })
        );
    }

    // Ottieni fatture per cliente
    getInvoicesByCustomer(customerId: string): Observable<Invoice[]> {
        return from(
            this.supabase.client
                .from('invoices')
                .select(`
                    *,
                    customer:customers(*),
                    items:invoice_items(*)
                `)
                .eq('customer_id', customerId)
                .order('created_at', { ascending: false })
        ).pipe(
            map(({ data, error }) => {
                if (error) throw error;
                return (data || []).map(invoice => ({
                    ...invoice,
                    items: invoice.items || []
                })) as Invoice[];
            }),
            catchError(error => {
                console.error('Error loading invoices for customer:', error);
                return of([]);
            })
        );
    }

    // Ottieni statistiche fatture
    getInvoiceStats(): Observable<{
        total: number;
        draft: number;
        sent: number;
        paid: number;
        overdue: number;
        totalRevenue: number;
        pendingRevenue: number;
    }> {
        return this.getInvoices().pipe(
            map(invoices => {
                const today = new Date().toISOString().split('T')[0];

                return {
                    total: invoices.length,
                    draft: invoices.filter(inv => inv.status === 'draft').length,
                    sent: invoices.filter(inv => inv.status === 'sent').length,
                    paid: invoices.filter(inv => inv.status === 'paid').length,
                    overdue: invoices.filter(inv =>
                        inv.status === 'sent' &&
                        inv.due_date &&
                        inv.due_date < today
                    ).length,
                    totalRevenue: invoices
                        .filter(inv => inv.status === 'paid')
                        .reduce((sum, inv) => sum + inv.total, 0),
                    pendingRevenue: invoices
                        .filter(inv => inv.status === 'sent')
                        .reduce((sum, inv) => sum + inv.total, 0)
                };
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
                this.loadCustomers();
                return data;
            }),
            catchError(error => {
                console.error('Error creating customer:', error);
                throw error;
            })
        );
    }

    updateCustomer(customer: Customer): Observable<Customer> {
        const { id, created_at, ...updateData } = customer;

        return from(
            this.supabase.client
                .from('customers')
                .update({
                    ...updateData,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .select()
                .single()
        ).pipe(
            map(({ data, error }) => {
                if (error) throw error;
                this.loadCustomers();
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
                this.loadCustomers();
                return;
            }),
            catchError(error => {
                console.error(`Error deleting customer with ID ${id}:`, error);
                throw error;
            })
        );
    }

    // Ricerca clienti per autocomplete
    searchCustomers(searchTerm: string): Observable<Customer[]> {
        return from(
            this.supabase.client
                .from('customers')
                .select('*')
                .or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,vat_number.ilike.%${searchTerm}%`)
                .order('name')
                .limit(20)
        ).pipe(
            map(({ data, error }) => {
                if (error) throw error;
                return data || [];
            }),
            catchError(error => {
                console.error(`Error searching customers for "${searchTerm}":`, error);
                return of([]);
            })
        );
    }

    // Ottieni le fatture scadute
    getOverdueInvoices(): Observable<Invoice[]> {
        const today = new Date().toISOString().split('T')[0];

        return from(
            this.supabase.client
                .from('invoices')
                .select(`
                    *,
                    customer:customers(*),
                    items:invoice_items(*)
                `)
                .eq('status', 'sent')
                .lt('due_date', today)
                .not('due_date', 'is', null)
                .order('due_date', { ascending: true })
        ).pipe(
            map(({ data, error }) => {
                if (error) throw error;
                return (data || []).map(invoice => ({
                    ...invoice,
                    items: invoice.items || []
                })) as Invoice[];
            }),
            catchError(error => {
                console.error('Error loading overdue invoices:', error);
                return of([]);
            })
        );
    }

    // Ottieni fatture per periodo
    getInvoicesByDateRange(startDate: string, endDate: string): Observable<Invoice[]> {
        return from(
            this.supabase.client
                .from('invoices')
                .select(`
                    *,
                    customer:customers(*),
                    items:invoice_items(*)
                `)
                .gte('issue_date', startDate)
                .lte('issue_date', endDate)
                .order('issue_date', { ascending: false })
        ).pipe(
            map(({ data, error }) => {
                if (error) throw error;
                return (data || []).map(invoice => ({
                    ...invoice,
                    items: invoice.items || []
                })) as Invoice[];
            }),
            catchError(error => {
                console.error('Error loading invoices by date range:', error);
                return of([]);
            })
        );
    }

    // Aggiorna le date di scadenza automatiche
    updateDueDatesAutomatically(invoiceId: string, paymentTerms: number = 30): Observable<Invoice> {
        return this.getInvoiceById(invoiceId).pipe(
            switchMap(invoice => {
                if (!invoice) throw new Error('Fattura non trovata');

                const issueDate = new Date(invoice.issue_date);
                const dueDate = new Date(issueDate);
                dueDate.setDate(issueDate.getDate() + paymentTerms);

                return from(
                    this.supabase.client
                        .from('invoices')
                        .update({
                            due_date: dueDate.toISOString().split('T')[0],
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', invoiceId)
                        .select(`
                            *,
                            customer:customers(*),
                            items:invoice_items(*)
                        `)
                        .single()
                ).pipe(
                    map(({ data, error }) => {
                        if (error) throw error;
                        return {
                            ...data,
                            items: data.items || []
                        } as Invoice;
                    })
                );
            })
        );
    }

    // Metodi per report e statistiche avanzate
    getMonthlyRevenueReport(year: number): Observable<{ month: number; revenue: number; count: number }[]> {
        return from(
            this.supabase.client
                .from('invoices')
                .select('issue_date, total, status')
                .gte('issue_date', `${year}-01-01`)
                .lte('issue_date', `${year}-12-31`)
                .eq('status', 'paid')
        ).pipe(
            map(({ data, error }) => {
                if (error) throw error;

                const monthlyData = Array.from({ length: 12 }, (_, i) => ({
                    month: i + 1,
                    revenue: 0,
                    count: 0
                }));

                (data || []).forEach(invoice => {
                    const month = new Date(invoice.issue_date).getMonth();
                    monthlyData[month].revenue += invoice.total;
                    monthlyData[month].count += 1;
                });

                return monthlyData;
            }),
            catchError(error => {
                console.error('Error loading monthly revenue report:', error);
                return of([]);
            })
        );
    }

    // Ottieni i clienti più redditizi
    getTopCustomersByRevenue(limit: number = 10): Observable<{
        customer: Customer;
        totalRevenue: number;
        invoiceCount: number;
    }[]> {
        return from(
            this.supabase.client
                .from('invoices')
                .select(`
                    customer_id,
                    total,
                    customer:customers(*)
                `)
                .eq('status', 'paid')
        ).pipe(
            map(({ data, error }) => {
                if (error) throw error;

                const customerMap = new Map<string, {
                    customer: Customer;
                    totalRevenue: number;
                    invoiceCount: number;
                }>();

                (data || []).forEach((invoice: any) => {
                    // Gestisce il caso in cui customer può essere un array o un oggetto
                    const customerData = Array.isArray(invoice.customer) ? invoice.customer[0] : invoice.customer;

                    if (customerData && invoice.customer_id) {
                        const existing = customerMap.get(invoice.customer_id);

                        if (existing) {
                            // Aggiorna i valori esistenti
                            existing.totalRevenue += invoice.total || 0;
                            existing.invoiceCount += 1;
                        } else {
                            // Crea nuova entry
                            customerMap.set(invoice.customer_id, {
                                customer: customerData as Customer,
                                totalRevenue: invoice.total || 0,
                                invoiceCount: 1
                            });
                        }
                    }
                });

                return Array.from(customerMap.values())
                    .sort((a, b) => b.totalRevenue - a.totalRevenue)
                    .slice(0, limit);
            }),
            catchError(error => {
                console.error('Error loading top customers:', error);
                return of([]);
            })
        );
    }

    // Verifica numerazione fatture (per evitare duplicati)
    checkInvoiceNumberExists(invoiceNumber: string, excludeId?: string): Observable<boolean> {
        let query = this.supabase.client
            .from('invoices')
            .select('id', { count: 'exact', head: true })
            .eq('invoice_number', invoiceNumber);

        if (excludeId) {
            query = query.neq('id', excludeId);
        }

        return from(query).pipe(
            map(({ count, error }) => {
                if (error) throw error;
                return (count || 0) > 0;
            }),
            catchError(error => {
                console.error('Error checking invoice number:', error);
                return of(false);
            })
        );
    }

    // Backup e restore fatture
    exportInvoicesData(): Observable<{
        invoices: Invoice[];
        customers: Customer[];
        exportDate: string;
    }> {
        return this.getInvoices().pipe(
            switchMap(invoices => {
                return this.getCustomers().pipe(
                    map(customers => ({
                        invoices,
                        customers,
                        exportDate: new Date().toISOString()
                    }))
                );
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