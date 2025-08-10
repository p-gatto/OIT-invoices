import { Injectable, OnDestroy, signal } from '@angular/core';

import { from, Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

import { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import { SupabaseService } from '../database/supabase.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService implements OnDestroy {

  // Signal per tenere traccia dello stato di autenticazione dell'utente
  private _currentUser = signal<User | null>(null);
  // Espone il segnale come readonly per prevenire modifiche esterne
  currentUser = this._currentUser.asReadonly();

  // Signal per indicare se la sessione è stata caricata (utile per guardie)
  private _sessionLoaded = signal(false);
  sessionLoaded = this._sessionLoaded.asReadonly();

  private authSubscription: any;

  constructor(private supabase: SupabaseService) {

    // Pulisci eventuali lock pendenti all'avvio
    this.cleanupLocks();

    // Ascolta i cambiamenti di stato dell'autenticazione di Supabase
    this.supabase.client.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      //console.log('Auth event:', event, 'Session:', session);
      this._currentUser.set(session ? session.user : null);
      this._sessionLoaded.set(true); // Indica che la sessione è stata caricata
    });

    // Carica la sessione iniziale all'avvio del servizio
    this.loadInitialSession();

    // Gestisci la chiusura della finestra/tab
    window.addEventListener('beforeunload', () => this.cleanup());
  }

  ngOnDestroy() {
    this.cleanup();
  }

  private cleanup() {
    // Pulisci la sottoscrizione se esiste
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
    // Pulisci i lock
    this.cleanupLocks();
  }

  private async cleanupLocks() {
    try {
      // Prova a rilasciare eventuali lock pendenti
      if ('locks' in navigator && navigator.locks) {
        // Questa è una workaround per forzare il rilascio dei lock
        await navigator.locks.request(
          'sb-azmyeqtnxecnajeupawk-auth-token',
          { ifAvailable: true },
          async (lock) => {
            if (lock) {
              // Lock acquisito e rilasciato immediatamente
              return;
            }
          }
        );
      }
    } catch (error) {
      // Ignora errori nel cleanup dei lock
      console.debug('Lock cleanup attempted:', error);
    }
  }


  /**
   * Carica la sessione utente iniziale.
   * Questo è importante per inizializzare lo stato dell'utente all'avvio dell'app.
   */
  private async loadInitialSession() {
    try {
      const { data: { session } } = await this.supabase.client.auth.getSession();
      this._currentUser.set(session ? session.user : null);
    } catch (error) {
      console.error('Error loading initial session:', error);
      this._currentUser.set(null);
    } finally {
      this._sessionLoaded.set(true);
    }
  }

  /**
   * Registra un nuovo utente con email e password.
   * @param email L'email dell'utente.
   * @param password La password dell'utente.
   * @returns Un Observable che emette l'utente registrato o un errore.
   */
  signUp(email: string, password: string): Observable<User | null> {
    return from(this.supabase.client.auth.signUp({ email, password })).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        // Supabase invia un'email di conferma, l'utente non è subito autenticato
        // L'utente sarà null qui se la conferma email è richiesta
        return data.user;
      }),
      catchError(error => {
        console.error('Error signing up:', error);
        throw error;
      })
    );
  }

  /**
   * Effettua il login di un utente con email e password.
   * @param email L'email dell'utente.
   * @param password La password dell'utente.
   * @returns Un Observable che emette l'utente loggato o un errore.
   */
  signIn(email: string, password: string): Observable<User | null> {
    return from(this.supabase.client.auth.signInWithPassword({ email, password })).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return data.user;
      }),
      catchError(error => {
        console.error('Error signing in:', error);
        throw error;
      })
    );
  }

  /**
   * Effettua il logout dell'utente corrente.
   * @returns Un Observable che completa al logout o emette un errore.
   */
  signOut(): Observable<void> {
    return from(this.supabase.client.auth.signOut()).pipe(
      map(({ error }) => {
        if (error) throw error;
        this._currentUser.set(null); // Aggiorna lo stato locale
        return;
      }),
      catchError(error => {
        console.error('Error signing out:', error);
        throw error;
      })
    );
  }

  /**
   * Restituisce un Observable che emette l'utente corrente.
   * Utile per componenti che devono reagire ai cambiamenti di autenticazione.
   */
  getCurrentUser(): Observable<User | null> {
    // Combina il segnale con un Observable per compatibilità RxJS
    return from(this.supabase.client.auth.getSession().then(({ data: { session } }) => session?.user || null).then(user => user));
  }
}