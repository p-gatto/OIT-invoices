import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDividerModule } from "@angular/material/divider";

import { Invoice } from './invoice.model';
import { InvoiceService } from './invoice.service';
import { ConfirmationDialogComponent } from '../../shared/components/confirmation-dialog/confirmation-dialog.component';

@Component({
  selector: 'app-invoices',
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatChipsModule,
    MatMenuModule,
    MatDialogModule,
    MatDividerModule
  ],
  templateUrl: './invoices.component.html',
  styleUrl: './invoices.component.scss'
})
export class InvoicesComponent implements OnInit {

  invoiceService = inject(InvoiceService);
  dialog = inject(MatDialog);
  snackBar = inject(MatSnackBar);
  router = inject(Router);
  route = inject(ActivatedRoute);

  invoices = signal<Invoice[]>([]);
  searchQuery = '';
  statusFilter = '';
  yearFilter = '';
  customerIdFilter = '';

  displayedColumns = ['invoice_number', 'customer', 'date', 'amount', 'status', 'actions'];

  availableYears = computed(() => {
    const years = new Set<number>();
    this.invoices().forEach(invoice => {
      years.add(new Date(invoice.issue_date).getFullYear());
    });
    return Array.from(years).sort((a, b) => b - a);
  });

  filteredInvoices = computed(() => {
    let filtered = this.invoices();

    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(invoice =>
        invoice.invoice_number.toLowerCase().includes(query) ||
        invoice.customer?.name?.toLowerCase().includes(query)
      );
    }

    if (this.statusFilter) {
      filtered = filtered.filter(invoice => invoice.status === this.statusFilter);
    }

    if (this.yearFilter) {
      filtered = filtered.filter(invoice =>
        new Date(invoice.issue_date).getFullYear().toString() === this.yearFilter
      );
    }

    if (this.customerIdFilter) {
      filtered = filtered.filter(invoice => invoice.customer_id === this.customerIdFilter);
    }

    return filtered;
  });

  constructor() { }

  ngOnInit() {
    this.loadInvoices();
    this.checkQueryParams();
  }

  private checkQueryParams() {
    // Verifica se c'è un customerId nei query params per filtrare
    this.route.queryParamMap.subscribe(params => {
      const customerId = params.get('customerId');
      if (customerId) {
        this.customerIdFilter = customerId;
      }
    });
  }

  private loadInvoices() {
    this.invoiceService.getInvoices().subscribe({
      next: invoices => {
        this.invoices.set(invoices);
      },
      error: err => {
        console.error('Failed to load invoices:', err);
        this.snackBar.open('Errore durante il caricamento delle fatture.', 'Chiudi', { duration: 3000 });
      }
    });
  }

  applyFilters() {
    // Triggers computed signal recalculation
  }

  clearFilters() {
    this.searchQuery = '';
    this.statusFilter = '';
    this.yearFilter = '';
  }

  viewInvoice(invoiceId: string) {
    this.router.navigate(['/invoices', invoiceId]);
  }

  editInvoice(invoiceId: string) {
    this.router.navigate(['/invoices', invoiceId, 'edit']);
  }

  duplicateInvoice(invoice: Invoice) {
    // Crea una copia della fattura senza ID e con un nuovo numero
    const duplicatedInvoice: Omit<Invoice, 'id' | 'created_at'> = {
      ...invoice,
      invoice_number: this.invoiceService.generateInvoiceNumber(),
      status: 'draft', // Di default una fattura duplicata è in bozza
      items: invoice.items.map(item => ({ ...item, id: undefined, invoice_id: undefined })) // Rimuovi ID degli item
    };

    this.invoiceService.createInvoice(duplicatedInvoice).subscribe({
      next: (newInvoice) => {
        this.snackBar.open('Fattura duplicata con successo!', 'Chiudi', { duration: 3000 });
        this.router.navigate(['/invoices', newInvoice.id, 'edit']); // Naviga alla fattura duplicata in modalità modifica
      },
      error: (err) => {
        console.error('Error duplicating invoice:', err);
        this.snackBar.open('Errore durante la duplicazione della fattura.', 'Chiudi', { duration: 3000 });
      }
    });
  }

  downloadPDF(invoice: Invoice) {
    // PDF download logic
    this.snackBar.open('Download PDF in corso...', 'Chiudi', { duration: 3000 });
  }

  confirmDelete(invoice: Invoice) {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: 'Conferma Eliminazione',
        message: `Sei sicuro di voler eliminare la fattura ${invoice.invoice_number}? Questa operazione è irreversibile.`,
        confirmText: 'Elimina',
        cancelText: 'Annulla'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.deleteInvoice(invoice.id!);
      }
    });
  }

  deleteInvoice(invoiceId: string) {
    this.invoiceService.deleteInvoice(invoiceId).subscribe({
      next: () => {
        this.snackBar.open('Fattura eliminata con successo!', 'Chiudi', { duration: 3000 });
        // Il signal `invoices` nel servizio si aggiornerà automaticamente
        // e la computed property `filteredInvoices` si aggiornerà di conseguenza.
      },
      error: (err) => {
        console.error('Error deleting invoice:', err);
        this.snackBar.open('Errore durante l\'eliminazione della fattura.', 'Chiudi', { duration: 3000 });
      }
    });
  }

  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      'draft': 'Bozza',
      'sent': 'Inviata',
      'paid': 'Pagata',
      'overdue': 'Scaduta'
    };
    return labels[status] || status;
  }

  getStatusClass(status: string): string {
    const classes: { [key: string]: string } = {
      'draft': 'bg-gray-100 text-gray-800',
      'sent': 'bg-blue-100 text-blue-800',
      'paid': 'bg-green-100 text-green-800',
      'overdue': 'bg-red-100 text-red-800'
    };
    return classes[status] || 'bg-gray-100 text-gray-800';
  }

  clearCustomerFilter() {
    this.customerIdFilter = '';
    this.router.navigate([], {
      queryParams: { customerId: null },
      queryParamsHandling: 'merge'
    });
  }

}