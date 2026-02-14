import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { ArrowRight, Loader2, Sparkles, Camera, User } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    referred_by_code: "",
  });

  useEffect(() => {
    if (!user) return;
    
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');
    if (refCode) {
      setFormData(prev => ({ ...prev, referred_by_code: refCode }));
    }

    const checkProfile = async () => {
      const { data } = await (supabase as any)
        .from("professionals")
        .select("id, full_name, phone, referred_by_code, photo_url")
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (data) {
        setHasProfile(true);
        setFormData({
          full_name: data.full_name || "",
          phone: data.phone || "",
          referred_by_code: data.referred_by_code || refCode || "",
        });
        if (data.photo_url) setPhotoUrl(data.photo_url);
      }
    };
    checkProfile();
  }, [user]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Error", description: "La imagen no debe superar 5MB", variant: "destructive" });
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast({ title: "Error", description: "Solo se permiten imágenes", variant: "destructive" });
      return;
    }

    setUploadingPhoto(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/profile.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('photos')
        .getPublicUrl(filePath);

      // Add cache buster
      const urlWithCacheBust = `${publicUrl}?t=${Date.now()}`;
      setPhotoUrl(urlWithCacheBust);

      // Update profile if it exists
      if (hasProfile) {
        await (supabase as any)
          .from("professionals")
          .update({ photo_url: urlWithCacheBust })
          .eq("user_id", user.id);
      }

      toast({ title: "✅ Foto subida", description: "Tu foto de perfil se ha actualizado" });
    } catch (error: any) {
      console.error("Photo upload error:", error);
      toast({ title: "Error", description: "No se pudo subir la foto", variant: "destructive" });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const validated = profileSchema.parse(formData);
      setLoading(true);

      const profileData: any = {
        user_id: user.id,
        full_name: validated.full_name,
        email: user.email || "",
        phone: validated.phone,
        referred_by_code: formData.referred_by_code || null,
      };

      if (photoUrl) {
        profileData.photo_url = photoUrl;
      }

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

      sessionStorage.setItem('conector-onboarding', 'true');
      
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

  const initials = formData.full_name
    ? formData.full_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
    : "?";

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
          {/* Photo Upload */}
          <div className="flex flex-col items-center space-y-2">
            <div 
              className="relative cursor-pointer group" 
              onClick={() => fileInputRef.current?.click()}
            >
              <Avatar className="h-24 w-24 border-2 border-primary/30 group-hover:border-primary transition-colors">
                <AvatarImage src={photoUrl || undefined} alt="Foto de perfil" />
                <AvatarFallback className="text-2xl bg-muted">
                  {photoUrl ? initials : <User className="h-10 w-10 text-muted-foreground" />}
                </AvatarFallback>
              </Avatar>
              <div className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-1.5 shadow-md group-hover:scale-110 transition-transform">
                {uploadingPhoto ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handlePhotoUpload}
              className="hidden"
              disabled={uploadingPhoto}
            />
            <p className="text-xs text-muted-foreground">
              {photoUrl ? "Toca para cambiar tu foto" : "Sube tu foto de perfil"}
            </p>
          </div>

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
            Alic.ia te guiará para elegir tu profesión, tu Tribu y completar tu Perfil paso a paso
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
