import { inject, Signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { CanActivateFn, Router } from '@angular/router';

import { catchError, map, of, take, tap } from 'rxjs';

import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = (route, state) => {

  const authService = inject(AuthService);
  const router = inject(Router);

  // Converti il signal sessionLoaded in un Observable per usarlo con pipe
  return toObservable(authService.sessionLoaded).pipe(
    // Aspetta che la sessione sia stata caricata
    tap(loaded => {
      if (!loaded) {
        // Potresti mostrare un loader qui se necessario
        console.log('Session not yet loaded, waiting...');
      }
    }),
    // Prendi il primo valore dopo che la sessione è stata caricata
    // Questo previene che la guardia si attivi prima che Supabase abbia caricato la sessione
    map(loaded => loaded && authService.currentUser() !== null),
    take(1), // Completa l'Observable dopo il primo valore
    tap(isAuthenticated => {
      if (!isAuthenticated) {
        console.log('User not authenticated, redirecting to login...');
        router.navigate(['/login']);
      }
    }),
    catchError(() => {
      // In caso di errore, reindirizza al login
      router.navigate(['/login']);
      return of(false);
    })
  );
};