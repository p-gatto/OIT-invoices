import { inject, Injectable, signal } from '@angular/core';

import { Observable, from, map, catchError, of, switchMap, forkJoin } from 'rxjs';

import { SupabaseService } from '../../../app/core/database/supabase.service';

import { Customer } from '../customers/customer.model';
import { Invoice } from './invoice.model';
import { NotificationService } from '../../shared/services/notification.service';
import { UtilityService } from '../../shared/services/utility.service';

@Injectable({
    providedIn: 'root'
})
export class InvoiceService {

    supabase = inject(SupabaseService);
    notificationService = inject(NotificationService);
    utilityService = inject(UtilityService);

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
                customers!invoices_customer_id_fkey(
                    id,
                    name,
                    email,
                    phone,
                    address,
                    tax_code,
                    vat_number
                )
            `)
                .order('created_at', { ascending: false })
        ).pipe(
            switchMap(({ data: invoicesData, error: invoicesError }) => {
                if (invoicesError) throw invoicesError;

                console.log('🔍 Service - Raw invoices from DB:', invoicesData?.length || 0);

                // Per ogni fattura, carica gli items separatamente
                const invoicesWithItems$ = (invoicesData || []).map(invoice =>
                    from(
                        this.supabase.client
                            .from('invoice_items')
                            .select(`
                            *,
                            products(
                                id,
                                name,
                                description,
                                category,
                                unit
                            )
                        `)
                            .eq('invoice_id', invoice.id)
                            .order('created_at')
                    ).pipe(
                        map(({ data: itemsData, error: itemsError }) => {
                            if (itemsError) {
                                console.error(`Error loading items for invoice ${invoice.id}:`, itemsError);
                                return this.normalizeInvoiceData({ ...invoice, customer: invoice.customers, items: [] });
                            }

                            const normalizedInvoice = this.normalizeInvoiceData({
                                ...invoice,
                                customer: invoice.customers,
                                items: itemsData || []
                            });

                            console.log(`📋 Invoice ${normalizedInvoice.invoice_number}:`, {
                                subtotal: normalizedInvoice.subtotal,
                                tax_amount: normalizedInvoice.tax_amount,
                                total: normalizedInvoice.total,
                                status: normalizedInvoice.status
                            });

                            return normalizedInvoice as Invoice;
                        })
                    )
                );

                // Se non ci sono fatture, restituisci array vuoto
                if (invoicesWithItems$.length === 0) {
                    return of([]);
                }

                return forkJoin(invoicesWithItems$);
            }),
            map((invoices: Invoice[]) => {
                console.log('✅ Service - Processed invoices:', invoices.length);

                // Calcola totali di debug
                const totalRevenue = invoices.reduce((sum, inv) => sum + (Number(inv.total) || 0), 0);
                console.log('💰 Service - Total revenue calculated:', totalRevenue);

                this.invoicesSignal.set(invoices);
                return invoices;
            }),
            catchError(error => {
                console.error('Error loading invoices:', error);
                this.notificationService.loadError('fatture', error);
                return of([]);
            })
        );
    }

    // 🔧 Metodo helper per normalizzare i dati delle fatture
    private normalizeInvoiceData(invoice: any): Invoice {
        return {
            ...invoice,
            // Assicura che i totali siano sempre numeri
            subtotal: this.ensureNumber(invoice.subtotal),
            tax_amount: this.ensureNumber(invoice.tax_amount),
            total: this.ensureNumber(invoice.total),

            // Normalizza gli items
            items: (invoice.items || []).map((item: any) => ({
                ...item,
                quantity: this.ensureNumber(item.quantity),
                unit_price: this.ensureNumber(item.unit_price),
                tax_rate: this.ensureNumber(item.tax_rate),
                total: this.ensureNumber(item.total)
            }))
        };
    }

    // 🔧 Metodo helper per assicurare conversione numerica
    private ensureNumber(value: any): number {
        if (typeof value === 'number') return value;
        if (typeof value === 'string') {
            const parsed = parseFloat(value);
            return isNaN(parsed) ? 0 : parsed;
        }
        return 0;
    }

    // 🔧 Metodo migliorato per le statistiche dashboard
    getInvoiceStats(): Observable<{
        total: number;
        draft: number;
        sent: number;
        paid: number;
        overdue: number;
        totalRevenue: number;
        pendingRevenue: number;
        thisMonthRevenue: number;
    }> {
        return this.getInvoices().pipe(
            map(invoices => {
                console.group('📊 InvoiceService - Calcolo statistiche');

                const today = new Date();
                const currentMonth = today.getMonth();
                const currentYear = today.getFullYear();

                // Conta fatture per status
                const statusCounts = {
                    draft: 0,
                    sent: 0,
                    paid: 0,
                    overdue: 0
                };

                // Calcola revenues
                let totalRevenue = 0;
                let pendingRevenue = 0;
                let thisMonthRevenue = 0;

                // Identifica fatture scadute e calcola totali
                const processedInvoices = invoices.map(inv => {
                    const total = this.ensureNumber(inv.total);

                    // Determina se è scaduta
                    let finalStatus = inv.status;
                    if (inv.status === 'sent' && inv.due_date) {
                        const dueDate = new Date(inv.due_date);
                        const todayReset = new Date();
                        todayReset.setHours(0, 0, 0, 0);
                        dueDate.setHours(0, 0, 0, 0);

                        if (dueDate < todayReset) {
                            finalStatus = 'overdue';
                        }
                    }

                    // Conta per status
                    if (finalStatus in statusCounts) {
                        statusCounts[finalStatus as keyof typeof statusCounts]++;
                    }

                    // Calcola revenue totale (pagate + inviate)
                    if (['paid', 'sent'].includes(finalStatus)) {
                        totalRevenue += total;
                    }

                    // Calcola revenue in attesa (solo inviate, non scadute)
                    if (finalStatus === 'sent') {
                        pendingRevenue += total;
                    }

                    // Calcola revenue del mese corrente
                    const invoiceDate = new Date(inv.issue_date);
                    if (['paid', 'sent'].includes(finalStatus) &&
                        invoiceDate.getMonth() === currentMonth &&
                        invoiceDate.getFullYear() === currentYear) {
                        thisMonthRevenue += total;
                    }

                    console.log(`${inv.invoice_number}: ${finalStatus}, €${total}`);
                    return { ...inv, finalStatus, total };
                });

                const stats = {
                    total: invoices.length,
                    draft: statusCounts.draft,
                    sent: statusCounts.sent,
                    paid: statusCounts.paid,
                    overdue: statusCounts.overdue,
                    totalRevenue: Math.round(totalRevenue * 100) / 100,
                    pendingRevenue: Math.round(pendingRevenue * 100) / 100,
                    thisMonthRevenue: Math.round(thisMonthRevenue * 100) / 100
                };

                console.log('📊 Final stats:', stats);
                console.groupEnd();

                return stats;
            })
        );
    }

    // 🔧 Metodo di debug per verificare i dati
    /* debugInvoiceData(): void {
        this.getInvoices().pipe(take(1)).subscribe(invoices=> {
            console.group('🐛 DEBUG Invoice Data');

            console.log(`Total invoices loaded: ${invoices.length}`);

            invoices.forEach((invoice, index) => {
                console.log(`Invoice ${index + 1}:`, {
                    number: invoice.invoice_number,
                    status: invoice.status,
                    subtotal: invoice.subtotal,
                    tax_amount: invoice.tax_amount,
                    total: invoice.total,
                    items_count: invoice.items?.length || 0,
                    customer: invoice.customer?.name || 'No customer'
                });
            });

            const totalSum = invoices.reduce((sum, inv) => sum + (Number(inv.total) || 0), 0);
            console.log(`Total revenue sum: €${totalSum}`);

            console.groupEnd();
        });
    } */

    getInvoiceById(id: string): Observable<Invoice | null> {
        return from(
            this.supabase.client
                .from('invoices')
                .select(`
                    *,
                    customers!invoices_customer_id_fkey(
                        id,
                        name,
                        email,
                        phone,
                        address,
                        tax_code,
                        vat_number
                    )
                `)
                .eq('id', id)
                .single()
        ).pipe(
            switchMap(({ data: invoiceData, error: invoiceError }) => {
                if (invoiceError) {
                    if (invoiceError.code === 'PGRST116') return of(null);
                    throw invoiceError;
                }

                // Carica gli items della fattura
                return from(
                    this.supabase.client
                        .from('invoice_items')
                        .select(`
                            *,
                            products(
                                id,
                                name,
                                description,
                                category,
                                unit
                            )
                        `)
                        .eq('invoice_id', id)
                        .order('created_at')
                ).pipe(
                    map(({ data: itemsData, error: itemsError }) => {
                        if (itemsError) {
                            console.error(`Error loading items for invoice ${id}:`, itemsError);
                        }

                        return {
                            ...invoiceData,
                            customer: invoiceData.customers,
                            items: itemsData || []
                        } as Invoice;
                    })
                );
            }),
            catchError(error => {
                console.error(`Error loading invoice with ID ${id}:`, error);
                return of(null);
            })
        );
    }

    createInvoice(invoice: Omit<Invoice, 'id' | 'created_at'>): Observable<Invoice> {
        const invoiceToInsert = {
            invoice_number: invoice.invoice_number,
            customer_id: invoice.customer_id,
            issue_date: this.utilityService.formatDateForDB(invoice.issue_date),
            due_date: invoice.due_date ? this.utilityService.formatDateForDB(invoice.due_date) : null,
            subtotal: this.utilityService.roundToDecimals(invoice.subtotal),
            tax_amount: this.utilityService.roundToDecimals(invoice.tax_amount),
            total: this.utilityService.roundToDecimals(invoice.total),
            status: invoice.status,
            notes: this.utilityService.cleanString(invoice.notes)
        };

        return from(
            this.supabase.client
                .from('invoices')
                .insert(invoiceToInsert)
                .select()
                .single()
        ).pipe(
            switchMap(({ data: newInvoice, error: invoiceError }) => {
                if (invoiceError) throw invoiceError;

                // Se ci sono items da inserire
                if (invoice.items && invoice.items.length > 0) {
                    const itemsToInsert = invoice.items.map(item => ({
                        invoice_id: newInvoice.id,
                        product_id: item.product_id || null,
                        quantity: this.utilityService.roundToDecimals(item.quantity, 3),
                        total: this.utilityService.roundToDecimals(item.total),
                        description: item.description.trim(),
                        unit_price: this.utilityService.roundToDecimals(item.unit_price),
                        tax_rate: this.utilityService.roundToDecimals(item.tax_rate, 1),
                        unit: item.unit || 'pz'
                    }));

                    return from(
                        this.supabase.client
                            .from('invoice_items')
                            .insert(itemsToInsert)
                            .select(`
              *,
              products(
                id,
                name,
                description,
                category,
                unit
              )
            `)
                    ).pipe(
                        map(({ data: insertedItems, error: itemsError }) => {
                            if (itemsError) throw itemsError;

                            this.loadInvoices();

                            return {
                                ...newInvoice,
                                customer: invoice.customer,
                                items: insertedItems || []
                            } as Invoice;
                        })
                    );
                } else {
                    // Se non ci sono items, restituisci la fattura senza items
                    this.loadInvoices();
                    return of({
                        ...newInvoice,
                        customer: invoice.customer,
                        items: []
                    } as Invoice);
                }
            }),
            catchError(error => {
                console.error('Error creating invoice:', error);
                this.notificationService.createError('fattura', error);
                throw error;
            })
        );
    }

    updateInvoice(invoice: Invoice): Observable<Invoice> {
        const invoiceToUpdate = {
            invoice_number: invoice.invoice_number,
            customer_id: invoice.customer_id,
            issue_date: this.utilityService.formatDateForDB(invoice.issue_date),
            due_date: invoice.due_date ? this.utilityService.formatDateForDB(invoice.due_date) : null,
            subtotal: this.utilityService.roundToDecimals(invoice.subtotal),
            tax_amount: this.utilityService.roundToDecimals(invoice.tax_amount),
            total: this.utilityService.roundToDecimals(invoice.total),
            status: invoice.status,
            notes: this.utilityService.cleanString(invoice.notes),
            updated_at: new Date().toISOString()
        };

        console.log('🔄 ================================');
        console.log('🔄 STARTING UPDATE INVOICE:', invoice.id);
        console.log('🔄 Items from form:', invoice.items?.length || 0);
        console.log('🔄 ================================');

        // STEP 1: Debug stato iniziale
        return from(this.debugInvoiceItems(invoice.id!)).pipe(
            switchMap(() => {
                // STEP 2: Aggiorna la fattura
                console.log('📝 Step 1: Updating invoice record...');
                return from(
                    this.supabase.client
                        .from('invoices')
                        .update(invoiceToUpdate)
                        .eq('id', invoice.id)
                        .select()
                        .single()
                );
            }),
            switchMap(({ data: updatedInvoice, error: invoiceError }) => {
                if (invoiceError) throw invoiceError;
                console.log('✅ Step 1 completed: Invoice record updated');

                // STEP 3: Debug prima della cancellazione
                return from(this.debugInvoiceItems(invoice.id!)).pipe(
                    switchMap(() => {
                        // STEP 4: Cancella items esistenti
                        console.log('🗑️ Step 2: Deleting existing items...');
                        return from(
                            this.supabase.client
                                .from('invoice_items')
                                .delete()
                                .eq('invoice_id', invoice.id!)
                                .select() // Aggiungi select per vedere cosa viene cancellato
                        );
                    }),
                    switchMap(({ data: deletedItems, error: deleteError }) => {
                        if (deleteError) {
                            console.error('❌ Error deleting items:', deleteError);
                            throw deleteError;
                        }

                        console.log('✅ Step 2 completed: Deleted', deletedItems?.length || 0, 'items');
                        deletedItems?.forEach((item, index) => {
                            console.log(`   Deleted item ${index + 1}: ${item.description}`);
                        });

                        // STEP 5: Debug dopo cancellazione
                        return from(this.debugInvoiceItems(invoice.id!));
                    }),
                    switchMap(() => {
                        // STEP 6: Inserisci nuovi items
                        if (invoice.items && invoice.items.length > 0) {
                            console.log('💾 Step 3: Inserting', invoice.items.length, 'new items...');

                            const itemsToInsert = invoice.items.map((item, index) => {
                                const cleanItem = {
                                    invoice_id: updatedInvoice.id,
                                    product_id: item.product_id || null,
                                    quantity: Number(item.quantity) || 0,
                                    total: Number(item.total) || 0,
                                    description: (item.description || '').trim(),
                                    unit_price: Number(item.unit_price) || 0,
                                    tax_rate: Number(item.tax_rate) || 22,
                                    unit: item.unit || 'pz'
                                };

                                console.log(`📦 Preparing item ${index + 1}:`, {
                                    description: cleanItem.description,
                                    quantity: cleanItem.quantity,
                                    unit_price: cleanItem.unit_price
                                });

                                return cleanItem;
                            });

                            return from(
                                this.supabase.client
                                    .from('invoice_items')
                                    .insert(itemsToInsert)
                                    .select(`
                  *,
                  products(
                    id,
                    name,
                    description,
                    category,
                    unit
                  )
                `)
                            ).pipe(
                                switchMap(({ data: insertedItems, error: itemsError }) => {
                                    if (itemsError) {
                                        console.error('❌ Error inserting items:', itemsError);
                                        throw itemsError;
                                    }

                                    console.log('✅ Step 3 completed: Inserted', insertedItems?.length || 0, 'items');
                                    insertedItems?.forEach((item, index) => {
                                        console.log(`   Inserted item ${index + 1}:`, {
                                            id: item.id,
                                            description: item.description,
                                            created_at: item.created_at
                                        });
                                    });

                                    // STEP 7: Debug finale
                                    return from(this.debugInvoiceItems(invoice.id!)).pipe(
                                        map(() => {
                                            this.loadInvoices();

                                            console.log('🎉 UPDATE COMPLETED SUCCESSFULLY');
                                            console.log('🎉 ================================');

                                            return {
                                                ...updatedInvoice,
                                                customer: invoice.customer,
                                                items: insertedItems || []
                                            } as Invoice;
                                        })
                                    );
                                })
                            );
                        } else {
                            console.log('ℹ️ Step 3: No items to insert');
                            this.loadInvoices();
                            return of({
                                ...updatedInvoice,
                                customer: invoice.customer,
                                items: []
                            } as Invoice);
                        }
                    })
                );
            }),
            catchError(error => {
                console.error('💥 ERROR in updateInvoice:', error);
                this.notificationService.updateError('fattura', error);
                throw error;
            })
        );
    }

    async debugInvoiceItems(invoiceId: string): Promise<void> {
        console.log('🔍 DEBUG: Checking items for invoice:', invoiceId);

        const { data: existingItems, error } = await this.supabase.client
            .from('invoice_items')
            .select('*')
            .eq('invoice_id', invoiceId)
            .order('created_at');

        if (error) {
            console.error('❌ Error checking existing items:', error);
            return;
        }

        console.log('📊 Current items in database:', existingItems?.length || 0);
        existingItems?.forEach((item, index) => {
            console.log(`   Item ${index + 1}:`, {
                id: item.id,
                description: item.description,
                quantity: item.quantity,
                created_at: item.created_at
            });
        });
    }

    deleteInvoice(id: string): Observable<void> {
        return from(
            // Prima elimina gli items
            this.supabase.client
                .from('invoice_items')
                .delete()
                .eq('invoice_id', id)
        ).pipe(
            switchMap(() =>
                // Poi elimina la fattura
                from(
                    this.supabase.client
                        .from('invoices')
                        .delete()
                        .eq('id', id)
                )
            ),
            map(({ error }) => {
                if (error) throw error;
                this.loadInvoices();
                return;
            }),
            catchError(error => {
                console.error(`Error deleting invoice with ID ${id}:`, error);
                this.notificationService.deleteError('fattura', error);
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
                    issue_date: this.utilityService.getCurrentItalianDate().toISOString().split('T')[0],
                    due_date: undefined,
                    items: sourceInvoice.items.map(({ id, invoice_id, created_at, updated_at, ...item }) => ({
                        ...item,
                        product_id: item.product_id // Mantieni il riferimento al prodotto se presente
                    }))
                };

                return this.createInvoice(duplicatedInvoice);
            }),
            catchError(error => {
                console.error('Error duplicating invoice:', error);
                this.notificationService.error('Errore durante la duplicazione della fattura');
                throw error;
            })
        );
    }

    // Cambia lo stato di una fattura
    updateInvoiceStatus(invoiceId: string, status: Invoice['status']): Observable<Invoice> {
        const updateData: any = {
            status,
            updated_at: new Date().toISOString()
        };

        // Se lo stato diventa 'paid', aggiungi timestamp di pagamento
        if (status === 'paid') {
            updateData.paid_at = new Date().toISOString();
        }

        return from(
            this.supabase.client
                .from('invoices')
                .update(updateData)
                .eq('id', invoiceId)
                .select(`
                    *,
                    customers!invoices_customer_id_fkey(
                        id,
                        name,
                        email,
                        phone,
                        address,
                        tax_code,
                        vat_number
                    )
                `)
                .single()
        ).pipe(
            switchMap(({ data: updatedInvoice, error: invoiceError }) => {
                if (invoiceError) throw invoiceError;

                // Carica anche gli items
                return from(
                    this.supabase.client
                        .from('invoice_items')
                        .select(`
                            *,
                            products(
                                id,
                                name,
                                description,
                                category,
                                unit
                            )
                        `)
                        .eq('invoice_id', invoiceId)
                        .order('created_at')
                ).pipe(
                    map(({ data: itemsData, error: itemsError }) => {
                        if (itemsError) {
                            console.error(`Error loading items for updated invoice ${invoiceId}:`, itemsError);
                        }

                        this.loadInvoices();

                        return {
                            ...updatedInvoice,
                            customer: updatedInvoice.customers,
                            items: itemsData || []
                        } as Invoice;
                    })
                );
            }),
            catchError(error => {
                console.error('Error updating invoice status:', error);
                this.notificationService.updateError('stato fattura', error);
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
                    customers!invoices_customer_id_fkey(
                        id,
                        name,
                        email,
                        phone,
                        address,
                        tax_code,
                        vat_number
                    )
                `)
                .eq('customer_id', customerId)
                .order('created_at', { ascending: false })
        ).pipe(
            switchMap(({ data: invoicesData, error: invoicesError }) => {
                if (invoicesError) throw invoicesError;

                if (!invoicesData || invoicesData.length === 0) {
                    return of([]);
                }

                // Carica gli items per ogni fattura
                const invoicesWithItems$ = invoicesData.map(invoice =>
                    from(
                        this.supabase.client
                            .from('invoice_items')
                            .select('*')
                            .eq('invoice_id', invoice.id)
                            .order('created_at')
                    ).pipe(
                        map(({ data: itemsData, error: itemsError }) => {
                            if (itemsError) {
                                console.error(`Error loading items for invoice ${invoice.id}:`, itemsError);
                            }

                            return {
                                ...invoice,
                                customer: invoice.customers,
                                items: itemsData || []
                            } as Invoice;
                        })
                    )
                );

                return forkJoin(invoicesWithItems$);
            }),
            catchError(error => {
                console.error('Error loading invoices for customer:', error);
                return of([]);
            })
        );
    }

    // CRUD Operazioni per Clienti (proxy al CustomerService)
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
                this.notificationService.loadError('clienti', error);
                return of([]);
            })
        );
    }

    // Ricerca clienti per autocomplete
    searchCustomers(searchTerm: string): Observable<Customer[]> {
        if (!searchTerm || searchTerm.trim().length < 2) {
            return of(this.customers().slice(0, 10)); // Limita risultati se ricerca vuota
        }

        return from(
            this.supabase.client
                .from('customers')
                .select('*')
                .or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,vat_number.ilike.%${searchTerm}%,tax_code.ilike.%${searchTerm}%`)
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
        const today = this.utilityService.formatDateForDB(new Date())!;

        return from(
            this.supabase.client
                .from('invoices')
                .select(`
                    *,
                    customers!invoices_customer_id_fkey(
                        id,
                        name,
                        email,
                        phone,
                        address,
                        tax_code,
                        vat_number
                    )
                `)
                .eq('status', 'sent')
                .lt('due_date', today)
                .not('due_date', 'is', null)
                .order('due_date', { ascending: true })
        ).pipe(
            switchMap(({ data: invoicesData, error: invoicesError }) => {
                if (invoicesError) throw invoicesError;

                if (!invoicesData || invoicesData.length === 0) {
                    return of([]);
                }

                // Carica gli items per ogni fattura scaduta
                const invoicesWithItems$ = invoicesData.map(invoice =>
                    from(
                        this.supabase.client
                            .from('invoice_items')
                            .select('*')
                            .eq('invoice_id', invoice.id)
                    ).pipe(
                        map(({ data: itemsData, error: itemsError }) => {
                            if (itemsError) {
                                console.error(`Error loading items for overdue invoice ${invoice.id}:`, itemsError);
                            }

                            return {
                                ...invoice,
                                customer: invoice.customers,
                                items: itemsData || []
                            } as Invoice;
                        })
                    )
                );

                return forkJoin(invoicesWithItems$);
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
                    customers!invoices_customer_id_fkey(
                        id,
                        name,
                        email,
                        phone,
                        address,
                        tax_code,
                        vat_number
                    )
                `)
                .gte('issue_date', startDate)
                .lte('issue_date', endDate)
                .order('issue_date', { ascending: false })
        ).pipe(
            map(({ data, error }) => {
                if (error) throw error;
                return (data || []).map(invoice => ({
                    ...invoice,
                    customer: invoice.customers,
                    items: [] // Gli items verranno caricati solo se necessario per performance
                })) as Invoice[];
            }),
            catchError(error => {
                console.error('Error loading invoices by date range:', error);
                return of([]);
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
                    customers!invoices_customer_id_fkey(
                        id,
                        name,
                        email,
                        phone,
                        address,
                        tax_code,
                        vat_number
                    )
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
                    const customerData = invoice.customers;

                    if (customerData && invoice.customer_id) {
                        const existing = customerMap.get(invoice.customer_id);

                        if (existing) {
                            existing.totalRevenue += invoice.total || 0;
                            existing.invoiceCount += 1;
                        } else {
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
        version: string;
    }> {
        return this.getInvoices().pipe(
            switchMap(invoices => {
                return this.getCustomers().pipe(
                    map(customers => ({
                        invoices,
                        customers,
                        exportDate: new Date().toISOString(),
                        version: this.utilityService.getAppVersion().version
                    }))
                );
            })
        );
    }

    // Aggiorna automaticamente lo stato delle fatture scadute
    updateOverdueInvoices(): Observable<number> {
        const today = this.utilityService.formatDateForDB(new Date())!;

        return from(
            this.supabase.client
                .from('invoices')
                .update({
                    status: 'overdue',
                    updated_at: new Date().toISOString()
                })
                .eq('status', 'sent')
                .lt('due_date', today)
                .not('due_date', 'is', null)
                .select('id')
        ).pipe(
            map(({ data, error }) => {
                if (error) throw error;

                const updatedCount = data?.length || 0;
                if (updatedCount > 0) {
                    this.loadInvoices(); // Ricarica le fatture se ci sono stati aggiornamenti
                }

                return updatedCount;
            }),
            catchError(error => {
                console.error('Error updating overdue invoices:', error);
                return of(0);
            })
        );
    }

    // Calcola il prossimo numero di fattura suggerito
    getNextInvoiceNumber(): Observable<string> {
        const currentYear = new Date().getFullYear();

        return from(
            this.supabase.client
                .from('invoices')
                .select('invoice_number')
                .like('invoice_number', `INV-${currentYear}-%`)
                .order('created_at', { ascending: false })
                .limit(1)
        ).pipe(
            map(({ data, error }) => {
                if (error) throw error;

                if (data && data.length > 0) {
                    const lastNumber = data[0].invoice_number;
                    // Estrai il numero sequenziale e incrementa
                    const matches = lastNumber.match(/INV-(\d{4})-(\d+)/);
                    if (matches) {
                        const year = parseInt(matches[1]);
                        const sequence = parseInt(matches[2]);

                        if (year === currentYear) {
                            return `INV-${currentYear}-${(sequence + 1).toString().padStart(6, '0')}`;
                        }
                    }
                }

                // Se non ci sono fatture per l'anno corrente, inizia da 000001
                return `INV-${currentYear}-000001`;
            }),
            catchError(error => {
                console.error('Error calculating next invoice number:', error);
                // Fallback al metodo timestamp
                return of(this.generateInvoiceNumber());
            })
        );
    }

    // Statistiche avanzate per dashboard
    getDashboardMetrics(): Observable<{
        totalInvoices: number;
        totalRevenue: number;
        averageInvoiceValue: number;
        topCustomer: { name: string; revenue: number } | null;
        recentActivity: { date: string; count: number }[];
        statusDistribution: { status: string; count: number; percentage: number }[];
    }> {
        return this.getInvoices().pipe(
            map(invoices => {
                const totalRevenue = invoices
                    .filter(inv => inv.status === 'paid')
                    .reduce((sum, inv) => sum + inv.total, 0);

                const averageInvoiceValue = invoices.length > 0 ? totalRevenue / invoices.length : 0;

                // Calcola distribuzione stati
                const statusMap = new Map<string, number>();
                invoices.forEach(inv => {
                    statusMap.set(inv.status, (statusMap.get(inv.status) || 0) + 1);
                });

                const statusDistribution = Array.from(statusMap.entries()).map(([status, count]) => ({
                    status,
                    count,
                    percentage: (count / invoices.length) * 100
                }));

                // Attività recente (ultimi 7 giorni)
                const sevenDaysAgo = new Date();
                sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

                const recentActivity = Array.from({ length: 7 }, (_, i) => {
                    const date = new Date();
                    date.setDate(date.getDate() - i);
                    const dateStr = this.utilityService.formatDateForDB(date)!;

                    const count = invoices.filter(inv =>
                        inv.issue_date === dateStr
                    ).length;

                    return { date: dateStr, count };
                }).reverse();

                return {
                    totalInvoices: invoices.length,
                    totalRevenue,
                    averageInvoiceValue,
                    topCustomer: null, // Calcolato separatamente con getTopCustomersByRevenue
                    recentActivity,
                    statusDistribution
                };
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
        const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        return `INV-${year}-${timestamp.toString().slice(-6)}${randomSuffix}`;
    }

    // Metodo per forzare il refresh dei dati
    refreshData(): Observable<{ invoices: Invoice[]; customers: Customer[] }> {
        return forkJoin({
            invoices: this.getInvoices(),
            customers: this.getCustomers()
        });
    }

    // Metodo per verificare l'integrità dei dati
    validateDataIntegrity(): Observable<{
        valid: boolean;
        issues: string[];
        fixedIssues: number;
    }> {
        return this.getInvoices().pipe(
            map(invoices => {
                const issues: string[] = [];
                let fixedIssues = 0;

                invoices.forEach(invoice => {
                    // Verifica che i totali siano corretti
                    const calculatedSubtotal = invoice.items.reduce((sum, item) =>
                        sum + (item.quantity * item.unit_price), 0);

                    const calculatedTax = invoice.items.reduce((sum, item) =>
                        sum + ((item.quantity * item.unit_price) * (item.tax_rate / 100)), 0);

                    const calculatedTotal = calculatedSubtotal + calculatedTax;

                    const subtotalDiff = Math.abs(invoice.subtotal - calculatedSubtotal);
                    const taxDiff = Math.abs(invoice.tax_amount - calculatedTax);
                    const totalDiff = Math.abs(invoice.total - calculatedTotal);

                    if (subtotalDiff > 0.01) {
                        issues.push(`Fattura ${invoice.invoice_number}: subtotale non corretto`);
                    }
                    if (taxDiff > 0.01) {
                        issues.push(`Fattura ${invoice.invoice_number}: IVA non corretta`);
                    }
                    if (totalDiff > 0.01) {
                        issues.push(`Fattura ${invoice.invoice_number}: totale non corretto`);
                    }

                    // Verifica che il cliente esista
                    if (!invoice.customer) {
                        issues.push(`Fattura ${invoice.invoice_number}: cliente mancante`);
                    }

                    // Verifica che ci siano items
                    if (!invoice.items || invoice.items.length === 0) {
                        issues.push(`Fattura ${invoice.invoice_number}: nessuna riga presente`);
                    }
                });

                return {
                    valid: issues.length === 0,
                    issues,
                    fixedIssues
                };
            })
        );
    }
}