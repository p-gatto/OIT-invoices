import { Component, inject, OnInit, signal } from '@angular/core';

import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';

import { Invoice } from '../invoices/invoice.model';
import { InvoiceService } from '../invoices/invoice.service';

import { DashboardStats } from './dashboard-stats.model';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { CustomerService } from '../customers/customer.service';

@Component({
  selector: 'app-dashboard',
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressBarModule,
    MatChipsModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {

  invoiceService = inject(InvoiceService);
  customerService = inject(CustomerService);
  router = inject(Router);

  stats = signal<DashboardStats>({
    totalInvoices: 0,
    totalRevenue: 0,
    pendingInvoices: 0,
    overdueInvoices: 0,
    totalCustomers: 0,
    thisMonthRevenue: 0
  });

  recentInvoices = signal<Invoice[]>([]);
  loading = signal(true);

  constructor() { }

  ngOnInit() {
    this.loadDashboardData();
  }

  private loadDashboardData() {
    this.loading.set(true);

    // Carica fatture
    this.invoiceService.getInvoices().subscribe({
      next: invoices => {
        // Prendi le ultime 5 fatture per la sezione recenti
        this.recentInvoices.set(invoices.slice(0, 5));
        this.calculateInvoiceStats(invoices);
        this.loadCustomerStats();
      },
      error: error => {
        console.error('Error loading invoices for dashboard:', error);
        this.loading.set(false);
      }
    });
  }

  private loadCustomerStats() {
    this.customerService.getCustomers().subscribe({
      next: customers => {
        const currentStats = this.stats();
        this.stats.set({
          ...currentStats,
          totalCustomers: customers.length
        });
        this.loading.set(false);
      },
      error: error => {
        console.error('Error loading customers for dashboard:', error);
        this.loading.set(false);
      }
    });
  }

  private calculateInvoiceStats(invoices: Invoice[]) {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    // Calcola revenue totale (solo fatture pagate)
    const totalRevenue = invoices
      .filter(inv => inv.status === 'paid')
      .reduce((sum, inv) => sum + inv.total, 0);

    // Calcola fatture in attesa
    const pendingInvoices = invoices.filter(inv => inv.status === 'sent').length;

    // Calcola fatture scadute
    const overdueInvoices = invoices.filter(inv => {
      if (inv.status !== 'sent' || !inv.due_date) return false;
      return new Date(inv.due_date) < today;
    }).length;

    // Calcola revenue del mese corrente
    const thisMonthRevenue = invoices
      .filter(inv => {
        const invoiceDate = new Date(inv.issue_date);
        return inv.status === 'paid' &&
          invoiceDate.getMonth() === currentMonth &&
          invoiceDate.getFullYear() === currentYear;
      })
      .reduce((sum, inv) => sum + inv.total, 0);

    this.stats.set({
      totalInvoices: invoices.length,
      totalRevenue,
      pendingInvoices,
      overdueInvoices,
      totalCustomers: 0, // Verrà aggiornato da loadCustomerStats()
      thisMonthRevenue
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

  navigateToInvoice(invoiceId: string) {
    this.router.navigate(['/invoices', invoiceId]);
  }

  // Calcola giorni alla scadenza per le fatture recenti
  getDaysToDeadline(invoice: Invoice): number {
    if (!invoice.due_date) return 0;
    const dueDate = new Date(invoice.due_date);
    const today = new Date();
    const diffTime = dueDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  getDaysToDeadlineText(invoice: Invoice): string {
    if (!invoice.due_date) return '';
    const days = this.getDaysToDeadline(invoice);

    if (days < 0) return `Scaduta da ${Math.abs(days)} giorni`;
    if (days === 0) return 'Scade oggi';
    if (days === 1) return 'Scade domani';
    return `Scade tra ${days} giorni`;
  }

  getDaysToDeadlineClass(invoice: Invoice): string {
    const days = this.getDaysToDeadline(invoice);
    if (days < 0) return 'text-error';
    if (days <= 7) return 'text-orange-600';
    return 'text-green-600';
  }

  // Metodi di navigazione rapida
  goToInvoices() {
    this.router.navigate(['/invoices']);
  }

  goToPendingInvoices() {
    this.router.navigate(['/invoices'], { queryParams: { status: 'sent' } });
  }

  goToOverdueInvoices() {
    this.router.navigate(['/invoices'], { queryParams: { status: 'overdue' } });
  }

  goToCustomers() {
    this.router.navigate(['/customers']);
  }

  createNewInvoice() {
    this.router.navigate(['/invoices/new']);
  }

  createNewCustomer() {
    this.router.navigate(['/customers']);
    // Trigger new customer dialog (this would need to be implemented in the customers component)
  }

  // Calcola la crescita percentuale mensile (placeholder per logica futura)
  calculateMonthlyGrowth(): number {
    // Logica semplificata - in futuro si potrebbe confrontare con il mese precedente
    const thisMonth = this.stats().thisMonthRevenue;
    const total = this.stats().totalRevenue;

    if (total === 0) return 0;
    return (thisMonth / total) * 100;
  }

  // Calcola la percentuale di fatture pagate
  getPaidPercentage(): number {
    const total = this.stats().totalInvoices;
    if (total === 0) return 0;

    const paidCount = total - this.stats().pendingInvoices - this.stats().overdueInvoices;
    return (paidCount / total) * 100;
  }

  // Calcola la percentuale di fatture in attesa
  getPendingPercentage(): number {
    const total = this.stats().totalInvoices;
    if (total === 0) return 0;

    return (this.stats().pendingInvoices / total) * 100;
  }

}