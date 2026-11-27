# PHP backend

This folder contains the standalone PHP API used by the React/Vite frontend.

## Run locally

From the project root, start the API with:

```powershell
cd frontend
npm run backend:php
```

PHP 8.1+ with PDO MySQL is required. Configure database and payment settings in `.env`, using `.env.example` as a reference. The API connects directly to MySQL and does not require Laravel or Composer.

`GET /api/staff/dashboard` requires an authenticated `admin`, `sales`, or `farm_staff` account and returns only the data allowed for that role. Admins receive summaries and staff records; sales staff receive orders and complaints; farm staff receive inventory, seasons, and farming logs. The dashboard endpoint is read-only and excludes password hashes and access tokens.

Password recovery currently works only in local development (`APP_ENV=local`): its one-time token is shown in the browser and expires after 30 minutes. Requests outside localhost return an explicit error until an email-delivery transport is implemented.
