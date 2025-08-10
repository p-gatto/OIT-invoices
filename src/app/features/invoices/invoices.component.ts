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
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';

import { Invoice } from './invoice.model';
import { InvoiceService } from './invoice.service';
import { ConfirmationDialogComponent } from '../../shared/components/confirmation-dialog/confirmation-dialog.component';
import { PdfService } from '../../core/print/pdf.service';

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
    MatDividerModule,
    MatProgressSpinnerModule,
    MatTooltipModule
  ],
  templateUrl: './invoices.component.html',
  styleUrl: './invoices.component.scss'
})
export class InvoicesComponent implements OnInit {

  invoiceService = inject(InvoiceService);
  pdfService = inject(PdfService);
  dialog = inject(MatDialog);
  snackBar = inject(MatSnackBar);
  router = inject(Router);
  route = inject(ActivatedRoute);

  invoices = signal<Invoice[]>([]);
  loading = signal(true);

  // Signal per i filtri - conversione delle variabili esistenti in signal
  searchQuery = signal('');
  statusFilter = signal('');
  yearFilter = signal('');
  customerIdFilter = signal('');

  displayedColumns = ['invoice_number', 'customer', 'date', 'amount', 'status', 'actions'];

  // Computed per gli anni disponibili
  availableYears = computed(() => {
    const years = new Set<number>();
    this.invoices().forEach(invoice => {
      years.add(new Date(invoice.issue_date).getFullYear());
    });
    return Array.from(years).sort((a, b) => b - a);
  });

  // Computed per gli stati disponibili con conteggio
  availableStatuses = computed(() => {
    const statusMap = new Map<string, number>();
    this.invoices().forEach(invoice => {
      statusMap.set(invoice.status, (statusMap.get(invoice.status) || 0) + 1);
    });

    return Array.from(statusMap.entries()).map(([status, count]) => ({
      value: status,
      label: this.getStatusLabel(status),
      count
    }));
  });

  // Computed per le fatture filtrate - logica simile ma più robusta
  filteredInvoices = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const status = this.statusFilter();
    const year = this.yearFilter();
    const customerId = this.customerIdFilter();
    let filtered = this.invoices();

    // Filtro per ricerca testuale
    if (query) {
      filtered = filtered.filter(invoice =>
        invoice.invoice_number.toLowerCase().includes(query) ||
        invoice.customer?.name?.toLowerCase().includes(query) ||
        invoice.customer?.email?.toLowerCase().includes(query) ||
        invoice.notes?.toLowerCase().includes(query)
      );
    }

    // Filtro per stato
    if (status) {
      filtered = filtered.filter(invoice => invoice.status === status);
    }

    // Filtro per anno
    if (year) {
      filtered = filtered.filter(invoice =>
        new Date(invoice.issue_date).getFullYear().toString() === year
      );
    }

    // Filtro per cliente specifico
    if (customerId) {
      filtered = filtered.filter(invoice => invoice.customer_id === customerId);
    }

    return filtered;
  });

  // Computed per statistiche rapide
  invoiceStats = computed(() => {
    const filtered = this.filteredInvoices();

    // Calcola i totali correttamente
    const total = filtered.reduce((sum, inv) => {
      // Assicurati che inv.total sia un numero
      const invoiceTotal = Number(inv.total) || 0;
      return sum + invoiceTotal;
    }, 0);

    const pending = filtered.filter(inv => inv.status === 'sent').length;

    // Migliora il calcolo delle fatture scadute
    const overdue = filtered.filter(inv => {
      if (inv.status !== 'sent' || !inv.due_date) return false;
      const dueDate = new Date(inv.due_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate < today;
    }).length;

    return {
      count: filtered.length,
      total: Math.round(total * 100) / 100, // Arrotonda a 2 decimali
      pending,
      overdue
    };
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
      const status = params.get('status');

      if (customerId) {
        this.customerIdFilter.set(customerId);
      }

      if (status) {
        this.statusFilter.set(status);
      }
    });
  }

  private loadInvoices() {
    this.loading.set(true);
    this.invoiceService.getInvoices().subscribe({
      next: invoices => {
        // AGGIUNTA: Verifica che tutti i totali siano numerici
        const validatedInvoices = invoices.map(invoice => ({
          ...invoice,
          subtotal: Number(invoice.subtotal) || 0,
          tax_amount: Number(invoice.tax_amount) || 0,
          total: Number(invoice.total) || 0
        }));

        this.invoices.set(validatedInvoices);
        this.loading.set(false);
      },
      error: err => {
        this.loading.set(false);
        this.snackBar.open('Errore durante il caricamento delle fatture.', 'Chiudi', { duration: 3000 });
        console.error('Failed to load invoices:', err);
      }
    });
  }

  refreshStats() {
    // Forza il ricalcolo triggherando il computed
    this.loadInvoices();
  }

  /**
   * Applica i filtri - ora gestito automaticamente dai signal
   */
  applyFilters() {
    // Con i signal, questo metodo può essere utilizzato per logiche aggiuntive
    // Il computed filteredInvoices si aggiorna automaticamente
  }

  /**
   * Pulisce tutti i filtri
   */
  clearFilters() {
    this.searchQuery.set('');
    this.statusFilter.set('');
    this.yearFilter.set('');
    // Non pulire customerIdFilter se viene dai query params
    if (!this.route.snapshot.queryParamMap.get('customerId')) {
      this.customerIdFilter.set('');
    }
  }

  /**
   * Imposta un filtro di ricerca specifico
   */
  setSearchQuery(query: string) {
    this.searchQuery.set(query);
  }

  /**
   * Imposta un filtro stato specifico
   */
  setStatusFilter(status: string) {
    this.statusFilter.set(status);
  }

  /**
   * Imposta un filtro anno specifico
   */
  setYearFilter(year: string) {
    this.yearFilter.set(year);
  }

  /**
   * Restituisce il numero di risultati filtrati
   */
  getFilteredCount(): number {
    return this.filteredInvoices().length;
  }

  /**
   * Verifica se sono attivi dei filtri
   */
  hasActiveFilters(): boolean {
    return this.searchQuery().trim().length > 0 ||
      this.statusFilter().length > 0 ||
      this.yearFilter().length > 0 ||
      (this.customerIdFilter().length > 0 && !this.route.snapshot.queryParamMap.get('customerId'));
  }

  /**
   * Ferma la propagazione del click event
   */
  stopEventPropagation(event: Event) {
    event.stopPropagation();
    event.preventDefault();
  }

  viewInvoice(invoiceId: string) {
    this.router.navigate(['/invoices', invoiceId]);
  }

  editInvoice(invoiceId: string) {
    this.router.navigate(['/invoices', invoiceId, 'edit']);
  }

  duplicateInvoice(invoice: Invoice) {
    // Crea una copia pulita della fattura
    const { id, created_at, ...invoiceData } = invoice;

    const duplicatedInvoice: Omit<Invoice, 'id' | 'created_at'> = {
      ...invoiceData,
      invoice_number: this.invoiceService.generateInvoiceNumber(),
      status: 'draft', // Di default una fattura duplicata è in bozza
      items: invoice.items.map(({ id, invoice_id, ...item }) => item) // Rimuovi ID degli item
    };

    this.invoiceService.createInvoice(duplicatedInvoice).subscribe({
      next: (newInvoice) => {
        this.snackBar.open('Fattura duplicata con successo!', 'Chiudi', { duration: 3000 });
        this.router.navigate(['/invoices', newInvoice.id, 'edit']);
      },
      error: (err) => {
        console.error('Error duplicating invoice:', err);
        this.snackBar.open('Errore durante la duplicazione della fattura.', 'Chiudi', { duration: 3000 });
      }
    });
  }

  downloadPDF(pInvoice: Invoice) {
    // PDF download logic
    const invoice = pInvoice;
    if (invoice) {
      try {
        this.pdfService.generateInvoicePDF(invoice);
        this.snackBar.open('PDF generato con successo', 'Chiudi', { duration: 3000 });
      } catch (error) {
        console.error('Error generating PDF:', error);
        this.snackBar.open('Errore durante la generazione del PDF', 'Chiudi', { duration: 3000 });
      }
    }
  }

  deleteInvoice(invoice: Invoice) {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '500px',
      data: {
        title: 'Conferma Eliminazione',
        message: `Sei sicuro di voler eliminare la fattura ${invoice.invoice_number}? Questa operazione è irreversibile.`,
        confirmText: 'Elimina',
        cancelText: 'Annulla'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && invoice.id) {
        this.performDelete(invoice.id, invoice.invoice_number);
      }
    });
  }

  private performDelete(invoiceId: string, invoiceNumber: string) {
    this.invoiceService.deleteInvoice(invoiceId).subscribe({
      next: () => {
        this.snackBar.open(`Fattura ${invoiceNumber} eliminata con successo!`, 'Chiudi', { duration: 3000 });
        this.loadInvoices();
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
    this.customerIdFilter.set('');
    this.router.navigate([], {
      queryParams: { customerId: null },
      queryParamsHandling: 'merge'
    });
  }

  /**
   * Calcola i giorni alla scadenza per una fattura
   */
  getDaysToDeadline(invoice: Invoice): number {
    if (!invoice.due_date) return 0;
    const dueDate = new Date(invoice.due_date);
    const today = new Date();
    const diffTime = dueDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Restituisce la classe CSS per i giorni alla scadenza
   */
  getDaysToDeadlineClass(invoice: Invoice): string {
    const days = this.getDaysToDeadline(invoice);
    if (days < 0) return 'text-error font-bold';
    if (days <= 7) return 'text-orange-600 font-medium';
    return 'text-green-600';
  }

}