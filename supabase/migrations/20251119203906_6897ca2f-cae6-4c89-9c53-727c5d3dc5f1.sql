-- Create function to award points when sphere reference is completed
CREATE OR REPLACE FUNCTION award_sphere_reference_points()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only when reference is marked as completed
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Award 50 points to referrer
    UPDATE professionals
    SET total_points = total_points + 50
    WHERE id = NEW.referrer_id;
    
    -- Record transaction
    INSERT INTO point_transactions (professional_id, points, reason)
    VALUES (NEW.referrer_id, 50, 'Referencia interna de esfera completada');
    
    -- Update points_awarded in reference
    NEW.points_awarded := 50;
    NEW.completed_at := NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic points
DROP TRIGGER IF EXISTS trigger_award_sphere_reference_points ON sphere_internal_references;
CREATE TRIGGER trigger_award_sphere_reference_points
  BEFORE UPDATE ON sphere_internal_references
  FOR EACH ROW
  EXECUTE FUNCTION award_sphere_reference_points();