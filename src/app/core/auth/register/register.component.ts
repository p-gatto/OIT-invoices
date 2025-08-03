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
  selector: 'app-register',
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss'
})
export class RegisterComponent {

  fb = inject(FormBuilder);
  authService = inject(AuthService);
  router = inject(Router);
  snackBar = inject(MatSnackBar);

  registerForm: FormGroup;
  hidePassword = signal(true);
  loading = signal(false);

  constructor() {
    this.registerForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  onSubmit() {
    if (this.registerForm.valid) {
      this.loading.set(true);
      const { email, password } = this.registerForm.value;
      this.authService.signUp(email, password).subscribe({
        next: (user) => {
          this.loading.set(false);
          if (user) {
            this.snackBar.open('Registrazione avvenuta con successo! Controlla la tua email per la conferma.', 'Chiudi', { duration: 5000 });
            this.router.navigate(['/login']); // Reindirizza al login dopo la registrazione
          } else {
            // Questo caso si verifica se Supabase richiede conferma email
            this.snackBar.open('Registrazione quasi completata. Controlla la tua email per il link di conferma.', 'Chiudi', { duration: 5000 });
            this.router.navigate(['/login']);
          }
        },
        error: (err) => {
          this.loading.set(false);
          let errorMessage = 'Errore durante la registrazione. Riprova.';
          if (err.message.includes('User already registered')) {
            errorMessage = 'Utente già registrato. Prova ad accedere.';
          }
          this.snackBar.open(errorMessage, 'Chiudi', { duration: 5000 });
          console.error('Registration error:', err);
        }
      });
    }
  }

}