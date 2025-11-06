import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Plus, Search, Store, Eye, MapPin, Tag, Euro, Trash2 } from "lucide-react";
import { CreateOfferDialog } from "@/components/marketplace/CreateOfferDialog";
import { OfferDetailsDialog } from "@/components/marketplace/OfferDetailsDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Category {
  id: number;
  name: string;
  description: string | null;
}

interface Offer {
  id: string;
  title: string;
  description: string;
  price_type: string;
  price_amount: number | null;
  contact_preference: string;
  created_at: string;
  is_active: boolean;
  professionals: {
    id: string;
    full_name: string;
    photo_url: string | null;
    company_name: string | null;
    position: string | null;
    email: string;
    phone: string | null;
    city: string;
    state: string;
  };
  offer_categories: {
    name: string;
  };
}

const Marketplace = () => {
  const { user } = useAuth();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [myOffers, setMyOffers] = useState<Offer[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [currentProfessional, setCurrentProfessional] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [offerToDelete, setOfferToDelete] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchCurrentProfessional();
      fetchCategories();
      fetchOffers();
    }
  }, [user]);

  const fetchCurrentProfessional = async () => {
    const { data } = await supabase
      .from("professionals")
      .select("*")
      .eq("user_id", user?.id)
      .single();
    setCurrentProfessional(data);
  };

  const fetchCategories = async () => {
    const { data } = await supabase
      .from("offer_categories")
      .select("*")
      .order("name");
    setCategories(data || []);
  };

  const fetchOffers = async () => {
    // Fetch all offers
    const { data: allOffers } = await supabase
      .from("offers")
      .select(`
        *,
        professionals (
          id, full_name, photo_url, company_name, position, email, phone, city, state
        ),
        offer_categories (name)
      `)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    setOffers(allOffers || []);

    // Fetch my offers
    if (currentProfessional) {
      const { data: myOffersData } = await supabase
        .from("offers")
        .select(`
          *,
          professionals (
            id, full_name, photo_url, company_name, position, email, phone, city, state
          ),
          offer_categories (name)
        `)
        .eq("professional_id", currentProfessional.id)
        .order("created_at", { ascending: false });

      setMyOffers(myOffersData || []);
    }
  };

  const handleViewOffer = (offer: Offer) => {
    setSelectedOffer(offer);
    setDetailsDialogOpen(true);
  };

  const handleDeleteOffer = async () => {
    if (!offerToDelete) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("offers")
        .delete()
        .eq("id", offerToDelete);

      if (error) throw error;

      toast.success("Oferta eliminada");
      fetchOffers();
      setOfferToDelete(null);
    } catch (error: any) {
      toast.error(error.message || "Error al eliminar la oferta");
    } finally {
      setLoading(false);
    }
  };

  const getPriceDisplay = (offer: Offer) => {
    switch (offer.price_type) {
      case "fixed":
        return `€${offer.price_amount?.toFixed(2)}`;
      case "hourly":
        return `€${offer.price_amount?.toFixed(2)}/h`;
      case "project":
        return `€${offer.price_amount?.toFixed(2)}/proyecto`;
      case "free":
        return "Gratis";
      case "negotiable":
        return "A negociar";
      default:
        return "";
    }
  };

  const filteredOffers = offers.filter((offer) => {
    const matchesSearch =
      offer.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      offer.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      offer.professionals.full_name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory =
      selectedCategory === "all" ||
      categories.find((c) => c.id.toString() === selectedCategory)?.name ===
        offer.offer_categories.name;

    return matchesSearch && matchesCategory;
  });

  const OfferCard = ({ offer, showActions = false }: { offer: Offer; showActions?: boolean }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <CardTitle className="text-lg line-clamp-2">{offer.title}</CardTitle>
            <CardDescription className="line-clamp-2 mt-2">
              {offer.description}
            </CardDescription>
          </div>
          <Badge variant="secondary">{offer.offer_categories.name}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={offer.professionals.photo_url || ""} />
            <AvatarFallback>
              {offer.professionals.full_name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">
              {offer.professionals.full_name}
            </p>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {offer.professionals.city}, {offer.professionals.state}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-2 text-primary font-semibold">
            <Euro className="h-4 w-4" />
            {getPriceDisplay(offer)}
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleViewOffer(offer)}
            >
              <Eye className="h-4 w-4 mr-1" />
              Ver Detalles
            </Button>
            {showActions && (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setOfferToDelete(offer.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Marketplace</h1>
          <p className="text-muted-foreground">
            Ofertas y servicios de la comunidad
          </p>
        </div>
        {currentProfessional?.status === "approved" && (
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Publicar Oferta
          </Button>
        )}
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">
            <Store className="h-4 w-4 mr-2" />
            Todas las Ofertas
          </TabsTrigger>
          <TabsTrigger value="mine">Mis Ofertas</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar ofertas, servicios o profesionales..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="w-full md:w-64">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="all">Todas las categorías</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id.toString()}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {filteredOffers.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Store className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {searchTerm || selectedCategory !== "all"
                    ? "No se encontraron ofertas con los filtros seleccionados"
                    : "No hay ofertas disponibles aún"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredOffers.map((offer) => (
                <OfferCard key={offer.id} offer={offer} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="mine" className="space-y-4">
          {myOffers.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Store className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">
                  Aún no has publicado ninguna oferta
                </p>
                {currentProfessional?.status === "approved" && (
                  <Button onClick={() => setCreateDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Publicar Mi Primera Oferta
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {myOffers.map((offer) => (
                <OfferCard key={offer.id} offer={offer} showActions />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <CreateOfferDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        professionalId={currentProfessional?.id}
        categories={categories}
        onSuccess={fetchOffers}
      />

      <OfferDetailsDialog
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
        offer={selectedOffer}
        currentProfessionalId={currentProfessional?.id}
      />

      <AlertDialog open={!!offerToDelete} onOpenChange={() => setOfferToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar oferta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La oferta será eliminada permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteOffer} disabled={loading}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Marketplace;
