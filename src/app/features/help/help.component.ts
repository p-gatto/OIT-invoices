import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

import { MatCardModule } from '@angular/material/card';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';

import { HelpArticle, HelpCategory } from './help.model';
import { HelpService } from './help.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-help',
  imports: [
    CommonModule,
    FormsModule,
    MatInputModule,
    MatFormFieldModule,
    MatCardModule,
    MatExpansionModule,
    MatIconModule,
    MatButtonModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatDividerModule
  ],
  templateUrl: './help.component.html',
  styleUrl: './help.component.scss'
})
export class HelpComponent implements OnInit {

  helpService = inject(HelpService);

  articles = signal<HelpArticle[]>([]);
  categories = signal<HelpCategory[]>([]);
  loading = signal(true);
  searchQuery = signal('');
  selectedCategory = signal<string>('');
  searchResults = signal<HelpArticle[]>([]);
  isSearching = signal(false);

  // Computed per gli articoli filtrati
  filteredArticles = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const category = this.selectedCategory();
    let filtered = this.articles();

    // Filtra per categoria se selezionata
    if (category) {
      filtered = filtered.filter(article => article.category === category);
    }

    // Filtra per ricerca se presente
    if (query) {
      filtered = filtered.filter(article =>
        article.title.toLowerCase().includes(query) ||
        article.content.toLowerCase().includes(query)
      );
    }

    return filtered;
  });

  // Computed per raggruppare gli articoli per categoria
  articlesByCategory = computed(() => {
    const articles = this.filteredArticles();
    const categoryMap = new Map<string, HelpArticle[]>();

    articles.forEach(article => {
      const category = article.category || 'Generale';
      if (!categoryMap.has(category)) {
        categoryMap.set(category, []);
      }
      categoryMap.get(category)!.push(article);
    });

    // Converti in array e ordina
    return Array.from(categoryMap.entries())
      .map(([category, articles]) => ({
        category,
        articles: articles.sort((a, b) => a.order_index - b.order_index)
      }))
      .sort((a, b) => a.category.localeCompare(b.category));
  });

  ngOnInit() {
    this.loadHelpData();
  }

  private loadHelpData() {
    this.loading.set(true);

    // Carica gli articoli
    this.helpService.getArticles().subscribe({
      next: articles => {
        this.articles.set(articles);
        this.loading.set(false);
      },
      error: error => {
        console.error('Error loading help articles:', error);
        this.loading.set(false);
      }
    });

    // Carica le categorie
    this.helpService.getCategories().subscribe({
      next: categories => {
        this.categories.set(categories);
      },
      error: error => {
        console.error('Error loading help categories:', error);
      }
    });
  }

  onSearch() {
    const query = this.searchQuery().trim();

    if (!query) {
      this.searchResults.set([]);
      this.isSearching.set(false);
      return;
    }

    this.isSearching.set(true);
    this.helpService.searchArticles(query).subscribe({
      next: results => {
        this.searchResults.set(results);
        this.isSearching.set(false);
      },
      error: error => {
        console.error('Error searching articles:', error);
        this.isSearching.set(false);
      }
    });
  }

  onCategorySelect(category: string) {
    this.selectedCategory.set(category);
    this.searchQuery.set(''); // Pulisce la ricerca quando si seleziona una categoria
  }

  clearFilters() {
    this.searchQuery.set('');
    this.selectedCategory.set('');
    this.searchResults.set([]);
  }

  // Utility per convertire il markdown in HTML (semplificato)
  convertMarkdownToHtml(content: string): string {
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>')
      .replace(/`(.*?)`/g, '<code>$1</code>');
  }

  // Utility per ottenere l'icona appropriata per categoria
  getCategoryIcon(category: string): string {
    const iconMap: { [key: string]: string } = {
      'Generale': 'help',
      'Fatturazione': 'receipt_long',
      'Clienti': 'people',
      'Prodotti': 'inventory_2',
      'Pagamenti': 'payment',
      'Configurazione': 'settings',
      'Sicurezza': 'security',
      'API': 'api',
      'Troubleshooting': 'build',
      'Aggiornamenti': 'system_update'
    };
    return iconMap[category] || 'article';
  }

}