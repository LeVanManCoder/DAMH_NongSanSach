# Nông Sản Việt

React/Vite frontend connected to a standalone PHP API and the existing MySQL database.

## Run locally

Make sure MySQL is running and PHP 8.1+ with PDO MySQL is installed. If needed, copy `backend\.env.example` to `backend\.env` from the project root and check the database settings.

On the first run, install the frontend dependencies:

   ```powershell
   cd frontend
   npm install
   ```

Start the PHP API in one terminal:

   ```powershell
   cd frontend
   npm run backend:php
   ```

In another terminal, start the frontend:

   ```powershell
   cd frontend
   npm run dev
   ```

Open `http://127.0.0.1:5174`. Vite in `frontend` proxies `/api` and `/storage` to the PHP server at `http://127.0.0.1:8001`. The PHP API in `backend` uses PDO directly and does not require Laravel or Composer. `STORAGE_ROOT` optionally points to the existing public upload folder.

The API handles products, authentication, cart, shipping, orders, VietQR, and VNPAY sandbox checkout. Configure VNPAY credentials and a public HTTPS IPN URL before attempting a real sandbox payment. The previous Node.js implementation is retained in `backend-node-legacy` as an unused backup.

The authenticated `/api/staff/dashboard` endpoint supplies SQL-backed dashboard data by role: admin sees operational summaries and staff, sales sees orders and complaints, and farm staff sees inventory, seasons, and farming logs. The endpoint never returns password hashes or access tokens; dashboard data is currently read-only.

On local development (`APP_ENV=local`), password recovery displays a one-time token in the browser; it expires after 30 minutes and is restricted to localhost. Recovery returns an explicit error outside local mode until an email-delivery transport is implemented.
