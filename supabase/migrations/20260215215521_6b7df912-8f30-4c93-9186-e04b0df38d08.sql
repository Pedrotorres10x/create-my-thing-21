
-- Add referral_role column to specializations
ALTER TABLE specializations
ADD COLUMN referral_role text NOT NULL DEFAULT 'hybrid';

-- Classify referrers (proximity/traffic businesses)
UPDATE specializations SET referral_role = 'referrer'
WHERE name IN ('Restaurantes', 'Catering', 'Comercio Minorista', 'Actividad Física y Deporte', 'Nutrición');

-- Classify receivers (high-value services)
UPDATE specializations SET referral_role = 'receiver'
WHERE name IN ('Inmobiliaria', 'Servicios Legales', 'Consultoría Empresarial', 'Arquitectura',
  'Construcción Residencial', 'Asesoría Financiera', 'Banca y Finanzas', 'Seguros',
  'Ciberseguridad', 'Computación en la Nube', 'Desarrollo de Software', 'Automatización', 'Producción Industrial');

-- Classify hybrids
UPDATE specializations SET referral_role = 'hybrid'
WHERE name IN ('Marketing Digital', 'Diseño Gráfico', 'Redes Sociales', 'Coaching',
  'Formación Corporativa', 'Formación Online', 'Comercio Electrónico', 'Contabilidad', 'Medicina General');
