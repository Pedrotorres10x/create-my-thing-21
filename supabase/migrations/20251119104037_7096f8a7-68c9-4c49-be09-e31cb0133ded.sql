-- Update subscription plan names to more casual/friendly names
UPDATE subscription_plans 
SET name = 'Free',
    description = 'Empieza sin compromiso, explora el networking'
WHERE slug = 'free';

UPDATE subscription_plans 
SET name = 'Local Pro',
    description = 'Tu provincia entera a un clic'
WHERE slug = 'provincial';

UPDATE subscription_plans 
SET name = 'Regional Boss',
    description = 'Domina tu comunidad, expande tu red'
WHERE slug = 'regional';

UPDATE subscription_plans 
SET name = 'Todoterreno',
    description = 'España entera es tu playground'
WHERE slug = 'national';