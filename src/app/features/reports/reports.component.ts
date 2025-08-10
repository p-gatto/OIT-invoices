import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { ChartConfiguration, ChartOptions } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';

import { startOfMonth, subMonths, endOfMonth, subDays } from 'date-fns';

import { InvoiceService } from '../invoices/invoice.service';
import { CustomerService } from '../customers/customer.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-reports',
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    BaseChartDirective
  ],
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.scss'
})
export class ReportsComponent {

  totalRevenue = 0;
  prevPeriodRevenue = 0;
  activeCustomers = 0;

  // Chart.js dataset
  pieChartData: ChartConfiguration<'pie'>['data'] = { labels: [], datasets: [{ data: [] }] };
  pieChartOptions: ChartOptions<'pie'> = { responsive: true };

  selectedFilter = 'month'; // month | last30 | custom
  customFrom?: Date;
  customTo?: Date;

  constructor(private invoiceSrv: InvoiceService, private customerSrv: CustomerService) { }

  async ngOnInit() {
    await this.loadData();
  }

  async loadData() {
    const { from, to, prevFrom, prevTo } = this.getDateRange();

    // Totale periodo selezionato
    this.totalRevenue = await this.invoiceSrv.getTotalRevenue(from, to);

    // Periodo precedente (per confronto)
    this.prevPeriodRevenue = await this.invoiceSrv.getTotalRevenue(prevFrom, prevTo);

    // Statistiche fatture
    const stats = await this.invoiceSrv.getInvoiceCountByStatus(from, to);
    this.pieChartData = {
      labels: stats.map(s => s.status),
      datasets: [{ data: stats.map(s => s.count) }]
    };

    // Clienti attivi
    this.activeCustomers = await this.customerSrv.getActiveCustomerCount();
  }

  getDateRange() {
    let from: Date, to: Date, prevFrom: Date, prevTo: Date;

    if (this.selectedFilter === 'month') {
      from = startOfMonth(new Date());
      to = endOfMonth(new Date());
      prevFrom = startOfMonth(subMonths(new Date(), 1));
      prevTo = endOfMonth(subMonths(new Date(), 1));
    } else if (this.selectedFilter === 'last30') {
      from = subDays(new Date(), 30);
      to = new Date();
      prevFrom = subDays(from, 30);
      prevTo = from;
    } else if (this.selectedFilter === 'custom' && this.customFrom && this.customTo) {
      from = this.customFrom;
      to = this.customTo;
      const diff = Math.ceil((+to - +from) / (1000 * 60 * 60 * 24));
      prevFrom = subDays(from, diff);
      prevTo = from;
    } else {
      throw new Error('Filtro data non valido');
    }

    return { from, to, prevFrom, prevTo };
  }

}