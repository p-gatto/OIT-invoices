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
        console.log('📊 Dashboard - Fatture caricate:', invoices.length);
        console.log('📊 Dashboard - Prima fattura esempio:', invoices[0]);

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
    console.log('🧮 Dashboard - Inizio calcolo statistiche...');

    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    // 🔧 FIX 1: Calcola revenue totale da TUTTE le fatture (non solo quelle pagate)
    // Considera 'paid' e 'sent' come fatture valide per il fatturato
    const totalRevenue = invoices
      .filter(inv => {
        const isValidStatus = ['paid', 'sent'].includes(inv.status);
        console.log(`Fattura ${inv.invoice_number}: status=${inv.status}, valid=${isValidStatus}, total=${inv.total}`);
        return isValidStatus;
      })
      .reduce((sum, inv) => {
        const total = Number(inv.total) || 0;
        console.log(`Aggiungendo ${total} al totale (era ${sum})`);
        return sum + total;
      }, 0);

    console.log('💰 Revenue totale calcolato:', totalRevenue);

    // Calcola fatture in attesa (solo 'sent')
    const pendingInvoices = invoices.filter(inv => inv.status === 'sent').length;

    // 🔧 FIX 2: Migliora il calcolo delle fatture scadute
    const overdueInvoices = invoices.filter(inv => {
      if (inv.status !== 'sent' || !inv.due_date) return false;

      const dueDate = new Date(inv.due_date);
      const todayReset = new Date();
      todayReset.setHours(0, 0, 0, 0);
      dueDate.setHours(0, 0, 0, 0);

      const isOverdue = dueDate < todayReset;
      console.log(`Fattura ${inv.invoice_number}: due=${inv.due_date}, overdue=${isOverdue}`);
      return isOverdue;
    }).length;

    // 🔧 FIX 3: Revenue del mese corrente più flessibile
    const thisMonthRevenue = invoices
      .filter(inv => {
        const invoiceDate = new Date(inv.issue_date);
        const isValidStatus = ['paid', 'sent'].includes(inv.status);
        const isThisMonth = invoiceDate.getMonth() === currentMonth &&
          invoiceDate.getFullYear() === currentYear;

        console.log(`Fattura ${inv.invoice_number}: date=${inv.issue_date}, thisMonth=${isThisMonth}, status=${inv.status}`);
        return isValidStatus && isThisMonth;
      })
      .reduce((sum, inv) => {
        const total = Number(inv.total) || 0;
        return sum + total;
      }, 0);

    console.log('📅 Revenue questo mese:', thisMonthRevenue);

    const newStats = {
      totalInvoices: invoices.length,
      totalRevenue: Math.round(totalRevenue * 100) / 100, // Arrotonda a 2 decimali
      pendingInvoices,
      overdueInvoices,
      totalCustomers: 0, // Verrà aggiornato da loadCustomerStats()
      thisMonthRevenue: Math.round(thisMonthRevenue * 100) / 100
    };

    console.log('📊 Statistiche finali:', newStats);
    this.stats.set(newStats);
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
  }

  // 🔧 FIX 4: Metodo migliorato per calcolare crescita mensile
  calculateMonthlyGrowth(): number {
    const thisMonth = this.stats().thisMonthRevenue;
    const total = this.stats().totalRevenue;

    if (total === 0) return 0;

    // Calcola la percentuale del fatturato mensile rispetto al totale
    const percentage = (thisMonth / total) * 100;
    return Math.round(percentage * 10) / 10; // Arrotonda a 1 decimale
  }

  // Calcola la percentuale di fatture pagate
  getPaidPercentage(): number {
    const total = this.stats().totalInvoices;
    if (total === 0) return 0;

    // Considera sia 'paid' che 'sent' come "processate" vs 'draft'
    const processedCount = total - this.countDraftInvoices();
    return Math.round((processedCount / total) * 100);
  }

  // Calcola la percentuale di fatture in attesa
  getPendingPercentage(): number {
    const total = this.stats().totalInvoices;
    if (total === 0) return 0;

    return Math.round((this.stats().pendingInvoices / total) * 100);
  }

  // 🔧 FIX 5: Metodo helper per contare le bozze
  private countDraftInvoices(): number {
    // Se hai accesso alle fatture, conta quelle con status 'draft'
    const recent = this.recentInvoices();
    return recent.filter(inv => inv.status === 'draft').length;
  }

  // 🔧 FIX 6: Metodi di debug per troubleshooting
  debugStats() {
    console.group('🐛 DEBUG Dashboard Stats');
    console.log('Current stats:', this.stats());
    console.log('Recent invoices:', this.recentInvoices());

    // Analizza ogni fattura recente
    this.recentInvoices().forEach((inv, index) => {
      console.log(`Invoice ${index + 1}:`, {
        number: inv.invoice_number,
        status: inv.status,
        total: inv.total,
        totalType: typeof inv.total,
        totalNumber: Number(inv.total)
      });
    });
    console.groupEnd();
  }

}