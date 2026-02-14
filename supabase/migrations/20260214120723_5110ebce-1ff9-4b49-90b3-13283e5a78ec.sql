-- Allow admins to manage thanks_sectors
CREATE POLICY "Admins can manage thanks_sectors"
ON public.thanks_sectors
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to manage thanks_category_bands
CREATE POLICY "Admins can manage thanks_category_bands"
ON public.thanks_category_bands
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to manage thanks_reputation_metrics
CREATE POLICY "Admins can manage reputation metrics"
ON public.thanks_reputation_metrics
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to manage disagreements
CREATE POLICY "Admins can resolve disagreements"
ON public.deal_disagreements
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));
