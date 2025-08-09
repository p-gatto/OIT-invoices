import { inject, Injectable, signal } from '@angular/core';

import { catchError, from, map, Observable, of, switchMap } from 'rxjs';

import { SupabaseService } from '../../core/database/supabase.service';
import { Product, ProductCategory } from './product.model';

@Injectable({
  providedIn: 'root'
})
export class ProductService {

  supabase = inject(SupabaseService);

  private productsSignal = signal<Product[]>([]);
  private allProductsSignal = signal<Product[]>([]); // Include anche quelli non attivi per le fatture esistenti

  products = this.productsSignal.asReadonly();
  allProducts = this.allProductsSignal.asReadonly();

  constructor() {
    this.loadProducts();
  }

  /**
   * Carica solo i prodotti attivi (per l'uso generale)
   */
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

  /**
   * Carica tutti i prodotti (attivi e non attivi)
   * Utile per le fatture esistenti che potrebbero riferirsi a prodotti disattivati
   */
  getAllProducts(): Observable<Product[]> {
    return from(
      this.supabase.client
        .from('products')
        .select('*')
        .order('name')
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        this.allProductsSignal.set(data || []);
        return data || [];
      }),
      catchError(error => {
        console.error('Error loading all products:', error);
        return of([]);
      })
    );
  }

  /**
   * Cerca prodotti per termine di ricerca
   * Utile per l'autocomplete nel form fattura
   */
  searchProducts(searchTerm: string, activeOnly: boolean = true): Observable<Product[]> {
    let query = this.supabase.client
      .from('products')
      .select('*')
      .or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,category.ilike.%${searchTerm}%`)
      .order('name');

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    return from(query).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return data || [];
      }),
      catchError(error => {
        console.error(`Error searching products for "${searchTerm}":`, error);
        return of([]);
      })
    );
  }

  /**
   * Carica prodotti per categoria
   * Utile per filtrare i prodotti nel form fattura
   */
  getProductsByCategory(category: string, activeOnly: boolean = true): Observable<Product[]> {
    let query = this.supabase.client
      .from('products')
      .select('*')
      .eq('category', category)
      .order('name');

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    return from(query).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return data || [];
      }),
      catchError(error => {
        console.error(`Error loading products for category ${category}:`, error);
        return of([]);
      })
    );
  }

  /**
   * Carica i prodotti più utilizzati nelle fatture
   * Utile per suggerimenti rapidi
   */
  getMostUsedProducts(limit: number = 10): Observable<Product[]> {
    return from(
      this.supabase.client
        .from('invoice_items')
        .select(`
          product_id,
          count(*),
          products!inner(*)
        `)
        .not('product_id', 'is', null)
        .eq('products.is_active', true)
        .order('count', { ascending: false })
        .limit(limit)
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        // Estrae solo i dati del prodotto dalla join
        return (data || []).map((item: any) => item.products).filter(Boolean);
      }),
      catchError(error => {
        console.error('Error loading most used products:', error);
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

    const cleanProduct = {
      name: product.name?.trim() || '',
      description: product.description?.trim() || null, // null invece di stringa vuota
      unit_price: Number(product.unit_price) || 0,
      tax_rate: Number(product.tax_rate) || 22,
      category: product.category?.trim() || null, // null invece di stringa vuota
      unit: product.unit || 'pz',
      is_active: Boolean(product.is_active)
    };

    return from(
      this.supabase.client
        .from('products')
        .insert(cleanProduct)
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
    const { id, created_at, ...updateData } = product;

    if (!id) {
      throw new Error('ID prodotto mancante per l\'aggiornamento');
    }

    // Pulisci i dati rimuovendo valori undefined e gestendo null appropriatamente
    const cleanUpdateData = {
      name: updateData.name?.trim() || '',
      description: updateData.description?.trim() || null,
      unit_price: Number(updateData.unit_price) || 0,
      tax_rate: Number(updateData.tax_rate) || 22,
      category: updateData.category?.trim() || null,
      unit: updateData.unit || 'pz',
      is_active: Boolean(updateData.is_active),
      updated_at: new Date().toISOString()
    };

    // Rimuovi completamente i campi undefined per evitare problemi con Supabase
    const finalUpdateData = Object.fromEntries(
      Object.entries(cleanUpdateData).filter(([_, value]) => value !== undefined)
    );

    return from(
      this.supabase.client
        .from('products')
        .update(finalUpdateData)
        .eq('id', id)
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

  /**
 * Elimina fisicamente un prodotto dal database (hard delete)
 * Verifica prima che non sia utilizzato in fatture
 */
  deleteProduct(id: string): Observable<void> {
    // Prima verifica se il prodotto è utilizzato in fatture
    return this.isProductUsedInInvoices(id).pipe(
      switchMap(isUsed => {
        if (isUsed) {
          // Se è utilizzato, fai solo soft delete per preservare l'integrità
          return from(
            this.supabase.client
              .from('products')
              .update({
                is_active: false,
                updated_at: new Date().toISOString()
              })
              .eq('id', id)
          ).pipe(
            map(({ error }) => {
              if (error) throw error;
              this.loadProducts();
              return;
            })
          );
        } else {
          // Se non è utilizzato, elimina fisicamente (HARD DELETE)
          return from(
            this.supabase.client
              .from('products')
              .delete()
              .eq('id', id)
          ).pipe(
            map(({ error }) => {
              if (error) throw error;
              this.loadProducts();
              return;
            })
          );
        }
      }),
      catchError(error => {
        console.error(`Error deleting product with ID ${id}:`, error);
        throw error;
      })
    );
  }

  /**
   * Ripristina un prodotto eliminato (soft delete)
   */
  restoreProduct(id: string): Observable<Product> {
    return from(
      this.supabase.client
        .from('products')
        .update({
          is_active: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        this.loadProducts();
        return data;
      }),
      catchError(error => {
        console.error(`Error restoring product with ID ${id}:`, error);
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
        .not('category', 'is', null)
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;

        const categoryMap = new Map<string, number>();
        data?.forEach(item => {
          const category = item.category;
          if (category) {
            categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
          }
        });

        return Array.from(categoryMap.entries())
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => a.name.localeCompare(b.name));
      }),
      catchError(error => {
        console.error('Error loading product categories:', error);
        return of([]);
      })
    );
  }

  /**
   * Ottieni le statistiche di utilizzo di un prodotto
   */
  getProductUsageStats(productId: string): Observable<{
    totalInvoices: number;
    totalQuantity: number;
    totalRevenue: number;
    lastUsed: string | null;
  }> {
    return from(
      this.supabase.client
        .from('invoice_items')
        .select(`
          quantity,
          total,
          created_at,
          invoices!inner(issue_date)
        `)
        .eq('product_id', productId)
        .order('created_at', { ascending: false })
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;

        const items = data || [];
        return {
          totalInvoices: items.length,
          totalQuantity: items.reduce((sum, item) => sum + (item.quantity || 0), 0),
          totalRevenue: items.reduce((sum, item) => sum + (item.total || 0), 0),
          lastUsed: items.length > 0 ? items[0].created_at : null
        };
      }),
      catchError(error => {
        console.error('Error loading product usage stats:', error);
        return of({
          totalInvoices: 0,
          totalQuantity: 0,
          totalRevenue: 0,
          lastUsed: null
        });
      })
    );
  }

  /**
   * Verifica se un prodotto è utilizzato in fatture
   */
  isProductUsedInInvoices(productId: string): Observable<boolean> {
    return from(
      this.supabase.client
        .from('invoice_items')
        .select('id', { count: 'exact', head: true })
        .eq('product_id', productId)
    ).pipe(
      map(({ count, error }) => {
        if (error) throw error;
        return (count || 0) > 0;
      }),
      catchError(error => {
        console.error('Error checking product usage:', error);
        return of(false);
      })
    );
  }

  /**
   * Crea template rapidi per prodotti/servizi comuni
   */
  createQuickTemplates(): Observable<Product[]> {
    const templates: Omit<Product, 'id' | 'created_at' | 'updated_at'>[] = [
      {
        name: 'Ore di Consulenza',
        description: 'Servizio di consulenza tecnica professionale',
        unit_price: 80,
        tax_rate: 22,
        category: 'Servizi',
        unit: 'ore',
        is_active: true
      },
      {
        name: 'Sviluppo Software',
        description: 'Ore di sviluppo software su misura',
        unit_price: 60,
        tax_rate: 22,
        category: 'Servizi',
        unit: 'ore',
        is_active: true
      },
      {
        name: 'Manutenzione Sistema',
        description: 'Servizio di manutenzione e aggiornamento sistemi',
        unit_price: 45,
        tax_rate: 22,
        category: 'Servizi',
        unit: 'ore',
        is_active: true
      },
      {
        name: 'Licenza Software',
        description: 'Licenza annuale software gestionale',
        unit_price: 300,
        tax_rate: 22,
        category: 'Licenze',
        unit: 'pz',
        is_active: true
      },
      {
        name: 'Hosting Web',
        description: 'Servizio di hosting web professionale',
        unit_price: 25,
        tax_rate: 22,
        category: 'Hosting',
        unit: 'mesi',
        is_active: true
      }
    ];

    return from(
      this.supabase.client
        .from('products')
        .insert(templates)
        .select()
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        this.loadProducts();
        return data || [];
      }),
      catchError(error => {
        console.error('Error creating quick templates:', error);
        throw error;
      })
    );
  }

  private loadProducts() {
    this.getProducts().subscribe();
  }
}