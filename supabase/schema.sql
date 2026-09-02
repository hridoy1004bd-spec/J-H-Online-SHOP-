-- =====================================================================
-- J H Online SHOP — Supabase database schema
-- Run this in the Supabase SQL editor (or via `supabase db push`).
-- Safe to re-run: uses IF NOT EXISTS / CREATE OR REPLACE where possible.
-- =====================================================================

create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------
do $$ begin
  create type order_status as enum
    ('pending','confirmed','processing','shipped','delivered','cancelled','returned');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_method as enum ('cod','bkash','nagad','rocket','card');
exception when duplicate_object then null; end $$;

do $$ begin
  create type admin_role as enum ('super_admin','admin','staff');
exception when duplicate_object then null; end $$;

do $$ begin
  create type notification_type as enum
    ('order_placed','order_confirmed','processing','shipped','delivered',
     'cancelled','new_offer','back_in_stock');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- PROFILES (mirrors auth.users for admin/staff accounts that use
-- Supabase Auth email+password login)
-- ---------------------------------------------------------------------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- ADMINS — role-based access, linked to a Supabase Auth user
-- ---------------------------------------------------------------------
create table if not exists admins (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text unique,
  mobile text unique,
  role admin_role not null default 'staff',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- CUSTOMERS — passwordless, identified by verified mobile number
-- ---------------------------------------------------------------------
create table if not exists customers (
  id uuid primary key default uuid_generate_v4(),
  mobile text not null unique,
  name text not null,
  auth_user_id uuid references auth.users(id) on delete set null,
  is_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_customers_mobile on customers(mobile);

-- ---------------------------------------------------------------------
-- OTP VERIFICATIONS — never exposed to the client after creation;
-- only the Edge Functions (service role) read/write the code.
-- ---------------------------------------------------------------------
create table if not exists otp_verifications (
  id uuid primary key default uuid_generate_v4(),
  mobile text not null,
  code_hash text not null,
  purpose text not null default 'login', -- login | order
  attempts int not null default 0,
  max_attempts int not null default 5,
  expires_at timestamptz not null,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_otp_mobile on otp_verifications(mobile, created_at desc);

-- Rate limiting helper table (per mobile, per rolling window)
create table if not exists otp_rate_limits (
  mobile text primary key,
  request_count int not null default 0,
  window_started_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- CATEGORIES
-- ---------------------------------------------------------------------
create table if not exists categories (
  id uuid primary key default uuid_generate_v4(),
  slug text not null unique,
  name_en text not null,
  name_bn text not null,
  icon text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- PRODUCTS
-- ---------------------------------------------------------------------
create table if not exists products (
  id uuid primary key default uuid_generate_v4(),
  sku text unique,
  category_id uuid references categories(id) on delete set null,
  name_en text not null,
  name_bn text not null,
  description_en text,
  description_bn text,
  short_description_en text,
  short_description_bn text,
  brand text,
  product_code text,
  old_price numeric(10,2) not null,
  current_price numeric(10,2) not null,
  weight_grams int,
  tags text[] default '{}',
  search_keywords text,
  seo_title text,
  seo_description text,
  is_active boolean not null default true,
  is_featured boolean not null default false,
  is_new_arrival boolean not null default true,
  is_best_seller boolean not null default false,
  rating numeric(2,1) not null default 0,
  review_count int not null default 0,
  created_by uuid references admins(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_prices check (current_price >= 0 and old_price >= current_price)
);
create index if not exists idx_products_category on products(category_id);
create index if not exists idx_products_active on products(is_active);
create index if not exists idx_products_search on products
  using gin (to_tsvector('simple', coalesce(name_en,'') || ' ' || coalesce(name_bn,'') || ' ' || coalesce(search_keywords,'')));

-- ---------------------------------------------------------------------
-- PRODUCT IMAGES
-- ---------------------------------------------------------------------
create table if not exists product_images (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references products(id) on delete cascade,
  url text not null,
  thumbnail_url text,
  is_main boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_product_images_product on product_images(product_id);

-- ---------------------------------------------------------------------
-- PRODUCT VARIANTS (size / color combinations)
-- ---------------------------------------------------------------------
create table if not exists product_variants (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references products(id) on delete cascade,
  size text,
  color text,
  sku_suffix text,
  created_at timestamptz not null default now(),
  unique (product_id, size, color)
);
create index if not exists idx_variants_product on product_variants(product_id);

-- ---------------------------------------------------------------------
-- INVENTORY — one row per variant, source of truth for stock
-- ---------------------------------------------------------------------
create table if not exists inventory (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references products(id) on delete cascade,
  variant_id uuid references product_variants(id) on delete cascade,
  quantity int not null default 0,
  reserved int not null default 0,
  updated_at timestamptz not null default now(),
  constraint chk_qty check (quantity >= 0)
);
create unique index if not exists idx_inventory_variant on inventory(product_id, coalesce(variant_id, '00000000-0000-0000-0000-000000000000'));

-- ---------------------------------------------------------------------
-- ADDRESSES
-- ---------------------------------------------------------------------
create table if not exists addresses (
  id uuid primary key default uuid_generate_v4(),
  customer_id uuid not null references customers(id) on delete cascade,
  full_address text not null,
  area text,
  city text not null,
  landmark text,
  is_default boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists idx_addresses_customer on addresses(customer_id);

-- ---------------------------------------------------------------------
-- COUPONS
-- ---------------------------------------------------------------------
create table if not exists coupons (
  id uuid primary key default uuid_generate_v4(),
  code text not null unique,
  description text,
  discount_type text not null default 'percent', -- percent | flat
  discount_value numeric(10,2) not null,
  min_order_amount numeric(10,2) default 0,
  max_uses int,
  used_count int not null default 0,
  starts_at timestamptz,
  expires_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- ORDERS
-- ---------------------------------------------------------------------
create table if not exists orders (
  id uuid primary key default uuid_generate_v4(),
  order_number text not null unique,
  customer_id uuid not null references customers(id),
  customer_name text not null,
  customer_mobile text not null,
  address_id uuid references addresses(id),
  full_address text not null,
  area text,
  city text not null,
  landmark text,
  subtotal numeric(10,2) not null default 0,
  discount numeric(10,2) not null default 0,
  delivery_charge numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,
  coupon_id uuid references coupons(id),
  payment_method payment_method not null default 'cod',
  payment_status text not null default 'unpaid', -- unpaid | paid | refunded
  status order_status not null default 'pending',
  admin_note text,
  cancel_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_orders_customer on orders(customer_id);
create index if not exists idx_orders_status on orders(status);
create index if not exists idx_orders_created on orders(created_at desc);

-- ---------------------------------------------------------------------
-- ORDER ITEMS
-- ---------------------------------------------------------------------
create table if not exists order_items (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid not null references products(id),
  variant_id uuid references product_variants(id),
  product_name text not null,
  size text,
  color text,
  unit_price numeric(10,2) not null,
  quantity int not null check (quantity > 0),
  line_total numeric(10,2) not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_order_items_order on order_items(order_id);

-- ---------------------------------------------------------------------
-- ORDER STATUS HISTORY (for the customer-facing timeline)
-- ---------------------------------------------------------------------
create table if not exists order_status_history (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references orders(id) on delete cascade,
  status order_status not null,
  note text,
  changed_by uuid references admins(id),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- REVIEWS
-- ---------------------------------------------------------------------
create table if not exists reviews (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references products(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  order_id uuid references orders(id),
  rating int not null check (rating between 1 and 5),
  comment text,
  is_approved boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists idx_reviews_product on reviews(product_id);

-- ---------------------------------------------------------------------
-- NOTIFICATIONS
-- ---------------------------------------------------------------------
create table if not exists notifications (
  id uuid primary key default uuid_generate_v4(),
  customer_id uuid references customers(id) on delete cascade,
  type notification_type not null,
  title_en text not null,
  title_bn text not null,
  body_en text,
  body_bn text,
  related_order_id uuid references orders(id),
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_notifications_customer on notifications(customer_id, is_read);

-- ---------------------------------------------------------------------
-- STORE SETTINGS — single-row config table
-- ---------------------------------------------------------------------
create table if not exists store_settings (
  id int primary key default 1,
  store_name text not null default 'J H Online SHOP',
  logo_url text,
  phone text,
  whatsapp text,
  address text,
  currency text not null default 'BDT',
  default_language text not null default 'bn',
  delivery_charge_inside_dhaka numeric(10,2) not null default 60,
  delivery_charge_outside_dhaka numeric(10,2) not null default 120,
  cod_enabled boolean not null default true,
  otp_provider text not null default 'dev',
  dev_otp_mode boolean not null default true,
  return_policy_en text,
  return_policy_bn text,
  privacy_policy_en text,
  privacy_policy_bn text,
  terms_en text,
  terms_bn text,
  updated_at timestamptz not null default now(),
  constraint single_row check (id = 1)
);
insert into store_settings (id) values (1) on conflict (id) do nothing;

-- =====================================================================
-- TRIGGERS: updated_at maintenance
-- =====================================================================
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_products_updated on products;
create trigger trg_products_updated before update on products
  for each row execute function set_updated_at();

drop trigger if exists trg_orders_updated on orders;
create trigger trg_orders_updated before update on orders
  for each row execute function set_updated_at();

drop trigger if exists trg_customers_updated on customers;
create trigger trg_customers_updated before update on customers
  for each row execute function set_updated_at();

-- Log status changes into order_status_history automatically
create or replace function log_order_status_change() returns trigger as $$
begin
  if (tg_op = 'INSERT') or (new.status is distinct from old.status) then
    insert into order_status_history (order_id, status) values (new.id, new.status);
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_order_status_log on orders;
create trigger trg_order_status_log after insert or update on orders
  for each row execute function log_order_status_change();

-- =====================================================================
-- ROW LEVEL SECURITY
-- =====================================================================
alter table profiles enable row level security;
alter table admins enable row level security;
alter table customers enable row level security;
alter table otp_verifications enable row level security;
alter table otp_rate_limits enable row level security;
alter table categories enable row level security;
alter table products enable row level security;
alter table product_images enable row level security;
alter table product_variants enable row level security;
alter table inventory enable row level security;
alter table addresses enable row level security;
alter table coupons enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table order_status_history enable row level security;
alter table reviews enable row level security;
alter table notifications enable row level security;
alter table store_settings enable row level security;

-- Helper: is the current auth.uid() an active admin?
create or replace function is_admin() returns boolean as $$
  select exists (
    select 1 from admins where id = auth.uid() and is_active = true
  );
$$ language sql stable security definer;

-- ---- Public read access (catalog is public) ----
create policy "public read categories" on categories for select using (is_active = true or is_admin());
create policy "public read products" on products for select using (is_active = true or is_admin());
create policy "public read product_images" on product_images for select using (true);
create policy "public read product_variants" on product_variants for select using (true);
create policy "public read inventory" on inventory for select using (true);
create policy "public read approved reviews" on reviews for select using (is_approved = true or is_admin());
create policy "public read store settings" on store_settings for select using (true);

-- ---- Admin write access (catalog, orders, settings) ----
create policy "admin write categories" on categories for all using (is_admin()) with check (is_admin());
create policy "admin write products" on products for all using (is_admin()) with check (is_admin());
create policy "admin write product_images" on product_images for all using (is_admin()) with check (is_admin());
create policy "admin write product_variants" on product_variants for all using (is_admin()) with check (is_admin());
create policy "admin write inventory" on inventory for all using (is_admin()) with check (is_admin());
create policy "admin write coupons" on coupons for all using (is_admin()) with check (is_admin());
create policy "admin write settings" on store_settings for update using (is_admin());
create policy "admin manage reviews" on reviews for update using (is_admin());
create policy "admin read admins" on admins for select using (is_admin());

-- ---- Customers: can only see/manage their own row ----
create policy "customer read own profile" on customers for select
  using (auth_user_id = auth.uid() or is_admin());
create policy "customer update own profile" on customers for update
  using (auth_user_id = auth.uid());
-- Inserts for new customers happen via the OTP-verification Edge Function
-- using the service role key, bypassing RLS by design.

-- ---- Addresses: customer owns their addresses ----
create policy "customer manage own addresses" on addresses for all
  using (
    customer_id in (select id from customers where auth_user_id = auth.uid())
    or is_admin()
  )
  with check (
    customer_id in (select id from customers where auth_user_id = auth.uid())
    or is_admin()
  );

-- ---- Orders: customer sees only their own; admin sees all ----
create policy "customer read own orders" on orders for select
  using (
    customer_id in (select id from customers where auth_user_id = auth.uid())
    or is_admin()
  );
create policy "admin update orders" on orders for update using (is_admin());
-- Order creation goes through the create-order Edge Function (service role)
-- so that stock checks and inventory decrements happen atomically and
-- cannot be bypassed or forged by the client.

create policy "customer read own order items" on order_items for select
  using (
    order_id in (
      select o.id from orders o
      join customers c on c.id = o.customer_id
      where c.auth_user_id = auth.uid()
    )
    or is_admin()
  );

create policy "customer read own order history" on order_status_history for select
  using (
    order_id in (
      select o.id from orders o
      join customers c on c.id = o.customer_id
      where c.auth_user_id = auth.uid()
    )
    or is_admin()
  );

-- ---- Reviews: customer can create for their own orders ----
create policy "customer create review" on reviews for insert
  with check (customer_id in (select id from customers where auth_user_id = auth.uid()));

-- ---- Notifications: customer sees only their own ----
create policy "customer read own notifications" on notifications for select
  using (customer_id in (select id from customers where auth_user_id = auth.uid()) or is_admin());
create policy "customer update own notifications" on notifications for update
  using (customer_id in (select id from customers where auth_user_id = auth.uid()));
create policy "admin create notifications" on notifications for insert with check (is_admin());

-- otp_verifications and otp_rate_limits have NO client policies at all —
-- they are only ever read/written by Edge Functions using the service
-- role key, which bypasses RLS. This keeps OTP codes fully server-side.

-- =====================================================================
-- RPC: atomic inventory decrement, used only by the create-order
-- Edge Function (service role). Guards against double-selling.
-- =====================================================================
create or replace function decrement_inventory(p_inventory_id uuid, p_qty int)
returns void as $$
  update inventory set quantity = quantity - p_qty, updated_at = now()
  where id = p_inventory_id and quantity >= p_qty;
$$ language sql;

-- =====================================================================
-- SEED DATA — starter categories (safe to edit/remove)
-- =====================================================================
insert into categories (slug, name_en, name_bn, sort_order) values
  ('all', 'All Products', 'সব পণ্য', 0),
  ('new', 'New Arrivals', 'নতুন পণ্য', 1),
  ('popular', 'Popular', 'জনপ্রিয়', 2),
  ('offers', 'Offers', 'অফার', 3),
  ('women', 'Women''s', 'নারীদের', 4),
  ('men', 'Men''s', 'পুরুষদের', 5),
  ('kids', 'Kids', 'শিশুদের', 6),
  ('fashion', 'Fashion', 'ফ্যাশন', 7),
  ('inner', 'Inner Products', 'ইনার প্রোডাক্ট', 8)
on conflict (slug) do nothing;
