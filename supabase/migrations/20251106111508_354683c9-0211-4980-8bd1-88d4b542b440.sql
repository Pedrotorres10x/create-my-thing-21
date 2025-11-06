-- Create sector catalog table
CREATE TABLE sector_catalog (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create specializations table
CREATE TABLE specializations (
  id SERIAL PRIMARY KEY,
  sector_id INTEGER REFERENCES sector_catalog(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE sector_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE specializations ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Anyone can view sectors"
  ON sector_catalog FOR SELECT
  USING (true);

CREATE POLICY "Anyone can view specializations"
  ON specializations FOR SELECT
  USING (true);

-- Insert sectors
INSERT INTO sector_catalog (id, name, description) VALUES
(1, 'Tecnología', 'Software, hardware, IT y telecomunicaciones'),
(2, 'Servicios Profesionales', 'Consultoría, legal, contable'),
(3, 'Salud y Bienestar', 'Medicina, fitness, nutrición'),
(4, 'Construcción e Inmobiliaria', 'Construcción, arquitectura, bienes raíces'),
(5, 'Educación', 'Capacitación, e-learning'),
(6, 'Marketing y Publicidad', 'Agencias creativas, marketing digital'),
(7, 'Manufactura', 'Producción industrial'),
(8, 'Retail y Comercio', 'Tiendas, e-commerce'),
(9, 'Alimentación', 'Restaurantes, catering'),
(10, 'Finanzas y Seguros', 'Banca, seguros, inversiones');

-- Insert specializations
INSERT INTO specializations (sector_id, name) VALUES
(1, 'Desarrollo de Software'),
(1, 'Ciberseguridad'),
(1, 'Cloud Computing'),
(2, 'Consultoría Empresarial'),
(2, 'Servicios Legales'),
(2, 'Contabilidad'),
(3, 'Medicina General'),
(3, 'Nutrición'),
(3, 'Fitness'),
(4, 'Construcción Residencial'),
(4, 'Arquitectura'),
(4, 'Bienes Raíces'),
(5, 'Capacitación Corporativa'),
(5, 'E-learning'),
(5, 'Coaching'),
(6, 'Marketing Digital'),
(6, 'Diseño Gráfico'),
(6, 'Social Media'),
(7, 'Producción Industrial'),
(7, 'Automatización'),
(8, 'E-commerce'),
(8, 'Retail'),
(9, 'Restaurantes'),
(9, 'Catering'),
(10, 'Banca'),
(10, 'Seguros'),
(10, 'Asesoría Financiera');