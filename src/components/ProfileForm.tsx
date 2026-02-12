import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { ArrowRight, Loader2, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const profileSchema = z.object({
  full_name: z.string().min(2, "Nombre muy corto").max(100, "Nombre muy largo"),
  phone: z.string().min(9, "Teléfono inválido").max(20, "Teléfono muy largo"),
});

export function ProfileForm() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);

  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    referred_by_code: "",
  });

  useEffect(() => {
    if (!user) return;
    
    // Check for referral code in URL
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');
    if (refCode) {
      setFormData(prev => ({ ...prev, referred_by_code: refCode }));
    }

    // Check if profile already exists
    const checkProfile = async () => {
      const { data } = await (supabase as any)
        .from("professionals")
        .select("id, full_name, phone, referred_by_code")
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (data) {
        setHasProfile(true);
        setFormData({
          full_name: data.full_name || "",
          phone: data.phone || "",
          referred_by_code: data.referred_by_code || refCode || "",
        });
      }
    };
    checkProfile();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const validated = profileSchema.parse(formData);
      setLoading(true);

      const profileData = {
        user_id: user.id,
        full_name: validated.full_name,
        email: user.email || "",
        phone: validated.phone,
        referred_by_code: formData.referred_by_code || null,
      };

      let error;
      if (hasProfile) {
        ({ error } = await (supabase as any)
          .from("professionals")
          .update(profileData)
          .eq("user_id", user.id));
      } else {
        ({ error } = await (supabase as any)
          .from("professionals")
          .insert({ ...profileData, status: "waiting_approval" }));
      }

      if (error) throw error;

      toast({
        title: "¡Bienvenido a CONECTOR!",
        description: "Alic.ia te guiará para completar tu perfil",
      });

      navigate("/dashboard");
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Revisa los datos",
          description: error.errors[0]?.message || "Datos inválidos",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message || "Error al guardar",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto border-primary/20 shadow-xl">
      <CardHeader className="text-center space-y-3">
        <div className="mx-auto w-14 h-14 rounded-full alicia-gradient flex items-center justify-center">
          <Sparkles className="h-7 w-7 text-white" />
        </div>
        <CardTitle className="text-2xl">Únete a CONECTOR</CardTitle>
        <CardDescription className="text-base">
          Solo necesitamos lo básico. Alic.ia, tu asistente IA, te ayudará a completar el resto.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="full_name">Nombre Completo *</Label>
            <Input
              id="full_name"
              value={formData.full_name}
              onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
              placeholder="Tu nombre y apellidos"
              required
              maxLength={100}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={user?.email || ""}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">Tu email de registro, no se puede cambiar</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Teléfono *</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              placeholder="+34 600 000 000"
              required
              maxLength={20}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="referred_by_code">¿Te invitó alguien? (Opcional)</Label>
            <Input
              id="referred_by_code"
              type="text"
              placeholder="Código de quien te invitó"
              value={formData.referred_by_code}
              onChange={(e) => setFormData(prev => ({ ...prev, referred_by_code: e.target.value.toUpperCase() }))}
              maxLength={8}
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full text-base py-5 gap-2">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creando tu cuenta...
              </>
            ) : (
              <>
                Empezar con Alic.ia
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Alic.ia te guiará para elegir tu profesión, tu Tribu y completar tu Tótem paso a paso
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
