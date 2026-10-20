# Ember & Ash

Ember & Ash è un'applicazione web per ristoranti realizzata con Next.js. Offre un'esperienza completa per scoprire il menu, effettuare ordini, prenotare un tavolo e consultare il pannello di amministrazione del ristorante.

## Funzionalità

- Scopri un menu ispirato alla cucina nigeriana, con categorie, specialità e schede dei piatti.
- Aggiungi piatti al carrello, modifica le quantità e controlla i prezzi prima di confermare l'ordine.
- Salva gli ordini con consegna a domicilio, ritiro o consumo al ristorante e segui il loro stato.
- Scegli tra pagamento con carta, bonifico bancario o contanti; i pagamenti sono simulati.
- Prenota un tavolo tramite il modulo dedicato o WhatsApp.
- Consulta i recapiti, gli orari di apertura e l'indirizzo del ristorante.
- Accedi con il sistema dimostrativo locale per aprire il pannello di amministrazione.
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
4. Avvia l'app su Windows (dove `localhost` punta alla porta del database pubblicata):

   ```powershell
   npm run dev
   ```

   Se l'app viene eseguita a sua volta in un container Compose, configura lì `DATABASE_URL` usando `db:5432` invece di `localhost:5434`.
5. Per visualizzare e aggiornare gli ordini salvati in `/admin`, accedi dall'interfaccia dimostrativa, inserisci la chiave `ADMIN_API_KEY` configurata sul server nel file `.env` e seleziona **Carica ordini dal database**. La chiave API rimane solo in memoria durante la visita e non viene salvata nel browser.

Il servizio Compose espone PostgreSQL solo su `127.0.0.1`. Il volume nominato conserva i dati tra un riavvio e l'altro: `docker compose down` non lo elimina. Per cancellare intenzionalmente i dati del database locale, esegui `docker compose down -v`.

## Note sulla versione dimostrativa

Questo progetto è ancora una demo e non una piattaforma di ordinazione pronta per la produzione.

- L'autenticazione è locale e dimostrativa.
- I metodi di pagamento sono simulati: i dati della carta non vengono inviati né salvati in PostgreSQL e non viene effettuato alcun addebito.
- Gli ordini vengono salvati in PostgreSQL, ma per l'uso in produzione servono un'autenticazione reale e un fornitore di servizi di pagamento.
- Le funzioni di prenotazione e WhatsApp illustrano come potrebbe funzionare una vera app per ristoranti.

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
