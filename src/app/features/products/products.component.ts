import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';

import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';

import { Product, ProductCategory } from './product.model';
import { ProductService } from './product.service';
import { ConfirmationDialogComponent } from '../../shared/components/confirmation-dialog/confirmation-dialog.component';
import { ProductDialogComponent } from './product-dialog/product-dialog.component';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-products',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatDialogModule,
    MatMenuModule,
    MatDividerModule,
    MatChipsModule,
    MatTooltipModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './products.component.html',
  styleUrl: './products.component.scss'
})
export class ProductsComponent implements OnInit {

  productService = inject(ProductService);
  dialog = inject(MatDialog);
  snackBar = inject(MatSnackBar);
  fb = inject(FormBuilder);

  products = signal<Product[]>([]);
  categories = signal<ProductCategory[]>([]);
  loading = signal(true);

  // Signal per i filtri - stessa struttura del CustomersComponent
  searchQuery = signal('');
  selectedCategory = signal('');

  displayedColumns = ['name', 'category', 'price', 'tax_rate', 'unit', 'actions'];

  // Computed per i prodotti filtrati - logica simile a CustomersComponent
  filteredProducts = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const category = this.selectedCategory();
    let filtered = this.products();

    // Filtra per ricerca se presente
    if (query) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(query) ||
        product.description?.toLowerCase().includes(query) ||
        product.category?.toLowerCase().includes(query)
      );
    }

    // Filtra per categoria se selezionata
    if (category) {
      filtered = filtered.filter(product => product.category === category);
    }

    return filtered;
  });

  ngOnInit() {
    this.loadData();
  }

  private loadData() {
    this.loading.set(true);

    this.productService.getProducts().subscribe({
      next: products => {
        this.products.set(products);
        this.loading.set(false);
      },
      error: error => {
        this.loading.set(false);
        this.snackBar.open('Errore nel caricamento dei prodotti', 'Chiudi', { duration: 3000 });
        console.error('Error loading products:', error);
      }
    });

    this.productService.getProductCategories().subscribe({
      next: categories => {
        this.categories.set(categories);
      },
      error: error => {
        console.error('Error loading categories:', error);
      }
    });
  }

  /**
   * Applica i filtri di ricerca
   * Con i signal, il computed filteredProducts si aggiorna automaticamente
   * quando cambia searchQuery o selectedCategory
   */
  applyFilter() {
    // Con i signal, questo metodo può essere utilizzato per logiche aggiuntive
    // come logging, analytics, o validazioni
    const query = this.searchQuery().trim();
    const category = this.selectedCategory();

    // Il computed filteredProducts si aggiorna automaticamente
    // grazie alla reattività dei signal
  }

  /**
   * Pulisce tutti i filtri
   */
  clearFilters() {
    this.searchQuery.set('');
    this.selectedCategory.set('');
  }

  /**
   * Imposta un filtro di ricerca specifico
   */
  setFilter(query: string) {
    this.searchQuery.set(query);
  }

  /**
   * Imposta un filtro categoria specifico
   */
  setCategoryFilter(category: string) {
    this.selectedCategory.set(category);
  }

  /**
   * Restituisce il numero di risultati filtrati
   */
  getFilteredCount(): number {
    return this.filteredProducts().length;
  }

  /**
   * Verifica se sono attivi dei filtri
   */
  hasActiveFilters(): boolean {
    return this.searchQuery().trim().length > 0 || this.selectedCategory().length > 0;
  }

  /**
   * METODO FONDAMENTALE: Ferma la propagazione del click event
   * Questo impedisce che il click sul bottone menu attivi il click sulla riga
   */
  stopEventPropagation(event: Event) {
    event.stopPropagation();
    event.preventDefault();
  }

  openProductDialog(product?: Product) {
    const dialogRef = this.dialog.open(ProductDialogComponent, {
      width: '600px',
      data: product ? { ...product } : null,
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Se il result ha un ID, è un aggiornamento
        // Se non ha ID, è una creazione
        if (result.id) {
          this.updateProduct(result);
        } else {
          this.createProduct(result);
        }
      }
    });
  }

  private createProduct(productData: any) {
    this.productService.createProduct(productData).subscribe({
      next: () => {
        this.snackBar.open('Prodotto creato con successo', 'Chiudi', { duration: 3000 });
        this.loadData();
      },
      error: (error) => {
        this.snackBar.open('Errore nella creazione del prodotto', 'Chiudi', { duration: 3000 });
        console.error('Error creating product:', error);
      }
    });
  }

  private updateProduct(productData: Product) {
    this.productService.updateProduct(productData).subscribe({
      next: () => {
        this.snackBar.open('Prodotto aggiornato con successo', 'Chiudi', { duration: 3000 });
        this.loadData();
      },
      error: (error) => {
        this.snackBar.open('Errore nell\'aggiornamento del prodotto', 'Chiudi', { duration: 3000 });
        console.error('Error updating product:', error);
      }
    });
  }

  editProduct(product: Product) {
    this.openProductDialog(product);
  }

  deleteProduct(product: Product) {
    // Prima verifica se il prodotto è utilizzato in fatture
    this.productService.isProductUsedInInvoices(product.id!).subscribe(isUsed => {
      let title = 'Elimina Prodotto';
      let message = `Sei sicuro di voler eliminare "${product.name}"?`;

      if (isUsed) {
        title = 'Prodotto utilizzato in fatture';
        message = `Il prodotto "${product.name}" è utilizzato in fatture esistenti. Sarà disattivato invece di essere eliminato per preservare l'integrità dei dati. Continuare?`;
      } else {
        message = `Sei sicuro di voler eliminare DEFINITIVAMENTE "${product.name}"? Il prodotto verrà rimosso completamente dal database.`;
      }

      const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
        width: '500px',
        data: {
          title,
          message,
          confirmText: isUsed ? 'Disattiva' : 'Elimina',
          cancelText: 'Annulla'
        }
      });

      dialogRef.afterClosed().subscribe(result => {
        if (result) {
          this.performDelete(product.id!, product.name, isUsed);
        }
      });
    });
  }

  private performDelete(productId: string, productName: string, wasUsedInInvoices: boolean) {
    this.productService.deleteProduct(productId).subscribe({
      next: () => {
        const action = wasUsedInInvoices ? 'disattivato' : 'eliminato';
        this.snackBar.open(`Prodotto "${productName}" ${action} con successo`, 'Chiudi', { duration: 3000 });
        this.loadData();
      },
      error: (error) => {
        this.snackBar.open('Errore nell\'eliminazione del prodotto', 'Chiudi', { duration: 3000 });
        console.error('Error deleting product:', error);
      }
    });
  }

  duplicateProduct(product: Product) {
    // Crea una copia pulita del prodotto SENZA ID
    // In questo modo il dialog lo tratterà come nuovo prodotto
    const duplicatedProduct = {
      name: `${product.name} (Copia)`,
      description: product.description || '',
      unit_price: product.unit_price || 0,
      tax_rate: product.tax_rate || 22,
      category: product.category || '',
      unit: product.unit || 'pz',
      is_active: product.is_active !== undefined ? product.is_active : true
      // NOTA: NON includiamo id, created_at, updated_at
    };

    // Chiama openProductDialog con il prodotto duplicato
    // Il metodo openProductDialog gestirà automaticamente create vs update
    this.openProductDialog(duplicatedProduct);
  }

  /**
   * Cerca prodotti per nome (utilità per ricerche rapide)
   */
  searchByName(name: string) {
    this.setFilter(name);
  }

  /**
   * Cerca prodotti per categoria (utilità per ricerche rapide)
   */
  searchByCategory(category: string) {
    this.setCategoryFilter(category);
  }

  /**
   * Restituisce l'etichetta user-friendly per l'unità di misura
   */
  getUnitLabel(unit: string): string {
    const unitLabels: { [key: string]: string } = {
      'pz': 'Pezzo',
      'ore': 'Ore',
      'kg': 'Kg',
      'm': 'Metro',
      'mq': 'Metro²',
      'giorni': 'Giorni',
      'mesi': 'Mesi'
    };
    return unitLabels[unit] || unit;
  }

}