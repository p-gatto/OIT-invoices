import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';

import { ChartConfiguration, ChartOptions, ChartData } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';

import { startOfMonth, subMonths, endOfMonth, subDays, startOfYear, endOfYear, format, isAfter, isBefore } from 'date-fns';
import { it } from 'date-fns/locale';

import { InvoiceService } from '../invoices/invoice.service';
import { CustomerService } from '../customers/customer.service';
import { ProductService } from '../products/product.service';

interface ReportFilters {
  dateRange: 'thisMonth' | 'lastMonth' | 'last3Months' | 'last6Months' | 'thisYear' | 'lastYear' | 'custom';
  customFrom?: Date;
  customTo?: Date;
  customerId?: string;
  status?: string;
}

interface DashboardMetrics {
  totalRevenue: number;
  prevPeriodRevenue: number;
  revenueGrowth: number;
  totalInvoices: number;
  prevPeriodInvoices: number;
  invoiceGrowth: number;
  averageInvoiceValue: number;
  activeCustomers: number;
  topCustomers: Array<{ name: string; revenue: number; invoices: number }>;
  statusDistribution: Array<{ status: string; count: number; percentage: number; label: string }>;
  monthlyTrend: Array<{ month: string; revenue: number; invoices: number }>;
  productPerformance: Array<{ name: string; usage: number; revenue: number }>;
}

@Component({
  selector: 'app-reports',
  imports: [
    CommonModule,
    DatePipe,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatTooltipModule,
    BaseChartDirective
  ],
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.scss'
})
export class ReportsComponent implements OnInit {

  invoiceService = inject(InvoiceService);
  customerService = inject(CustomerService);
  productService = inject(ProductService);

  // Signals for state management
  loading = signal(true);
  filters = signal<ReportFilters>({
    dateRange: 'thisMonth'
  });
  metrics = signal<DashboardMetrics>({
    totalRevenue: 0,
    prevPeriodRevenue: 0,
    revenueGrowth: 0,
    totalInvoices: 0,
    prevPeriodInvoices: 0,
    invoiceGrowth: 0,
    averageInvoiceValue: 0,
    activeCustomers: 0,
    topCustomers: [],
    statusDistribution: [],
    monthlyTrend: [],
    productPerformance: []
  });

  customers = signal<Array<{ id: string; name: string }>>([]);

  // Chart configurations
  revenueChartData = signal<ChartData<'line'>>({
    labels: [],
    datasets: []
  });

  statusChartData = signal<ChartData<'doughnut'>>({
    labels: [],
    datasets: []
  });

  topCustomersChartData = signal<ChartData<'bar'>>({
    labels: [],
    datasets: []
  });

  // Chart options
  revenueChartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: true,
        text: 'Trend Fatturato Mensile'
      },
      legend: {
        display: true,
        position: 'top'
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function (value) {
            return '€' + Number(value).toLocaleString('it-IT');
          }
        }
      }
    }
  };

  statusChartOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: true,
        text: 'Distribuzione Stati Fatture'
      },
      legend: {
        position: 'right'
      }
    }
  };

  customersChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y' as const,
    plugins: {
      title: {
        display: true,
        text: 'Top 5 Clienti per Fatturato'
      },
      legend: {
        display: false
      }
    },
    scales: {
      x: {
        beginAtZero: true,
        ticks: {
          callback: function (value) {
            return '€' + Number(value).toLocaleString('it-IT');
          }
        }
      }
    }
  };

  // Computed properties
  dateRangeLabel = computed(() => {
    const range = this.filters().dateRange;
    const labels = {
      thisMonth: 'Questo Mese',
      lastMonth: 'Mese Scorso',
      last3Months: 'Ultimi 3 Mesi',
      last6Months: 'Ultimi 6 Mesi',
      thisYear: 'Quest\'Anno',
      lastYear: 'Anno Scorso',
      custom: 'Personalizzato'
    };
    return labels[range];
  });

  customDateRange = computed(() => {
    const filters = this.filters();
    return filters.dateRange === 'custom' && filters.customFrom && filters.customTo;
  });

  growthIndicators = computed(() => {
    const m = this.metrics();
    return {
      revenue: {
        value: m.revenueGrowth,
        isPositive: m.revenueGrowth >= 0,
        icon: m.revenueGrowth >= 0 ? 'trending_up' : 'trending_down',
        color: m.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'
      },
      invoices: {
        value: m.invoiceGrowth,
        isPositive: m.invoiceGrowth >= 0,
        icon: m.invoiceGrowth >= 0 ? 'trending_up' : 'trending_down',
        color: m.invoiceGrowth >= 0 ? 'text-green-600' : 'text-red-600'
      }
    };
  });

  ngOnInit() {
    this.loadCustomers();
    this.loadData();
  }

  private loadCustomers() {
    this.customerService.getActiveCustomers().subscribe({
      next: customers => {
        this.customers.set(customers.map(c => ({ id: c.id!, name: c.name })));
      },
      error: error => {
        console.error('Error loading customers:', error);
      }
    });
  }

  async loadData() {
    this.loading.set(true);

    try {
      const { from, to, prevFrom, prevTo } = this.getDateRange();

      // Carica tutti i dati in parallelo
      const [
        currentInvoices,
        previousInvoices,
        customers,
        topCustomers,
        monthlyData,
        productsData
      ] = await Promise.all([
        this.loadInvoicesForPeriod(from, to),
        this.loadInvoicesForPeriod(prevFrom, prevTo),
        this.customerService.getActiveCustomerCount(),
        this.invoiceService.getTopCustomersByRevenue(5).toPromise(),
        this.loadMonthlyTrend(from, to),
        this.productService.getMostUsedProductsSimple(5).toPromise()
      ]);

      // Calcola metriche
      const metrics = this.calculateMetrics(
        currentInvoices,
        previousInvoices,
        customers,
        topCustomers || [],
        monthlyData,
        productsData || []
      );

      this.metrics.set(metrics);
      this.updateCharts(metrics);

    } catch (error) {
      console.error('Error loading report data:', error);
    } finally {
      this.loading.set(false);
    }
  }

  private async loadInvoicesForPeriod(from: Date, to: Date) {
    return new Promise<any[]>((resolve, reject) => {
      this.invoiceService.getInvoicesByDateRange(
        this.formatDateForDB(from),
        this.formatDateForDB(to)
      ).subscribe({
        next: invoices => resolve(invoices),
        error: error => reject(error)
      });
    });
  }

  private async loadMonthlyTrend(from: Date, to: Date) {
    // Genera i mesi nel range
    const months: Array<{ month: string; revenue: number; invoices: number }> = [];
    let current = new Date(from);

    while (current <= to) {
      const monthStart = startOfMonth(current);
      const monthEnd = endOfMonth(current);

      try {
        const monthInvoices = await this.loadInvoicesForPeriod(monthStart, monthEnd);
        const revenue = monthInvoices
          .filter(inv => ['paid', 'sent'].includes(inv.status))
          .reduce((sum, inv) => sum + (Number(inv.total) || 0), 0);

        months.push({
          month: format(current, 'MMM yyyy', { locale: it }),
          revenue: Math.round(revenue * 100) / 100,
          invoices: monthInvoices.length
        });
      } catch (error) {
        console.error('Error loading month data:', error);
        months.push({
          month: format(current, 'MMM yyyy', { locale: it }),
          revenue: 0,
          invoices: 0
        });
      }

      current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
    }

    return months;
  }

  private calculateMetrics(
    currentInvoices: any[],
    previousInvoices: any[],
    activeCustomers: number,
    topCustomers: any[],
    monthlyData: any[],
    productsData: any[]
  ): DashboardMetrics {

    // Revenue metrics
    const totalRevenue = currentInvoices
      .filter(inv => ['paid', 'sent'].includes(inv.status))
      .reduce((sum, inv) => sum + (Number(inv.total) || 0), 0);

    const prevPeriodRevenue = previousInvoices
      .filter(inv => ['paid', 'sent'].includes(inv.status))
      .reduce((sum, inv) => sum + (Number(inv.total) || 0), 0);

    const revenueGrowth = prevPeriodRevenue > 0
      ? ((totalRevenue - prevPeriodRevenue) / prevPeriodRevenue) * 100
      : 0;

    // Invoice metrics
    const totalInvoices = currentInvoices.length;
    const prevPeriodInvoices = previousInvoices.length;
    const invoiceGrowth = prevPeriodInvoices > 0
      ? ((totalInvoices - prevPeriodInvoices) / prevPeriodInvoices) * 100
      : 0;

    // Average invoice value
    const averageInvoiceValue = totalInvoices > 0 ? totalRevenue / totalInvoices : 0;

    // Status distribution
    const statusMap = new Map<string, number>();
    currentInvoices.forEach(inv => {
      const status = this.determineActualStatus(inv);
      statusMap.set(status, (statusMap.get(status) || 0) + 1);
    });

    const statusDistribution = Array.from(statusMap.entries()).map(([status, count]) => ({
      status,
      count,
      percentage: totalInvoices > 0 ? (count / totalInvoices) * 100 : 0,
      label: this.getStatusLabel(status)
    }));

    // Top customers processing
    const processedTopCustomers = (topCustomers || []).slice(0, 5).map(tc => ({
      name: tc.customer?.name || 'Cliente sconosciuto',
      revenue: tc.totalRevenue || 0,
      invoices: tc.invoiceCount || 0
    }));

    // Product performance
    const productPerformance = (productsData || []).map(product => ({
      name: product.name,
      usage: 0, // Questo dovrebbe essere calcolato dal servizio
      revenue: 0 // Questo dovrebbe essere calcolato dal servizio
    }));

    return {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      prevPeriodRevenue: Math.round(prevPeriodRevenue * 100) / 100,
      revenueGrowth: Math.round(revenueGrowth * 10) / 10,
      totalInvoices,
      prevPeriodInvoices,
      invoiceGrowth: Math.round(invoiceGrowth * 10) / 10,
      averageInvoiceValue: Math.round(averageInvoiceValue * 100) / 100,
      activeCustomers,
      topCustomers: processedTopCustomers,
      statusDistribution,
      monthlyTrend: monthlyData,
      productPerformance
    };
  }

  private determineActualStatus(invoice: any): string {
    if (invoice.status !== 'sent') return invoice.status;

    // Verifica se è scaduta
    if (invoice.due_date) {
      const dueDate = new Date(invoice.due_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      dueDate.setHours(0, 0, 0, 0);

      if (dueDate < today) {
        return 'overdue';
      }
    }

    return 'sent';
  }

  private updateCharts(metrics: DashboardMetrics) {
    // Revenue trend chart
    this.revenueChartData.set({
      labels: metrics.monthlyTrend.map(m => m.month),
      datasets: [
        {
          label: 'Fatturato',
          data: metrics.monthlyTrend.map(m => m.revenue),
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.4,
          fill: true
        },
        {
          label: 'Numero Fatture',
          data: metrics.monthlyTrend.map(m => m.invoices),
          borderColor: 'rgb(16, 185, 129)',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          tension: 0.4,
          yAxisID: 'y1'
        }
      ]
    });

    // Status distribution chart
    const statusColors = {
      draft: '#6B7280',
      sent: '#3B82F6',
      paid: '#10B981',
      overdue: '#EF4444'
    };

    this.statusChartData.set({
      labels: metrics.statusDistribution.map(s => s.label),
      datasets: [{
        data: metrics.statusDistribution.map(s => s.count),
        backgroundColor: metrics.statusDistribution.map(s =>
          statusColors[s.status as keyof typeof statusColors] || '#6B7280'
        ),
        borderWidth: 2,
        borderColor: '#ffffff'
      }]
    });

    // Top customers chart
    this.topCustomersChartData.set({
      labels: metrics.topCustomers.map(c => c.name.length > 20 ? c.name.substring(0, 17) + '...' : c.name),
      datasets: [{
        label: 'Fatturato €',
        data: metrics.topCustomers.map(c => c.revenue),
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(139, 92, 246, 0.8)'
        ],
        borderColor: [
          'rgb(59, 130, 246)',
          'rgb(16, 185, 129)',
          'rgb(245, 158, 11)',
          'rgb(239, 68, 68)',
          'rgb(139, 92, 246)'
        ],
        borderWidth: 1
      }]
    });
  }

  // Event handlers
  onFilterChange() {
    this.loadData();
  }

  onDateRangeChange(range: ReportFilters['dateRange']) {
    this.filters.update(f => ({ ...f, dateRange: range }));
    this.loadData();
  }

  onCustomerChange(customerId: string) {
    this.filters.update(f => ({ ...f, customerId }));
    this.loadData();
  }

  onStatusChange(status: string) {
    this.filters.update(f => ({ ...f, status }));
    this.loadData();
  }

  onCustomDateChange() {
    if (this.customDateRange()) {
      this.loadData();
    }
  }

  exportReport() {
    const metrics = this.metrics();
    const reportData = {
      period: this.dateRangeLabel(),
      generatedAt: new Date().toISOString(),
      metrics,
      filters: this.filters()
    };

    const dataStr = JSON.stringify(reportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `report-${format(new Date(), 'yyyy-MM-dd')}.json`;
    link.click();

    URL.revokeObjectURL(url);
  }

  // Utility methods
  private getDateRange() {
    const filters = this.filters();
    let from: Date, to: Date, prevFrom: Date, prevTo: Date;

    const now = new Date();

    switch (filters.dateRange) {
      case 'thisMonth':
        from = startOfMonth(now);
        to = endOfMonth(now);
        prevFrom = startOfMonth(subMonths(now, 1));
        prevTo = endOfMonth(subMonths(now, 1));
        break;

      case 'lastMonth':
        from = startOfMonth(subMonths(now, 1));
        to = endOfMonth(subMonths(now, 1));
        prevFrom = startOfMonth(subMonths(now, 2));
        prevTo = endOfMonth(subMonths(now, 2));
        break;

      case 'last3Months':
        from = startOfMonth(subMonths(now, 2));
        to = endOfMonth(now);
        prevFrom = startOfMonth(subMonths(now, 5));
        prevTo = endOfMonth(subMonths(now, 3));
        break;

      case 'last6Months':
        from = startOfMonth(subMonths(now, 5));
        to = endOfMonth(now);
        prevFrom = startOfMonth(subMonths(now, 11));
        prevTo = endOfMonth(subMonths(now, 6));
        break;

      case 'thisYear':
        from = startOfYear(now);
        to = endOfYear(now);
        prevFrom = startOfYear(subMonths(now, 12));
        prevTo = endOfYear(subMonths(now, 12));
        break;

      case 'lastYear':
        from = startOfYear(subMonths(now, 12));
        to = endOfYear(subMonths(now, 12));
        prevFrom = startOfYear(subMonths(now, 24));
        prevTo = endOfYear(subMonths(now, 24));
        break;

      case 'custom':
        if (filters.customFrom && filters.customTo) {
          from = filters.customFrom;
          to = filters.customTo;
          const diffDays = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
          prevFrom = subDays(from, diffDays);
          prevTo = from;
        } else {
          // Fallback to this month
          from = startOfMonth(now);
          to = endOfMonth(now);
          prevFrom = startOfMonth(subMonths(now, 1));
          prevTo = endOfMonth(subMonths(now, 1));
        }
        break;

      default:
        from = startOfMonth(now);
        to = endOfMonth(now);
        prevFrom = startOfMonth(subMonths(now, 1));
        prevTo = endOfMonth(subMonths(now, 1));
    }

    return { from, to, prevFrom, prevTo };
  }

  private formatDateForDB(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      'draft': 'Bozza',
      'sent': 'Inviata',
      'paid': 'Pagata',
      'overdue': 'Scaduta'
    };
    return labels[status] || status;
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(value);
  }

  formatPercentage(value: number): string {
    return new Intl.NumberFormat('it-IT', {
      style: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    }).format(value / 100);
  }

  getStatusColor(status: string): string {
    const colors: { [key: string]: string } = {
      'draft': '#6B7280',
      'sent': '#3B82F6',
      'paid': '#10B981',
      'overdue': '#EF4444'
    };
    return colors[status] || '#6B7280';
  }

  // Computed per i top 5 clienti revenue
  top5CustomersRevenue = computed(() => {
    return this.metrics().topCustomers
      .slice(0, 5)
      .reduce((sum, c) => sum + c.revenue, 0);
  });

  // Proprietà per la data corrente
  get currentDate(): Date {
    return new Date();
  }

  get top5Revenue(): number {
    return this.metrics().topCustomers
      .slice(0, 5)
      .reduce((sum, c) => sum + c.revenue, 0);
  }

}