import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';

import { Invoice } from '../invoice.model';
import { InvoiceService } from '../invoice.service';

import { PdfService } from '../../../core/print/pdf.service';
import { ConfirmationDialogComponent } from '../../../shared/components/confirmation-dialog/confirmation-dialog.component';

@Component({
  selector: 'app-invoice-detail',
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatChipsModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    MatTooltipModule
  ],
  templateUrl: './invoice-detail.component.html',
  styleUrl: './invoice-detail.component.scss'
})
export class InvoiceDetailComponent implements OnInit {

  route = inject(ActivatedRoute);
  router = inject(Router);
  invoiceService = inject(InvoiceService);
  pdfService = inject(PdfService);
  dialog = inject(MatDialog);
  snackBar = inject(MatSnackBar);

  invoice = signal<Invoice | null>(null);
  loading = signal(true);
  updating = signal(false);

  constructor() { }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadInvoice(id);
    } else {
      this.snackBar.open('ID fattura non valido', 'Chiudi', { duration: 3000 });
      this.router.navigate(['/invoices']);
    }
  }

  private loadInvoice(id: string) {
    this.loading.set(true);

    this.invoiceService.getInvoiceById(id).subscribe({
      next: (invoice) => {
        if (invoice) {
          this.invoice.set(invoice);

          // AGGIUNTA: Verifica l'integrità dei totali
          setTimeout(() => {
            if (!this.verifyTotalIntegrity()) {
              this.snackBar.open(
                'I totali della fattura potrebbero non essere aggiornati',
                'Ricalcola',
                { duration: 5000 }
              );
            }
          }, 100);
        } else {
          this.snackBar.open('Fattura non trovata', 'Chiudi', { duration: 3000 });
          this.router.navigate(['/invoices']);
        }
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.snackBar.open('Errore durante il caricamento della fattura', 'Chiudi', { duration: 5000 });
        console.error('Error loading invoice:', error);
        this.router.navigate(['/invoices']);
      }
    });
  }

  calculatedSubtotal = computed(() => {
    const invoice = this.invoice();
    if (!invoice?.items) return 0;

    return invoice.items.reduce((sum, item) =>
      sum + (item.quantity * item.unit_price), 0);
  });

  calculatedTaxAmount = computed(() => {
    const invoice = this.invoice();
    if (!invoice?.items) return 0;

    return invoice.items.reduce((sum, item) => {
      const subtotal = item.quantity * item.unit_price;
      return sum + (subtotal * (item.tax_rate / 100));
    }, 0);
  });

  calculatedTotal = computed(() => {
    return this.calculatedSubtotal() + this.calculatedTaxAmount();
  });

  private verifyTotalIntegrity(): boolean {
    const invoice = this.invoice();
    if (!invoice) return false;

    const calcSubtotal = this.calculatedSubtotal();
    const calcTaxAmount = this.calculatedTaxAmount();
    const calcTotal = this.calculatedTotal();

    const tolerance = 0.01; // 1 centesimo di tolleranza

    const subtotalMatch = Math.abs(invoice.subtotal - calcSubtotal) <= tolerance;
    const taxMatch = Math.abs(invoice.tax_amount - calcTaxAmount) <= tolerance;
    const totalMatch = Math.abs(invoice.total - calcTotal) <= tolerance;

    if (!subtotalMatch || !taxMatch || !totalMatch) {
      console.warn('Invoice total mismatch detected:', {
        stored: { subtotal: invoice.subtotal, tax: invoice.tax_amount, total: invoice.total },
        calculated: { subtotal: calcSubtotal, tax: calcTaxAmount, total: calcTotal }
      });
      return false;
    }

    return true;
  }


  getDaysToDeadline(): number {
    const invoice = this.invoice();
    if (!invoice?.due_date) return 0;

    const dueDate = new Date(invoice.due_date);
    const today = new Date();
    const diffTime = dueDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  getDaysToDeadlineClass(): string {
    const days = this.getDaysToDeadline();
    if (days < 0) return 'text-error font-bold';
    if (days <= 7) return 'text-orange-600 font-medium';
    return 'text-green-600';
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

  downloadPDF() {
    const invoice = this.invoice();
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

  printInvoice() {
    window.print();
  }

  duplicateInvoice() {
    const invoice = this.invoice();
    if (invoice) {
      this.updating.set(true);

      this.invoiceService.duplicateInvoice(invoice.id!).subscribe({
        next: (duplicatedInvoice) => {
          this.updating.set(false);
          this.snackBar.open('Fattura duplicata con successo', 'Chiudi', { duration: 3000 });
          this.router.navigate(['/invoices', duplicatedInvoice.id, 'edit']);
        },
        error: (error) => {
          this.updating.set(false);
          this.snackBar.open('Errore durante la duplicazione', 'Chiudi', { duration: 3000 });
          console.error('Error duplicating invoice:', error);
        }
      });
    }
  }

  sendInvoice() {
    const invoice = this.invoice();
    if (invoice && invoice.customer?.email) {
      // TODO: Implementare invio email
      this.snackBar.open('Fattura inviata via email', 'Chiudi', { duration: 3000 });
    } else {
      this.snackBar.open('Il cliente non ha un indirizzo email configurato', 'Chiudi', { duration: 3000 });
    }
  }

  markAsSent() {
    this.updateInvoiceStatus('sent');
  }

  markAsPaid() {
    this.updateInvoiceStatus('paid');
  }

  private updateInvoiceStatus(status: Invoice['status']) {
    const invoice = this.invoice();
    if (!invoice?.id) return;

    this.updating.set(true);

    this.invoiceService.updateInvoiceStatus(invoice.id, status).subscribe({
      next: (updatedInvoice) => {
        this.updating.set(false);
        this.invoice.set(updatedInvoice);
        this.snackBar.open(`Fattura aggiornata: ${this.getStatusLabel(status)}`, 'Chiudi', { duration: 3000 });
      },
      error: (error) => {
        this.updating.set(false);
        this.snackBar.open('Errore durante l\'aggiornamento dello stato', 'Chiudi', { duration: 3000 });
        console.error('Error updating invoice status:', error);
      }
    });
  }

  deleteInvoice() {
    const invoice = this.invoice();
    if (!invoice) return;

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
    this.updating.set(true);

    this.invoiceService.deleteInvoice(invoiceId).subscribe({
      next: () => {
        this.updating.set(false);
        this.snackBar.open(`Fattura ${invoiceNumber} eliminata con successo`, 'Chiudi', { duration: 3000 });
        this.router.navigate(['/invoices']);
      },
      error: (error) => {
        this.updating.set(false);
        this.snackBar.open('Errore durante l\'eliminazione della fattura', 'Chiudi', { duration: 3000 });
        console.error('Error deleting invoice:', error);
      }
    });
  }

  goBack() {
    this.router.navigate(['/invoices']);
  }

}