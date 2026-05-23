-- =============================================
-- REFERENCE FOODS TABLE (Ciqual 2020 - ANSES)
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

create index reference_foods_name_idx on public.reference_foods using gin(to_tsvector('french', name));

alter table public.reference_foods enable row level security;
create policy "Reference foods are publicly readable"
  on public.reference_foods for select using (true);

-- =============================================
-- DATA — Ciqual 2020 (valeurs pour 100g)
-- =============================================
insert into public.reference_foods (name, category, kcal, protein_g, carbs_g, fat_g, fiber_g) values

-- ŒUFS
('Œuf de poule entier, cru', 'Œufs', 148, 12.6, 0.7, 10.6, 0),
('Blanc d''œuf de poule, cru', 'Œufs', 45, 10.9, 0.7, 0.2, 0),
('Jaune d''œuf de poule, cru', 'Œufs', 327, 15.9, 0.5, 29.0, 0),
('Œuf de poule entier, dur', 'Œufs', 155, 13.0, 0.7, 11.3, 0),
('Œuf de poule entier, brouillé', 'Œufs', 166, 10.6, 1.3, 13.3, 0),
('Omelette nature', 'Œufs', 185, 11.4, 0.7, 15.3, 0),

-- VOLAILLES
('Poulet, blanc (filet), cru', 'Volailles', 108, 23.3, 0.0, 1.5, 0),
('Poulet, blanc (filet), cuit', 'Volailles', 148, 31.4, 0.0, 2.5, 0),
('Poulet, cuisse, cru', 'Volailles', 151, 18.4, 0.0, 8.5, 0),
('Poulet, cuisse, cuit', 'Volailles', 191, 25.9, 0.0, 9.7, 0),
('Poulet rôti (avec peau)', 'Volailles', 215, 25.6, 0.0, 12.5, 0),
('Dinde, blanc, cru', 'Volailles', 105, 24.0, 0.0, 0.8, 0),
('Dinde, blanc, cuit', 'Volailles', 147, 33.8, 0.0, 1.1, 0),
('Canard, filet, cru', 'Volailles', 131, 22.1, 0.0, 4.6, 0),

-- VIANDES BOVINES
('Bœuf, steak, cru', 'Viandes', 175, 20.7, 0.0, 10.1, 0),
('Bœuf, steak haché 5% MG, cru', 'Viandes', 121, 20.8, 0.0, 4.1, 0),
('Bœuf, steak haché 15% MG, cru', 'Viandes', 225, 17.2, 0.0, 17.2, 0),
('Bœuf, entrecôte, crue', 'Viandes', 218, 19.5, 0.0, 15.3, 0),
('Bœuf, rôti, cuit', 'Viandes', 188, 30.0, 0.0, 7.4, 0),
('Veau, escalope, crue', 'Viandes', 107, 22.3, 0.0, 1.7, 0),

-- VIANDES PORCINES
('Porc, côtelette, crue', 'Viandes', 185, 19.3, 0.0, 12.0, 0),
('Jambon cuit, dégraissé', 'Charcuterie', 97, 16.5, 1.0, 2.9, 0),
('Jambon cru, sec', 'Charcuterie', 268, 25.4, 0.4, 17.9, 0),
('Lardons fumés, cuits', 'Charcuterie', 348, 23.5, 0.4, 28.0, 0),
('Saucisse de Francfort', 'Charcuterie', 285, 12.1, 2.8, 25.1, 0),

-- POISSONS
('Saumon atlantique, cru', 'Poissons', 142, 20.4, 0.0, 6.9, 0),
('Saumon atlantique, cuit (vapeur)', 'Poissons', 182, 25.4, 0.0, 8.8, 0),
('Thon rouge, cru', 'Poissons', 144, 23.3, 0.0, 5.3, 0),
('Thon au naturel, en conserve', 'Poissons', 116, 25.5, 0.0, 1.2, 0),
('Cabillaud, cru', 'Poissons', 82, 18.3, 0.0, 0.7, 0),
('Cabillaud, cuit (vapeur)', 'Poissons', 96, 21.4, 0.0, 0.7, 0),
('Sardine à l''huile, en conserve', 'Poissons', 208, 24.6, 0.5, 11.9, 0),
('Maquereau, cru', 'Poissons', 205, 18.7, 0.0, 14.4, 0),
('Tilapia, cru', 'Poissons', 96, 20.1, 0.0, 1.7, 0),
('Crevettes cuites', 'Fruits de mer', 99, 20.9, 0.4, 1.4, 0),

-- PRODUITS LAITIERS
('Lait entier', 'Produits laitiers', 65, 3.2, 4.7, 3.6, 0),
('Lait demi-écrémé', 'Produits laitiers', 46, 3.2, 4.8, 1.5, 0),
('Lait écrémé', 'Produits laitiers', 33, 3.3, 4.8, 0.1, 0),
('Yaourt nature entier', 'Produits laitiers', 61, 3.7, 4.8, 2.9, 0),
('Yaourt nature 0%', 'Produits laitiers', 43, 4.4, 5.1, 0.2, 0),
('Fromage blanc nature 3%', 'Produits laitiers', 58, 7.4, 3.8, 1.3, 0),
('Fromage blanc nature 0%', 'Produits laitiers', 45, 7.7, 4.1, 0.2, 0),
('Skyr nature', 'Produits laitiers', 63, 11.0, 4.0, 0.2, 0),
('Crème fraîche épaisse 30% MG', 'Produits laitiers', 292, 2.3, 2.9, 30.0, 0),
('Beurre doux', 'Matières grasses', 751, 0.7, 0.5, 82.1, 0),
('Emmental', 'Fromages', 403, 28.8, 0.3, 31.9, 0),
('Gruyère', 'Fromages', 415, 29.8, 0.4, 32.9, 0),
('Camembert', 'Fromages', 264, 19.8, 0.5, 20.3, 0),
('Chèvre frais', 'Fromages', 230, 13.8, 2.5, 18.5, 0),
('Mozzarella', 'Fromages', 253, 18.9, 2.2, 19.1, 0),
('Parmesan', 'Fromages', 441, 38.5, 0.0, 31.4, 0),
('Ricotta', 'Fromages', 146, 8.8, 3.5, 10.4, 0),
('Fromage cottage', 'Fromages', 98, 11.1, 3.4, 4.3, 0),

-- CÉRÉALES & FÉCULENTS
('Riz blanc, cuit', 'Féculents', 130, 2.7, 28.7, 0.2, 0.4),
('Riz complet, cuit', 'Féculents', 120, 2.6, 25.1, 0.9, 1.6),
('Pâtes, cuites', 'Féculents', 124, 4.3, 24.9, 0.7, 1.5),
('Pâtes complètes, cuites', 'Féculents', 118, 4.8, 22.8, 0.8, 2.8),
('Flocons d''avoine', 'Céréales', 372, 13.5, 60.4, 7.4, 9.7),
('Pain blanc (baguette)', 'Pain', 269, 8.5, 55.7, 1.4, 2.7),
('Pain de mie', 'Pain', 265, 8.3, 50.2, 3.8, 2.4),
('Pain complet', 'Pain', 228, 9.5, 41.3, 2.5, 6.5),
('Pain de seigle', 'Pain', 216, 7.6, 41.0, 1.7, 6.2),
('Biscottes', 'Pain', 393, 12.0, 73.7, 6.6, 4.8),
('Farine de blé T55', 'Farines', 341, 10.3, 71.0, 1.1, 2.7),
('Quinoa, cuit', 'Féculents', 120, 4.4, 21.3, 1.9, 2.8),
('Lentilles, cuites', 'Légumineuses', 116, 9.0, 20.1, 0.4, 7.0),
('Pois chiches, cuits', 'Légumineuses', 164, 8.9, 27.4, 2.6, 7.6),
('Haricots rouges, cuits', 'Légumineuses', 127, 8.7, 22.8, 0.5, 6.8),
('Haricots blancs, cuits', 'Légumineuses', 118, 8.0, 21.3, 0.6, 6.3),
('Pomme de terre, cuite à l''eau', 'Féculents', 80, 2.0, 18.0, 0.1, 1.5),
('Pomme de terre, en purée', 'Féculents', 74, 1.9, 14.3, 1.4, 1.7),
('Patate douce, cuite', 'Féculents', 90, 1.7, 20.7, 0.1, 2.5),
('Semoule de blé, cuite', 'Féculents', 113, 3.8, 23.5, 0.2, 1.2),

-- LÉGUMES
('Tomate, crue', 'Légumes', 18, 0.9, 3.2, 0.2, 1.2),
('Carotte, crue', 'Légumes', 35, 0.8, 7.3, 0.2, 2.8),
('Carotte, cuite', 'Légumes', 27, 0.7, 5.4, 0.2, 2.5),
('Concombre, cru', 'Légumes', 12, 0.6, 1.9, 0.1, 0.5),
('Courgette, crue', 'Légumes', 17, 1.3, 2.5, 0.1, 1.0),
('Courgette, cuite', 'Légumes', 22, 1.4, 3.5, 0.3, 1.2),
('Poivron rouge, cru', 'Légumes', 27, 1.0, 5.3, 0.2, 2.1),
('Brocoli, cru', 'Légumes', 34, 2.8, 5.2, 0.4, 2.6),
('Brocoli, cuit', 'Légumes', 29, 3.3, 2.3, 0.5, 3.0),
('Épinards, cuits', 'Légumes', 24, 2.7, 1.7, 0.5, 2.1),
('Épinards, crus', 'Légumes', 23, 2.9, 1.6, 0.4, 2.2),
('Salade verte (laitue)', 'Légumes', 14, 1.3, 1.6, 0.2, 1.3),
('Champignon de Paris, cru', 'Légumes', 25, 3.1, 0.6, 0.3, 1.3),
('Oignon, cru', 'Légumes', 40, 1.1, 8.7, 0.1, 1.6),
('Ail, cru', 'Légumes', 135, 5.3, 28.4, 0.1, 2.1),
('Poireau, cuit', 'Légumes', 27, 1.5, 4.5, 0.3, 2.2),
('Aubergine, cuite', 'Légumes', 26, 0.8, 5.6, 0.2, 2.2),
('Avocat', 'Légumes', 160, 2.0, 0.9, 15.3, 6.7),
('Céleri branche, cru', 'Légumes', 17, 0.7, 3.1, 0.1, 1.5),
('Chou-fleur, cuit', 'Légumes', 25, 1.8, 4.0, 0.2, 2.3),
('Chou vert, cru', 'Légumes', 26, 1.8, 4.5, 0.2, 2.5),
('Haricots verts, cuits', 'Légumes', 30, 2.0, 5.0, 0.3, 3.5),
('Petits pois, cuits', 'Légumes', 84, 5.4, 14.4, 0.4, 5.5),
('Maïs doux, en conserve', 'Légumes', 83, 2.8, 17.0, 1.2, 2.7),

-- FRUITS
('Pomme, crue', 'Fruits', 52, 0.3, 12.7, 0.2, 2.4),
('Banane, crue', 'Fruits', 89, 1.1, 22.1, 0.2, 2.6),
('Orange, crue', 'Fruits', 44, 1.1, 9.5, 0.1, 2.2),
('Fraise, crue', 'Fruits', 32, 0.8, 6.8, 0.4, 2.0),
('Raisin, cru', 'Fruits', 69, 0.7, 16.3, 0.2, 1.0),
('Poire, crue', 'Fruits', 51, 0.4, 11.9, 0.2, 3.1),
('Pêche, crue', 'Fruits', 39, 0.9, 8.7, 0.1, 1.5),
('Mangue, crue', 'Fruits', 60, 0.8, 13.8, 0.2, 1.8),
('Ananas, cru', 'Fruits', 50, 0.5, 11.8, 0.1, 1.4),
('Myrtilles, crues', 'Fruits', 57, 0.7, 13.2, 0.3, 2.4),
('Framboises, crues', 'Fruits', 52, 1.2, 11.9, 0.7, 6.5),
('Kiwi, cru', 'Fruits', 61, 1.1, 13.0, 0.6, 3.0),
('Citron, cru', 'Fruits', 29, 1.1, 5.4, 0.3, 2.8),
('Melon, cru', 'Fruits', 34, 0.8, 7.4, 0.1, 0.9),
('Pastèque, crue', 'Fruits', 30, 0.6, 6.8, 0.2, 0.4),

-- MATIÈRES GRASSES & HUILES
('Huile d''olive', 'Matières grasses', 900, 0.0, 0.0, 99.9, 0),
('Huile de colza', 'Matières grasses', 900, 0.0, 0.0, 99.9, 0),
('Huile de tournesol', 'Matières grasses', 900, 0.0, 0.0, 99.9, 0),
('Margarine', 'Matières grasses', 740, 0.2, 0.5, 81.0, 0),
('Crème liquide entière 30%', 'Matières grasses', 300, 2.2, 3.0, 30.0, 0),

-- PROTÉINES & COMPLÉMENTS
('Protéines de lactosérum (whey), poudre', 'Compléments', 380, 75.0, 7.5, 6.0, 0),
('Caséine, poudre', 'Compléments', 358, 80.0, 4.0, 2.0, 0),
('Tofu nature', 'Végétal', 76, 8.1, 1.9, 4.2, 0),
('Tempeh', 'Végétal', 195, 19.0, 9.4, 11.0, 0),
('Edamame, cuit', 'Végétal', 122, 11.9, 8.9, 5.2, 5.2),

-- NOIX & GRAINES
('Amandes', 'Oléagineux', 601, 21.2, 6.1, 53.4, 12.2),
('Noix', 'Oléagineux', 654, 15.2, 3.3, 65.2, 6.7),
('Cacahuètes / arachides', 'Oléagineux', 585, 25.8, 10.6, 47.5, 8.0),
('Noisettes', 'Oléagineux', 656, 15.0, 6.3, 63.5, 9.4),
('Graines de chia', 'Oléagineux', 486, 16.5, 42.1, 30.7, 34.4),
('Graines de lin', 'Oléagineux', 534, 18.3, 28.9, 42.2, 27.3),
('Beurre de cacahuète', 'Oléagineux', 614, 24.1, 16.1, 51.1, 6.0),
('Graines de tournesol', 'Oléagineux', 584, 20.8, 11.4, 51.5, 8.6),

-- SUCRES & CONFISERIES
('Sucre blanc', 'Sucres', 400, 0.0, 100.0, 0.0, 0),
('Miel', 'Sucres', 304, 0.4, 80.3, 0.0, 0.2),
('Confiture (moyenne)', 'Sucres', 250, 0.6, 64.0, 0.1, 1.2),
('Chocolat noir 70%', 'Confiseries', 560, 8.5, 43.2, 42.6, 10.9),
('Chocolat au lait', 'Confiseries', 540, 7.7, 57.9, 31.3, 3.4),
('Nutella / pâte à tartiner', 'Confiseries', 541, 6.3, 57.5, 30.9, 3.4),

-- BOISSONS
('Jus d''orange, sans sucre ajouté', 'Boissons', 44, 0.6, 10.1, 0.1, 0.2),
('Café, préparé', 'Boissons', 2, 0.3, 0.0, 0.0, 0),
('Thé, infusé', 'Boissons', 1, 0.1, 0.0, 0.0, 0),

-- PLATS & DIVERS
('Soupe de légumes', 'Plats', 30, 1.5, 5.5, 0.5, 1.5),
('Riz au lait', 'Desserts', 102, 3.2, 17.0, 2.8, 0.1),
('Sauces tomate, en conserve', 'Condiments', 35, 1.5, 7.0, 0.3, 1.5);
