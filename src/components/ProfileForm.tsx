import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { ArrowRight, Loader2, Sparkles, Camera, User, Building2, MapPin, FileText } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const profileSchema = z.object({
  full_name: z.string().min(2, "Nombre muy corto").max(100, "Nombre muy largo"),
  phone: z.string().min(9, "Teléfono inválido").max(20, "Teléfono muy largo"),
  position: z.string().optional(),
  bio: z.string().max(500, "Máximo 500 caracteres").optional(),
  nif_cif: z.string().optional(),
  company_name: z.string().optional(),
  company_cif: z.string().optional(),
  company_address: z.string().optional(),
  business_description: z.string().max(1000, "Máximo 1000 caracteres").optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postal_code: z.string().optional(),
  country: z.string().optional(),
  website: z.string().optional(),
  linkedin_url: z.string().optional(),
  years_experience: z.number().min(0).max(70).optional().nullable(),
});

interface Specialization {
  id: number;
  name: string;
}

interface ProfessionSpecialization {
  id: number;
  name: string;
  specialization_id: number;
}

export function ProfileForm() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [specializations, setSpecializations] = useState<Specialization[]>([]);
  const [professionSpecializations, setProfessionSpecializations] = useState<ProfessionSpecialization[]>([]);
  const [selectedSpecializationId, setSelectedSpecializationId] = useState<number | null>(null);
  const [selectedProfessionSpecId, setSelectedProfessionSpecId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    referred_by_code: "",
    position: "",
    bio: "",
    nif_cif: "",
    company_name: "",
    company_cif: "",
    company_address: "",
    business_description: "",
    address: "",
    city: "",
    state: "",
    postal_code: "",
    country: "España",
    website: "",
    linkedin_url: "",
    years_experience: "" as string,
  });

  useEffect(() => {
    const loadSpecializations = async () => {
      const { data } = await supabase
        .from("specializations")
        .select("id, name")
        .order("name");
      if (data) setSpecializations(data);
    };
    const loadProfessionSpecializations = async () => {
      const { data } = await supabase
        .from("profession_specializations")
        .select("id, name, specialization_id")
        .order("name");
      if (data) setProfessionSpecializations(data);
    };
    loadSpecializations();
    loadProfessionSpecializations();
  }, []);

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
        .select("id, full_name, phone, referred_by_code, photo_url, logo_url, position, bio, nif_cif, company_name, company_cif, company_address, business_description, address, city, state, postal_code, country, website, linkedin_url, years_experience, specialization_id, profession_specialization_id")
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (data) {
        setHasProfile(true);
        setFormData({
          full_name: data.full_name || "",
          phone: data.phone || "",
          referred_by_code: data.referred_by_code || refCode || "",
          position: data.position || "",
          bio: data.bio || "",
          nif_cif: data.nif_cif || "",
          company_name: data.company_name || "",
          company_cif: data.company_cif || "",
          company_address: data.company_address || "",
          business_description: data.business_description || "",
          address: data.address || "",
          city: data.city || "",
          state: data.state || "",
          postal_code: data.postal_code || "",
          country: data.country || "España",
          website: data.website || "",
          linkedin_url: data.linkedin_url || "",
          years_experience: data.years_experience?.toString() || "",
        });
        if (data.photo_url) setPhotoUrl(data.photo_url);
        if (data.logo_url) setLogoUrl(data.logo_url);
        if (data.specialization_id) setSelectedSpecializationId(data.specialization_id);
        if (data.profession_specialization_id) setSelectedProfessionSpecId(data.profession_specialization_id);
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

      const urlWithCacheBust = `${publicUrl}?t=${Date.now()}`;
      setPhotoUrl(urlWithCacheBust);

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

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Error", description: "El logo no debe superar 5MB", variant: "destructive" });
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast({ title: "Error", description: "Solo se permiten imágenes", variant: "destructive" });
      return;
    }

    setUploadingLogo(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/logo.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('photos')
        .getPublicUrl(filePath);

      const urlWithCacheBust = `${publicUrl}?t=${Date.now()}`;
      setLogoUrl(urlWithCacheBust);

      if (hasProfile) {
        await (supabase as any)
          .from("professionals")
          .update({ logo_url: urlWithCacheBust })
          .eq("user_id", user.id);
      }

      toast({ title: "✅ Logo subido", description: "El logo de tu empresa se ha actualizado" });
    } catch (error: any) {
      console.error("Logo upload error:", error);
      toast({ title: "Error", description: "No se pudo subir el logo", variant: "destructive" });
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const validated = profileSchema.parse({
        ...formData,
        years_experience: formData.years_experience ? parseInt(formData.years_experience) : null,
      });
      setLoading(true);

      const profileData: any = {
        user_id: user.id,
        full_name: validated.full_name,
        email: user.email || "",
        phone: validated.phone,
        referred_by_code: formData.referred_by_code || null,
        position: validated.position || null,
        bio: validated.bio || null,
        nif_cif: validated.nif_cif || null,
        company_name: validated.company_name || null,
        company_cif: validated.company_cif || null,
        company_address: validated.company_address || null,
        business_description: validated.business_description || null,
        address: validated.address || null,
        city: validated.city || null,
        state: validated.state || null,
        postal_code: validated.postal_code || null,
        country: validated.country || null,
        website: validated.website || null,
        linkedin_url: validated.linkedin_url || null,
        years_experience: validated.years_experience || null,
        specialization_id: selectedSpecializationId,
        profession_specialization_id: selectedProfessionSpecId,
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
        title: hasProfile ? "✅ Perfil actualizado" : "¡Bienvenido a CONECTOR!",
        description: hasProfile ? "Los cambios se han guardado" : "Alic.ia te guiará para completar tu perfil",
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

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const initials = formData.full_name
    ? formData.full_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  return (
    <Card className="w-full max-w-2xl mx-auto border-primary/20 shadow-xl">
      <CardHeader className="text-center space-y-3">
        <div className="mx-auto w-14 h-14 rounded-full alicia-gradient flex items-center justify-center">
          <Sparkles className="h-7 w-7 text-white" />
        </div>
        <CardTitle className="text-2xl">{hasProfile ? "Tu Perfil Profesional" : "Únete a CONECTOR"}</CardTitle>
        <CardDescription className="text-base">
          {hasProfile 
            ? "Completa tu perfil para generar más confianza en la red"
            : "Completa tus datos profesionales. Alic.ia te ayudará con el resto."
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
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

          {/* === DATOS PERSONALES === */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
              <User className="h-4 w-4" />
              <span>Datos Personales</span>
            </div>
            <Separator />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Nombre Completo *</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => updateField("full_name", e.target.value)}
                placeholder="Tu nombre y apellidos"
                required
                maxLength={100}
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono *</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => updateField("phone", e.target.value)}
                placeholder="+34 600 000 000"
                required
                maxLength={20}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nif_cif">NIF / CIF</Label>
              <Input
                id="nif_cif"
                value={formData.nif_cif}
                onChange={(e) => updateField("nif_cif", e.target.value.toUpperCase())}
                placeholder="12345678A"
                maxLength={15}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Sobre ti</Label>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => updateField("bio", e.target.value)}
              placeholder="Cuéntanos brevemente sobre ti y tu experiencia..."
              maxLength={500}
              rows={3}
            />
            <p className="text-xs text-muted-foreground text-right">{formData.bio.length}/500</p>
          </div>

          {/* === DATOS PROFESIONALES === */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
              <FileText className="h-4 w-4" />
              <span>Datos Profesionales</span>
            </div>
            <Separator />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="specialization">Sector</Label>
              <Select
                value={selectedSpecializationId?.toString() || ""}
                onValueChange={(val) => {
                  const newId = val ? parseInt(val) : null;
                  setSelectedSpecializationId(newId);
                  setSelectedProfessionSpecId(null); // Reset profession when sector changes
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona tu sector" />
                </SelectTrigger>
                <SelectContent>
                  {specializations.map((s) => (
                    <SelectItem key={s.id} value={s.id.toString()}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="professionSpec">Especialización</Label>
              <Select
                value={selectedProfessionSpecId?.toString() || ""}
                onValueChange={(val) => {
                  const profSpecId = val ? parseInt(val) : null;
                  setSelectedProfessionSpecId(profSpecId);
                  // Auto-set sector from the profession specialization
                  if (profSpecId) {
                    const match = professionSpecializations.find(ps => ps.id === profSpecId);
                    if (match && match.specialization_id !== selectedSpecializationId) {
                      setSelectedSpecializationId(match.specialization_id);
                    }
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona tu especialización" />
                </SelectTrigger>
                <SelectContent>
                  {(selectedSpecializationId 
                    ? professionSpecializations.filter(ps => ps.specialization_id === selectedSpecializationId)
                    : professionSpecializations
                  ).map((ps) => (
                    <SelectItem key={ps.id} value={ps.id.toString()}>
                      {ps.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="position">Cargo / Puesto</Label>
              <Input
                id="position"
                value={formData.position}
                onChange={(e) => updateField("position", e.target.value)}
                placeholder="Ej: Director, CEO, Consultor..."
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="years_experience">Años de Experiencia</Label>
              <Input
                id="years_experience"
                type="number"
                min={0}
                max={70}
                value={formData.years_experience}
                onChange={(e) => updateField("years_experience", e.target.value)}
                placeholder="Ej: 10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">Página Web</Label>
              <Input
                id="website"
                value={formData.website}
                onChange={(e) => updateField("website", e.target.value)}
                placeholder="https://tuempresa.com"
                maxLength={200}
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="linkedin_url">LinkedIn</Label>
              <Input
                id="linkedin_url"
                value={formData.linkedin_url}
                onChange={(e) => updateField("linkedin_url", e.target.value)}
                placeholder="https://linkedin.com/in/tu-perfil"
                maxLength={200}
              />
            </div>
          </div>

          {/* === DATOS DE EMPRESA === */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
              <Building2 className="h-4 w-4" />
              <span>Datos de Empresa</span>
            </div>
            <Separator />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="company_name">Nombre de Empresa</Label>
              <Input
                id="company_name"
                value={formData.company_name}
                onChange={(e) => updateField("company_name", e.target.value)}
                placeholder="Tu empresa S.L."
                maxLength={200}
              />
            </div>

            <div className="space-y-2">
              <Label>Logo de Empresa</Label>
              <div className="flex items-center gap-3">
                <div 
                  className="w-16 h-16 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center overflow-hidden cursor-pointer hover:border-primary/50 transition-colors bg-muted/30"
                  onClick={() => logoInputRef.current?.click()}
                >
                  {uploadingLogo ? (
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  ) : logoUrl ? (
                    <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
                  ) : (
                    <Building2 className="h-6 w-6 text-muted-foreground/50" />
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => logoInputRef.current?.click()}
                  disabled={uploadingLogo}
                >
                  {uploadingLogo ? "Subiendo..." : logoUrl ? "Cambiar logo" : "Subir logo"}
                </Button>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="company_cif">CIF de Empresa</Label>
              <Input
                id="company_cif"
                value={formData.company_cif}
                onChange={(e) => updateField("company_cif", e.target.value.toUpperCase())}
                placeholder="B12345678"
                maxLength={15}
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="business_description">Descripción del Negocio</Label>
              <Textarea
                id="business_description"
                value={formData.business_description}
                onChange={(e) => updateField("business_description", e.target.value)}
                placeholder="¿A qué se dedica tu empresa? ¿Cuál es tu cliente ideal?"
                maxLength={1000}
                rows={3}
              />
              <p className="text-xs text-muted-foreground text-right">{formData.business_description.length}/1000</p>
            </div>
          </div>

          {/* === UBICACIÓN === */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
              <MapPin className="h-4 w-4" />
              <span>Ubicación</span>
            </div>
            <Separator />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="address">Dirección</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => updateField("address", e.target.value)}
                placeholder="Calle, número..."
                maxLength={300}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">Ciudad</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => updateField("city", e.target.value)}
                placeholder="Madrid"
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="state">Provincia / Comunidad</Label>
              <Input
                id="state"
                value={formData.state}
                onChange={(e) => updateField("state", e.target.value)}
                placeholder="Madrid"
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="postal_code">Código Postal</Label>
              <Input
                id="postal_code"
                value={formData.postal_code}
                onChange={(e) => updateField("postal_code", e.target.value)}
                placeholder="28001"
                maxLength={10}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="country">País</Label>
              <Input
                id="country"
                value={formData.country}
                onChange={(e) => updateField("country", e.target.value)}
                placeholder="España"
                maxLength={100}
              />
            </div>
          </div>

          {/* Código de referido */}
          <div className="space-y-2">
            <Label htmlFor="referred_by_code">¿Te invitó alguien? (Opcional)</Label>
            <Input
              id="referred_by_code"
              type="text"
              placeholder="Código de quien te invitó"
              value={formData.referred_by_code}
              onChange={(e) => updateField("referred_by_code", e.target.value.toUpperCase())}
              maxLength={8}
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full text-base py-5 gap-2">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {hasProfile ? "Guardando..." : "Creando tu cuenta..."}
              </>
            ) : (
              <>
                {hasProfile ? "Guardar cambios" : "Empezar con Alic.ia"}
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>

          {!hasProfile && (
            <p className="text-xs text-center text-muted-foreground">
              Alic.ia te guiará para elegir tu profesión, tu Tribu y completar tu Perfil paso a paso
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
