import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ExternalLink, Mail, Phone, Star, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface PremiumSlotCardProps {
  slot: {
    id: string;
    slot_number: number;
    company_name: string;
    company_logo_url: string | null;
    contact_name: string;
    contact_email: string;
    contact_phone: string;
    website_url: string | null;
    description: string;
    is_external_company: boolean;
    is_featured: boolean;
    category?: { name: string };
  };
  onView: (slotId: string, professionalId: string | null) => void;
}

export default function PremiumSlotCard({ slot, onView }: PremiumSlotCardProps) {
  const { user } = useAuth();
  const [professionalId, setProfessionalId] = useState<string | null>(null);
  const [viewCount, setViewCount] = useState<number>(0);
  const [hasViewed, setHasViewed] = useState(false);

  useEffect(() => {
    if (user) {
      fetchProfessionalId();
    }
    fetchViewCount();
  }, [user]);

  const fetchProfessionalId = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("professionals")
      .select("id")
      .eq("user_id", user.id)
      .single();
    if (data) setProfessionalId(data.id);
  };

  const fetchViewCount = async () => {
    const { count } = await supabase
      .from("premium_slot_views")
      .select("*", { count: "exact", head: true })
      .eq("slot_id", slot.id);
    if (count !== null) setViewCount(count);
  };

  const handleView = () => {
    if (!hasViewed && user) {
      onView(slot.id, professionalId);
      setHasViewed(true);
      setViewCount((prev) => prev + 1);
    }
  };

  return (
    <Card
      className={`relative overflow-hidden transition-all hover:shadow-lg ${
        slot.is_featured ? "ring-2 ring-primary" : ""
      }`}
      onMouseEnter={handleView}
    >
      {slot.is_featured && (
        <Badge className="absolute top-4 right-4 z-10 bg-primary">
          <Star className="h-3 w-3 mr-1" />
          Destacado
        </Badge>
      )}

      <CardHeader className="text-center pb-3">
        <div className="flex justify-center mb-4">
          <Avatar className="h-24 w-24 ring-4 ring-background">
            <AvatarImage src={slot.company_logo_url || ""} alt={slot.company_name} />
            <AvatarFallback className="text-2xl font-bold">
              {slot.company_name.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>
        <CardTitle className="text-xl">{slot.company_name}</CardTitle>
        <CardDescription className="flex items-center justify-center gap-2">
          {slot.is_external_company ? (
            <Badge variant="secondary">Empresa Externa</Badge>
          ) : (
            <Badge variant="outline">Miembro Premium</Badge>
          )}
          {slot.category && (
            <Badge variant="outline">{slot.category.name}</Badge>
          )}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground line-clamp-3">
          {slot.description}
        </p>

        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <a
              href={`mailto:${slot.contact_email}`}
              className="hover:underline text-primary"
            >
              {slot.contact_email}
            </a>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <a
              href={`tel:${slot.contact_phone}`}
              className="hover:underline"
            >
              {slot.contact_phone}
            </a>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Eye className="h-3 w-3" />
            <span>{viewCount} vistas</span>
          </div>
          {slot.website_url && (
            <Button variant="outline" size="sm" asChild>
              <a
                href={slot.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2"
              >
                Visitar web
                <ExternalLink className="h-3 w-3" />
              </a>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
