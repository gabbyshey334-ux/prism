create table if not exists brands (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  description text,
  website_url text,
  primary_color text,
  created_at timestamp with time zone default now()
);

create table if not exists content (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  ai_generated_title text,
  original_input text,
  status text default 'draft',
  tags text[],
  ai_generated_category text,
  created_date timestamp with time zone default now()
);

create table if not exists social_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  brand_id uuid,
  platform text not null,
  account_name text,
  created_at timestamp with time zone default now()
);

create table if not exists oauth_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  brand_id uuid,
  platform text not null,
  access_token text,
  refresh_token text,
  expires_in integer,
  created_at timestamp with time zone default now()
);

create table if not exists uploads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  brand_id uuid,
  storage_path text not null,
  mime_type text,
  created_at timestamp with time zone default now()
);

create table if not exists templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  data jsonb,
  created_at timestamp with time zone default now()
);

create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  brand_id uuid,
  platform text not null,
  content_id uuid,
  status text default 'queued',
  scheduled_at timestamp with time zone,
  posted_at timestamp with time zone,
  created_at timestamp with time zone default now()
);