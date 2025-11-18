import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface BannerData {
  id: string;
  campaign_name: string;
  company_name: string;
  company_logo_url: string | null;
  banner_image_url: string;
  click_url: string;
  banner_size: string;
}

interface PremiumBannerProps {
  location: 'dashboard' | 'feed' | 'marketplace' | 'all';
  size: 'horizontal_large' | 'horizontal_small';
}

export const PremiumBanner = ({ location, size }: PremiumBannerProps) => {
  const { user } = useAuth();
  const [banner, setBanner] = useState<BannerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [professionalId, setProfessionalId] = useState<string | null>(null);
  const hasTrackedImpression = useRef(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const bannerRef = useRef<HTMLDivElement>(null);

  // Get professional ID
  useEffect(() => {
    const fetchProfessional = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from("professionals")
        .select("id")
        .eq("user_id", user.id)
        .single();
      
      if (data) setProfessionalId(data.id);
    };
    
    fetchProfessional();
  }, [user]);

  // Fetch banner
  useEffect(() => {
    const fetchBanner = async () => {
      try {
        setLoading(true);
        
        const { data: bannerId } = await supabase.rpc('get_next_banner_to_display', {
          _location: location
        });

        if (!bannerId) {
          setBanner(null);
          return;
        }

        const { data: bannerData, error } = await supabase
          .from("premium_ad_banners")
          .select("*")
          .eq("id", bannerId)
          .single();

        if (error) throw error;
        
        setBanner(bannerData);
        hasTrackedImpression.current = false;
      } catch (error) {
        console.error("Error fetching banner:", error);
        setBanner(null);
      } finally {
        setLoading(false);
      }
    };

    fetchBanner();

    // Rotate banner every 45 seconds
    const rotationInterval = setInterval(fetchBanner, 45000);

    return () => clearInterval(rotationInterval);
  }, [location]);

  // Track impression when banner is visible
  useEffect(() => {
    if (!banner || hasTrackedImpression.current || !bannerRef.current) return;

    const trackImpression = async () => {
      try {
        const sessionId = sessionStorage.getItem('banner_session_id') || 
          `${user?.id || 'anon'}_${Date.now()}`;
        
        if (!sessionStorage.getItem('banner_session_id')) {
          sessionStorage.setItem('banner_session_id', sessionId);
        }

        await supabase.from("banner_impressions").insert({
          banner_id: banner.id,
          professional_id: professionalId,
          page_location: location,
          session_id: sessionId
        });

        hasTrackedImpression.current = true;
      } catch (error) {
        console.error("Error tracking impression:", error);
      }
    };

    // Use Intersection Observer to track when banner is actually visible
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasTrackedImpression.current) {
            trackImpression();
          }
        });
      },
      { threshold: 0.5 } // Banner must be 50% visible
    );

    observerRef.current.observe(bannerRef.current);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [banner, professionalId, location, user]);

  // Track click
  const handleClick = async () => {
    if (!banner) return;

    try {
      const sessionId = sessionStorage.getItem('banner_session_id') || 
        `${user?.id || 'anon'}_${Date.now()}`;

      await supabase.from("banner_clicks").insert({
        banner_id: banner.id,
        professional_id: professionalId,
        page_location: location,
        session_id: sessionId
      });

      // Open link in new tab
      window.open(banner.click_url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error("Error tracking click:", error);
    }
  };

  if (loading) {
    return (
      <Card className={`${size === 'horizontal_large' ? 'h-[150px]' : 'h-[100px]'} flex items-center justify-center bg-muted/30`}>
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  if (!banner) return null;

  const heightClass = size === 'horizontal_large' 
    ? 'h-[150px] md:h-[150px]' 
    : 'h-[80px] md:h-[100px]';

  return (
    <Card 
      ref={bannerRef}
      onClick={handleClick}
      className={`${heightClass} relative overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-[1.01] group border-2 border-primary/10 bg-gradient-to-r from-background to-muted/30`}
    >
      {/* Banner Image */}
      <div className="absolute inset-0">
        <img 
          src={banner.banner_image_url} 
          alt={`Anuncio de ${banner.company_name}`}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>

      {/* Overlay on hover */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-all duration-300" />

      {/* Badge "Publicidad" */}
      <div className="absolute top-2 right-2 z-10">
        <Badge variant="secondary" className="text-xs bg-background/80 backdrop-blur-sm">
          Publicidad
        </Badge>
      </div>

      {/* Hover icon */}
      <div className="absolute bottom-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="bg-primary text-primary-foreground rounded-full p-1.5">
          <ExternalLink className="w-3 h-3" />
        </div>
      </div>
    </Card>
  );
};
