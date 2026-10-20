# Ember & Ash

Ember & Ash is a restaurant web application built with Next.js. It showcases a customer experience for browsing menu items, placing orders, booking reservations, and exploring a restaurant admin dashboard in a warm fire-themed interface.

## Features

- Browse a curated Nigerian-inspired menu with categories, featured items, and menu cards.
- Add items to cart, update quantities, and review pricing before checkout.
- Save delivery, pickup, and dine-in orders and track their status.
- Use card, bank transfer, or cash payment simulation during checkout.
- Book reservations with a clean reservation form and WhatsApp handoff.
- View the restaurant contact details, opening hours, and location information.
- Sign in with demo/local auth to access the admin dashboard.
- Manage saved orders, reservations, and menu views from the admin area.

## Local PostgreSQL with Rancher Desktop

The app connects to PostgreSQL from its Next.js server; the browser never connects to the database directly.

1. In Rancher Desktop, enable the Docker-compatible `dockerd (moby)` engine and Compose.
2. Copy `.env.example` to `.env` and replace the example password and admin key with local values. `DATABASE_URL` uses the other variables in `.env`. Keep `.env` private.

   ```powershell
   Copy-Item .env.example .env
   ```
3. Start PostgreSQL from the project folder:

   ```powershell
   docker compose up -d
   ```

   The database is available on `localhost:5432`. Its schema is initialized from `database/init.sql` the first time the `postgres_data` volume is created.
4. Start the app on Windows (where `localhost` points to the published database port):

   ```powershell
   npm run dev
   ```

   If the app itself runs in a Compose container instead, set `DATABASE_URL` there to use `db:5432` rather than `localhost:5432`.
5. To view and update saved orders in `/admin`, sign in through the demo UI, enter the server-side `ADMIN_API_KEY` from `.env`, and choose **Load database orders**. The API key is held only in page memory and is not stored in the browser.

The Compose service binds PostgreSQL to `127.0.0.1` only. The named volume keeps data between restarts; `docker compose down` does not delete it. To intentionally remove local database data, run `docker compose down -v`.

## Demo Notes

This is still a demo project, not a production ordering platform.

- Authentication is local/demo based.
- Payment methods are simulated; card details are not sent to or stored in PostgreSQL, and no card is charged.
- Order records now persist in PostgreSQL, but production use still requires real authentication and a payment provider.
- Reservation and WhatsApp actions are designed to show how a real restaurant app could work.

## Tech Stack

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

## License

This project is for demo and portfolio use.
