import { inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { CanActivateFn, Router } from '@angular/router';

import { catchError, map, of, take, tap } from 'rxjs';

import { AuthService } from './auth.service';

export const publicGuard: CanActivateFn = (route, state) => {

  const authService = inject(AuthService);
  const router = inject(Router);

  return toObservable(authService.sessionLoaded).pipe(
    tap(loaded => {
      if (!loaded) {
        console.log('Session not yet loaded for public guard, waiting...');
      }
    }),
    map(loaded => loaded && authService.currentUser() === null),
    take(1),
    tap(isPublicOnly => {
      if (!isPublicOnly) {
        console.log('User already authenticated, redirecting to dashboard...');
        router.navigate(['/dashboard']);
      }
    }),
    catchError(() => {
      // In caso di errore, permetti l'accesso (o gestisci diversamente)
      return of(true);
    })
  );

};