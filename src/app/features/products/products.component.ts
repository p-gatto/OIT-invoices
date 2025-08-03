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

import { Product, ProductCategory } from './product.model';
import { ProductService } from './product.service';
import { ConfirmationDialogComponent } from '../../shared/components/confirmation-dialog/confirmation-dialog.component';
import { ProductDialogComponent } from './product-dialog/product-dialog.component';

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
    MatChipsModule
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
  searchQuery = '';
  selectedCategory = '';

  displayedColumns = ['name', 'category', 'price', 'tax_rate', 'unit', 'actions'];

  filteredProducts = computed(() => {
    let filtered = this.products();

    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(query) ||
        product.description?.toLowerCase().includes(query) ||
        product.category?.toLowerCase().includes(query)
      );
    }

    if (this.selectedCategory) {
      filtered = filtered.filter(product => product.category === this.selectedCategory);
    }

    return filtered;
  });

  ngOnInit() {
    this.loadData();
  }

  private loadData() {
    this.productService.getProducts().subscribe(products => {
      this.products.set(products);
    });

    this.productService.getProductCategories().subscribe(categories => {
      this.categories.set(categories);
    });
  }

  applyFilter() {
    // Triggers computed signal recalculation
  }

  clearFilters() {
    this.searchQuery = '';
    this.selectedCategory = '';
  }

  openProductDialog(product?: Product) {
    const dialogRef = this.dialog.open(ProductDialogComponent, {
      width: '600px',
      data: product ? { ...product } : null
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        if (product) {
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
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: 'Elimina Prodotto',
        message: `Sei sicuro di voler eliminare "${product.name}"?`,
        confirmText: 'Elimina',
        cancelText: 'Annulla'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.productService.deleteProduct(product.id!).subscribe({
          next: () => {
            this.snackBar.open('Prodotto eliminato con successo', 'Chiudi', { duration: 3000 });
            this.loadData();
          },
          error: (error) => {
            this.snackBar.open('Errore nell\'eliminazione del prodotto', 'Chiudi', { duration: 3000 });
            console.error('Error deleting product:', error);
          }
        });
      }
    });
  }

  duplicateProduct(product: Product) {
    const duplicatedProduct = {
      ...product,
      name: `${product.name} (Copia)`,
      id: undefined,
      created_at: undefined,
      updated_at: undefined
    };
    this.openProductDialog(duplicatedProduct);
  }
}