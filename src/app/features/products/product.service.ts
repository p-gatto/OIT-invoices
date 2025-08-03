import { inject, Injectable, signal } from '@angular/core';

import { catchError, from, map, Observable, of } from 'rxjs';

import { SupabaseService } from '../../core/database/supabase.service';
import { Product, ProductCategory } from './product.model';

@Injectable({
  providedIn: 'root'
})
export class ProductService {

  supabase = inject(SupabaseService);

  private productsSignal = signal<Product[]>([]);
  products = this.productsSignal.asReadonly();

  constructor() {
    this.loadProducts();
  }

  getProducts(): Observable<Product[]> {
    return from(
      this.supabase.client
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('name')
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        this.productsSignal.set(data || []);
        return data || [];
      }),
      catchError(error => {
        console.error('Error loading products:', error);
        return of([]);
      })
    );
  }

  getProductById(id: string): Observable<Product | null> {
    return from(
      this.supabase.client
        .from('products')
        .select('*')
        .eq('id', id)
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          if (error.code === 'PGRST116') return null;
          throw error;
        }
        return data as Product;
      }),
      catchError(error => {
        console.error(`Error loading product with ID ${id}:`, error);
        return of(null);
      })
    );
  }

  createProduct(product: Omit<Product, 'id' | 'created_at' | 'updated_at'>): Observable<Product> {
    return from(
      this.supabase.client
        .from('products')
        .insert(product)
        .select()
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        this.loadProducts();
        return data;
      }),
      catchError(error => {
        console.error('Error creating product:', error);
        throw error;
      })
    );
  }

  updateProduct(product: Product): Observable<Product> {
    return from(
      this.supabase.client
        .from('products')
        .update({
          name: product.name,
          description: product.description,
          unit_price: product.unit_price,
          tax_rate: product.tax_rate,
          category: product.category,
          unit: product.unit,
          is_active: product.is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', product.id)
        .select()
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        this.loadProducts();
        return data;
      }),
      catchError(error => {
        console.error('Error updating product:', error);
        throw error;
      })
    );
  }

  deleteProduct(id: string): Observable<void> {
    return from(
      this.supabase.client
        .from('products')
        .update({ is_active: false })
        .eq('id', id)
    ).pipe(
      map(({ error }) => {
        if (error) throw error;
        this.loadProducts();
        return;
      }),
      catchError(error => {
        console.error(`Error deleting product with ID ${id}:`, error);
        throw error;
      })
    );
  }

  getProductCategories(): Observable<ProductCategory[]> {
    return from(
      this.supabase.client
        .from('products')
        .select('category')
        .eq('is_active', true)
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;

        const categoryMap = new Map<string, number>();
        data?.forEach(item => {
          const category = item.category || 'Senza categoria';
          categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
        });

        return Array.from(categoryMap.entries()).map(([name, count]) => ({
          name,
          count
        }));
      }),
      catchError(error => {
        console.error('Error loading product categories:', error);
        return of([]);
      })
    );
  }

  private loadProducts() {
    this.getProducts().subscribe()
  }
}