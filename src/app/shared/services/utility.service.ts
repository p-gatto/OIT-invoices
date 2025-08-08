import { Injectable } from '@angular/core';

// Importa environment se necessario
import { environment } from '../../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class UtilityService {

    constructor() { }

    /**
     * Formatta una data per il database (YYYY-MM-DD)
     */
    formatDateForDB(date: Date | string | null): string | null {
        if (!date) return null;

        const d = typeof date === 'string' ? new Date(date) : date;
        if (isNaN(d.getTime())) return null;

        return d.toISOString().split('T')[0];
    }

    /**
     * Formatta una data per la visualizzazione italiana (DD/MM/YYYY)
     */
    formatDateForDisplay(date: Date | string | null): string {
        if (!date) return '';

        const d = typeof date === 'string' ? new Date(date) : date;
        if (isNaN(d.getTime())) return '';

        return d.toLocaleDateString('it-IT');
    }

    /**
     * Calcola i giorni tra due date
     */
    daysBetween(date1: Date | string, date2: Date | string): number {
        const d1 = typeof date1 === 'string' ? new Date(date1) : date1;
        const d2 = typeof date2 === 'string' ? new Date(date2) : date2;

        const diffTime = d2.getTime() - d1.getTime();
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    /**
     * Verifica se una data è nel passato
     */
    isDateInPast(date: Date | string): boolean {
        const d = typeof date === 'string' ? new Date(date) : date;
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Reset ore per confronto solo per data
        d.setHours(0, 0, 0, 0);

        return d < today;
    }

    /**
     * Aggiunge giorni a una data
     */
    addDays(date: Date | string, days: number): Date {
        const d = typeof date === 'string' ? new Date(date) : new Date(date);
        d.setDate(d.getDate() + days);
        return d;
    }

    /**
     * Genera un numero di fattura univoco
     */
    generateInvoiceNumber(): string {
        const year = new Date().getFullYear();
        const timestamp = Date.now();
        const randomPart = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        return `INV-${year}-${timestamp.toString().slice(-6)}${randomPart}`;
    }

    /**
     * Verifica se un numero di fattura ha il formato corretto
     */
    isValidInvoiceNumber(invoiceNumber: string): boolean {
        const pattern = /^INV-\d{4}-\d{6,9}$/;
        return pattern.test(invoiceNumber);
    }

    /**
     * Formatta un numero per la visualizzazione europea
     */
    formatNumber(value: number, decimals: number = 2): string {
        return value.toLocaleString('it-IT', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        });
    }

    /**
     * Formatta una valuta per la visualizzazione europea
     */
    formatCurrency(value: number, decimals: number = 2): string {
        return value.toLocaleString('it-IT', {
            style: 'currency',
            currency: 'EUR',
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        });
    }

    /**
     * Valida un codice fiscale italiano
     */
    isValidItalianTaxCode(code: string): boolean {
        if (!code) return false;

        // Rimuovi spazi e converti in maiuscolo
        const cleanCode = code.replace(/\s/g, '').toUpperCase();

        // Verifica lunghezza
        if (cleanCode.length !== 16) return false;

        // Pattern base per codice fiscale
        const pattern = /^[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]$/;
        return pattern.test(cleanCode);
    }

    /**
     * Valida una partita IVA italiana
     */
    isValidItalianVAT(vat: string): boolean {
        if (!vat) return false;

        // Rimuovi spazi
        const cleanVat = vat.replace(/\s/g, '');

        // Verifica che sia composta da 11 cifre
        if (!/^\d{11}$/.test(cleanVat)) return false;

        // Algoritmo di verifica del check digit
        let sum = 0;
        for (let i = 0; i < 10; i++) {
            let digit = parseInt(cleanVat[i]);
            if (i % 2 === 1) {
                digit *= 2;
                if (digit > 9) digit -= 9;
            }
            sum += digit;
        }

        const checkDigit = (10 - (sum % 10)) % 10;
        return checkDigit === parseInt(cleanVat[10]);
    }

    /**
     * Valida un indirizzo email
     */
    isValidEmail(email: string): boolean {
        if (!email) return false;

        const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return pattern.test(email);
    }

    /**
     * Estrae il nome del file da un percorso
     */
    getFileNameFromPath(path: string): string {
        return path.split('/').pop() || path;
    }

    /**
     * Genera un ID temporaneo per nuovi elementi
     */
    generateTempId(): string {
        return `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Converte una stringa in slug (per URL)
     */
    slugify(text: string): string {
        return text
            .toLowerCase()
            .replace(/[àáâãäå]/g, 'a')
            .replace(/[èéêë]/g, 'e')
            .replace(/[ìíîï]/g, 'i')
            .replace(/[òóôõö]/g, 'o')
            .replace(/[ùúûü]/g, 'u')
            .replace(/[ñ]/g, 'n')
            .replace(/[ç]/g, 'c')
            .replace(/[^\w\s-]/g, '') // Remove special characters
            .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
            .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
    }

    /**
     * Calcola la percentuale tra due numeri
     */
    calculatePercentage(value: number, total: number): number {
        if (total === 0) return 0;
        return (value / total) * 100;
    }

    /**
     * Arrotonda un numero a 2 decimali (per calcoli monetari)
     */
    roundToDecimals(value: number, decimals: number = 2): number {
        return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
    }

    /**
     * Verifica se un valore è un numero valido
     */
    isValidNumber(value: any): boolean {
        return !isNaN(value) && isFinite(value) && value !== null && value !== undefined;
    }

    /**
     * Converte una stringa in numero, gestendo i casi edge
     */
    parseNumber(value: any): number {
        if (typeof value === 'number') return value;
        if (typeof value === 'string') {
            const parsed = parseFloat(value.replace(',', '.'));
            return isNaN(parsed) ? 0 : parsed;
        }
        return 0;
    }

    /**
     * Normalizza un testo per la ricerca (rimuove accenti, maiuscole, spazi extra)
     */
    normalizeForSearch(text: string): string {
        if (!text) return '';

        return text
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Rimuove accenti
            .replace(/\s+/g, ' ') // Normalizza spazi
            .trim();
    }

    /**
     * Verifica se una stringa contiene un'altra stringa (ricerca flessibile)
     */
    fuzzySearch(searchTerm: string, target: string): boolean {
        if (!searchTerm || !target) return false;

        const normalizedSearch = this.normalizeForSearch(searchTerm);
        const normalizedTarget = this.normalizeForSearch(target);

        return normalizedTarget.includes(normalizedSearch);
    }

    /**
     * Debounce function per ottimizzare le ricerche
     */
    debounce<T extends (...args: any[]) => void>(func: T, delay: number): (...args: Parameters<T>) => void {
        let timeoutId: ReturnType<typeof setTimeout>;

        return (...args: Parameters<T>) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    }

    /**
     * Converte bytes in formato leggibile
     */
    formatFileSize(bytes: number): string {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Copia testo negli appunti
     */
    async copyToClipboard(text: string): Promise<boolean> {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (err) {
            console.error('Failed to copy to clipboard:', err);
            return false;
        }
    }

    /**
     * Scarica contenuto come file
     */
    downloadFile(content: string, filename: string, mimeType: string = 'text/plain') {
        const blob = new Blob([content], { type: mimeType });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');

        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();

        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    }

    /**
     * Ottiene informazioni sul device
     */
    getDeviceInfo(): {
        isMobile: boolean;
        isTablet: boolean;
        isDesktop: boolean;
        userAgent: string;
    } {
        const userAgent = navigator.userAgent;
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
        const isTablet = /iPad|Android(?=.*\bMobile\b)/.test(userAgent) && window.innerWidth >= 768;

        return {
            isMobile: isMobile && !isTablet,
            isTablet,
            isDesktop: !isMobile,
            userAgent
        };
    }

    /**
     * Gestisce la visualizzazione responsive
     */
    isScreenSize(size: 'mobile' | 'tablet' | 'desktop'): boolean {
        const width = window.innerWidth;

        switch (size) {
            case 'mobile': return width < 768;
            case 'tablet': return width >= 768 && width < 1024;
            case 'desktop': return width >= 1024;
            default: return false;
        }
    }

    /**
     * Ritorna la data corrente nel fuso orario italiano
     */
    getCurrentItalianDate(): Date {
        return new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Rome' }));
    }

    /**
     * Calcola l'età di un elemento basata sulla data di creazione
     */
    calculateAge(createdAt: string | Date): {
        days: number;
        weeks: number;
        months: number;
        years: number;
        humanReadable: string;
    } {
        const created = typeof createdAt === 'string' ? new Date(createdAt) : createdAt;
        const now = new Date();

        const diffMs = now.getTime() - created.getTime();
        const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const weeks = Math.floor(days / 7);
        const months = Math.floor(days / 30);
        const years = Math.floor(days / 365);

        let humanReadable = '';
        if (years > 0) {
            humanReadable = `${years} ${years === 1 ? 'anno' : 'anni'} fa`;
        } else if (months > 0) {
            humanReadable = `${months} ${months === 1 ? 'mese' : 'mesi'} fa`;
        } else if (weeks > 0) {
            humanReadable = `${weeks} ${weeks === 1 ? 'settimana' : 'settimane'} fa`;
        } else if (days > 0) {
            humanReadable = `${days} ${days === 1 ? 'giorno' : 'giorni'} fa`;
        } else {
            humanReadable = 'Oggi';
        }

        return { days, weeks, months, years, humanReadable };
    }

    /**
     * Valida una stringa non vuota
     */
    isNonEmptyString(value: any): boolean {
        return typeof value === 'string' && value.trim().length > 0;
    }

    /**
     * Pulisce e normalizza una stringa
     */
    cleanString(value: string | null | undefined): string | null {
        if (!value || typeof value !== 'string') return null;
        const cleaned = value.trim();
        return cleaned.length > 0 ? cleaned : null;
    }

    /**
     * Genera colori casuali per grafici o avatar
     */
    generateColor(seed: string): string {
        let hash = 0;
        for (let i = 0; i < seed.length; i++) {
            hash = seed.charCodeAt(i) + ((hash << 5) - hash);
        }

        const hue = Math.abs(hash) % 360;
        return `hsl(${hue}, 70%, 60%)`;
    }

    /**
     * Ottiene le iniziali da un nome
     */
    getInitials(name: string): string {
        if (!name) return '';

        return name
            .split(' ')
            .map(word => word.charAt(0).toUpperCase())
            .slice(0, 2)
            .join('');
    }

    /**
     * Converte un numero in formato ordinale italiano
     */
    toOrdinal(num: number): string {
        const ordinals: { [key: number]: string } = {
            1: '1°', 2: '2°', 3: '3°', 4: '4°', 5: '5°',
            6: '6°', 7: '7°', 8: '8°', 9: '9°', 10: '10°'
        };

        return ordinals[num] || `${num}°`;
    }

    /**
     * Verifica se l'app è in modalità di sviluppo
     */
    isDevelopmentMode(): boolean {
        return !environment.production;
    }

    /**
     * Log condizionale (solo in sviluppo)
     */
    devLog(message: any, ...args: any[]): void {
        if (this.isDevelopmentMode()) {
            console.log(message, ...args);
        }
    }

    /**
     * Gestisce errori con logging appropriato
     */
    handleError(error: any, context: string = ''): void {
        const errorMessage = error?.message || 'Errore sconosciuto';
        const fullContext = context ? `[${context}] ${errorMessage}` : errorMessage;

        console.error(fullContext, error);

        // In futuro si potrebbe aggiungere tracking degli errori
        // this.analyticsService.trackError(fullContext, error);
    }

    /**
     * Ritorna informazioni sulla versione dell'app
     */
    getAppVersion(): { version: string; buildDate: string } {
        // Questi valori dovrebbero essere iniettati dal build process
        return {
            version: '1.0.4', // Dalla package.json
            buildDate: new Date().toISOString()
        };
    }

    /**
     * Controlla la connessione internet
     */
    isOnline(): boolean {
        return navigator.onLine;
    }

    /**
     * Ascolta i cambiamenti di connessione
     */
    onConnectionChange(callback: (isOnline: boolean) => void): () => void {
        const handleOnline = () => callback(true);
        const handleOffline = () => callback(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Restituisce una funzione di cleanup
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }
}