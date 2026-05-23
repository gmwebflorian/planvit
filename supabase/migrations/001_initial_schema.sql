-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- =============================================
-- PROFILES TABLE
-- =============================================
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  full_name text,
  avatar_url text,
  sex text check (sex in ('male', 'female')),
  birth_date date,
  height_cm numeric(5, 1),
  weight_kg numeric(5, 2),
  goal_calories integer,
  goal_protein_g integer,
  goal_carbs_g integer,
  goal_fat_g integer,
  strava_athlete_id bigint,
  strava_access_token text,
  strava_refresh_token text,
  strava_token_expires_at timestamptz,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- RLS for profiles
alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- =============================================
-- CUSTOM FOODS TABLE
-- =============================================
create table if not exists public.custom_foods (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  brand text,
  calories_per_100g numeric(8, 2) not null,
  protein_per_100g numeric(8, 2) not null default 0,
  carbs_per_100g numeric(8, 2) not null default 0,
  fat_per_100g numeric(8, 2) not null default 0,
  fiber_per_100g numeric(8, 2),
  serving_size_g numeric(8, 2),
  barcode text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- RLS for custom_foods
alter table public.custom_foods enable row level security;

create policy "Users can view their own custom foods"
  on public.custom_foods for select
  using (auth.uid() = user_id);

create policy "Users can insert their own custom foods"
  on public.custom_foods for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own custom foods"
  on public.custom_foods for update
  using (auth.uid() = user_id);

create policy "Users can delete their own custom foods"
  on public.custom_foods for delete
  using (auth.uid() = user_id);

-- =============================================
-- FOOD ENTRIES TABLE
-- =============================================
create table if not exists public.food_entries (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  date date not null,
  meal_type text not null check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  food_name text not null,
  quantity_g numeric(8, 2) not null,
  calories numeric(8, 2) not null,
  protein_g numeric(8, 2) not null default 0,
  carbs_g numeric(8, 2) not null default 0,
  fat_g numeric(8, 2) not null default 0,
  fiber_g numeric(8, 2),
  custom_food_id uuid references public.custom_foods(id) on delete set null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Index for quick date-based queries
create index food_entries_user_date_idx on public.food_entries (user_id, date);

-- RLS for food_entries
alter table public.food_entries enable row level security;

create policy "Users can view their own food entries"
  on public.food_entries for select
  using (auth.uid() = user_id);

create policy "Users can insert their own food entries"
  on public.food_entries for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own food entries"
  on public.food_entries for update
  using (auth.uid() = user_id);

create policy "Users can delete their own food entries"
  on public.food_entries for delete
  using (auth.uid() = user_id);

-- =============================================
-- DAILY SUMMARIES TABLE
-- =============================================
create table if not exists public.daily_summaries (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  date date not null,
  total_calories numeric(8, 2) not null default 0,
  total_protein_g numeric(8, 2) not null default 0,
  total_carbs_g numeric(8, 2) not null default 0,
  total_fat_g numeric(8, 2) not null default 0,
  total_fiber_g numeric(8, 2) not null default 0,
  calories_burned numeric(8, 2) not null default 0,
  net_calories numeric(8, 2) not null default 0,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique (user_id, date)
);

-- Index for quick date-based queries
create index daily_summaries_user_date_idx on public.daily_summaries (user_id, date);

-- RLS for daily_summaries
alter table public.daily_summaries enable row level security;

create policy "Users can view their own daily summaries"
  on public.daily_summaries for select
  using (auth.uid() = user_id);

create policy "Users can insert their own daily summaries"
  on public.daily_summaries for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own daily summaries"
  on public.daily_summaries for update
  using (auth.uid() = user_id);

-- =============================================
-- STRAVA ACTIVITIES TABLE
-- =============================================
create table if not exists public.strava_activities (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  strava_activity_id bigint not null,
  name text not null,
  sport_type text not null,
  start_date timestamptz not null,
  elapsed_time_s integer not null,
  moving_time_s integer not null,
  distance_m numeric(10, 2),
  total_elevation_gain_m numeric(8, 2),
  average_heartrate numeric(6, 2),
  max_heartrate numeric(6, 2),
  calories numeric(8, 2),
  average_watts numeric(8, 2),
  kilojoules numeric(10, 2),
  raw_data jsonb,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique (user_id, strava_activity_id)
);

-- Index for quick date-based queries
create index strava_activities_user_date_idx on public.strava_activities (user_id, start_date);

-- RLS for strava_activities
alter table public.strava_activities enable row level security;

create policy "Users can view their own strava activities"
  on public.strava_activities for select
  using (auth.uid() = user_id);

create policy "Users can insert their own strava activities"
  on public.strava_activities for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own strava activities"
  on public.strava_activities for update
  using (auth.uid() = user_id);

create policy "Users can delete their own strava activities"
  on public.strava_activities for delete
  using (auth.uid() = user_id);

-- =============================================
-- AUTOMATIC updated_at TRIGGER
-- =============================================
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

create trigger set_custom_foods_updated_at
  before update on public.custom_foods
  for each row execute function public.handle_updated_at();

create trigger set_food_entries_updated_at
  before update on public.food_entries
  for each row execute function public.handle_updated_at();

create trigger set_daily_summaries_updated_at
  before update on public.daily_summaries
  for each row execute function public.handle_updated_at();

create trigger set_strava_activities_updated_at
  before update on public.strava_activities
  for each row execute function public.handle_updated_at();

-- =============================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- =============================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
