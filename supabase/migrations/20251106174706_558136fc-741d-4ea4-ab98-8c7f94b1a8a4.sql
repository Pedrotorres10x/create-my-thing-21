-- Create offer_categories table
CREATE TABLE IF NOT EXISTS public.offer_categories (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default categories
INSERT INTO public.offer_categories (name, description) VALUES
  ('Servicios Profesionales', 'Consultoría, asesoría y servicios especializados'),
  ('Marketing y Publicidad', 'Servicios de marketing digital, branding y publicidad'),
  ('Tecnología', 'Desarrollo web, apps, software y servicios IT'),
  ('Formación', 'Cursos, talleres y capacitación profesional'),
  ('Diseño', 'Diseño gráfico, web, industrial y creativo'),
  ('Legal', 'Servicios legales y jurídicos'),
  ('Financiero', 'Contabilidad, finanzas e inversiones'),
  ('Recursos Humanos', 'Reclutamiento, capacitación y gestión de personal'),
  ('Inmobiliario', 'Bienes raíces y gestión de propiedades'),
  ('Salud y Bienestar', 'Servicios de salud, coaching y bienestar'),
  ('Otros', 'Otros servicios y ofertas');

-- Create offers table
CREATE TABLE IF NOT EXISTS public.offers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  professional_id UUID NOT NULL,
  category_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  price_type TEXT NOT NULL CHECK (price_type IN ('fixed', 'hourly', 'project', 'free', 'negotiable')),
  price_amount DECIMAL(10, 2),
  image_url TEXT,
  contact_preference TEXT NOT NULL CHECK (contact_preference IN ('email', 'phone', 'whatsapp', 'all')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  views_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT offers_professional_id_fkey FOREIGN KEY (professional_id) 
    REFERENCES public.professionals(id) ON DELETE CASCADE,
  CONSTRAINT offers_category_id_fkey FOREIGN KEY (category_id) 
    REFERENCES public.offer_categories(id) ON DELETE RESTRICT
);

-- Create offer_contacts table for tracking interest
CREATE TABLE IF NOT EXISTS public.offer_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  offer_id UUID NOT NULL,
  interested_professional_id UUID NOT NULL,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'closed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT offer_contacts_offer_id_fkey FOREIGN KEY (offer_id) 
    REFERENCES public.offers(id) ON DELETE CASCADE,
  CONSTRAINT offer_contacts_interested_professional_id_fkey FOREIGN KEY (interested_professional_id) 
    REFERENCES public.professionals(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.offer_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offer_contacts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for offer_categories
CREATE POLICY "Anyone can view categories"
  ON public.offer_categories FOR SELECT
  USING (true);

-- RLS Policies for offers
CREATE POLICY "Anyone can view active offers from approved professionals"
  ON public.offers FOR SELECT
  USING (
    is_active = true AND
    EXISTS (
      SELECT 1 FROM professionals 
      WHERE professionals.id = offers.professional_id 
      AND professionals.status = 'approved'
    )
  );

CREATE POLICY "Approved users can create offers"
  ON public.offers FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM professionals 
      WHERE professionals.id = offers.professional_id 
      AND professionals.user_id = auth.uid()
      AND professionals.status = 'approved'
    )
  );

CREATE POLICY "Users can update their own offers"
  ON public.offers FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM professionals 
      WHERE professionals.id = offers.professional_id 
      AND professionals.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own offers"
  ON public.offers FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM professionals 
      WHERE professionals.id = offers.professional_id 
      AND professionals.user_id = auth.uid()
    )
  );

-- RLS Policies for offer_contacts
CREATE POLICY "Users can view contacts for their own offers"
  ON public.offer_contacts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM offers o
      JOIN professionals p ON p.id = o.professional_id
      WHERE o.id = offer_contacts.offer_id
      AND p.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM professionals
      WHERE professionals.id = offer_contacts.interested_professional_id
      AND professionals.user_id = auth.uid()
    )
  );

CREATE POLICY "Approved users can create contact requests"
  ON public.offer_contacts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM professionals 
      WHERE professionals.id = offer_contacts.interested_professional_id 
      AND professionals.user_id = auth.uid()
      AND professionals.status = 'approved'
    )
  );

CREATE POLICY "Users can update their own contact requests"
  ON public.offer_contacts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM professionals
      WHERE professionals.id = offer_contacts.interested_professional_id
      AND professionals.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM offers o
      JOIN professionals p ON p.id = o.professional_id
      WHERE o.id = offer_contacts.offer_id
      AND p.user_id = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX idx_offers_professional_id ON public.offers(professional_id);
CREATE INDEX idx_offers_category_id ON public.offers(category_id);
CREATE INDEX idx_offers_is_active ON public.offers(is_active);
CREATE INDEX idx_offers_created_at ON public.offers(created_at DESC);
CREATE INDEX idx_offer_contacts_offer_id ON public.offer_contacts(offer_id);
CREATE INDEX idx_offer_contacts_interested_professional_id ON public.offer_contacts(interested_professional_id);

-- Trigger for updating offers updated_at
CREATE TRIGGER update_offers_updated_at
  BEFORE UPDATE ON public.offers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();