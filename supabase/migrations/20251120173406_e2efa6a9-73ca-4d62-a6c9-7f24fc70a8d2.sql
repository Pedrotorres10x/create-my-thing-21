-- Fix mutable search_path on database functions
-- This prevents potential privilege escalation attacks

-- Trigger functions
ALTER FUNCTION public.update_conversation_timestamp() SET search_path = public;
ALTER FUNCTION public.update_activity_tracking_timestamp() SET search_path = public;
ALTER FUNCTION public.track_post_creation() SET search_path = public;
ALTER FUNCTION public.track_comment_creation() SET search_path = public;
ALTER FUNCTION public.track_like_creation() SET search_path = public;
ALTER FUNCTION public.track_offer_contact() SET search_path = public;
ALTER FUNCTION public.track_meeting_request() SET search_path = public;
ALTER FUNCTION public.trigger_update_waitlist_positions() SET search_path = public;
ALTER FUNCTION public.trigger_update_referral_goal() SET search_path = public;
ALTER FUNCTION public.trigger_update_meeting_goal() SET search_path = public;
ALTER FUNCTION public.trigger_update_post_goal() SET search_path = public;
ALTER FUNCTION public.trigger_update_comment_goal() SET search_path = public;

-- Security definer functions (especially critical)
ALTER FUNCTION public.calculate_user_weekly_goals(uuid) SET search_path = public;
ALTER FUNCTION public.upsert_user_weekly_goals(uuid) SET search_path = public;

-- Pure/immutable function (doesn't access tables but good practice)
ALTER FUNCTION public.determine_reengagement_stage(integer, integer) SET search_path = public;