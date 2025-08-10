import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';

import { AuthService } from '../auth.service';

@Component({
  selector: 'app-login',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    RouterModule
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {

  fb = inject(FormBuilder);
  authService = inject(AuthService);
  router = inject(Router);
  snackBar = inject(MatSnackBar);

  loginForm: FormGroup;
  hidePassword = signal(true);
  loading = signal(false);

  constructor() {
    this.loginForm = this.fb.group({
      email: ['demo@demo.it', [Validators.required, Validators.email]],
      password: ['Demo!12345', Validators.required]
    });
  }

  onSubmit() {
    if (this.loginForm.valid) {
      this.loading.set(true);
      const { email, password } = this.loginForm.value;
      this.authService.signIn(email, password).subscribe({
        next: (user) => {
          this.loading.set(false);
          if (user) {
            this.snackBar.open('Login effettuato con successo!', 'Chiudi', { duration: 3000 });
            this.router.navigate(['/dashboard']);
          } else {
            // Questo caso potrebbe verificarsi se Supabase richiede conferma email
            this.snackBar.open('Controlla la tua email per il link di conferma.', 'Chiudi', { duration: 5000 });
          }
        },
        error: (err) => {
          this.loading.set(false);
          let errorMessage = 'Errore durante il login. Riprova.';
          if (err.message.includes('Invalid login credentials')) {
            errorMessage = 'Credenziali non valide. Controlla email e password.';
          } else if (err.message.includes('Email not confirmed')) {
            errorMessage = 'Email non confermata. Controlla la tua casella di posta.';
          }
          this.snackBar.open(errorMessage, 'Chiudi', { duration: 5000 });
          console.error('Login error:', err);
        }
      });
    }
  }

}