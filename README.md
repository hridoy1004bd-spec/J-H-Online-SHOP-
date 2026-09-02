# J H Online SHOP

A real, production-structured e-commerce app: React + TypeScript + Vite + Tailwind
on the frontend, Supabase (Postgres + Auth + Storage + Edge Functions) as the backend.
Bilingual (বাংলা / English) throughout, passwordless OTP checkout, and a full admin
dashboard.

> **Read this before you run it.** This codebase talks to a *real* Supabase project —
> there is no mock/demo data mode. You must create your own Supabase project and
> (for production) a real SMS provider before it will actually create accounts,
> save products, or place orders.

---

## 1. What's included

- `src/` — the full React app (customer storefront + admin dashboard), routed with
  `react-router-dom`, styled with Tailwind, everything wired to Supabase — no
  `localStorage`-as-database, no hardcoded products/customers/orders.
- `supabase/schema.sql` — every table (`products`, `orders`, `customers`,
  `inventory`, `otp_verifications`, etc.), enums, triggers, and **Row Level Security**
  policies so customers can only see their own orders/profile and only admins can
  write to the catalog.
- `supabase/functions/` — three Edge Functions that must run server-side because they
  touch secrets or need atomicity:
  - `send-otp` — generates + hashes a one-time code, rate-limits requests, and sends
    it via your SMS provider (or returns it in a dev-only banner if `DEV_OTP_MODE=true`).
  - `verify-otp` — checks the code, creates the customer + a matching Supabase Auth
    user on first login (passwordless), and hands back a session token.
  - `create-order` — validates stock, computes totals server-side (never trusts
    client-submitted prices), creates the order, and decrements inventory atomically
    so two customers can't oversell the last unit.

## 2. One-time setup

### a) Create a Supabase project
Go to [supabase.com](https://supabase.com) → New Project. Grab the **Project URL**
and **anon public key** from Settings → API.

### b) Run the schema
Open the SQL editor in your Supabase dashboard and run the entire contents of
`supabase/schema.sql`. This creates every table, enum, trigger, and RLS policy, plus
starter categories.

### c) Create the storage bucket
In Storage, create a public bucket named `product-images` (or run the SQL snippet at
the bottom of `src/services/uploadService.ts`).

### d) Create your first admin account
1. In Supabase → Authentication → Users → **Add user**, create yourself with an
   email + password.
2. In the SQL editor, promote that user to admin:
   ```sql
   insert into admins (id, name, email, role)
   values ('<paste the user UUID from step 1>', 'Your Name', 'you@example.com', 'super_admin');
   ```

### e) Deploy the Edge Functions
```bash
npm install -g supabase
supabase login
supabase link --project-ref <your-project-ref>
supabase functions deploy send-otp
supabase functions deploy verify-otp
supabase functions deploy create-order
```

Set the required secrets (never put these in the frontend `.env`):
```bash
supabase secrets set DEV_OTP_MODE=true   # set to false once a real SMS provider is wired up
supabase secrets set SMS_PROVIDER=your-provider
supabase secrets set SMS_API_KEY=xxxx
supabase secrets set SMS_API_SECRET=xxxx
supabase secrets set SMS_SENDER_ID=JHShop
```
`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are already available to Edge Functions
automatically — you don't need to set those.

**Development OTP mode:** while `DEV_OTP_MODE=true`, `send-otp` returns the code
directly in its response so you can test the full checkout flow with zero SMS
account. The checkout screen shows it in a clearly-labelled orange banner. **Set this
to `false` and configure a real provider before taking any real orders** — the admin
Settings page also surfaces a warning banner while dev mode is on.

### f) Configure the frontend
```bash
cp .env.example .env
# fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
```

## 3. Run it

```bash
npm install
npm run dev
```

Visit `http://localhost:5173` for the storefront, and `/admin/login` for the admin
dashboard (log in with the email/password from step d above).

## 4. Adding your first product

Log into `/admin`, go to **New Product**, upload an image, fill in the name (in
either language — the other field auto-fills with a placeholder you should review
and correct before publishing), set old/current price, sizes, and stock, then
**Publish**. It appears on the storefront immediately.

## 5. Deploying

- **Frontend:** `npm run build` produces `dist/` — deploy it to Vercel, Netlify,
  Cloudflare Pages, or any static host. Set the same two `VITE_SUPABASE_*` env vars
  in your host's dashboard.
- **Backend:** already live once you've deployed the Edge Functions and run the
  schema — Supabase hosts the database, auth, storage, and functions for you.

## 6. Payment methods

Cash on Delivery works today. bKash / Nagad / Rocket / Card are architected (see
Admin → Payment Settings) but need each provider's merchant credentials wired into
a new Edge Function following the same pattern as `create-order` before they go live.

## 7. Project structure

```
src/
  components/   shared UI (ProductCard, Header, BottomNav, ...)
  pages/
    customer/   storefront pages
    admin/      dashboard pages
  layouts/      CustomerLayout, AdminLayout
  contexts/     Cart, Auth, Toast
  i18n/         বাংলা/English dictionary + LanguageContext
  services/     Supabase queries (products, orders, OTP, uploads)
  lib/          Supabase client
  types/        shared TypeScript types
  utils/        formatting/validation helpers
supabase/
  schema.sql            full DB schema + RLS
  functions/send-otp/   OTP generation + SMS sending
  functions/verify-otp/ OTP check + passwordless login/signup
  functions/create-order/  atomic order creation + stock decrement
```
