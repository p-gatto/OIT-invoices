import { Injectable } from '@angular/core';

import { createClient, SupabaseClient } from '@supabase/supabase-js';

import { environment } from '../../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class SupabaseService {
    private supabase: SupabaseClient;

    constructor() {
        this.supabase = createClient(
            environment.supabaseUrl,
            environment.supabaseKey,
            {
                auth: {
                    persistSession: true,
                    storageKey: 'sb-azmyeqtnxecnajeupawk-auth-token',
                    storage: window.localStorage,
                    detectSessionInUrl: true,
                    autoRefreshToken: true,
                    //// Aggiungi un timeout più lungo per il lock
                    //lockAcquireTimeout: 10000, // 10 secondi invece del default
                    //// Disabilita completamente i lock
                    //lock: false,
                    // Disabilita il debug per evitare log eccessivi
                    debug: false
                }
            }
        );
    }

    get client() {
        return this.supabase;
    }
}