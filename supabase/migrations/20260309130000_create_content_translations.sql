-- Create content_translations table to store AI translations
create table if not exists "public"."content_translations" (
    "id" uuid not null default gen_random_uuid(),
    "tmdb_id" int4 not null,
    "media_type" text not null,
    "title_ar" text,
    "overview_ar" text,
    "title_en" text,
    "overview_en" text,
    "created_at" timestamptz default now(),
    primary key ("id"),
    unique ("tmdb_id", "media_type")
);

-- Enable RLS
alter table "public"."content_translations" enable row level security;

-- Policy: Allow read access for all
create policy "Enable read access for all users"
on "public"."content_translations"
for select
using (true);

-- Policy: Allow insert for authenticated users (or anon if needed for auto-translation)
-- We'll allow anon for now to support the client-side translation flow
create policy "Enable insert for all users"
on "public"."content_translations"
for insert
with check (true);

-- Policy: Allow update for all users
create policy "Enable update for all users"
on "public"."content_translations"
for update
using (true);
