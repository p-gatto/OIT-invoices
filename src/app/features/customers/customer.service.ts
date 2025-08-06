import { inject, Injectable, signal } from '@angular/core';

import { catchError, from, map, Observable, of } from 'rxjs';

import { SupabaseService } from '../../core/database/supabase.service';

import { Customer } from './customer.model';

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

  // Verifica se un cliente ha fatture associate
  hasInvoices(customerId: string): Observable<boolean> {
    return from(
      this.supabase.client
        .from('invoices')
        .select('id', { count: 'exact', head: true })
        .eq('customer_id', customerId)
    ).pipe(
      map(({ count, error }) => {
        if (error) throw error;
        return (count || 0) > 0;
      }),
      catchError(error => {
        console.error('Error checking customer invoices:', error);
        return of(false);
      })
    );
  }

  // Ottieni statistiche del cliente
  getCustomerStats(customerId: string): Observable<{
    totalInvoices: number;
    totalAmount: number;
    lastInvoiceDate: string | null;
  }> {
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
          totalInvoices: invoices.length,
          totalAmount: invoices.reduce((sum, inv) => sum + (inv.total || 0), 0),
          lastInvoiceDate: invoices.length > 0 ? invoices[0].issue_date : null
        };
      }),
      catchError(error => {
        console.error('Error loading customer stats:', error);
        return of({
          totalInvoices: 0,
          totalAmount: 0,
          lastInvoiceDate: null
        });
      })
    );
  }

  private loadCustomers() {
    this.getCustomers().subscribe();
  }

}