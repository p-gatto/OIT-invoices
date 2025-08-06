import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from "@angular/material/divider";
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { ConfirmationDialogComponent } from '../../shared/components/confirmation-dialog/confirmation-dialog.component';

import { Customer } from './customer.model';
import { CustomerService } from './customer.service';
import { CustomerDiaogComponent } from './customer-diaog/customer-diaog.component';

@Component({
  selector: 'app-customers',
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatDialogModule,
    MatMenuModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatSnackBarModule,
    MatChipsModule
  ],
  templateUrl: './customers.component.html',
  styleUrl: './customers.component.scss'
})
export class CustomersComponent implements OnInit {

  customerService = inject(CustomerService);
  dialog = inject(MatDialog);
  snackBar = inject(MatSnackBar);
  router = inject(Router);

  customers = signal<Customer[]>([]);
  searchQuery = '';
  loading = signal(true);
  displayedColumns = ['name', 'contact', 'tax_info', 'address', 'actions'];

  // Statistiche per ogni cliente
  customerStats = signal<Map<string, any>>(new Map());

  filteredCustomers = computed(() => {
    if (!this.searchQuery) return this.customers();

    const query = this.searchQuery.toLowerCase();
    return this.customers().filter(customer =>
      customer.name.toLowerCase().includes(query) ||
      customer.email?.toLowerCase().includes(query) ||
      customer.phone?.toLowerCase().includes(query) ||
      customer.tax_code?.toLowerCase().includes(query) ||
      customer.vat_number?.toLowerCase().includes(query)
    );
  });

  constructor() { }

  ngOnInit() {
    this.loadCustomers();
  }

  private loadCustomers() {
    this.loading.set(true);
    this.customerService.getCustomers().subscribe({
      next: customers => {
        this.customers.set(customers);
        this.loading.set(false);
        // Carica le statistiche per ogni cliente
        customers.forEach(customer => {
          if (customer.id) {
            this.loadCustomerStats(customer.id);
          }
        });
      },
      error: error => {
        this.loading.set(false);
        this.snackBar.open('Errore nel caricamento dei clienti', 'Chiudi', { duration: 3000 });
        console.error('Error loading customers:', error);
      }
    });
  }

  private loadCustomerStats(customerId: string) {
    this.customerService.getCustomerStats(customerId).subscribe(stats => {
      const currentStats = this.customerStats();
      currentStats.set(customerId, stats);
      this.customerStats.set(new Map(currentStats));
    });
  }

  applyFilter() {
    // Triggers computed signal recalculation
  }

  openCustomerDialog(customer?: Customer) {
    const dialogRef = this.dialog.open(CustomerDiaogComponent, {
      width: '700px',
      data: customer ? { ...customer } : null,
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        if (customer) {
          this.updateCustomer(result);
        } else {
          this.createCustomer(result);
        }
      }
    });
  }

  private createCustomer(customerData: Omit<Customer, 'id' | 'created_at'>) {
    this.customerService.createCustomer(customerData).subscribe({
      next: (newCustomer) => {
        this.snackBar.open('Cliente creato con successo', 'Chiudi', { duration: 3000 });
        this.loadCustomers();
      },
      error: (error) => {
        this.snackBar.open('Errore nella creazione del cliente', 'Chiudi', { duration: 3000 });
        console.error('Error creating customer:', error);
      }
    });
  }

  private updateCustomer(customerData: Customer) {
    this.customerService.updateCustomer(customerData).subscribe({
      next: () => {
        this.snackBar.open('Cliente aggiornato con successo', 'Chiudi', { duration: 3000 });
        this.loadCustomers();
      },
      error: (error) => {
        this.snackBar.open('Errore nell\'aggiornamento del cliente', 'Chiudi', { duration: 3000 });
        console.error('Error updating customer:', error);
      }
    });
  }

  editCustomer(customer: Customer) {
    this.openCustomerDialog(customer);
  }

  viewCustomerInvoices(customer: Customer) {
    this.router.navigate(['/invoices'], {
      queryParams: { customerId: customer.id }
    });
  }

  deleteCustomer(customer: Customer) {
    // Prima verifica se il cliente ha fatture
    this.customerService.hasInvoices(customer.id!).subscribe(hasInvoices => {
      let message = `Sei sicuro di voler eliminare il cliente "${customer.name}"?`;

      if (hasInvoices) {
        message = `ATTENZIONE: Il cliente "${customer.name}" ha fatture associate. Eliminando il cliente, le fatture rimarranno orfane. Sei sicuro di voler procedere?`;
      }

      const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
        width: '500px',
        data: {
          title: 'Elimina Cliente',
          message: message,
          confirmText: 'Elimina',
          cancelText: 'Annulla'
        }
      });

      dialogRef.afterClosed().subscribe(result => {
        if (result && customer.id) {
          this.performDelete(customer.id, customer.name);
        }
      });
    });
  }

  private performDelete(customerId: string, customerName: string) {
    this.customerService.deleteCustomer(customerId).subscribe({
      next: () => {
        this.snackBar.open(`Cliente "${customerName}" eliminato con successo`, 'Chiudi', { duration: 3000 });
        this.loadCustomers();
      },
      error: (error) => {
        this.snackBar.open('Errore nell\'eliminazione del cliente', 'Chiudi', { duration: 3000 });
        console.error('Error deleting customer:', error);
      }
    });
  }

  getCustomerStats(customerId: string | undefined) {
    if (!customerId) return null;
    return this.customerStats().get(customerId);
  }

  createInvoiceForCustomer(customer: Customer) {
    this.router.navigate(['/invoices/new'], {
      queryParams: { customerId: customer.id }
    });
  }

}