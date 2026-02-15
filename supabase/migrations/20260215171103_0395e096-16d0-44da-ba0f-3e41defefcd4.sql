-- Specializations: cambiar términos latinoamericanos a español de España
UPDATE public.specializations SET name = 'Formación Corporativa' WHERE id = 13 AND name = 'Capacitación Corporativa';
UPDATE public.specializations SET name = 'Comercio Electrónico' WHERE id = 21 AND name = 'E-commerce';
UPDATE public.specializations SET name = 'Comercio Minorista' WHERE id = 22 AND name = 'Retail';
UPDATE public.specializations SET name = 'Formación Online' WHERE id = 14 AND name = 'E-learning';
UPDATE public.specializations SET name = 'Banca y Finanzas' WHERE id = 25 AND name = 'Banca';

-- Profession specializations: cambiar términos
UPDATE public.profession_specializations SET name = 'Dentista' WHERE id = 2 AND name = 'Dentista / Odontólogo';
UPDATE public.profession_specializations SET name = 'Desarrollador Móvil' WHERE id = 20 AND name = 'Desarrollador Mobile';
UPDATE public.profession_specializations SET name = 'Ingeniero de Datos' WHERE id = 22 AND name = 'Data Engineer';
UPDATE public.profession_specializations SET name = 'Marketing en Redes Sociales' WHERE id = 29 AND name = 'Social Media Marketing';
UPDATE public.profession_specializations SET name = 'Marketing de Contenidos' WHERE id = 31 AND name = 'Content Marketing';
UPDATE public.profession_specializations SET name = 'Marketing de Resultados' WHERE id = 32 AND name = 'Performance Marketing';
UPDATE public.profession_specializations SET name = 'Marketing por Email' WHERE id = 30 AND name = 'Email Marketing';

-- Specialization sector "Social Media" → "Redes Sociales"
UPDATE public.specializations SET name = 'Redes Sociales' WHERE id = 18 AND name = 'Social Media';

-- "Cloud Computing" → "Computación en la Nube"
UPDATE public.specializations SET name = 'Computación en la Nube' WHERE id = 3 AND name = 'Cloud Computing';

-- "Fitness" → "Actividad Física y Deporte"  
UPDATE public.specializations SET name = 'Actividad Física y Deporte' WHERE id = 9 AND name = 'Fitness';