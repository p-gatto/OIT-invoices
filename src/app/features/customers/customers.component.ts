import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from "@angular/material/divider";
import { Customer } from '../invoices/customer.model';
import { InvoiceService } from '../invoices/invoice.service';

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
    MatDividerModule
  ],
  templateUrl: './customers.component.html',
  styleUrl: './customers.component.scss'
})
export class CustomersComponent implements OnInit {

  invoiceService = inject(InvoiceService);
  dialog = inject(MatDialog);
  snackBar = inject(MatSnackBar);

  customers = signal<Customer[]>([]);
  searchQuery = '';
  displayedColumns = ['name', 'contact', 'tax_info', 'address', 'actions'];

  filteredCustomers = computed(() => {
    if (!this.searchQuery) return this.customers();

    const query = this.searchQuery.toLowerCase();
    return this.customers().filter(customer =>
      customer.name.toLowerCase().includes(query) ||
      customer.email?.toLowerCase().includes(query) ||
      customer.phone?.toLowerCase().includes(query)
    );
  });

  constructor() { }

  ngOnInit() {
    this.loadCustomers();
  }

  private loadCustomers() {
    this.invoiceService.getCustomers().subscribe(customers => {
      this.customers.set(customers);
    });
  }

  applyFilter() {
    // Triggers computed signal recalculation
  }

  openCustomerDialog(customer?: Customer) {
    // Would open a dialog for customer form
    this.snackBar.open(
      customer ? 'Modifica cliente' : 'Nuovo cliente',
      'Chiudi',
      { duration: 2000 }
    );
  }

  editCustomer(customer: Customer) {
    this.openCustomerDialog(customer);
  }

  viewCustomerInvoices(customer: Customer) {
    // Navigate to invoices filtered by customer
    this.snackBar.open(`Visualizzazione fatture per ${customer.name}`, 'Chiudi', { duration: 2000 });
  }

  deleteCustomer(customer: Customer) {
    // Show confirmation dialog
    this.snackBar.open(`Cliente ${customer.name} eliminato`, 'Chiudi', { duration: 3000 });
  }

}