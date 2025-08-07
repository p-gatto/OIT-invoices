import { Component, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar } from '@angular/material/snack-bar';

import { AuthService } from '../../auth/auth.service';

@Component({
  selector: 'app-header',
  imports: [
    CommonModule,
    RouterModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatBadgeModule,
    MatDividerModule
  ],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent {
  sidebarOpen = input<boolean>(true);
  toggleSidebar = output<void>();
  menuClick = output<void>();

  authService = inject(AuthService);
  router = inject(Router);
  snackBar = inject(MatSnackBar);

  notificationCount = signal(3);

  logout() {
    this.authService.signOut().subscribe({
      next: () => {
        this.snackBar.open('Logout effettuato con successo', 'Chiudi', { duration: 3000 });
        if (this.sidebarOpen()) {
          this.toggleSidebar.emit();
        }
        this.router.navigate(['/login']);
      },
      error: (error) => {
        this.snackBar.open('Errore durante il logout', 'Chiudi', { duration: 3000 });
        console.error('Logout error:', error);
      }
    });
  }

  toggleSidebarEvent() {
    this.toggleSidebar.emit();
    //this.menuClick.emit();
  }

}