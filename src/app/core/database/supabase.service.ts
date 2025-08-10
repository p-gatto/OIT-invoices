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
                    debug: false
                }
            }
        );
    }

    get client() {
        return this.supabase;
    }
}