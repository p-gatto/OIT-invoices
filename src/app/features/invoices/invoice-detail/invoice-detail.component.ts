import { Component, inject, OnInit, signal } from '@angular/core';

import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Invoice } from '../invoice.model';
import { InvoiceService } from '../invoice.service';
import { PdfService } from '../../../core/print/pdf.service';

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
    MatMenuModule
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

  constructor() { }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadInvoice(id);
    }
  }

  private loadInvoice(id: string) {
    // Simulate loading invoice from service
    // In real app, this would call invoiceService.getInvoiceById(id)
    setTimeout(() => {
      const mockInvoice: Invoice = {
        id: id,
        invoice_number: 'INV-2025-001234',
        customer_id: 'customer-1',
        customer: {
          id: 'customer-1',
          name: 'Azienda Cliente SRL',
          email: 'info@aziendacliente.com',
          phone: '+39 02 1234567',
          address: 'Via Roma 123, 20100 Milano (MI)',
          tax_code: 'RSSMRA80A01F205X',
          vat_number: '12345678901'
        },
        issue_date: '2025-01-15',
        due_date: '2025-02-15',
        subtotal: 1000.00,
        tax_amount: 220.00,
        total: 1220.00,
        status: 'sent',
        notes: 'Pagamento entro 30 giorni dalla data di emissione.',
        items: [
          {
            id: '1',
            description: 'Sviluppo Applicazione Web',
            quantity: 1,
            unit_price: 800.00,
            tax_rate: 22,
            total: 976.00
          },
          {
            id: '2',
            description: 'Consulenza Tecnica',
            quantity: 4,
            unit_price: 50.00,
            tax_rate: 22,
            total: 244.00
          }
        ],
        created_at: '2025-01-15T10:30:00Z'
      };

      this.invoice.set(mockInvoice);
      this.loading.set(false);
    }, 1000);
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
      this.pdfService.generateInvoicePDF(invoice);
      this.snackBar.open('PDF generato con successo', 'Chiudi', { duration: 3000 });
    }
  }

  printInvoice() {
    window.print();
  }

  duplicateInvoice() {
    const invoice = this.invoice();
    if (invoice) {
      // Navigate to form with duplicated data
      this.router.navigate(['/invoices/new'], {
        queryParams: { duplicate: invoice.id }
      });
    }
  }

  sendInvoice() {
    this.snackBar.open('Fattura inviata via email', 'Chiudi', { duration: 3000 });
  }

  markAsSent() {
    this.updateInvoiceStatus('sent');
  }

  markAsPaid() {
    this.updateInvoiceStatus('paid');
  }

  private updateInvoiceStatus(status: string) {
    const invoice = this.invoice();
    if (invoice) {
      this.invoice.set({ ...invoice, status: status as any });
      this.snackBar.open(`Fattura aggiornata: ${this.getStatusLabel(status)}`, 'Chiudi', { duration: 3000 });
    }
  }

  deleteInvoice() {
    // Show confirmation dialog
    this.snackBar.open('Fattura eliminata', 'Chiudi', { duration: 3000 });
    this.router.navigate(['/invoices']);
  }

  goBack() {
    this.router.navigate(['/invoices']);
  }

}