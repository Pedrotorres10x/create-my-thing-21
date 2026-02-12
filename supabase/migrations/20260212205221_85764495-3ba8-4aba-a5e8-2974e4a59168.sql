
-- Allow ethics committee members to create penalties
CREATE POLICY "Ethics committee can create penalties"
  ON public.user_penalties FOR INSERT
  WITH CHECK (
    is_ethics_committee_member((
      SELECT id FROM professionals WHERE user_id = auth.uid()
    ))
  );

-- Allow ethics committee to insert point transactions for sanctions
CREATE POLICY "Ethics committee can insert point transactions"
  ON public.point_transactions FOR INSERT
  WITH CHECK (
    is_ethics_committee_member((
      SELECT id FROM professionals WHERE user_id = auth.uid()
    ))
  );

-- Allow ethics committee to update professional points for sanctions
CREATE POLICY "Ethics committee can update professional points"
  ON public.professionals FOR UPDATE
  USING (
    is_ethics_committee_member((
      SELECT id FROM professionals p2 WHERE p2.user_id = auth.uid()
    ))
  );
