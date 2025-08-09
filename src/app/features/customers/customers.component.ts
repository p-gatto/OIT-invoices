import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from "@angular/material/divider";
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { ConfirmationDialogComponent } from '../../shared/components/confirmation-dialog/confirmation-dialog.component';

import { Customer, isActiveCustomer, isInactiveCustomer } from './customer.model';
import { CustomerService, DeleteCustomerResult } from './customer.service';
import { CustomerDiaogComponent } from './customer-diaog/customer-diaog.component';

// Interfaccia per gestire l'apertura automatica del dialogo
export interface CustomerDialogTrigger {
  openNewCustomerDialog(): void;
}

// Nuovo componente dialog per gestire le opzioni di eliminazione
interface DeleteConfirmationData {
  customer: Customer;
  hasInvoices: boolean;
  invoiceCount: number;
  canForceDelete: boolean;
}

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
    MatDividerModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatSnackBarModule,
    MatChipsModule
  ],
  templateUrl: './customers.component.html',
  styleUrl: './customers.component.scss'
})
export class CustomersComponent implements OnInit, CustomerDialogTrigger {

  customerService = inject(CustomerService);
  dialog = inject(MatDialog);
  snackBar = inject(MatSnackBar);
  router = inject(Router);
  route = inject(ActivatedRoute);

  customers = signal<Customer[]>([]);
  loading = signal(true);
  showInactive = signal(false); // Toggle per mostrare clienti disattivati

  // Signal per i filtri
  searchQuery = signal('');
  selectedCustomerId = signal<string | null>(null);

  displayedColumns = ['name', 'contact', 'tax_info', 'address', 'actions'];

  // Computed per clienti filtrati con supporto per stato attivo/inattivo
  filteredCustomers = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const selectedId = this.selectedCustomerId();
    const includeInactive = this.showInactive();

    let filtered = this.customers();

    // Filtra per stato attivo/inattivo
    if (!includeInactive) {
      filtered = filtered.filter(customer => isActiveCustomer(customer));
    }

    // Altri filtri esistenti...
    if (selectedId) {
      filtered = filtered.filter(customer => customer.id === selectedId);
    }

    if (query) {
      filtered = filtered.filter(customer =>
        customer.name.toLowerCase().includes(query) ||
        customer.email?.toLowerCase().includes(query) ||
        customer.phone?.toLowerCase().includes(query) ||
        customer.tax_code?.toLowerCase().includes(query) ||
        customer.vat_number?.toLowerCase().includes(query) ||
        customer.address?.toLowerCase().includes(query)
      );
    }

    return filtered;
  });

  // Computed per le statistiche generali
  overallStats = computed(() => {
    const all = this.customers();
    const active = all.filter(isActiveCustomer);
    const inactive = all.filter(isInactiveCustomer);

    return {
      total: all.length,
      active: active.length,
      inactive: inactive.length
    };
  });

  private customerStatsMap = signal<Map<string, any>>(new Map());

  ngOnInit() {
    this.loadCustomers();
    this.checkQueryParams();
  }

  private checkQueryParams() {
    // Controlla se c'è un customerId specifico nei query params
    this.route.queryParamMap.subscribe(params => {
      const customerId = params.get('customerId');
      if (customerId) {
        this.selectedCustomerId.set(customerId);
      }
    });
  }

  private loadCustomerStats(customerId: string) {
    this.customerService.getCustomerStats(customerId).subscribe({
      next: stats => {
        const currentStats = this.customerStatsMap();
        currentStats.set(customerId, stats);
        this.customerStatsMap.set(new Map(currentStats));
      },
      error: error => {
        console.error(`Error loading stats for customer ${customerId}:`, error);
      }
    });
  }

  // Nel loadCustomers, carica le statistiche per ogni cliente
  private loadCustomers() {
    this.loading.set(true);
    this.customerService.getCustomers().subscribe({
      next: customers => {
        this.customers.set(customers);
        this.loading.set(false);

        // Carica le statistiche per ogni cliente
        customers.forEach(customer => {
          if (customer.id) {
            this.loadCustomerStats(customer.id);
          }
        });
      },
      error: error => {
        this.loading.set(false);
        this.snackBar.open('Errore nel caricamento dei clienti', 'Chiudi', { duration: 3000 });
        console.error('Error loading customers:', error);
      }
    });
  }

  /**
   * Mostra dialog di conferma personalizzato basato sullo stato del cliente
   */
  private showDeleteConfirmation(customer: Customer, hasInvoices: boolean, invoiceCount: number) {
    const isActive = isActiveCustomer(customer);

    let title: string;
    let message: string;
    let options: Array<{ text: string; action: string; color?: string }> = [];

    if (!hasInvoices) {
      // Cliente senza fatture - può essere eliminato definitivamente
      title = 'Elimina Cliente';
      message = `Il cliente "${customer.name}" non ha fatture associate. Può essere eliminato definitivamente.`;
      options = [
        { text: 'Annulla', action: 'cancel' },
        { text: 'Elimina Definitivamente', action: 'hard-delete', color: 'warn' }
      ];
    } else if (isActive) {
      // Cliente attivo con fatture - offri soft delete o force delete
      title = 'Gestisci Cliente con Fatture';
      message = `Il cliente "${customer.name}" ha ${invoiceCount} fatture associate. Scegli come procedere:`;
      options = [
        { text: 'Annulla', action: 'cancel' },
        { text: 'Disattiva Cliente', action: 'soft-delete' },
        { text: 'Elimina Comunque (PERICOLOSO)', action: 'force-delete', color: 'warn' }
      ];
    } else {
      // Cliente già disattivato - offri ripristino o force delete
      title = 'Cliente Disattivato';
      message = `Il cliente "${customer.name}" è già disattivato e ha ${invoiceCount} fatture associate.`;
      options = [
        { text: 'Annulla', action: 'cancel' },
        { text: 'Riattiva Cliente', action: 'restore' },
        { text: 'Elimina Definitivamente (PERICOLOSO)', action: 'force-delete', color: 'warn' }
      ];
    }

    this.showCustomDeleteDialog(title, message, options, customer, hasInvoices, invoiceCount);
  }

  /**
   * Dialog personalizzato per le opzioni di eliminazione
   */
  private showCustomDeleteDialog(
    title: string,
    message: string,
    options: Array<{ text: string; action: string; color?: string }>,
    customer: Customer,
    hasInvoices: boolean,
    invoiceCount: number
  ) {
    // Qui potresti creare un dialog component personalizzato, per ora uso quello esistente
    // Per semplicità, creo dialog sequenziali per le diverse opzioni

    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '600px',
      data: {
        title,
        message: `${message}\n\n⚠️ IMPORTANTE:\n- Disattiva: Il cliente viene nascosto ma i dati rimangono\n- Elimina: I dati vengono cancellati definitivamente`,
        confirmText: hasInvoices ? 'Disattiva Cliente' : 'Elimina Definitivamente',
        cancelText: 'Annulla'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        if (hasInvoices) {
          this.performSoftDelete(customer);
        } else {
          this.performHardDelete(customer);
        }
      }
    });
  }

  /**
   * Esegue soft delete con conferma aggiuntiva per force delete
   */
  private performSoftDelete(customer: Customer) {
    this.customerService.deleteCustomer(customer.id!, { force: false, 'reason': 'Il cliente è collegato a delle fatture!!!' }).subscribe({
      next: (result: DeleteCustomerResult) => {
        this.handleDeleteSuccess(result);
        this.offerForceDeleteOption(customer);
      },
      error: (error) => {
        this.handleDeleteError(error, customer.name);
      }
    });
  }

  /**
   * Offre opzione di force delete dopo soft delete
   */
  private offerForceDeleteOption(customer: Customer) {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '500px',
      data: {
        title: 'Eliminazione Completa',
        message: `Il cliente "${customer.name}" è stato disattivato. Vuoi eliminarlo completamente dal database?\n\n⚠️ ATTENZIONE: Questa operazione eliminerà DEFINITIVAMENTE tutti i dati del cliente e renderà orfane le sue fatture.`,
        confirmText: 'Elimina Definitivamente',
        cancelText: 'Mantieni Disattivato'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.performHardDelete(customer);
      }
    });
  }

  /**
   * Esegue hard delete
   */
  private performHardDelete(customer: Customer) {
    this.customerService.deleteCustomer(customer.id!, { force: true, 'reason': 'Eliminazione diretta - cliente senza fatture' }).subscribe({
      next: (result: DeleteCustomerResult) => {
        this.handleDeleteSuccess(result);
      },
      error: (error) => {
        this.handleDeleteError(error, customer.name);
      }
    });
  }

  /**
   * Ripristina un cliente disattivato
   */
  restoreCustomer(customer: Customer) {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '500px',
      data: {
        title: 'Ripristina Cliente',
        message: `Sei sicuro di voler riattivare il cliente "${customer.name}"? Diventerà nuovamente visibile e utilizzabile.`,
        confirmText: 'Riattiva',
        cancelText: 'Annulla'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.customerService.restoreCustomer(customer.id!).subscribe({
          next: (restoredCustomer) => {
            this.snackBar.open(`Cliente "${restoredCustomer.name}" riattivato con successo`, 'Chiudi', { duration: 3000 });
            this.loadCustomers();
          },
          error: (error) => {
            this.snackBar.open('Errore durante il ripristino del cliente', 'Chiudi', { duration: 3000 });
            console.error('Error restoring customer:', error);
          }
        });
      }
    });
  }


  /**
   * Gestisce il successo dell'eliminazione
   */
  private handleDeleteSuccess(result: DeleteCustomerResult) {
    let message = result.message;
    let duration = 4000;

    if (result.type === 'hard' && result.hasInvoices) {
      duration = 8000; // Messaggio più lungo per eliminazioni rischiose
    }

    this.snackBar.open(message, 'Chiudi', { duration });
    this.loadCustomers();
  }

  /**
   * Gestisce gli errori di eliminazione
   */
  private handleDeleteError(error: any, customerName: string) {
    console.error('Error deleting customer:', error);
    let message = `Errore nell'eliminazione del cliente "${customerName}"`;

    if (error.message?.includes('foreign key')) {
      message = `Impossibile eliminare "${customerName}": ha fatture associate. Prova la disattivazione.`;
    }

    this.snackBar.open(message, 'Chiudi', { duration: 5000 });
  }

  /**
   * Toggle per mostrare/nascondere clienti disattivati
   */
  toggleShowInactive() {
    this.showInactive.update(value => !value);
  }

  /**
   * Verifica se un cliente è attivo
   */
  isCustomerActive(customer: Customer): boolean {
    return isActiveCustomer(customer);
  }

  /**
   * Ottiene la classe CSS per lo stato del cliente
   */
  getCustomerStatusClass(customer: Customer): string {
    return isActiveCustomer(customer)
      ? 'bg-green-100 text-green-800'
      : 'bg-gray-100 text-gray-800';
  }

  /**
     * Ottiene l'etichetta dello stato del cliente
     */
  getCustomerStatusLabel(customer: Customer): string {
    return isActiveCustomer(customer) ? 'Attivo' : 'Disattivato';
  }

  /**
   * Implementazione dell'interfaccia CustomerDialogTrigger
   * Consente ad altri componenti di aprire il dialogo di creazione cliente
   */
  openNewCustomerDialog(): void {
    this.openCustomerDialog();
  }

  /**
   * Applica i filtri di ricerca
   * Con i signal, il computed filteredCustomers si aggiorna automaticamente
   * quando cambia searchQuery
   */
  applyFilter() {
    // Con i signal, questo metodo può essere utilizzato per logiche aggiuntive
    // come logging, analytics, o validazioni
    const query = this.searchQuery().trim();

    // Il computed filteredCustomers si aggiorna automaticamente
    // grazie alla reattività dei signal
  }

  /**
   * Pulisce il filtro di ricerca
   */
  clearFilter() {
    this.searchQuery.set('');
    this.selectedCustomerId.set(null);

    // Pulisci anche i query params se presenti
    this.router.navigate([], {
      queryParams: { customerId: null },
      queryParamsHandling: 'merge'
    });
  }

  /**
   * Imposta un filtro di ricerca specifico
   */
  setFilter(query: string) {
    this.searchQuery.set(query);
  }

  /**
   * Cerca clienti per nome (utilità per ricerche rapide)
   */
  searchByName(name: string) {
    this.setFilter(name);
  }

  /**
   * Cerca clienti per email (utilità per ricerche rapide)
   */
  searchByEmail(email: string) {
    this.setFilter(email);
  }

  /**
   * Filtra per un cliente specifico
   */
  selectCustomer(customerId: string) {
    this.selectedCustomerId.set(customerId);
    this.searchQuery.set(''); // Pulisci la ricerca testuale
  }

  /**
   * Restituisce il numero di risultati filtrati
   */
  getFilteredCount(): number {
    return this.filteredCustomers().length;
  }

  /**
   * Verifica se sono attivi dei filtri
   */
  hasActiveFilters(): boolean {
    return this.searchQuery().trim().length > 0 || this.selectedCustomerId() !== null;
  }

  /**
   * Verifica se è attivo il filtro cliente specifico
   */
  hasCustomerFilter(): boolean {
    return this.selectedCustomerId() !== null;
  }

  /**
   * Ottiene il nome del cliente filtrato
   */
  getFilteredCustomerName(): string {
    const customerId = this.selectedCustomerId();
    if (!customerId) return '';

    const customer = this.customers().find(c => c.id === customerId);
    return customer?.name || '';
  }

  /**
   * METODO FONDAMENTALE: Ferma la propagazione del click event
   * Questo impedisce che il click sul bottone menu attivi il click sulla riga
   */
  stopEventPropagation(event: Event) {
    event.stopPropagation();
    event.preventDefault();
  }

  openCustomerDialog(customer?: Customer) {
    const dialogRef = this.dialog.open(CustomerDiaogComponent, {
      width: '700px',
      data: customer ? { ...customer } : null,
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        if (customer) {
          this.updateCustomer(result);
        } else {
          this.createCustomer(result);
        }
      }
    });
  }

  private createCustomer(customerData: Omit<Customer, 'id' | 'created_at'>) {
    this.customerService.createCustomer(customerData).subscribe({
      next: (newCustomer) => {
        this.snackBar.open('Cliente creato con successo', 'Chiudi', { duration: 3000 });
        this.loadCustomers();

        // Se è stato creato da una richiesta esterna, naviga alla creazione fattura
        if (this.route.snapshot.queryParamMap.get('returnTo') === 'invoice') {
          this.router.navigate(['/invoices/new'], {
            queryParams: { customerId: newCustomer.id }
          });
        }
      },
      error: (error) => {
        this.snackBar.open('Errore nella creazione del cliente', 'Chiudi', { duration: 3000 });
        console.error('Error creating customer:', error);
      }
    });
  }

  private updateCustomer(customerData: Customer) {
    this.customerService.updateCustomer(customerData).subscribe({
      next: () => {
        this.snackBar.open('Cliente aggiornato con successo', 'Chiudi', { duration: 3000 });
        this.loadCustomers();
      },
      error: (error) => {
        this.snackBar.open('Errore nell\'aggiornamento del cliente', 'Chiudi', { duration: 3000 });
        console.error('Error updating customer:', error);
      }
    });
  }

  editCustomer(customer: Customer) {
    this.openCustomerDialog(customer);
  }

  viewCustomerInvoices(customer: Customer) {
    this.router.navigate(['/invoices'], {
      queryParams: { customerId: customer.id }
    });
  }


  /**
   * Metodo principale per eliminare un cliente
   * Mostra dialog con opzioni basate sullo stato del cliente
   */
  deleteCustomer(customer: Customer) {
    this.loading.set(true);

    this.customerService.getCustomerStats(customer.id!).subscribe({
      next: (stats) => {
        this.loading.set(false);
        this.showDeleteConfirmation(customer, stats.totalInvoices > 0, stats.totalInvoices);
      },
      error: (error) => {
        this.loading.set(false);
        console.error('Error getting customer stats:', error);
        this.snackBar.open('Errore nel caricamento delle informazioni cliente', 'Chiudi', { duration: 3000 });
      }
    });
  }


  getCustomerStats(customerId: string | undefined) {
    if (!customerId) return null;
    return this.customerStatsMap().get(customerId);
  }

  createInvoiceForCustomer(customer: Customer) {
    this.router.navigate(['/invoices/new'], {
      queryParams: { customerId: customer.id }
    });
  }

  // Metodi di utilità per migliorare l'UX

  /**
   * Copia email del cliente negli appunti
   */
  async copyCustomerEmail(customer: Customer, event: Event) {
    this.stopEventPropagation(event);

    if (customer.email) {
      try {
        await navigator.clipboard.writeText(customer.email);
        this.snackBar.open('Email copiata negli appunti', 'Chiudi', { duration: 2000 });
      } catch (error) {
        console.error('Error copying to clipboard:', error);
      }
    }
  }

  /**
   * Copia telefono del cliente negli appunti
   */
  async copyCustomerPhone(customer: Customer, event: Event) {
    this.stopEventPropagation(event);

    if (customer.phone) {
      try {
        await navigator.clipboard.writeText(customer.phone);
        this.snackBar.open('Telefono copiato negli appunti', 'Chiudi', { duration: 2000 });
      } catch (error) {
        console.error('Error copying to clipboard:', error);
      }
    }
  }

  /**
   * Esporta lista clienti in CSV
   */
  exportCustomersToCSV() {
    const customers = this.filteredCustomers();
    if (customers.length === 0) {
      this.snackBar.open('Nessun cliente da esportare', 'Chiudi', { duration: 3000 });
      return;
    }

    const headers = ['Nome', 'Email', 'Telefono', 'Indirizzo', 'Codice Fiscale', 'Partita IVA', 'Note'];
    const csvContent = [
      headers.join(','),
      ...customers.map(customer => [
        `"${customer.name || ''}"`,
        `"${customer.email || ''}"`,
        `"${customer.phone || ''}"`,
        `"${customer.address || ''}"`,
        `"${customer.tax_code || ''}"`,
        `"${customer.vat_number || ''}"`,
        `"${(customer as any).notes || ''}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `clienti-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    this.snackBar.open('Lista clienti esportata con successo', 'Chiudi', { duration: 3000 });
  }

  /**
   * Ottieni statistiche rapide sui clienti filtrati
   */
  getFilteredStats(): {
    totalCustomers: number;
    withEmail: number;
    withPhone: number;
    withVAT: number;
    withTaxCode: number;
  } {
    const filtered = this.filteredCustomers();

    return {
      totalCustomers: filtered.length,
      withEmail: filtered.filter(c => c.email).length,
      withPhone: filtered.filter(c => c.phone).length,
      withVAT: filtered.filter(c => c.vat_number).length,
      withTaxCode: filtered.filter(c => c.tax_code).length
    };
  }

  /**
   * Determina il tipo di cliente (Azienda/Privato)
   */
  getCustomerType(customer: Customer): 'business' | 'individual' {
    return customer.vat_number ? 'business' : 'individual';
  }

  /**
   * Ottieni l'icona appropriata per il tipo di cliente
   */
  getCustomerIcon(customer: Customer): string {
    return this.getCustomerType(customer) === 'business' ? 'business' : 'person';
  }

  /**
   * Formatta l'indirizzo per la visualizzazione compatta
   */
  formatAddressForDisplay(address: string): string {
    if (!address) return '';

    // Limita a 50 caratteri per la visualizzazione in tabella
    return address.length > 50 ? address.substring(0, 47) + '...' : address;
  }

  /**
   * Controlla la completezza dei dati del cliente
   */
  getCustomerCompleteness(customer: Customer): {
    percentage: number;
    missingFields: string[];
  } {
    const fields = ['name', 'email', 'phone', 'address'];
    const fiscalFields = ['tax_code', 'vat_number'];

    let filledFields = 0;
    const missingFields: string[] = [];

    // Controlla campi base
    fields.forEach(field => {
      if (customer[field as keyof Customer]) {
        filledFields++;
      } else {
        missingFields.push(field);
      }
    });

    // Controlla almeno uno dei campi fiscali
    const hasFiscalData = fiscalFields.some(field => customer[field as keyof Customer]);
    if (hasFiscalData) {
      filledFields++;
    } else {
      missingFields.push('dati_fiscali');
    }

    const totalFields = fields.length + 1; // +1 per i dati fiscali
    const percentage = (filledFields / totalFields) * 100;

    return { percentage, missingFields };
  }

  /**
   * Ottieni la classe CSS per il livello di completezza
   */
  getCompletenessClass(percentage: number): string {
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-orange-600';
    return 'text-red-600';
  }

  /**
   * Ordina i clienti per diversi criteri
   */
  sortCustomers(criteria: 'name' | 'recent' | 'invoices' | 'revenue') {
    let sorted = [...this.customers()];

    switch (criteria) {
      case 'name':
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'recent':
        sorted.sort((a, b) => {
          const aDate = new Date(a.created_at || '');
          const bDate = new Date(b.created_at || '');
          return bDate.getTime() - aDate.getTime();
        });
        break;
      case 'invoices':
        sorted.sort((a, b) => {
          const aStats = this.getCustomerStats(a.id);
          const bStats = this.getCustomerStats(b.id);
          const aInvoices = aStats?.totalInvoices || 0;
          const bInvoices = bStats?.totalInvoices || 0;
          return bInvoices - aInvoices;
        });
        break;
      case 'revenue':
        sorted.sort((a, b) => {
          const aStats = this.getCustomerStats(a.id);
          const bStats = this.getCustomerStats(b.id);
          const aRevenue = aStats?.totalAmount || 0;
          const bRevenue = bStats?.totalAmount || 0;
          return bRevenue - aRevenue;
        });
        break;
    }

    this.customers.set(sorted);
  }

  /**
   * Ottieni i top clienti per fatturato
   */
  getTopCustomersByRevenue(limit: number = 5): Customer[] {
    return [...this.customers()]
      .sort((a, b) => {
        const aStats = this.getCustomerStats(a.id);
        const bStats = this.getCustomerStats(b.id);
        const aRevenue = aStats?.totalAmount || 0;
        const bRevenue = bStats?.totalAmount || 0;
        return bRevenue - aRevenue;
      })
      .slice(0, limit);
  }

  /**
   * Metodi per la gestione dell'importazione di clienti
   */
  async importCustomersFromCSV(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    if (!file.name.toLowerCase().endsWith('.csv')) {
      this.snackBar.open('Seleziona un file CSV valido', 'Chiudi', { duration: 3000 });
      return;
    }

    try {
      const text = await file.text();
      const lines = text.split('\n');

      if (lines.length < 2) {
        this.snackBar.open('Il file CSV deve contenere almeno un cliente', 'Chiudi', { duration: 3000 });
        return;
      }

      // Parse CSV (implementazione semplificata)
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const requiredFields = ['nome', 'name'];

      if (!requiredFields.some(field => headers.includes(field))) {
        this.snackBar.open('Il CSV deve contenere almeno una colonna "Nome" o "Name"', 'Chiudi', { duration: 3000 });
        return;
      }

      // Processo di importazione (da implementare completamente)
      this.snackBar.open('Funzionalità di importazione in sviluppo', 'Chiudi', { duration: 3000 });

    } catch (error) {
      console.error('Error importing CSV:', error);
      this.snackBar.open('Errore durante l\'importazione del file', 'Chiudi', { duration: 3000 });
    }

    // Reset input
    input.value = '';
  }

  /**
   * Cerca duplicati potenziali
   */
  findPotentialDuplicates(): Customer[] {
    const customers = this.customers();
    const duplicates: Customer[] = [];

    for (let i = 0; i < customers.length; i++) {
      for (let j = i + 1; j < customers.length; j++) {
        const customer1 = customers[i];
        const customer2 = customers[j];

        // Controllo per nome simile (più del 80% di somiglianza)
        const similarity = this.calculateStringSimilarity(customer1.name, customer2.name);

        if (similarity > 0.8 ||
          (customer1.email && customer1.email === customer2.email) ||
          (customer1.phone && customer1.phone === customer2.phone) ||
          (customer1.tax_code && customer1.tax_code === customer2.tax_code) ||
          (customer1.vat_number && customer1.vat_number === customer2.vat_number)) {

          if (!duplicates.includes(customer1)) duplicates.push(customer1);
          if (!duplicates.includes(customer2)) duplicates.push(customer2);
        }
      }
    }

    return duplicates;
  }

  private calculateStringSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const editDistance = this.calculateLevenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  private calculateLevenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i += 1) {
      matrix[0][i] = i;
    }

    for (let j = 0; j <= str2.length; j += 1) {
      matrix[j][0] = j;
    }

    for (let j = 1; j <= str2.length; j += 1) {
      for (let i = 1; i <= str1.length; i += 1) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Metodo per gestire azioni bulk sui clienti selezionati
   */
  performBulkAction(action: 'delete' | 'export' | 'email', selectedCustomers: Customer[]) {
    if (selectedCustomers.length === 0) {
      this.snackBar.open('Seleziona almeno un cliente', 'Chiudi', { duration: 3000 });
      return;
    }

    switch (action) {
      case 'export':
        this.exportSelectedCustomers(selectedCustomers);
        break;
      case 'delete':
        this.deleteMultipleCustomers(selectedCustomers);
        break;
      case 'email':
        this.sendBulkEmail(selectedCustomers);
        break;
    }
  }

  private exportSelectedCustomers(customers: Customer[]) {
    // Implementazione dell'esportazione selettiva
    this.snackBar.open(`Esportazione di ${customers.length} clienti in corso...`, 'Chiudi', { duration: 3000 });
  }

  private deleteMultipleCustomers(customers: Customer[]) {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '500px',
      data: {
        title: 'Elimina Clienti Multipli',
        message: `Sei sicuro di voler eliminare ${customers.length} clienti selezionati? Questa operazione è irreversibile.`,
        confirmText: 'Elimina Tutti',
        cancelText: 'Annulla'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Implementa l'eliminazione multipla
        this.snackBar.open('Eliminazione multipla in corso...', 'Chiudi', { duration: 3000 });
      }
    });
  }

  private sendBulkEmail(customers: Customer[]) {
    const customersWithEmail = customers.filter(c => c.email);
    if (customersWithEmail.length === 0) {
      this.snackBar.open('Nessun cliente selezionato ha un indirizzo email', 'Chiudi', { duration: 3000 });
      return;
    }

    this.snackBar.open('Funzionalità email bulk in sviluppo', 'Chiudi', { duration: 3000 });
  }

  /**
   * Ricerca avanzata con filtri multipli
   */
  advancedSearch(filters: {
    name?: string;
    email?: string;
    hasVAT?: boolean;
    hasTaxCode?: boolean;
    hasInvoices?: boolean;
    city?: string;
  }) {
    let filtered = this.customers();

    if (filters.name) {
      filtered = filtered.filter(c =>
        c.name.toLowerCase().includes(filters.name!.toLowerCase())
      );
    }

    if (filters.email) {
      filtered = filtered.filter(c =>
        c.email?.toLowerCase().includes(filters.email!.toLowerCase())
      );
    }

    if (filters.hasVAT !== undefined) {
      filtered = filtered.filter(c =>
        filters.hasVAT ? !!c.vat_number : !c.vat_number
      );
    }

    if (filters.hasTaxCode !== undefined) {
      filtered = filtered.filter(c =>
        filters.hasTaxCode ? !!c.tax_code : !c.tax_code
      );
    }

    if (filters.city) {
      filtered = filtered.filter(c =>
        c.address?.toLowerCase().includes(filters.city!.toLowerCase())
      );
    }

    // Per il filtro hasInvoices, dovremmo controllare le statistiche
    if (filters.hasInvoices !== undefined) {
      filtered = filtered.filter(c => {
        const stats = this.getCustomerStats(c.id);
        const hasInvoices = (stats?.totalInvoices || 0) > 0;
        return filters.hasInvoices ? hasInvoices : !hasInvoices;
      });
    }

    return filtered;
  }

  /**
   * Mostra clienti senza fatture
   */
  showCustomersWithoutInvoices() {
    const customersWithoutInvoices = this.customers().filter(customer => {
      const stats = this.getCustomerStats(customer.id);
      return (stats?.totalInvoices || 0) === 0;
    });

    if (customersWithoutInvoices.length === 0) {
      this.snackBar.open('Tutti i clienti hanno almeno una fattura', 'Chiudi', { duration: 3000 });
    } else {
      // Imposta un filtro personalizzato o naviga a una vista filtrata
      this.snackBar.open(`Trovati ${customersWithoutInvoices.length} clienti senza fatture`, 'Chiudi', { duration: 3000 });
    }
  }

  /**
   * Metodo chiamato quando si clicca su una riga della tabella
   */
  onRowClick(customer: Customer) {
    // Default action: mostra le fatture del cliente
    this.viewCustomerInvoices(customer);
  }

}