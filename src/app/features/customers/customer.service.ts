import { inject, Injectable, signal } from '@angular/core';

import { catchError, from, map, Observable, of, switchMap } from 'rxjs';

import { SupabaseService } from '../../core/database/supabase.service';

import { Customer } from './customer.model';

export interface DeleteCustomerOptions {
  force?: boolean; // Se true, forza l'eliminazione anche con fatture
  reason?: string; // Motivo dell'eliminazione per audit
}

export interface DeleteCustomerResult {
  type: 'soft' | 'hard';
  customer: Customer;
  hasInvoices: boolean;
  invoiceCount: number;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class CustomerService {

  supabase = inject(SupabaseService);

  private customersSignal = signal<Customer[]>([]);
  customers = this.customersSignal.asReadonly();

  constructor() {
    this.loadCustomers();
  }

  private loadCustomers() {
    this.getCustomers().subscribe();
  }

  getCustomerById(id: string): Observable<Customer | null> {
    return from(
      this.supabase.client
        .from('customers')
        .select('*')
        .eq('id', id)
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          if (error.code === 'PGRST116') return null;
          throw error;
        }
        return data as Customer;
      }),
      catchError(error => {
        console.error(`Error loading customer with ID ${id}:`, error);
        return of(null);
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

  /**
   * Metodo principale per eliminare un cliente
   * Decide automaticamente tra soft delete e hard delete
   */
  deleteCustomer(id: string, options: DeleteCustomerOptions = {}): Observable<DeleteCustomerResult> {
    return this.getCustomerWithInvoiceInfo(id).pipe(
      switchMap(({ customer, hasInvoices, invoiceCount }) => {
        if (!customer) {
          throw new Error('Cliente non trovato');
        }

        if (hasInvoices && !options.force) {
          // Soft delete se ha fatture e non è forzato
          return this.performSoftDelete(customer, invoiceCount, options.reason);
        } else {
          // Hard delete se non ha fatture o è forzato
          return this.performHardDelete(customer, hasInvoices, invoiceCount, options.reason);
        }
      }),
      catchError(error => {
        console.error('Error in deleteCustomer:', error);
        throw error;
      })
    );
  }

  /**
   * Esegue il soft delete - VERSIONE CORRETTA
   */
  private performSoftDelete(
    customer: Customer,
    invoiceCount: number,
    reason?: string
  ): Observable<DeleteCustomerResult> {
    const updateData: any = {
      is_active: false,
      updated_at: new Date().toISOString()
    };

    if (reason) {
      updateData.deactivation_reason = reason;
      updateData.deactivated_at = new Date().toISOString();
    }

    return from(
      this.supabase.client
        .from('customers')
        .update(updateData)
        .eq('id', customer.id)
        .select()
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          console.error('Supabase soft delete error:', error);
          throw error;
        }

        this.loadCustomers(); // Ricarica la lista

        return {
          type: 'soft' as const,
          customer: data as Customer,
          hasInvoices: true,
          invoiceCount,
          message: `Cliente "${customer.name}" disattivato. Mantiene ${invoiceCount} fatture associate.`
        };
      }),
      catchError(error => {
        console.error('Error performing soft delete:', error);
        throw error;
      })
    );
  }

  /**
   * Esegue l'hard delete - VERSIONE CORRETTA
   */
  private performHardDelete(
    customer: Customer,
    hasInvoices: boolean,
    invoiceCount: number,
    reason?: string
  ): Observable<DeleteCustomerResult> {

    // Log dell'operazione per audit
    console.warn('HARD DELETE CUSTOMER:', {
      customer_id: customer.id,
      customer_name: customer.name,
      had_invoices: hasInvoices,
      invoice_count: invoiceCount,
      deletion_reason: reason,
      deleted_at: new Date().toISOString()
    });

    return from(
      this.supabase.client
        .from('customers')
        .delete()
        .eq('id', customer.id)
    ).pipe(
      map(({ error }) => {
        if (error) {
          console.error('Supabase hard delete error:', error);
          throw error;
        }

        this.loadCustomers(); // Ricarica la lista

        let message = `Cliente "${customer.name}" eliminato definitivamente.`;
        if (hasInvoices) {
          message += ` ATTENZIONE: ${invoiceCount} fatture sono ora orfane.`;
        }

        return {
          type: 'hard' as const,
          customer,
          hasInvoices,
          invoiceCount,
          message
        };
      }),
      catchError(error => {
        console.error('Error performing hard delete:', error);
        throw error;
      })
    );
  }

  /**
   * Ottiene informazioni complete sul cliente e le sue fatture
   */
  private getCustomerWithInvoiceInfo(customerId: string): Observable<{
    customer: Customer | null;
    hasInvoices: boolean;
    invoiceCount: number;
  }> {
    return from(
      this.supabase.client
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .single()
    ).pipe(
      switchMap(({ data: customer, error: customerError }) => {
        if (customerError) {
          if (customerError.code === 'PGRST116') {
            return of({ customer: null, hasInvoices: false, invoiceCount: 0 });
          }
          throw customerError;
        }

        // Conta le fatture associate
        return from(
          this.supabase.client
            .from('invoices')
            .select('id', { count: 'exact', head: true })
            .eq('customer_id', customerId)
        ).pipe(
          map(({ count, error: invoiceError }) => {
            if (invoiceError) throw invoiceError;

            const invoiceCount = count || 0;
            return {
              customer: customer as Customer,
              hasInvoices: invoiceCount > 0,
              invoiceCount
            };
          })
        );
      }),
      catchError(error => {
        console.error('Error getting customer info:', error);
        throw error;
      })
    );
  }

  /**
   * Ripristina un cliente disattivato (soft delete)
   */
  restoreCustomer(id: string): Observable<Customer> {
    return from(
      this.supabase.client
        .from('customers')
        .update({
          is_active: true,
          deactivation_reason: null,
          deactivated_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        this.loadCustomers();
        return data as Customer;
      }),
      catchError(error => {
        console.error(`Error restoring customer with ID ${id}:`, error);
        throw error;
      })
    );
  }

  /**
   * Carica tutti i clienti (attivi e disattivati)
   */
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

  /**
   * Carica solo clienti attivi
   */
  getActiveCustomers(): Observable<Customer[]> {
    return from(
      this.supabase.client
        .from('customers')
        .select('*')
        .eq('is_active', true)
        .order('name')
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return data || [];
      }),
      catchError(error => {
        console.error('Error loading active customers:', error);
        return of([]);
      })
    );
  }

  /**
   * Carica solo clienti disattivati
   */
  getInactiveCustomers(): Observable<Customer[]> {
    return from(
      this.supabase.client
        .from('customers')
        .select('*')
        .eq('is_active', false)
        .order('name')
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return data || [];
      }),
      catchError(error => {
        console.error('Error loading inactive customers:', error);
        return of([]);
      })
    );
  }

  /**
   * Verifica se un cliente ha fatture (metodo legacy mantenuto per compatibilità)
   */
  hasInvoices(customerId: string): Observable<boolean> {
    return this.getCustomerWithInvoiceInfo(customerId).pipe(
      map(({ hasInvoices }) => hasInvoices)
    );
  }

  /**
   * Ottieni statistiche complete del cliente
   */
  getCustomerStats(customerId: string): Observable<{
    totalInvoices: number;
    totalAmount: number;
    lastInvoiceDate: string | null;
    isActive: boolean;
    canBeDeleted: boolean;
  }> {
    return this.getCustomerWithInvoiceInfo(customerId).pipe(
      switchMap(({ customer, hasInvoices, invoiceCount }) => {
        if (!customer) {
          throw new Error('Cliente non trovato');
        }

        if (!hasInvoices) {
          return of({
            totalInvoices: 0,
            totalAmount: 0,
            lastInvoiceDate: null,
            isActive: customer.is_active ?? true,
            canBeDeleted: true
          });
        }

        // Carica statistiche dettagliate
        return from(
          this.supabase.client
            .from('invoices')
            .select('total, issue_date')
            .eq('customer_id', customerId)
            .order('issue_date', { ascending: false })
        ).pipe(
          map(({ data, error }) => {
            if (error) throw error;

            const invoices = data || [];
            return {
              totalInvoices: invoiceCount,
              totalAmount: invoices.reduce((sum, inv) => sum + (inv.total || 0), 0),
              lastInvoiceDate: invoices.length > 0 ? invoices[0].issue_date : null,
              isActive: customer.is_active ?? true,
              canBeDeleted: false
            };
          })
        );
      }),
      catchError(error => {
        console.error('Error loading customer stats:', error);
        return of({
          totalInvoices: 0,
          totalAmount: 0,
          lastInvoiceDate: null,
          isActive: true,
          canBeDeleted: false
        });
      })
    );
  }

}