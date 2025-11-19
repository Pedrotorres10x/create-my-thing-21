import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import PremiumSlotCard from "@/components/marketplace/PremiumSlotCard";
import { useAuth } from "@/hooks/useAuth";
import { PremiumBanner } from "@/components/advertising/PremiumBanner";

interface Category {
  id: number;
  name: string;
}

interface PremiumSlot {
  id: string;
  slot_number: number;
  company_name: string;
  company_logo_url: string | null;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  website_url: string | null;
  description: string;
  category_id: number;
  is_external_company: boolean;
  is_featured: boolean;
  display_order: number;
  category?: Category;
}

export default function PremiumMarketplace() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [slots, setSlots] = useState<PremiumSlot[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [availableSlots, setAvailableSlots] = useState<number>(30);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch categories
      const { data: categoriesData } = await supabase
        .from("offer_categories")
        .select("*")
        .order("name");

      if (categoriesData) setCategories(categoriesData);

      // Fetch active premium slots
      const { data: slotsData, error } = await supabase
        .from("premium_marketplace_slots")
        .select(`
          *,
          category:offer_categories(id, name)
        `)
        .eq("status", "active")
        .gt("contract_end_date", new Date().toISOString())
        .order("is_featured", { ascending: false })
        .order("display_order")
        .order("company_name");

      if (error) throw error;
      if (slotsData) setSlots(slotsData);

      // Get available slots count
      const { data: countData } = await supabase.rpc("get_available_slots_count");
      if (countData !== null) setAvailableSlots(countData);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los anuncios premium",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const trackView = async (slotId: string, professionalId: string | null) => {
    if (!user) return;

    try {
      await supabase.from("premium_slot_views").insert({
        slot_id: slotId,
        viewed_by_professional_id: professionalId,
      });
    } catch (error) {
      console.error("Error tracking view:", error);
    }
  };

  const filteredSlots = slots.filter((slot) => {
    const matchesSearch =
      slot.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      slot.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === "all" || slot.category_id === parseInt(selectedCategory);
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent flex items-center gap-2">
              <Sparkles className="h-8 w-8 text-primary" />
              Marketplace Premium
            </h1>
            <p className="text-muted-foreground mt-2">
              Empresas líderes que confían en nuestra red de profesionales
            </p>
          </div>
        </div>

        {/* Slots Counter */}
        <div className="flex items-center gap-4">
          <Badge variant="secondary" className="text-lg py-2 px-4">
            {30 - availableSlots} de 30 espacios ocupados
          </Badge>
          {availableSlots > 0 && (
            <Badge variant="outline" className="text-lg py-2 px-4">
              {availableSlots} espacios disponibles
            </Badge>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar empresas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Todas las categorías" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las categorías</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id.toString()}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Premium Banner */}
      <PremiumBanner location="marketplace" size="horizontal_large" />

      {/* Slots Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-96 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : filteredSlots.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground text-lg">
            No se encontraron anuncios premium
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSlots.map((slot) => (
            <PremiumSlotCard key={slot.id} slot={slot} onView={trackView} />
          ))}
        </div>
      )}

    </div>
  );
}
