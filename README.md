diff --git a/README.md b/README.md
index 5b274a84a775c04e8bdb02a4ef4d8b2b16f67e09..c216b7d72c3deee06ae61918e4c2edfa3d74ebc7 100644
--- a/README.md
+++ b/README.md
@@ -1,2 +1,103 @@
-# west72-ticketing
-West 72 Ticketing Platform
+# West72 Ticketing
+
+Tixr-inspired ticketing frontend powered by Supabase, with a Node/Express Stripe Checkout backend.
+
+## 1) Local setup
+
+1. Install dependencies:
+
+```bash
+npm install
+```
+
+2. Copy env template:
+
+```bash
+cp .env.example .env
+```
+
+3. Fill `.env` values:
+
+- `STRIPE_SECRET_KEY` from Stripe dashboard.
+- `STRIPE_PUBLISHABLE_KEY` from Stripe dashboard.
+- `SUPABASE_URL` from Supabase project settings.
+- `SUPABASE_SERVICE_ROLE_KEY` from Supabase project settings (server-side only).
+- `APP_BASE_URL` should match your local or deployed URL.
+
+4. Run app:
+
+```bash
+npm start
+```
+
+## 2) What you must do in Supabase
+
+Create these database tables (minimum):
+
+### `events`
+- `id` (uuid, primary key, default `gen_random_uuid()`)
+- `title` (text, not null)
+- `description` (text)
+- `location` (text)
+- `datetime` (timestamptz)
+- `price` (numeric)
+- `image_url` (text)
+- `created_at` (timestamptz, default `now()`)
+
+### `customers`
+- `id` (uuid, primary key, default `gen_random_uuid()`)
+- `event_id` (uuid, references `events.id`)
+- `full_name` (text, not null)
+- `email` (text, not null)
+- `phone` (text)
+- `address` (text)
+- `city` (text)
+- `state` (text)
+- `zip_code` (text)
+- `marketing_opt_in` (boolean, default `false`)
+- `created_at` (timestamptz, default `now()`)
+
+Create storage bucket:
+- Bucket name: `event-images`
+- Make it public if you want direct public image URLs.
+
+### Recommended RLS policies
+Enable RLS and add policies so:
+- public/anon can `select` from `events`.
+- admin workflow can `insert` into `events` (or use authenticated role only).
+- public form can `insert` into `customers` (or move this to backend).
+- never expose `service_role` key client-side.
+
+## 3) What you must do in Stripe
+
+1. In Stripe Dashboard, copy:
+   - Publishable key (`pk_...`) → `STRIPE_PUBLISHABLE_KEY`
+   - Secret key (`sk_...`) → `STRIPE_SECRET_KEY`
+
+2. Optional but recommended:
+   - Set up webhook endpoint for payment confirmations:
+     - URL: `https://your-domain.com/stripe/webhook` (if you implement webhook route)
+     - Events: `checkout.session.completed`, `checkout.session.async_payment_failed`, `checkout.session.expired`
+
+3. For local testing use Stripe CLI forwarding:
+
+```bash
+stripe listen --forward-to localhost:3000/stripe/webhook
+```
+
+## 4) Data/payment flow in this codebase
+
+- `admin.html` uploads event images to Supabase Storage bucket `event-images` and inserts event rows into `events`.
+- `index.html` + `events.html` query `events` and display cards/calendar.
+- `event.html` fetches event details by `id` and inserts attendee data into `customers`.
+- `event.html` then calls backend `POST /create-checkout-session`.
+- `server.js` validates event + quantity server-side, creates Stripe Checkout Session with real Stripe secret key, and returns `sessionId`.
+- Browser redirects to Stripe Checkout.
+
+## 5) Brand color customization
+
+Current brand buttons use these CSS vars in pages:
+- `--brand-primary: #ff5d1f`
+- `--brand-secondary: #ff874f`
+
+Update those vars to match your logo’s exact primary color.
