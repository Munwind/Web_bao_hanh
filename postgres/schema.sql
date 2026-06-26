create extension if not exists "pgcrypto";

create table if not exists product_models (
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

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  model_id uuid references product_models(id) on delete set null,
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

create table if not exists warranty_events (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  event_type text not null check (event_type in ('activated', 'manual_use', 'note')),
  note text,
  created_at timestamptz not null default now()
);

create index if not exists products_qr_code_idx on products (qr_code);
create index if not exists products_sku_idx on products (sku);
create index if not exists products_model_id_idx on products (model_id);
create index if not exists product_models_code_idx on product_models (code);
create index if not exists warranty_events_product_id_idx on warranty_events (product_id, created_at desc);

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists product_models_set_updated_at on product_models;
create trigger product_models_set_updated_at
before update on product_models
for each row execute function set_updated_at();

drop trigger if exists products_set_updated_at on products;
create trigger products_set_updated_at
before update on products
for each row execute function set_updated_at();
