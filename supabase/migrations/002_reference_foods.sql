-- =============================================
-- REFERENCE FOODS TABLE (Ciqual — ANSES)
-- Data populated by 004_ciqual_2025_full.sql
-- =============================================
create table if not exists public.reference_foods (
  id        serial primary key,
  name      text not null,
  category  text,
  kcal      numeric(8,2) not null,
  protein_g numeric(8,2) not null default 0,
  carbs_g   numeric(8,2) not null default 0,
  fat_g     numeric(8,2) not null default 0,
  fiber_g   numeric(8,2)
);

create index if not exists reference_foods_name_idx on public.reference_foods using gin(to_tsvector('french', name));

alter table public.reference_foods enable row level security;
create policy "Reference foods are publicly readable"
  on public.reference_foods for select using (true);
