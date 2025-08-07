import { inject, Injectable, signal } from '@angular/core';

import { catchError, from, map, Observable, of } from 'rxjs';

import { SupabaseService } from '../../core/database/supabase.service';

import { HelpArticle, HelpCategory } from './help.model';

@Injectable({
  providedIn: 'root'
})
export class HelpService {

  supabase = inject(SupabaseService);

  private articlesSignal = signal<HelpArticle[]>([]);
  private categoriesSignal = signal<HelpCategory[]>([]);

  articles = this.articlesSignal.asReadonly();
  categories = this.categoriesSignal.asReadonly();

  constructor() {
    this.loadArticles();
  }

  /**
   * Carica tutti gli articoli pubblicati dal database
   */
  getArticles(): Observable<HelpArticle[]> {
    return from(
      this.supabase.client
        .from('help_articles')
        .select('*')
        .eq('is_published', true)
        .order('category')
        .order('order_index')
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        this.articlesSignal.set(data || []);
        this.updateCategories(data || []);
        return data || [];
      }),
      catchError(error => {
        console.error('Error loading help articles:', error);
        return of([]);
      })
    );
  }

  /**
   * Carica articoli per una categoria specifica
   */
  getArticlesByCategory(category: string): Observable<HelpArticle[]> {
    return from(
      this.supabase.client
        .from('help_articles')
        .select('*')
        .eq('category', category)
        .eq('is_published', true)
        .order('order_index')
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return data || [];
      }),
      catchError(error => {
        console.error(`Error loading articles for category ${category}:`, error);
        return of([]);
      })
    );
  }

  /**
   * Carica un singolo articolo per ID
   */
  getArticleById(id: string): Observable<HelpArticle | null> {
    return from(
      this.supabase.client
        .from('help_articles')
        .select('*')
        .eq('id', id)
        .eq('is_published', true)
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          if (error.code === 'PGRST116') return null;
          throw error;
        }
        return data as HelpArticle;
      }),
      catchError(error => {
        console.error(`Error loading article with ID ${id}:`, error);
        return of(null);
      })
    );
  }

  /**
   * Cerca articoli per termine
   */
  searchArticles(searchTerm: string): Observable<HelpArticle[]> {
    return from(
      this.supabase.client
        .from('help_articles')
        .select('*')
        .eq('is_published', true)
        .or(`title.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%`)
        .order('category')
        .order('order_index')
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return data || [];
      }),
      catchError(error => {
        console.error(`Error searching articles for "${searchTerm}":`, error);
        return of([]);
      })
    );
  }

  /**
   * Ottieni le categorie con il conteggio degli articoli
   */
  getCategories(): Observable<HelpCategory[]> {
    return from(
      this.supabase.client
        .from('help_articles')
        .select('category')
        .eq('is_published', true)
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;

        const categoryMap = new Map<string, number>();
        data?.forEach(item => {
          const category = item.category || 'Generale';
          categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
        });

        const categories = Array.from(categoryMap.entries()).map(([category, count]) => ({
          category,
          count
        }));

        this.categoriesSignal.set(categories);
        return categories;
      }),
      catchError(error => {
        console.error('Error loading help categories:', error);
        return of([]);
      })
    );
  }

  /**
   * Crea un nuovo articolo (per uso amministrativo futuro)
   */
  createArticle(article: Omit<HelpArticle, 'id' | 'created_at' | 'updated_at'>): Observable<HelpArticle> {
    return from(
      this.supabase.client
        .from('help_articles')
        .insert(article)
        .select()
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        this.loadArticles(); // Ricarica gli articoli dopo l'inserimento
        return data;
      }),
      catchError(error => {
        console.error('Error creating help article:', error);
        throw error;
      })
    );
  }

  /**
   * Aggiorna un articolo esistente (per uso amministrativo futuro)
   */
  updateArticle(article: HelpArticle): Observable<HelpArticle> {
    return from(
      this.supabase.client
        .from('help_articles')
        .update({
          title: article.title,
          content: article.content,
          category: article.category,
          order_index: article.order_index,
          is_published: article.is_published,
          updated_at: new Date().toISOString()
        })
        .eq('id', article.id)
        .select()
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        this.loadArticles(); // Ricarica gli articoli dopo l'aggiornamento
        return data;
      }),
      catchError(error => {
        console.error('Error updating help article:', error);
        throw error;
      })
    );
  }

  /**
   * Elimina un articolo (soft delete - imposta is_published a false)
   */
  deleteArticle(id: string): Observable<void> {
    return from(
      this.supabase.client
        .from('help_articles')
        .update({ is_published: false, updated_at: new Date().toISOString() })
        .eq('id', id)
    ).pipe(
      map(({ error }) => {
        if (error) throw error;
        this.loadArticles(); // Ricarica gli articoli dopo l'eliminazione
        return;
      }),
      catchError(error => {
        console.error(`Error deleting help article with ID ${id}:`, error);
        throw error;
      })
    );
  }

  /**
   * Aggiorna le categorie in base agli articoli caricati
   */
  private updateCategories(articles: HelpArticle[]) {
    const categoryMap = new Map<string, HelpArticle[]>();

    articles.forEach(article => {
      const category = article.category || 'Generale';
      if (!categoryMap.has(category)) {
        categoryMap.set(category, []);
      }
      categoryMap.get(category)!.push(article);
    });

    const categories: HelpCategory[] = Array.from(categoryMap.entries()).map(([category, articles]) => ({
      category,
      count: articles.length,
      articles
    }));

    this.categoriesSignal.set(categories);
  }

  /**
   * Carica gli articoli all'inizializzazione del service
   */
  private loadArticles() {
    this.getArticles().subscribe();
    this.getCategories().subscribe();
  }
}