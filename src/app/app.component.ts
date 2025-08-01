import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';

import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { HeaderComponent } from './core/frame/header/header.component';
import { FooterComponent } from './core/frame/footer/footer.component';
import { SidebarComponent } from './core/frame/sidebar/sidebar.component';

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
export class AppComponent {
  title = 'OIT-invoices';

  sidebarOpen = signal(true);

  toggleSidebar() {
    this.sidebarOpen.update(value => !value);
  }

  isDesktop(): boolean {
    return window.innerWidth >= 768;
  }
}
