import { Component, OnInit, signal } from '@angular/core';

import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';

import { Invoice } from '../invoices/invoice.model';
import { InvoiceService } from '../invoices/invoice.service';

import { DashboardStats } from './dashboard-stats.model';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

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
  stats = signal<DashboardStats>({
    totalInvoices: 0,
    totalRevenue: 0,
    pendingInvoices: 0,
    overdueInvoices: 0,
    totalCustomers: 0,
    thisMonthRevenue: 0
  });

  recentInvoices = signal<Invoice[]>([]);

  constructor(private invoiceService: InvoiceService) { }

  ngOnInit() {
    this.loadDashboardData();
  }

  private loadDashboardData() {
    // Load invoices
    this.invoiceService.getInvoices().subscribe(invoices => {
      this.recentInvoices.set(invoices.slice(0, 5));
      this.calculateStats(invoices);
    });
  }

  private calculateStats(invoices: Invoice[]) {
    const totalRevenue = invoices.reduce((sum, inv) => sum + inv.total, 0);
    const pendingInvoices = invoices.filter(inv => inv.status === 'sent').length;
    const overdueInvoices = invoices.filter(inv =>
      inv.status === 'sent' && inv.due_date && new Date(inv.due_date) < new Date()
    ).length;

    this.stats.set({
      totalInvoices: invoices.length,
      totalRevenue,
      pendingInvoices,
      overdueInvoices,
      totalCustomers: this.invoiceService.customers().length,
      thisMonthRevenue: this.calculateThisMonthRevenue(invoices)
    });
  }

  private calculateThisMonthRevenue(invoices: Invoice[]): number {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    return invoices
      .filter(inv => {
        const invoiceDate = new Date(inv.issue_date);
        return invoiceDate.getMonth() === currentMonth &&
          invoiceDate.getFullYear() === currentYear;
      })
      .reduce((sum, inv) => sum + inv.total, 0);
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
    // Navigate to invoice detail
  }

}