-- Partage des aliments personnalisés entre tous les utilisateurs
-- 1. Ajoute creator_name pour afficher le prénom du créateur
-- 2. Remplace la policy SELECT restrictive par une policy ouverte à tous les users connectés

ALTER TABLE public.custom_foods
  ADD COLUMN IF NOT EXISTS creator_name text;

-- Supprime l'ancienne policy SELECT (propriétaire uniquement)
DROP POLICY IF EXISTS "Users can view their own custom foods" ON public.custom_foods;

-- Tous les utilisateurs connectés peuvent voir tous les aliments perso
CREATE POLICY "Authenticated users can view all custom foods"
  ON public.custom_foods FOR SELECT
  TO authenticated
  USING (true);
