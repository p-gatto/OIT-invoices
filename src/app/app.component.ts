import { Component, effect, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet } from '@angular/router';

import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { HeaderComponent } from './core/frame/header/header.component';
import { FooterComponent } from './core/frame/footer/footer.component';
import { SidebarComponent } from './core/frame/sidebar/sidebar.component';
import { AuthService } from './core/auth/auth.service';

@Component({
  selector: 'app-root',
  imports: [
    CommonModule,
    RouterOutlet,
    MatSidenavModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    HeaderComponent,
    FooterComponent,
    SidebarComponent
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent { //implements OnInit {
  title = 'OIT-invoices';

  sidebarOpen = signal(true);

  constructor(public authService: AuthService, private router: Router) {
    // Effetto per reagire ai cambiamenti dello stato di autenticazione
    effect(() => {
      // Se l'utente non è autenticato e la sessione è stata caricata, reindirizza al login
      if (this.authService.sessionLoaded() && !this.authService.currentUser()) {
        this.router.navigate(['/login']);
      }
    });
  }

  ngOnInit() {
    // Inizializza lo stato della sidebar in base alla dimensione dello schermo
    this.sidebarOpen.set(this.isDesktop());

    // Listener per il resize della finestra
    window.addEventListener('resize', () => {
      if (!this.isDesktop() && this.sidebarOpen()) {
        this.sidebarOpen.set(false);
      }
    });
  }

  toggleSidebar() {
    this.sidebarOpen.update(value => !value);
  }

  isDesktop(): boolean {
    return window.innerWidth >= 768;
  }

}