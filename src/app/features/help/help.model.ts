export interface HelpArticle {
    id?: string;
    title: string;
    content: string;
    category: string;
    order_index: number;
    is_published: boolean;
    created_at?: string;
    updated_at?: string;
}

export interface HelpCategory {
    category: string;
    count: number;
    articles?: HelpArticle[];
}

// Dati di esempio per popolare inizialmente il database help_articles
export const SAMPLE_HELP_ARTICLES: Omit<HelpArticle, 'id' | 'created_at' | 'updated_at'>[] = [
    {
        title: 'Come creare una nuova fattura',
        content: `Per creare una nuova fattura segui questi passaggi:

**1. Accedi alla sezione Fatture**
Clicca su "Fatture" nel menu laterale o vai direttamente alla dashboard e clicca su "Nuova Fattura".

**2. Compila i dati della fattura**
- Seleziona il cliente dall'elenco o creane uno nuovo
- Imposta la data di emissione (di default è quella odierna)
- Aggiungi eventualmente una data di scadenza
- Scegli lo stato iniziale (di solito "Bozza")

**3. Aggiungi righe alla fattura**
- Clicca su "Aggiungi riga" per inserire prodotti o servizi
- Puoi cercare nei tuoi prodotti salvati o inserire manualmente
- Per ogni riga specifica: descrizione, quantità, prezzo unitario e aliquota IVA

**4. Verifica i totali**
Il sistema calcolerà automaticamente subtotale, IVA e totale generale.

**5. Salva la fattura**
Clicca su "Salva Fattura" per completare l'operazione.`,
        category: 'Fatturazione',
        order_index: 1,
        is_published: true
    },
    {
        title: 'Gestione clienti: aggiungere e modificare',
        content: `La gestione dei clienti è fondamentale per una fatturazione efficiente.

**Aggiungere un nuovo cliente:**
1. Vai nella sezione "Clienti"
2. Clicca su "Nuovo Cliente"
3. Compila i dati anagrafici (nome obbligatorio)
4. Aggiungi i contatti (email e telefono)
5. Inserisci l'indirizzo completo
6. Per le aziende: inserisci Partita IVA (11 cifre)
7. Per privati: inserisci Codice Fiscale (16 caratteri)

**Modificare un cliente esistente:**
- Clicca sulla riga del cliente nella tabella
- Oppure usa il menu azioni (tre puntini) e seleziona "Modifica"
- Aggiorna i dati necessari e salva

**Suggerimenti:**
- Il Codice Fiscale viene automaticamente convertito in maiuscolo
- La Partita IVA deve essere composta da 11 cifre numeriche
- L'indirizzo completo aiuta nella generazione dei PDF`,
        category: 'Clienti',
        order_index: 1,
        is_published: true
    },
    {
        title: 'Come duplicare una fattura esistente',
        content: `Duplicare una fattura è utile per fatture ricorrenti o simili.

**Metodo 1: Dal dettaglio fattura**
1. Apri la fattura che vuoi duplicare
2. Clicca sul menu "Azioni" (tre puntini)
3. Seleziona "Duplica"
4. Il sistema creerà una copia in modalità bozza con nuovo numero

**Metodo 2: Dalla lista fatture**
1. Trova la fattura nella lista
2. Clicca sul menu azioni della riga
3. Seleziona "Duplica"

**Cosa viene duplicato:**
- Tutti i dati del cliente
- Tutte le righe con prodotti/servizi
- Note della fattura originale

**Cosa viene modificato:**
- Nuovo numero fattura generato automaticamente
- Stato impostato su "Bozza"
- Data di emissione aggiornata a oggi
- Data di scadenza azzerata`,
        category: 'Fatturazione',
        order_index: 2,
        is_published: true
    },
    {
        title: 'Gestione prodotti e servizi',
        content: `L'archivio prodotti velocizza la creazione delle fatture.

**Creare un nuovo prodotto:**
1. Vai in "Prodotti"
2. Clicca "Nuovo Prodotto"
3. Inserisci nome e descrizione
4. Imposta prezzo unitario e aliquota IVA
5. Scegli categoria e unità di misura

**Utilizzare prodotti nelle fatture:**
- Nel form fattura, inizia a digitare nel campo "Cerca Prodotto"
- Il sistema mostrerà i prodotti corrispondenti
- Seleziona il prodotto per auto-compilare i campi

**Categorie utili:**
- *Servizi*: consulenze, assistenza, sviluppo
- *Prodotti*: articoli fisici, hardware
- *Licenze*: software, abbonamenti
- *Hosting*: servizi web, domini

**Unità di misura:**
- pz (pezzi), ore, giorni, mesi, kg, metri, mq`,
        category: 'Prodotti',
        order_index: 1,
        is_published: true
    },
    {
        title: 'Stati della fattura e workflow',
        content: `Ogni fattura passa attraverso diversi stati nel suo ciclo di vita.

**Bozza (Draft)**
- Fattura in fase di creazione o modifica
- Non ancora inviata al cliente
- Può essere modificata liberamente

**Inviata (Sent)**
- Fattura completata e inviata al cliente
- In attesa di pagamento
- Modifiche limitate (solo note e stato)

**Pagata (Paid)**
- Pagamento ricevuto e confermato
- Fattura completata
- Solo consultazione

**Scaduta (Overdue)**
- Fattura inviata oltre la data di scadenza
- Richiede azioni di sollecito
- Il sistema può marcare automaticamente come scaduta

**Transizioni di stato:**
- Bozza → Inviata: quando completi e invii la fattura
- Inviata → Pagata: quando ricevi il pagamento
- Inviata → Scaduta: automatico dopo la data di scadenza`,
        category: 'Fatturazione',
        order_index: 3,
        is_published: true
    },
    {
        title: 'Aliquote IVA e calcoli fiscali',
        content: `Il sistema supporta tutte le principali aliquote IVA italiane.

**Aliquote disponibili:**
- **0%**: Esente IVA (servizi specifici, esportazioni)
- **4%**: Aliquota super-ridotta (beni di prima necessità)
- **10%**: Aliquota ridotta (turismo, alimentari specifici)
- **22%**: Aliquota ordinaria (maggior parte di beni e servizi)

**Calcolo automatico:**
Il sistema calcola automaticamente:
- Subtotale = Σ(quantità × prezzo unitario)
- IVA = Subtotale × (aliquota / 100)
- Totale = Subtotale + IVA

**Fatture con aliquote miste:**
Ogni riga può avere una propria aliquota IVA. Il sistema raggrupperà automaticamente le imposte nel PDF finale.

**Casi speciali:**
- Regime forfettario: utilizzare sempre 0%
- Reverse charge: utilizzare 0% e specificare nelle note`,
        category: 'Configurazione',
        order_index: 1,
        is_published: true
    },
    {
        title: 'Generazione e download PDF',
        content: `Il sistema genera automaticamente PDF professionali delle fatture.

**Generare un PDF:**
1. Apri il dettaglio della fattura
2. Clicca su "Scarica PDF"
3. Il file viene scaricato automaticamente

**Contenuto del PDF:**
- Header azienda con logo
- Dati fattura (numero, date)
- Informazioni cliente complete
- Tabella dettagliata righe
- Riepilogo IVA e totali
- Note aggiuntive se presenti

**Nome file:**
Il PDF viene salvato come: 'fattura-[NUMERO_FATTURA].pdf'

**Personalizzazione:**
Il layout è ottimizzato per:
- Stampa su carta A4
- Conformità normativa italiana
- Leggibilità professionale

**Requisiti browser:**
I PDF vengono generati localmente nel browser utilizzando jsPDF. Funziona su tutti i browser moderni.`,
        category: 'Configurazione',
        order_index: 2,
        is_published: true
    },
    {
        title: 'Ricerca e filtri avanzati',
        content: `Il sistema offre potenti strumenti di ricerca per trovare rapidamente fatture, clienti e prodotti.

**Ricerca fatture:**
- Numero fattura (completo o parziale)
- Nome cliente
- Email cliente
- Note della fattura

**Filtri fatture:**
- **Stato**: filtra per bozza, inviata, pagata, scaduta
- **Anno**: raggruppa per anno di emissione
- **Cliente**: mostra solo fatture di un cliente specifico

**Ricerca clienti:**
- Nome o ragione sociale
- Email e telefono
- Codice fiscale o Partita IVA
- Indirizzo

**Ricerca prodotti:**
- Nome prodotto
- Descrizione
- Categoria
- Prezzo (range)

**Filtri rapidi:**
Usa i bottoni di filtro rapido per accedere velocemente a:
- Fatture in attesa di pagamento
- Fatture scadute
- Clienti più attivi
- Prodotti più venduti`,
        category: 'Generale',
        order_index: 1,
        is_published: true
    },
    {
        title: 'Numerazione automatica fatture',
        content: `Il sistema genera automaticamente numeri progressivi per le fatture.

**Formato numerazione:**
'INV-YYYY-XXXXXX'
- INV: Prefisso fisso
- YYYY: Anno corrente
- XXXXXX: Timestamp univoco (ultime 6 cifre)

**Vantaggi:**
- Numerazione sempre univoca
- Ordinamento cronologico naturale
- Conformità agli obblighi di legge
- Zero conflitti anche con uso simultaneo

**Personalizzazione:**
Il formato può essere personalizzato nelle impostazioni avanzate (funzionalità futura).

**Verifiche:**
Il sistema verifica automaticamente che non esistano duplicati prima del salvataggio.

**Reset annuale:**
La numerazione non si resetta automaticamente. Per una numerazione 001, 002, 003 per anno, contatta il supporto per personalizzazioni.`,
        category: 'Configurazione',
        order_index: 3,
        is_published: true
    },
    {
        title: 'Backup e sicurezza dei dati',
        content: `I tuoi dati sono protetti e sempre disponibili.

**Sicurezza:**
- Connessione sempre crittografata (HTTPS/SSL)
- Database ridondato geograficamente
- Backup automatici giornalieri
- Accesso protetto da autenticazione

**Dove sono salvati i dati:**
- Database: Supabase (infrastruttura europea)
- Backup: Multipli datacenter europei
- Conformità: GDPR compliant

**Esportazione dati:**
Puoi sempre esportare i tuoi dati in formato:
- PDF (fatture individuali)
- Excel/CSV (elenchi e report)
- JSON (backup completo)

**Cancellazione account:**
- I dati vengono mantenuti per 30 giorni
- Poi cancellazione permanente
- Possibilità di recupero entro i 30 giorni

**Best practices:**
- Scarica periodicamente PDF delle fatture importanti
- Mantieni backup locali per documenti critici`,
        category: 'Sicurezza',
        order_index: 1,
        is_published: true
    }
];