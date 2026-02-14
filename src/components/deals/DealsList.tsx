import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DealCard } from "./DealCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Handshake } from "lucide-react";

interface DealsListProps {
  professionalId: string;
}

export const DealsList = ({ professionalId }: DealsListProps) => {
  const [sentDeals, setSentDeals] = useState<any[]>([]);
  const [receivedDeals, setReceivedDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDeals = async () => {
    setLoading(true);
    try {
      const selectFields = "*, receiver:professionals!deals_receiver_id_fkey(full_name), thanks_category_bands(display_label, min_thanks_amount, recommended_thanks_amount, max_thanks_amount), thanks_sectors(name)";
      const selectFieldsReceived = "*, referrer:professionals!deals_referrer_id_fkey(full_name), thanks_category_bands(display_label, min_thanks_amount, recommended_thanks_amount, max_thanks_amount), thanks_sectors(name)";

      const { data: sent } = await (supabase as any)
        .from("deals")
        .select(selectFields)
        .eq("referrer_id", professionalId)
        .order("created_at", { ascending: false });

      const { data: received } = await (supabase as any)
        .from("deals")
        .select(selectFieldsReceived)
        .eq("receiver_id", professionalId)
        .order("created_at", { ascending: false });

      setSentDeals((sent || []).map((d: any) => ({ ...d, referrer: null })));
      setReceivedDeals((received || []).map((d: any) => ({ ...d, receiver: null })));
    } catch (error) {
      console.error("Error fetching deals:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeals();
  }, [professionalId]);

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const EmptyState = ({ message }: { message: string }) => (
    <div className="text-center py-8 text-muted-foreground">
      <Handshake className="h-10 w-10 mx-auto mb-3 opacity-30" />
      <p className="text-sm">{message}</p>
    </div>
  );

  return (
    <Tabs defaultValue="sent" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="sent">Enviados ({sentDeals.length})</TabsTrigger>
        <TabsTrigger value="received">Recibidos ({receivedDeals.length})</TabsTrigger>
      </TabsList>
      <TabsContent value="sent" className="space-y-3 mt-3">
        {sentDeals.length === 0 ? (
          <EmptyState message="No has referido clientes aún. Ve a tu tribu para empezar." />
        ) : (
          sentDeals.map((deal) => (
            <DealCard key={deal.id} deal={deal} perspective="referrer" myProfessionalId={professionalId} onRefresh={fetchDeals} />
          ))
        )}
      </TabsContent>
      <TabsContent value="received" className="space-y-3 mt-3">
        {receivedDeals.length === 0 ? (
          <EmptyState message="No has recibido referencias aún." />
        ) : (
          receivedDeals.map((deal) => (
            <DealCard key={deal.id} deal={deal} perspective="receiver" myProfessionalId={professionalId} onRefresh={fetchDeals} />
          ))
        )}
      </TabsContent>
    </Tabs>
  );
};
