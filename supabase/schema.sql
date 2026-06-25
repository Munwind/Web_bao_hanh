create extension if not exists "pgcrypto";

create table if not exists public.product_models (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  image_url text,
  description text,
  default_warranty_months integer not null check (default_warranty_months > 0),
  default_warranty_uses integer not null check (default_warranty_uses >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  model_id uuid references public.product_models(id) on delete set null,
  name text not null,
  sku text not null unique,
  qr_code text not null unique,
  image_url text,
  description text,
  warranty_months integer not null check (warranty_months > 0),
  total_warranty_uses integer not null check (total_warranty_uses >= 0),
  remaining_warranty_uses integer not null check (remaining_warranty_uses >= 0),
  customer_name text,
  customer_phone text,
  activated_at timestamptz,
  expires_at timestamptz,
  locked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.products add column if not exists model_id uuid references public.product_models(id) on delete set null;
alter table public.products add column if not exists customer_name text;
alter table public.products add column if not exists customer_phone text;

create table if not exists public.warranty_events (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  event_type text not null check (event_type in ('activated', 'manual_use', 'note')),
  note text,
  created_at timestamptz not null default now()
);

create index if not exists products_qr_code_idx on public.products (qr_code);
create index if not exists products_sku_idx on public.products (sku);
create index if not exists products_model_id_idx on public.products (model_id);
create index if not exists product_models_code_idx on public.product_models (code);
create index if not exists warranty_events_product_id_idx on public.warranty_events (product_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists product_models_set_updated_at on public.product_models;
create trigger product_models_set_updated_at
before update on public.product_models
for each row execute function public.set_updated_at();

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
before update on public.products
for each row execute function public.set_updated_at();

alter table public.product_models enable row level security;
alter table public.products enable row level security;
alter table public.warranty_events enable row level security;

-- This v1 app reads/writes through server-side service role actions.
-- Do not expose SUPABASE_SERVICE_ROLE_KEY to the browser.
