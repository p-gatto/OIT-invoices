import { Injectable, inject } from '@angular/core';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';


// Importa environment per il controllo della produzione
import { environment } from '../../../environments/environment';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface NotificationConfig extends MatSnackBarConfig {
    type?: NotificationType;
    autoClose?: boolean;
    persistent?: boolean;
}

@Injectable({
    providedIn: 'root'
})
export class NotificationService {

    private snackBar = inject(MatSnackBar);

    // Configurazioni predefinite per tipo di notifica
    private readonly defaultConfigs: Record<NotificationType, MatSnackBarConfig> = {
        success: {
            duration: 3000,
            panelClass: ['success-snackbar'],
            horizontalPosition: 'end',
            verticalPosition: 'bottom'
        },
        error: {
            duration: 5000,
            panelClass: ['error-snackbar'],
            horizontalPosition: 'end',
            verticalPosition: 'bottom'
        },
        warning: {
            duration: 4000,
            panelClass: ['warning-snackbar'],
            horizontalPosition: 'end',
            verticalPosition: 'bottom'
        },
        info: {
            duration: 3000,
            panelClass: ['info-snackbar'],
            horizontalPosition: 'end',
            verticalPosition: 'bottom'
        }
    };

    constructor() { }

    /**
     * Mostra una notifica di successo
     */
    success(message: string, action: string = 'Chiudi', config?: NotificationConfig) {
        return this.show(message, action, { ...this.defaultConfigs.success, ...config });
    }

    /**
     * Mostra una notifica di errore
     */
    error(message: string, action: string = 'Chiudi', config?: NotificationConfig) {
        return this.show(message, action, { ...this.defaultConfigs.error, ...config });
    }

    /**
     * Mostra una notifica di avvertimento
     */
    warning(message: string, action: string = 'Chiudi', config?: NotificationConfig) {
        return this.show(message, action, { ...this.defaultConfigs.warning, ...config });
    }

    /**
     * Mostra una notifica informativa
     */
    info(message: string, action: string = 'Chiudi', config?: NotificationConfig) {
        return this.show(message, action, { ...this.defaultConfigs.info, ...config });
    }

    /**
     * Mostra una notifica generica
     */
    show(message: string, action: string = 'Chiudi', config?: MatSnackBarConfig) {
        return this.snackBar.open(message, action, config);
    }

    /**
     * Notifiche specifiche per operazioni CRUD
     */

    // Create operations
    createSuccess(entityName: string, entityLabel?: string) {
        const label = entityLabel || entityName;
        this.success(`${label} creato con successo`);
    }

    createError(entityName: string, error?: any) {
        console.error(`Error creating ${entityName}:`, error);
        this.error(`Errore nella creazione di ${entityName}`);
    }

    // Update operations
    updateSuccess(entityName: string, entityLabel?: string) {
        const label = entityLabel || entityName;
        this.success(`${label} aggiornato con successo`);
    }

    updateError(entityName: string, error?: any) {
        console.error(`Error updating ${entityName}:`, error);
        this.error(`Errore nell'aggiornamento di ${entityName}`);
    }

    // Delete operations
    deleteSuccess(entityName: string, entityLabel?: string) {
        const label = entityLabel || entityName;
        this.success(`${label} eliminato con successo`);
    }

    deleteError(entityName: string, error?: any) {
        console.error(`Error deleting ${entityName}:`, error);
        this.error(`Errore nell'eliminazione di ${entityName}`);
    }

    // Load operations
    loadError(entityName: string, error?: any) {
        console.error(`Error loading ${entityName}:`, error);
        this.error(`Errore nel caricamento di ${entityName}`);
    }

    /**
     * Notifiche specifiche per l'applicazione invoice
     */

    // Invoice notifications
    invoiceCreated(invoiceNumber: string) {
        this.success(`Fattura ${invoiceNumber} creata con successo`);
    }

    invoiceUpdated(invoiceNumber: string) {
        this.success(`Fattura ${invoiceNumber} aggiornata con successo`);
    }

    invoiceDeleted(invoiceNumber: string) {
        this.success(`Fattura ${invoiceNumber} eliminata con successo`);
    }

    invoiceDuplicated(originalNumber: string, newNumber: string) {
        this.success(`Fattura duplicata: ${originalNumber} → ${newNumber}`);
    }

    invoiceStatusChanged(invoiceNumber: string, status: string) {
        this.success(`Fattura ${invoiceNumber} marcata come: ${status}`);
    }

    // Customer notifications
    customerCreated(customerName: string) {
        this.success(`Cliente "${customerName}" creato con successo`);
    }

    customerUpdated(customerName: string) {
        this.success(`Cliente "${customerName}" aggiornato con successo`);
    }

    customerDeleted(customerName: string) {
        this.success(`Cliente "${customerName}" eliminato con successo`);
    }

    // Product notifications
    productCreated(productName: string) {
        this.success(`Prodotto "${productName}" creato con successo`);
    }

    productUpdated(productName: string) {
        this.success(`Prodotto "${productName}" aggiornato con successo`);
    }

    productDeleted(productName: string) {
        this.success(`Prodotto "${productName}" eliminato con successo`);
    }

    // PDF notifications
    pdfGenerated(fileName: string) {
        this.success(`PDF generato: ${fileName}`);
    }

    pdfError(error?: any) {
        console.error('PDF generation error:', error);
        this.error('Errore durante la generazione del PDF');
    }

    // Authentication notifications
    loginSuccess() {
        this.success('Login effettuato con successo');
    }

    loginError(error?: any) {
        let message = 'Errore durante il login';

        if (error?.message?.includes('Invalid login credentials')) {
            message = 'Credenziali non valide. Controlla email e password.';
        } else if (error?.message?.includes('Email not confirmed')) {
            message = 'Email non confermata. Controlla la tua casella di posta.';
        }

        this.error(message);
    }

    logoutSuccess() {
        this.success('Logout effettuato con successo');
    }

    registrationSuccess() {
        this.success('Registrazione completata! Controlla la tua email per la conferma.', 'Chiudi', { duration: 5000 });
    }

    registrationError(error?: any) {
        let message = 'Errore durante la registrazione';

        if (error?.message?.includes('User already registered')) {
            message = 'Utente già registrato. Prova ad accedere.';
        }

        this.error(message);
    }

    // Data validation notifications
    validationError(field: string, issue: string) {
        this.warning(`${field}: ${issue}`);
    }

    formIncomplete() {
        this.warning('Completa tutti i campi obbligatori');
    }

    // Network and connection notifications
    connectionLost() {
        this.error('Connessione internet persa', 'Riprova', {
            duration: 0, // Persistent until reconnection
            persistent: true
        });
    }

    connectionRestored() {
        this.success('Connessione ripristinata');
    }

    // File operations
    fileExported(fileName: string) {
        this.success(`File esportato: ${fileName}`);
    }

    fileImported(count: number, entityType: string) {
        this.success(`${count} ${entityType} importati con successo`);
    }

    fileImportError(error?: any) {
        console.error('File import error:', error);
        this.error('Errore durante l\'importazione del file');
    }

    // Copy to clipboard
    copiedToClipboard(what: string) {
        this.info(`${what} copiato negli appunti`, '', { duration: 2000 });
    }

    copyError() {
        this.error('Impossibile copiare negli appunti');
    }

    // Search and filter notifications
    noResultsFound(searchTerm?: string) {
        const message = searchTerm
            ? `Nessun risultato trovato per "${searchTerm}"`
            : 'Nessun risultato trovato';
        this.info(message);
    }

    filterApplied(count: number) {
        this.info(`${count} risultati trovati`);
    }

    // Backup and sync notifications
    backupCreated() {
        this.success('Backup creato con successo');
    }

    syncCompleted() {
        this.success('Sincronizzazione completata');
    }

    syncError(error?: any) {
        console.error('Sync error:', error);
        this.error('Errore durante la sincronizzazione');
    }

    // Feature availability notifications
    featureNotAvailable(featureName: string) {
        this.info(`La funzionalità "${featureName}" sarà disponibile nelle prossime versioni`);
    }

    comingSoon(featureName: string) {
        this.info(`${featureName} - Funzionalità in arrivo!`);
    }

    // Confirmation notifications (for actions that need user feedback)
    actionConfirmed(action: string) {
        this.success(`${action} completato`);
    }

    actionCancelled(action: string) {
        this.info(`${action} annullato`);
    }

    // Progress notifications for long operations
    operationInProgress(operation: string) {
        return this.show(`${operation} in corso...`, '', {
            duration: 0,
            panelClass: ['progress-snackbar']
        });
    }

    operationCompleted(operation: string) {
        this.success(`${operation} completato`);
    }

    // Email notifications
    emailSent(recipient?: string) {
        const message = recipient
            ? `Email inviata a ${recipient}`
            : 'Email inviata con successo';
        this.success(message);
    }

    emailError(error?: any) {
        console.error('Email error:', error);
        this.error('Errore durante l\'invio dell\'email');
    }

    // Print notifications
    printStarted() {
        this.info('Stampa avviata');
    }

    printError() {
        this.error('Errore durante la stampa');
    }

    /**
     * Notifica personalizzata con azione custom
     */
    customAction(message: string, actionText: string, callback: () => void, type: NotificationType = 'info') {
        const config = { ...this.defaultConfigs[type], duration: 0 };
        const snackBarRef = this.snackBar.open(message, actionText, config);

        snackBarRef.onAction().subscribe(() => {
            callback();
        });

        return snackBarRef;
    }

    /**
     * Notifica di conferma con azioni multiple
     */
    confirmAction(
        message: string,
        confirmText: string,
        cancelText: string,
        onConfirm: () => void,
        onCancel?: () => void
    ) {
        const snackBarRef = this.show(message, confirmText, {
            duration: 0,
            panelClass: ['confirm-snackbar']
        });

        snackBarRef.onAction().subscribe(() => {
            onConfirm();
        });

        snackBarRef.afterDismissed().subscribe((info) => {
            if (!info.dismissedByAction && onCancel) {
                onCancel();
            }
        });

        return snackBarRef;
    }

    /**
     * Chiude tutte le notifiche attive
     */
    dismissAll() {
        this.snackBar.dismiss();
    }

    /**
     * Verifica se ci sono notifiche attive
     */
    hasActiveNotifications(): boolean {
        return !!this.snackBar._openedSnackBarRef;
    }

    /**
     * Gestione errori HTTP standardizzata
     */
    handleHttpError(error: any, operation: string = 'operazione', context?: string) {
        let userMessage = `Errore durante ${operation}`;

        // Analizza il tipo di errore
        if (error.status === 0) {
            userMessage = 'Problema di connessione. Verifica la tua connessione internet.';
        } else if (error.status === 401) {
            userMessage = 'Sessione scaduta. Effettua nuovamente il login.';
        } else if (error.status === 403) {
            userMessage = 'Non hai i permessi per questa operazione.';
        } else if (error.status === 404) {
            userMessage = 'Risorsa non trovata.';
        } else if (error.status === 422) {
            userMessage = 'Dati non validi. Controlla i campi inseriti.';
        } else if (error.status === 500) {
            userMessage = 'Errore del server. Riprova più tardi.';
        } else if (error.status >= 400 && error.status < 500) {
            userMessage = 'Errore nella richiesta. Controlla i dati inseriti.';
        } else if (error.status >= 500) {
            userMessage = 'Errore del server. Il team tecnico è stato notificato.';
        }

        // Log dettagliato per debugging
        const logContext = context ? `[${context}] ` : '';
        console.error(`${logContext}HTTP Error in ${operation}:`, {
            status: error.status,
            statusText: error.statusText,
            url: error.url,
            message: error.message,
            error: error.error
        });

        // Mostra notifica all'utente
        this.error(userMessage);

        return userMessage;
    }

    /**
     * Gestione errori di validazione form
     */
    handleValidationErrors(errors: { [key: string]: any }) {
        const messages: string[] = [];

        Object.keys(errors).forEach(field => {
            const fieldErrors = errors[field];

            if (fieldErrors.required) {
                messages.push(`${field} è obbligatorio`);
            }
            if (fieldErrors.email) {
                messages.push(`${field} deve essere un'email valida`);
            }
            if (fieldErrors.minlength) {
                messages.push(`${field} troppo corto (min: ${fieldErrors.minlength.requiredLength})`);
            }
            if (fieldErrors.maxlength) {
                messages.push(`${field} troppo lungo (max: ${fieldErrors.maxlength.requiredLength})`);
            }
            if (fieldErrors.min) {
                messages.push(`${field} deve essere >= ${fieldErrors.min.min}`);
            }
            if (fieldErrors.max) {
                messages.push(`${field} deve essere <= ${fieldErrors.max.max}`);
            }
            if (fieldErrors.pattern) {
                messages.push(`${field} non ha un formato valido`);
            }
        });

        if (messages.length > 0) {
            this.warning(messages.join('; '));
        }
    }

    /**
     * Notifiche per operazioni in batch
     */
    batchOperationStart(operation: string, count: number) {
        return this.operationInProgress(`${operation} ${count} elementi`);
    }

    batchOperationComplete(operation: string, successCount: number, errorCount: number = 0) {
        if (errorCount === 0) {
            this.success(`${operation}: ${successCount} elementi processati con successo`);
        } else {
            this.warning(`${operation} completato: ${successCount} successi, ${errorCount} errori`);
        }
    }

    /**
     * Notifiche per operazioni di sincronizzazione
     */
    syncStart() {
        return this.operationInProgress('Sincronizzazione dati');
    }

    syncComplete(itemsUpdated: number) {
        if (itemsUpdated === 0) {
            this.info('Tutti i dati sono già aggiornati');
        } else {
            this.success(`Sincronizzazione completata: ${itemsUpdated} elementi aggiornati`);
        }
    }

    /**
     * Notifiche per lo stato di connessione
     */
    connectionStatus(isOnline: boolean) {
        if (isOnline) {
            this.connectionRestored();
        } else {
            this.connectionLost();
        }
    }

    /**
     * Notifiche per operazioni file
     */
    fileUploadStart(fileName: string) {
        return this.operationInProgress(`Caricamento ${fileName}`);
    }

    fileUploadComplete(fileName: string) {
        this.success(`File ${fileName} caricato con successo`);
    }

    fileUploadError(fileName: string, error?: any) {
        console.error(`File upload error for ${fileName}:`, error);
        this.error(`Errore nel caricamento di ${fileName}`);
    }

    /**
     * Notifiche di sistema
     */
    systemMaintenance(message: string) {
        this.warning(message, 'Ho capito', { duration: 0 });
    }

    newFeatureAvailable(featureName: string) {
        this.info(`Nuova funzionalità disponibile: ${featureName}`, 'Scopri');
    }

    updateAvailable() {
        this.customAction(
            'È disponibile un aggiornamento dell\'applicazione',
            'Aggiorna',
            () => window.location.reload(),
            'info'
        );
    }

    /**
     * Utility per debugging (solo in sviluppo)
     */
    debug(message: string, data?: any) {
        if (!environment.production) {
            console.log(`[DEBUG] ${message}`, data);
            this.info(`DEBUG: ${message}`, '', { duration: 2000 });
        }
    }

    /**
     * Notifica con countdown
     */
    countdownNotification(
        message: string,
        seconds: number,
        onComplete: () => void,
        actionText: string = 'Annulla'
    ) {
        let remainingSeconds = seconds;

        const updateMessage = () => `${message} (${remainingSeconds}s)`;

        const snackBarRef = this.show(updateMessage(), actionText, { duration: 0 });

        const interval = setInterval(() => {
            remainingSeconds--;

            if (remainingSeconds <= 0) {
                clearInterval(interval);
                snackBarRef.dismiss();
                onComplete();
            } else {
                // Update message with new countdown
                snackBarRef.instance.data.message = updateMessage();
            }
        }, 1000);

        // Handle manual cancellation
        snackBarRef.onAction().subscribe(() => {
            clearInterval(interval);
        });

        return snackBarRef;
    }
}