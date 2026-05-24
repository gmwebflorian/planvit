-- Table des favoris — un favori = un aliment qu'on veut retrouver rapidement
CREATE TABLE IF NOT EXISTS public.favorites (
  id              uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id         uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  food_name       text NOT NULL,
  calories_per_100g numeric(8,2) NOT NULL,
  protein_per_100g  numeric(8,2) NOT NULL DEFAULT 0,
  carbs_per_100g    numeric(8,2) NOT NULL DEFAULT 0,
  fat_per_100g      numeric(8,2) NOT NULL DEFAULT 0,
  brand           text,
  source          text,        -- 'ciqual' | 'off' | 'custom' | null
  custom_label    text,        -- prénom du créateur pour les aliments custom
  created_at      timestamptz DEFAULT now() NOT NULL,
  UNIQUE (user_id, food_name)
);

ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own favorites"
  ON public.favorites FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own favorites"
  ON public.favorites FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own favorites"
  ON public.favorites FOR DELETE USING (auth.uid() = user_id);
