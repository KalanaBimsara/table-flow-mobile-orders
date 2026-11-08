-- =============================================================================
-- Rebuild of the full TableFlow schema on a fresh Supabase project
-- (project hlemlubraovotrsdkgka), after the original database was lost.
--
-- The older migrations in this folder only ALTER tables that were first
-- created through the Lovable UI, so they cannot rebuild an empty database.
-- This file is self-contained: run it ONCE on an empty project.
--
-- Sources: src/integrations/supabase/types.ts (columns), the older migrations
-- (policies, functions) and how the app code reads and writes each table.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- -----------------------------------------------------------------------------
-- Enums and sequences
-- -----------------------------------------------------------------------------
CREATE TYPE public.user_role AS ENUM ('customer', 'seller', 'delivery', 'admin', 'manager');

-- orders.order_form_number is filled from this sequence. The last order in the
-- lost database was 3596, so new orders continue from 3597 and never clash
-- with old printed forms and QR codes.
CREATE SEQUENCE public.order_form_number_seq START WITH 3597;

-- -----------------------------------------------------------------------------
-- Tables
-- -----------------------------------------------------------------------------
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text,
  email text,
  contact_no text,
  role public.user_role DEFAULT 'customer',
  can_view_all_orders boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- No CHECK constraints on status columns: the app writes delivery_status values
-- 'pending', 'ready', 'assigned' and 'completed', and odoo_sync_status values
-- that are not documented anywhere.
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_form_number text UNIQUE DEFAULT nextval('public.order_form_number_seq')::text,
  customer_name text NOT NULL,
  customer_district text,
  address text NOT NULL,
  contact_number text NOT NULL,
  whatsapp_number text,
  sales_person_name text,
  table_size text NOT NULL,
  colour text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  price numeric NOT NULL DEFAULT 0,
  delivery_fee numeric DEFAULT 0,
  additional_charges numeric DEFAULT 0,
  delivery_date date,
  delivery_type text,
  delivery_status text DEFAULT 'pending',
  status text DEFAULT 'pending',
  delivery_person_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  note text,
  odoo_sale_order_id text,
  odoo_sync_status text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  completed_at timestamptz
);
ALTER SEQUENCE public.order_form_number_seq OWNED BY public.orders.order_form_number;
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_created_at ON public.orders(created_at);
CREATE INDEX idx_orders_created_by ON public.orders(created_by);
CREATE INDEX idx_orders_delivery_person ON public.orders(delivery_person_id);

CREATE TABLE public.order_tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  size text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  price numeric NOT NULL DEFAULT 0,
  colour text NOT NULL,
  top_colour text,
  frame_colour text,
  leg_size text,
  leg_shape text,
  leg_height text,
  wire_holes text,
  wire_holes_comment text,
  front_panel_size text,
  front_panel_length numeric,
  l_shape_orientation text,
  created_at timestamptz DEFAULT now()
);
COMMENT ON COLUMN public.order_tables.l_shape_orientation IS 'Orientation for L-shaped tables: normal or reverse';
CREATE INDEX idx_order_tables_order_id ON public.order_tables(order_id);

CREATE TABLE public.bills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_number integer NOT NULL UNIQUE,
  bill_to text NOT NULL,
  driver_name text,
  vehicle_number text,
  order_numbers text[] NOT NULL,
  total_amount numeric NOT NULL DEFAULT 0,
  total_quantity integer NOT NULL DEFAULT 0,
  bill_date date NOT NULL DEFAULT CURRENT_DATE,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_bills_bill_date ON public.bills(bill_date);

CREATE TABLE public.bill_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id uuid NOT NULL REFERENCES public.bills(id) ON DELETE CASCADE,
  order_number text NOT NULL,
  item text NOT NULL,
  quantity integer NOT NULL,
  rate numeric NOT NULL DEFAULT 0,
  amount numeric NOT NULL DEFAULT 0,
  delivery_city text NOT NULL DEFAULT '',
  is_extra_fee boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_bill_items_bill_id ON public.bill_items(bill_id);

CREATE TABLE public.transport (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  transport_mode text NOT NULL,
  transport_status text,
  copy_name text,
  loaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  loaded_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_transport_order_id ON public.transport(order_id);

-- Written by the external scanner app, read by Production and Dispatch/Return.
CREATE TABLE public.dispatch_return_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  order_form_number text NOT NULL,
  customer_name text,
  customer_district text,
  operation_mode text NOT NULL,
  copy_type text,
  table_size text,
  colour text,
  quantity integer NOT NULL DEFAULT 1,
  vehicle_number text NOT NULL DEFAULT '',
  scanner_name text NOT NULL DEFAULT '',
  device_id text NOT NULL DEFAULT '',
  restocked boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_dispatch_return_order_form_no ON public.dispatch_return_logs(order_form_number);
CREATE INDEX idx_dispatch_return_copy_type ON public.dispatch_return_logs(copy_type);
CREATE INDEX idx_dispatch_return_created_at ON public.dispatch_return_logs(created_at);

CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_push_subscriptions_user_id ON public.push_subscriptions(user_id);

CREATE TABLE public.super_admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL UNIQUE,
  email text NOT NULL,
  password_hash text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  last_login timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.super_admin_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.super_admin_users(id) ON DELETE CASCADE,
  session_token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.production_bars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  size text NOT NULL,
  color text NOT NULL,
  quantity integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.production_legs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  size text NOT NULL,
  color text NOT NULL,
  quantity integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.production_table_tops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  size text NOT NULL,
  color text NOT NULL,
  quantity integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Size -> Odoo product mapping, used by the external Odoo sync. Rows were
-- entered by hand in the old database and must be re-entered.
CREATE TABLE public.product_mapping (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supabase_size text,
  odoo_product_id integer,
  odoo_internal_reference text
);

CREATE TABLE public."product_mapping_Prod" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supabase_size text,
  odoo_product_id integer,
  odoo_internal_reference text
);

CREATE TABLE public.daily_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL UNIQUE,
  total_orders integer DEFAULT 0,
  completed_orders integer DEFAULT 0,
  pending_orders integer DEFAULT 0,
  total_revenue numeric DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.monthly_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month text NOT NULL UNIQUE,
  total_orders integer DEFAULT 0,
  total_revenue numeric DEFAULT 0,
  avg_order_value numeric DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- Functions
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::text FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.try_cast_double(inp text)
RETURNS double precision
LANGUAGE plpgsql IMMUTABLE
AS $$
BEGIN
  BEGIN
    RETURN inp::double precision;
  EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
  END;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_daily_analytics()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today date := current_date;
BEGIN
  INSERT INTO public.daily_analytics (date, total_orders, completed_orders, pending_orders, total_revenue)
  SELECT v_today,
         COUNT(*),
         COUNT(*) FILTER (WHERE status = 'completed'),
         COUNT(*) FILTER (WHERE status = 'pending'),
         COALESCE(SUM(COALESCE(price, 0) + COALESCE(delivery_fee, 0) + COALESCE(additional_charges, 0)), 0)
  FROM public.orders
  WHERE created_at::date = v_today
  ON CONFLICT (date) DO UPDATE SET
    total_orders = excluded.total_orders,
    completed_orders = excluded.completed_orders,
    pending_orders = excluded.pending_orders,
    total_revenue = excluded.total_revenue;
END;
$$;

-- Creates the profile row for every new auth user. The signup forms send either
-- `name` or `first_name` + `last_name`, and the role in user metadata.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role public.user_role;
BEGIN
  BEGIN
    v_role := COALESCE(NULLIF(new.raw_user_meta_data->>'role', '')::public.user_role, 'customer');
  EXCEPTION WHEN invalid_text_representation THEN
    v_role := 'customer';
  END;

  INSERT INTO public.profiles (id, name, email, role)
  VALUES (
    new.id,
    COALESCE(
      NULLIF(new.raw_user_meta_data->>'name', ''),
      NULLIF(trim(concat_ws(' ', new.raw_user_meta_data->>'first_name', new.raw_user_meta_data->>'last_name')), '')
    ),
    new.email,
    v_role
  )
  ON CONFLICT (id) DO UPDATE SET
    name = COALESCE(excluded.name, public.profiles.name),
    email = excluded.email;
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Super admin login (separate from Supabase Auth). Same signature and
-- behaviour as the last version in 20260602181632, with a random 256-bit token.
CREATE OR REPLACE FUNCTION public.super_admin_sign_in(p_username text, p_password text)
RETURNS TABLE(
  session_id uuid,
  session_token text,
  expires_at timestamptz,
  user_id uuid,
  username text,
  email text,
  last_login timestamptz,
  is_active boolean
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  user_record record;
  session_record record;
BEGIN
  SELECT u.id, u.username, u.email, u.password_hash, u.is_active
  INTO user_record
  FROM public.super_admin_users u
  WHERE lower(u.username) = lower(p_username) AND u.is_active = true
  LIMIT 1;

  IF NOT FOUND OR extensions.crypt(p_password, user_record.password_hash) <> user_record.password_hash THEN
    RAISE EXCEPTION 'Invalid username or password' USING ERRCODE = '28000';
  END IF;

  INSERT INTO public.super_admin_sessions (user_id, session_token, expires_at)
  VALUES (user_record.id, encode(extensions.gen_random_bytes(32), 'hex'), now() + interval '24 hours')
  RETURNING public.super_admin_sessions.id,
            public.super_admin_sessions.session_token,
            public.super_admin_sessions.expires_at
  INTO session_record;

  UPDATE public.super_admin_users SET last_login = now()
  WHERE public.super_admin_users.id = user_record.id;

  RETURN QUERY SELECT session_record.id, session_record.session_token, session_record.expires_at,
                      user_record.id, user_record.username, user_record.email, now(), user_record.is_active;
END;
$$;

CREATE OR REPLACE FUNCTION public.super_admin_get_session(p_session_token text)
RETURNS TABLE(
  session_id uuid,
  session_token text,
  expires_at timestamptz,
  user_id uuid,
  username text,
  email text,
  last_login timestamptz,
  is_active boolean
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT s.id, s.session_token, s.expires_at, u.id, u.username, u.email, u.last_login, u.is_active
  FROM public.super_admin_sessions s
  JOIN public.super_admin_users u ON u.id = s.user_id
  WHERE s.session_token = p_session_token
    AND s.expires_at > now()
    AND u.is_active = true
  LIMIT 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.super_admin_sign_out(p_session_token text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.super_admin_sessions WHERE session_token = p_session_token;
END;
$$;

-- The super admin panel is not signed in through Supabase Auth, so it reaches
-- the database as `anon`. These two functions let it list and edit profiles
-- after checking its session token, instead of opening `profiles` to anon.
CREATE OR REPLACE FUNCTION public.super_admin_list_profiles(p_session_token text)
RETURNS SETOF public.profiles
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.super_admin_get_session(p_session_token)) THEN
    RAISE EXCEPTION 'Invalid or expired super admin session' USING ERRCODE = '28000';
  END IF;
  RETURN QUERY SELECT * FROM public.profiles ORDER BY created_at DESC;
END;
$$;

-- NULL arguments leave that field unchanged. A role change is also written to
-- auth user metadata, because the app's route guards read the role from there.
CREATE OR REPLACE FUNCTION public.super_admin_update_profile(
  p_session_token text,
  p_user_id uuid,
  p_name text DEFAULT NULL,
  p_role public.user_role DEFAULT NULL,
  p_contact_no text DEFAULT NULL,
  p_can_view_all_orders boolean DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.super_admin_get_session(p_session_token)) THEN
    RAISE EXCEPTION 'Invalid or expired super admin session' USING ERRCODE = '28000';
  END IF;

  UPDATE public.profiles SET
    name = COALESCE(p_name, name),
    role = COALESCE(p_role, role),
    contact_no = COALESCE(p_contact_no, contact_no),
    can_view_all_orders = COALESCE(p_can_view_all_orders, can_view_all_orders)
  WHERE id = p_user_id;

  IF p_role IS NOT NULL THEN
    UPDATE auth.users
    SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('role', p_role::text)
    WHERE id = p_user_id;
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.update_daily_analytics() FROM PUBLIC, anon;

-- -----------------------------------------------------------------------------
-- Row level security
-- -----------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bill_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispatch_return_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.super_admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.super_admin_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_bars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_legs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_table_tops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."product_mapping_Prod" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_analytics ENABLE ROW LEVEL SECURITY;
-- super_admin_users / super_admin_sessions: no policies on purpose. They are
-- only reached through the SECURITY DEFINER super_admin_* functions.

-- profiles
CREATE POLICY "Authenticated users can view profiles"
  ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE TO authenticated USING (public.get_current_user_role() = 'admin');

-- orders
CREATE POLICY "Allow public to read orders by order form number"
  ON public.orders FOR SELECT TO anon USING (true);
CREATE POLICY "Users can view their accessible orders"
  ON public.orders FOR SELECT TO authenticated
  USING (
    created_by = auth.uid()
    OR delivery_person_id = auth.uid()
    OR public.get_current_user_role() IN ('admin', 'manager')
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND can_view_all_orders)
  );
CREATE POLICY "Delivery can view ready orders"
  ON public.orders FOR SELECT TO authenticated
  USING (delivery_status = 'ready' AND public.get_current_user_role() = 'delivery');
CREATE POLICY "Users can insert orders"
  ON public.orders FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update their own pending orders"
  ON public.orders FOR UPDATE TO authenticated
  USING (auth.uid() = created_by AND status = 'pending');
CREATE POLICY "Managers can update orders"
  ON public.orders FOR UPDATE TO authenticated
  USING (public.get_current_user_role() = 'manager');
-- Delivery staff assign ready orders to themselves, then complete them.
CREATE POLICY "Delivery can take and complete orders"
  ON public.orders FOR UPDATE TO authenticated
  USING (public.get_current_user_role() = 'delivery' AND (delivery_status = 'ready' OR delivery_person_id = auth.uid()))
  WITH CHECK (public.get_current_user_role() = 'delivery' AND delivery_person_id = auth.uid());
CREATE POLICY "Admins have full access to orders"
  ON public.orders FOR ALL TO authenticated
  USING (public.get_current_user_role() = 'admin')
  WITH CHECK (public.get_current_user_role() = 'admin');

-- order_tables
CREATE POLICY "Allow public to read order_tables"
  ON public.order_tables FOR SELECT TO anon USING (true);
CREATE POLICY "Authenticated users can view order_tables"
  ON public.order_tables FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert order_tables"
  ON public.order_tables FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update their own order tables"
  ON public.order_tables FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_tables.order_id AND o.created_by = auth.uid() AND o.status = 'pending'));
CREATE POLICY "Users can delete their own order tables"
  ON public.order_tables FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_tables.order_id AND o.created_by = auth.uid() AND o.status = 'pending'));
CREATE POLICY "Admins and managers manage order_tables"
  ON public.order_tables FOR ALL TO authenticated
  USING (public.get_current_user_role() IN ('admin', 'manager'))
  WITH CHECK (public.get_current_user_role() IN ('admin', 'manager'));

-- bills / bill_items
CREATE POLICY "Authenticated users can view bills"
  ON public.bills FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert bills"
  ON public.bills FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Authenticated users can update their own bills"
  ON public.bills FOR UPDATE TO authenticated USING (auth.uid() = created_by);
CREATE POLICY "Authenticated users can delete their own bills"
  ON public.bills FOR DELETE TO authenticated USING (auth.uid() = created_by);

CREATE POLICY "Authenticated users can view bill items"
  ON public.bill_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert bill items"
  ON public.bill_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update bill items"
  ON public.bill_items FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete bill items"
  ON public.bill_items FOR DELETE TO authenticated USING (true);

-- transport
CREATE POLICY "Authenticated users can view transport"
  ON public.transport FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert transport"
  ON public.transport FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update transport"
  ON public.transport FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete transport"
  ON public.transport FOR DELETE TO authenticated USING (true);

-- dispatch_return_logs: the scanner app inserts with the public key.
CREATE POLICY "Authenticated users can view dispatch return logs"
  ON public.dispatch_return_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Scanner and users can insert dispatch return logs"
  ON public.dispatch_return_logs FOR INSERT TO anon, authenticated WITH CHECK (true);

-- push_subscriptions
CREATE POLICY "Users can manage own subscriptions"
  ON public.push_subscriptions FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- production stock
CREATE POLICY "Authenticated users can manage production bars"
  ON public.production_bars FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage production legs"
  ON public.production_legs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage production table tops"
  ON public.production_table_tops FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- product mapping (read-only from the app)
CREATE POLICY "Authenticated users can read product_mapping"
  ON public.product_mapping FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read product_mapping_Prod"
  ON public."product_mapping_Prod" FOR SELECT TO authenticated USING (true);

-- analytics
CREATE POLICY "Admin can view daily analytics"
  ON public.daily_analytics FOR SELECT TO authenticated USING (public.get_current_user_role() = 'admin');
CREATE POLICY "Admin can view monthly analytics"
  ON public.monthly_analytics FOR SELECT TO authenticated USING (public.get_current_user_role() = 'admin');

-- -----------------------------------------------------------------------------
-- Grants. New Supabase projects may not grant the API roles access to new
-- tables automatically; RLS above still decides which rows they see.
-- -----------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Realtime: src/pages/Index.tsx listens for new orders.
-- -----------------------------------------------------------------------------
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
