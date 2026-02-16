import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Send, UserPlus, Search, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { CreateDealDialog } from "@/components/deals/CreateDealDialog";
import { DealsList } from "@/components/deals/DealsList";
import { DealHistoryStats } from "@/components/deals/DealHistoryStats";

interface Member {
  id: string;
  full_name: string;
  photo_url: string | null;
  company_name: string | null;
  profession_specializations: { name: string } | null;
}

interface RecommendClientProps {
  professionalId: string;
  chapterId: string | null;
  sphereId: number;
}

export const RecommendClient = ({ professionalId, chapterId, sphereId }: RecommendClientProps) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([]);
  const [search, setSearch] = useState("");
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [dealDialogOpen, setDealDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMembers();
  }, [chapterId, sphereId]);

  useEffect(() => {
    if (!search.trim()) {
      setFilteredMembers(members);
    } else {
      const q = search.toLowerCase();
      setFilteredMembers(
        members.filter(
          (m) =>
            m.full_name.toLowerCase().includes(q) ||
            m.company_name?.toLowerCase().includes(q) ||
            m.profession_specializations?.name.toLowerCase().includes(q)
        )
      );
    }
  }, [search, members]);

  const loadMembers = async () => {
    try {
      let query = supabase
        .from("professionals_public")
        .select(`
          id, full_name, photo_url, company_name,
          profession_specializations (name)
        `)
        .neq("id", professionalId)
        .order("full_name");

      if (chapterId) {
        query = query.eq("chapter_id", chapterId);
      } else {
        query = query.eq("business_sphere_id", sphereId);
      }

      const { data } = await query;
      setMembers((data as any) || []);
    } catch (error) {
      console.error("Error loading members:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRecommend = (member: Member) => {
    setSelectedMember(member);
    setDealDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Quick recommend */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Recomendar un cliente
          </CardTitle>
          <CardDescription>
            Selecciona a un miembro de tu tribu para enviarle un cliente. Cuando el trato se cierre, recibirás un Agradecimiento.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, empresa o especialidad..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {loading ? (
            <p className="text-center text-muted-foreground py-4">Cargando miembros...</p>
          ) : filteredMembers.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              No se encontraron miembros. {!chapterId && "Necesitas estar en una tribu."}
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredMembers.map((member) => (
                <Card
                  key={member.id}
                  className="cursor-pointer hover:border-primary transition-colors"
                  onClick={() => handleRecommend(member)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={member.photo_url || undefined} />
                        <AvatarFallback>
                          {member.full_name.split(" ").map((n) => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm truncate">{member.full_name}</h4>
                        {member.profession_specializations && (
                          <Badge variant="secondary" className="text-[10px] mt-0.5">
                            {member.profession_specializations.name}
                          </Badge>
                        )}
                        {member.company_name && (
                          <p className="text-xs text-muted-foreground truncate">{member.company_name}</p>
                        )}
                      </div>
                      <Button size="sm" variant="ghost" className="flex-shrink-0">
                        <UserPlus className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Deals history */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Mis Recomendaciones
          </CardTitle>
          <CardDescription>
            Historial de clientes recomendados y tratos en curso
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <DealHistoryStats professionalId={professionalId} />
          <DealsList professionalId={professionalId} />
        </CardContent>
      </Card>

      {selectedMember && (
        <CreateDealDialog
          open={dealDialogOpen}
          onOpenChange={setDealDialogOpen}
          receiverId={selectedMember.id}
          receiverName={selectedMember.full_name}
          referrerId={professionalId}
          onSuccess={loadMembers}
        />
      )}
    </div>
  );
};
