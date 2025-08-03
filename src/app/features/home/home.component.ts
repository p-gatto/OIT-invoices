import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-home',
  imports: [
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export default class HomeComponent {

}
