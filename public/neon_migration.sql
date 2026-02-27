-- ============================================================
-- JAF HOT CHICKEN - Neon DB Migration
-- Single-file consolidated migration (all 14 Supabase migrations)
-- Compatible with: Neon / Standard PostgreSQL (no Supabase-specific deps)
-- Run this once on a fresh Neon database
-- ============================================================

-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


-- ============================================================
-- ENUMS
-- ============================================================
-- (No Postgres ENUM used; roles stored as TEXT with CHECK constraints
--  for maximum Neon / plain PostgreSQL compatibility)


-- ============================================================
-- TABLE: profiles
-- Stores app users (billers & kitchen managers).
-- No dependency on auth.users — uses standalone password_hash.
-- ============================================================
CREATE TABLE public.profiles (
  id           UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email        TEXT        NOT NULL UNIQUE,
  role         TEXT        NOT NULL CHECK (role IN ('biller', 'kitchen_manager')),
  full_name    TEXT,
  password_hash TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ============================================================
-- TABLE: food_categories
-- ============================================================
CREATE TABLE public.food_categories (
  id          UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT        NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ============================================================
-- TABLE: food_items
-- ============================================================
CREATE TABLE public.food_items (
  id          UUID          NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT          NOT NULL,
  description TEXT,
  price       DECIMAL(10,2) NOT NULL,
  category_id UUID          NOT NULL REFERENCES public.food_categories(id) ON DELETE CASCADE,
  status      TEXT          NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'unavailable')),
  image_url   TEXT,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT now()
);


-- ============================================================
-- TABLE: bills
-- status: 'draft' → billed but not sent | 'active' → sent to kitchen
--         'completed' → paid & done
-- ============================================================
CREATE TABLE public.bills (
  id               UUID          NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name    TEXT,
  mobile_last_digit TEXT         NOT NULL,
  total            DECIMAL(10,2) NOT NULL DEFAULT 0,
  status           TEXT          NOT NULL DEFAULT 'draft'
                     CHECK (status IN ('draft', 'active', 'completed')),
  payment_mode     TEXT,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT now()
);

COMMENT ON COLUMN public.bills.payment_mode IS 'Payment method used (e.g., cash, online, upi)';


-- ============================================================
-- TABLE: bill_items
-- ============================================================
CREATE TABLE public.bill_items (
  id             UUID          NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bill_id        UUID          NOT NULL REFERENCES public.bills(id) ON DELETE CASCADE,
  food_item_id   UUID          NOT NULL REFERENCES public.food_items(id),
  food_item_name TEXT          NOT NULL,
  price          DECIMAL(10,2) NOT NULL,
  quantity       INTEGER       NOT NULL DEFAULT 1,
  total          DECIMAL(10,2) NOT NULL,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT now()
);


-- ============================================================
-- INDEXES (for common query patterns)
-- ============================================================
CREATE INDEX idx_bills_status          ON public.bills(status);
CREATE INDEX idx_bills_created_at      ON public.bills(created_at DESC);
CREATE INDEX idx_bill_items_bill_id    ON public.bill_items(bill_id);
CREATE INDEX idx_food_items_category   ON public.food_items(category_id);
CREATE INDEX idx_profiles_email        ON public.profiles(email);


-- ============================================================
-- FUNCTION: update_updated_at_column
-- Auto-updates the `updated_at` timestamp on row changes.
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


-- ============================================================
-- TRIGGERS: auto updated_at
-- ============================================================
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_food_categories_updated_at
  BEFORE UPDATE ON public.food_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_food_items_updated_at
  BEFORE UPDATE ON public.food_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bills_updated_at
  BEFORE UPDATE ON public.bills
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ============================================================
-- FUNCTION: verify_user_password
-- Used by the app's custom login (RPC call from the frontend).
-- Verifies email + bcrypt password against profiles.password_hash.
-- ============================================================
CREATE OR REPLACE FUNCTION public.verify_user_password(
  user_email    TEXT,
  user_password TEXT
)
RETURNS TABLE(
  user_id   UUID,
  email     TEXT,
  role      TEXT,
  full_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id          AS user_id,
    p.email,
    p.role,
    p.full_name
  FROM public.profiles p
  WHERE p.email         = user_email
    AND p.password_hash = public.crypt(user_password, p.password_hash);
END;
$$;


-- ============================================================
-- SEED DATA: Default Users
-- Passwords are bcrypt-hashed via pgcrypto.
--
--   Biller login     → biller@gmail.com   / biller123
--   Kitchen login    → kitchen@gmail.com  / kitchen123
--
-- Change passwords after first login in production!
-- ============================================================
INSERT INTO public.profiles (id, email, role, full_name, password_hash, created_at, updated_at)
VALUES
  (
    gen_random_uuid(),
    'biller@gmail.com',
    'biller',
    'Biller User',
    public.crypt('biller123', public.gen_salt('bf')),
    now(),
    now()
  ),
  (
    gen_random_uuid(),
    'kitchen@gmail.com',
    'kitchen_manager',
    'Kitchen Manager',
    public.crypt('kitchen123', public.gen_salt('bf')),
    now(),
    now()
  )
ON CONFLICT (email) DO NOTHING;


-- ============================================================
-- DONE
-- Tables created: profiles, food_categories, food_items, bills, bill_items
-- Functions: verify_user_password, update_updated_at_column
-- Seed users: biller@gmail.com, kitchen@gmail.com
-- ============================================================
