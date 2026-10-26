# Ember & Ash

Ember & Ash è un'applicazione web per ristoranti realizzata con Next.js. Offre un'esperienza completa per scoprire il menu, effettuare ordini, prenotare un tavolo e consultare il pannello di amministrazione del ristorante.

## Funzionalità

- Scopri un menu ispirato alla cucina nigeriana, con categorie, specialità e schede dei piatti.
- Aggiungi piatti al carrello, modifica le quantità e controlla i prezzi prima di confermare l'ordine.
- Salva gli ordini con consegna a domicilio, ritiro o consumo al ristorante e segui il loro stato.
- Scegli tra pagamento con carta, bonifico bancario o contanti; i pagamenti sono simulati.
- Prenota un tavolo tramite il modulo dedicato o WhatsApp.
- Consulta i recapiti, gli orari di apertura e l'indirizzo del ristorante.
- Crea un account cliente nel database e consulta lo storico personale, anche da dispositivi diversi.
- Su mobile, naviga da un menu a schermo intero con sfondo opaco, scorrimento interno e accesso al profilo. Si chiude dal pulsante dedicato, con Esc o selezionando un collegamento; il focus resta nel menu e lo scorrimento della pagina sottostante viene bloccato.
- La barra di navigazione mobile ha uno sfondo opaco che copre anche l'area sicura superiore del dispositivo; il contenuto pubblico tiene conto dello stesso spazio.
- Ricevi il riepilogo ordine via WhatsApp Business Platform, con consenso facoltativo e configurazione Meta.
- Usa l'accesso staff separato per il pannello di amministrazione.
- Gestisci gli ordini salvati, le prenotazioni e le voci del menu dall'area admin.

## Valuta e prezzi

I prezzi sono espressi in euro e memorizzati come centesimi interi, sia nel menu sia nel database. Gli importi di esempio in naira sono stati convertiti con un tasso indicativo di 1 EUR = 1.496,85 NGN; il tasso è statico e non viene aggiornato automaticamente. Per convertire un database preesistente, applicare una volta `database/migrations/20261020_ngn_to_eur_cents.sql`: la migrazione registra la propria esecuzione e non converte di nuovo gli importi se viene rilanciata.

## PostgreSQL locale con Rancher Desktop

L'applicazione si collega a PostgreSQL dal server Next.js; il browser non accede mai direttamente al database.

1. In Rancher Desktop, attiva il motore compatibile con Docker `dockerd (moby)` e Compose.
2. Copia `.env.example` in `.env`, quindi sostituisci la password di esempio e la chiave admin con valori locali. `DATABASE_URL` usa le altre variabili definite in `.env`. Mantieni privato questo file.

   ```powershell
   Copy-Item .env.example .env
   ```

3. Avvia PostgreSQL dalla cartella del progetto:

   ```powershell
   docker compose up -d
   ```

   Il database è disponibile su `localhost:5434`. Lo schema viene inizializzato da `database/init.sql` alla prima creazione del volume `postgres_data`.
4. Per un database esistente applica la migrazione additiva, poi avvia l'app su Windows (dove `localhost` punta alla porta del database pubblicata):

   ```powershell
   npm run db:migrate
   npm run dev
   ```

   Se l'app viene eseguita a sua volta in un container Compose, configura lì `DATABASE_URL` usando `db:5432` invece di `localhost:5434`.
5. Per visualizzare e aggiornare gli ordini salvati, apri direttamente `/admin`: verrai indirizzato a `/admin/login`. Inserisci la chiave `ADMIN_API_KEY` configurata sul server e seleziona **Carica ordini dal database** nel pannello. Non serve un account cliente. Il server verifica la chiave e crea una sessione firmata di 8 ore in un cookie HttpOnly, Secure in produzione e SameSite Strict. La chiave non viene salvata nel browser. **Esci dall'amministrazione** cancella il cookie senza disconnettere il cliente; cambiare `ADMIN_API_KEY` invalida tutte le sessioni staff esistenti.

La navigazione pubblica non mostra collegamenti amministrativi. L'area staff non mostra il carrello o il menu profilo clienti. Le API amministrative verificano la sessione server; continuano anche ad accettare la chiave tramite header Bearer per gli strumenti esterni. Questa separazione usa una chiave staff condivisa, non account amministrativi individuali: prima dell'uso in produzione occorrono autenticazione completa e protezioni contro i tentativi di accesso ripetuti.

Il servizio Compose espone PostgreSQL solo su `127.0.0.1`. Il volume nominato conserva i dati tra un riavvio e l'altro: `docker compose down` non lo elimina. Per cancellare intenzionalmente i dati del database locale, esegui `docker compose down -v`.

## Account clienti e storico

Gli account sono salvati in PostgreSQL, con password derivate tramite scrypt e salt casuale. Le sessioni durano 7 giorni: il browser riceve un cookie HttpOnly (Secure in produzione), mentre il database conserva solo l'hash del token casuale. Login e registrazione sono limitati a 10 tentativi per email ogni 15 minuti. Gli account demo precedenti non vengono importati e i relativi dati locali vengono rimossi: occorre registrarsi nuovamente.

Ogni nuovo ordine richiede una sessione cliente e viene associato all'identificativo verificato dal server, mai all'email fornita nel modulo. `/tracking` mostra automaticamente **I miei ordini**, con schede responsive, dettagli, aggiornamento manuale degli stati e paginazione. Anche la ricerca di un singolo ordine associato richiede il proprietario. Gli ordini precedenti restano invariati e ricercabili per codice: non vengono attribuiti automaticamente a nessun account.

Le richieste di salvataggio usano una chiave di idempotenza: ripetere la stessa richiesta non crea un secondo ordine o un secondo messaggio. Il server rifiuta il riutilizzo della chiave con contenuti diversi.

## Numero ordine, cassa e ritiro

Eseguire `npm run db:migrate` anche sui database esistenti. La migrazione
`database/migrations/20261022_cash_desk.sql` assegna numeri univoci anche agli ordini
precedenti, senza eliminarli. Il codice visibile e' `A-001`, `A-002`, ecc.
La sequenza non si azzera a ogni giornata, puo' avere salti e supera le tre cifre
senza troncarle. L'identificativo lungo rimane quello dei collegamenti protetti:
conoscere il numero breve **non** permette di leggere un ordine altrui.

- Il cliente vede il numero alla conferma, nello storico e in `/orders/<id>`.
  La pagina richiede l'account proprietario o una sessione staff; dopo il login
  cliente si ritorna all'ordine. Gli ordini legacy senza proprietario restano
  consultabili dallo staff in questa pagina, non vengono assegnati automaticamente.
- Lo staff apre **Apri cassa e ritiro** in `/admin`, oppure `/admin/cash`.
  Cerca numero breve, identificativo lungo o nome su tutto il database.
  I risultati sono limitati a 50: se necessario restringere la ricerca.
- **Registra pagamento** conferma un incasso realmente ricevuto tramite contanti,
  carta/POS o bonifico verificato. Non addebita carte e non emette scontrini:
  il documento fiscale va gestito separatamente. La preferenza indicata al checkout
  non costituisce prova di pagamento.
- **Segna ritirato** e' un'operazione distinta, disponibile solo dopo il pagamento
  e quando l'ordine e' pronto. Per le consegne a domicilio occorre lo stato
  *in consegna*. Il ritiro conclude l'ordine nello stato tecnico `delivered`.
- Conferma, preparazione e pronto si gestiscono dalla scheda Ordini.
  Solo le consegne a domicilio passano per *affidato al corriere*.
  Gli ordini ritiro/ristorante gia' finiti in quel passaggio nella vecchia versione
  possono comunque essere chiusi in cassa dopo il pagamento.
  Un ordine pagato o consegnato non puo' essere annullato: manca un flusso rimborsi.

Le operazioni bloccano la riga nel database: due casse simultanee non registrano
due pagamenti/ritiri. Un'operazione ripetuta segnala che e' gia' stata registrata;
un metodo di incasso diverso viene rifiutato. Anche la vecchia API di cambio stato
rispetta questi vincoli. Dopo un esito di rete incerto aggiornare prima l'ordine.
Per ora basta mostrare il numero: non e' incluso un QR code.

## WhatsApp automatico al cliente

La funzionalita' e' **disattivata per impostazione predefinita**. L'unico interruttore e' `WHATSAPP_ORDER_NOTIFICATIONS_ENABLED`: assente o `false` impedisce gli invii e nasconde consenso, esiti e pulsanti di recupero nell'interfaccia cliente e staff, anche se le credenziali Meta sono gia' presenti. Il frontend legge solo il valore booleano da `/api/features`, mai le credenziali.

Per abilitarla, completare prima la configurazione Meta descritta sotto, impostare `WHATSAPP_ORDER_NOTIFICATIONS_ENABLED=true` e riavviare Next.js (oppure eseguire un nuovo deploy su Vercel). Per spegnerla, usare `false` e riavviare/ridistribuire. Le notifiche gia' registrate restano nel database ma non vengono inviate finche' l'interruttore e' spento; quelle gia' accettate da Meta non possono essere ritirate. I collegamenti WhatsApp manuali verso il ristorante non dipendono da questo parametro.

L'invio parte **dopo il commit dell'ordine**, solo se il cliente seleziona il consenso facoltativo e indica un telefono con prefisso internazionale (es. `+39...`). Il messaggio comunica che l'ordine e' ricevuto e in attesa di conferma, non ancora confermato dallo staff. I collegamenti manuali WhatsApp verso il ristorante restano disponibili e non attivano questo invio.

Configurare sul server, senza prefisso `NEXT_PUBLIC_`, le variabili in `.env.example`:

- `WHATSAPP_ORDER_NOTIFICATIONS_ENABLED`: `true` per attivare; `false` per disattivare completamente notifiche e relativa UI.
- `WHATSAPP_ACCESS_TOKEN`: token Meta con permessi per l'invio.
- `WHATSAPP_PHONE_NUMBER_ID`: identificativo del numero business abilitato.
- `WHATSAPP_API_VERSION`: versione Graph API attualmente supportata dalla propria app Meta, ad esempio nel formato `vXX.X` (non usare il placeholder).
- `WHATSAPP_ORDER_TEMPLATE`: nome esatto del modello Utility approvato.
- `WHATSAPP_TEMPLATE_LANGUAGE`: lingua esatta del modello, ad esempio `it`.
- `WHATSAPP_ORDER_TEMPLATE_VERSION`: `2` per numero breve e pulsante ordine;
  assente o `1` conserva il precedente modello solo testo, senza pulsante.
- `WHATSAPP_TEMPLATE_PARAMETER_FORMAT`: `named` per il nuovo modello fornito;
  assente o `positional` per modelli con variabili numeriche.
- `APP_BASE_URL`: origine HTTPS pubblica, ad esempio `https://nome-progetto.vercel.app`,
  senza percorso, credenziali o query. Deve coincidere con il dominio statico del
  pulsante approvato su Meta. Non usare localhost o un URL temporaneo di anteprima.

### Modello consigliato: riepilogo_ordine_v2

Il file [whatsapp/riepilogo_ordine_v2.json](whatsapp/riepilogo_ordine_v2.json) contiene
il payload di creazione del modello Meta, con esempi. Sostituire
`https://your-project.vercel.app` con il dominio definitivo.
Il file non viene caricato automaticamente e non e' un file da allegare in chat:
serve come riferimento per l'editor oppure come body della richiesta
`POST /<WHATSAPP_BUSINESS_ACCOUNT_ID>/message_templates` alla Graph API.
L'ID dell'account Business per creare modelli non e' il Phone Number ID di invio.

Nell'editor WhatsApp Manager:

1. Creare un modello **Utility**, nome `riepilogo_ordine_v2`, lingua **Italiano**,
   formato variabili **Nome** (non numerico).
2. Copiare il testo del campo `components[0].text` del file, mantenendo
   `{{customer_name}}`, `{{order_code}}`, `{{items}}`, `{{total}}`,
   `{{order_type}}`, `{{address}}`, `{{status}}`. Inserire gli esempi del file.
3. Aggiungere un pulsante **Visita sito web**, testo **Visualizza ordine**,
   URL **dinamico** `https://TUO-DOMINIO/orders/{{order_id}}`.
   Anche il pulsante usa una variabile con nome: `order_id`.
   Come esempio di suffisso usare l'identificativo lungo `EA-0123456789ABCDEF`,
   non il codice breve; se l'editor richiede un URL completo, anteporre il dominio
   e `/orders/`. Per modelli in formato posizionale usare invece `{{1}}` nell'URL.
4. Inviare per approvazione. Dopo l'approvazione configurare sul server:

   ```dotenv
   WHATSAPP_ORDER_NOTIFICATIONS_ENABLED=true
   WHATSAPP_ORDER_TEMPLATE=riepilogo_ordine_v2
   WHATSAPP_ORDER_TEMPLATE_VERSION=2
   WHATSAPP_TEMPLATE_PARAMETER_FORMAT=named
   WHATSAPP_TEMPLATE_LANGUAGE=it
   APP_BASE_URL=https://TUO-DOMINIO
   ```

   Completare anche token, Phone Number ID e versione API; riavviare o ridistribuire.
   **Non attivare v2 prima che il modello con il pulsante sia approvato.**

Meta usa il prefisso URL approvato nel modello; l'app invia solo l'identificativo
lungo come suffisso del pulsante, mai cookie, password o token di sessione.
`APP_BASE_URL` e' verificato per impedire configurazioni locali/non HTTPS, ma non
modifica il dominio di un modello gia' approvato: cambiare dominio richiede aggiornare
anche il modello Meta. Il link richiede sempre il login del proprietario.

In v2 il riepilogo viene ricostruito dall'ordine al momento dell'invio, anche per
recuperare notifiche vecchie fallite: numero breve, stato e pagamento sono attuali.
Il messaggio e' una fotografia di quel momento, il link mostra lo stato aggiornato.
Le notifiche gia' accettate non vengono reinviate cambiando modello.

### Compatibilita' con il precedente modello solo testo

Per mantenere il vecchio modello usare versione `1` e formato `positional`.
Non aggiungere il pulsante a un modello precedente senza aggiornare la configurazione.

Creare e far approvare in WhatsApp Manager un modello con questi **7 parametri**, nello stesso ordine:

```text
Ciao {{1}}, abbiamo ricevuto l'ordine {{2}}.
Piatti: {{3}}.
Totale: {{4}}.
Modalita': {{5}}.
Indirizzo: {{6}}.
Stato: {{7}}.
Grazie per aver ordinato con noi.
```

I parametri contengono nome, codice, piatti/quantita'/importi/note, totale, modalita', indirizzo (o "Non previsto") e stato iniziale. Rispettare i limiti di lunghezza Meta quando si approva il modello: riepiloghi troppo lunghi possono essere rifiutati dal provider. Servono un account WhatsApp Business Platform e un numero configurato; l'API di test Meta richiede destinatari abilitati. Sono possibili costi Meta.

La richiesta HTTP a Meta ha timeout di 8 secondi. Il database registra la notifica nella stessa transazione dell'ordine; un errore WhatsApp **non annulla l'ordine**. Il cliente vede l'esito nella conferma e nei dettagli dello storico. Nell'admin e' possibile riprovare notifiche `pending`, `failed` e `not_configured` dopo aver corretto la configurazione. Notifiche `accepted`, `sending` o `unknown` non vengono ritentate automaticamente, per evitare duplicati; se il processo si interrompe durante l'invio, verificare prima l'esito su Meta. Non e' un worker automatico: le notifiche rimaste pendenti richiedono il pulsante di recupero dello staff.

`accepted` significa accettato dall'API Meta, **non consegnato al telefono**. La conferma di consegna richiederebbe un webhook Meta, non incluso. Non vengono inviati aggiornamenti WhatsApp a ogni cambio di stato.

Per Vercel: impostare `DATABASE_URL` e le variabili WhatsApp nei secrets del progetto, eseguire `npm run db:migrate` contro il database remoto e ridistribuire. Non esporre PostgreSQL locale su Internet.

## Verifiche

`npm test` esegue i test unitari dell'invio WhatsApp senza chiamare Meta. Per i test HTTP con database locale, avviare Next.js e usare:

```powershell
$env:TEST_BASE_URL = "http://localhost:3000"
npm test
```

I test di integrazione creano e rimuovono esclusivamente i propri account e ordini di prova. Non inviano WhatsApp reali.

## Note sulla versione dimostrativa

Questo progetto è ancora una demo e non una piattaforma di ordinazione pronta per la produzione.

- L'accesso clienti usa account e sessioni reali. Non sono ancora inclusi verifica email, recupero password e protezioni anti-abuso per IP; l'accesso staff rimane basato su chiave condivisa.
- I metodi di pagamento sono simulati: i dati della carta non vengono inviati né salvati in PostgreSQL e non viene effettuato alcun addebito.
- Gli ordini vengono salvati in PostgreSQL; per pagamenti reali serve un fornitore di servizi di pagamento.
- Le prenotazioni restano dimostrative. L'invio WhatsApp automatico richiede credenziali e modello Meta approvato.

## Tecnologie

- Next.js 16
- React 19
- TypeScript
- PostgreSQL
- `pg`
- Zustand
- Tailwind CSS
- Lucide React
- React Hot Toast
- Framer Motion

## Licenza

Questo progetto è destinato a demo e portfolio.
