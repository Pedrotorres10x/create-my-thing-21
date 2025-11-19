import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { Upload, Loader2 } from "lucide-react";
import { BusinessSphereSelector } from "@/components/BusinessSphereSelector";
import { ProfessionSpecializationSelector } from "@/components/ProfessionSpecializationSelector";
import { SpecializationAvailabilityIndicator } from "@/components/SpecializationAvailabilityIndicator";

const profileSchema = z.object({
  full_name: z.string().min(2, "Nombre muy corto").max(100, "Nombre muy largo"),
  company_name: z.string().min(2, "Nombre de empresa muy corto").max(100, "Nombre muy largo"),
  position: z.string().min(2, "Cargo muy corto").max(100, "Cargo muy largo"),
  phone: z.string().min(9, "Teléfono inválido").max(20, "Teléfono muy largo").optional(),
  bio: z.string().max(500, "Biografía muy larga").optional(),
  linkedin_url: z.string().url("URL inválida").max(255, "URL muy larga").optional().or(z.literal("")),
  website: z.string().url("URL inválida").max(255, "URL muy larga").optional().or(z.literal("")),
  address: z.string().max(200, "Dirección muy larga").optional(),
  city: z.string().max(100, "Ciudad muy larga").optional(),
  state: z.string().max(100, "Provincia muy larga").optional(),
  country: z.string().max(100, "País muy largo").optional(),
  postal_code: z.string().max(20, "Código postal muy largo").optional(),
});

interface Sector {
  id: string;
  name: string;
}

interface Specialization {
  id: string;
  name: string;
  sector_id: string;
}

interface Chapter {
  id: string;
  name: string;
  city: string;
  state: string;
}

export function ProfileForm() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [specializations, setSpecializations] = useState<Specialization[]>([]);
  const [filteredSpecs, setFilteredSpecs] = useState<Specialization[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [filteredChapters, setFilteredChapters] = useState<Chapter[]>([]);

  const [formData, setFormData] = useState({
    full_name: "",
    email: user?.email || "",
    phone: "",
    company_name: "",
    position: "",
    sector_id: "",
    specialization_id: "",
    profession_specialization_id: null as number | null,
    business_sphere_id: 0,
    chapter_id: null as string | null,
    bio: "",
    linkedin_url: "",
    website: "",
    address: "",
    city: "",
    state: "",
    country: "",
    postal_code: "",
    logo_url: "",
    photo_url: "",
    video_url: "",
    referred_by_code: "",
  });

  useEffect(() => {
    loadSectors();
    loadSpecializations();
    loadChapters();
    loadProfile();
    
    // Check for referral code in URL
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');
    if (refCode) {
      setFormData(prev => ({ ...prev, referred_by_code: refCode }));
    }
  }, [user]);

  useEffect(() => {
    if (formData.sector_id) {
      const filtered = specializations.filter(s => s.sector_id === formData.sector_id);
      setFilteredSpecs(filtered);
    }
  }, [formData.sector_id, specializations]);

  useEffect(() => {
    if (formData.state) {
      const filtered = chapters.filter(c => c.state === formData.state);
      setFilteredChapters(filtered);
    } else {
      setFilteredChapters(chapters);
    }
  }, [formData.state, chapters]);

  const loadSectors = async () => {
    const { data } = await (supabase as any).from("sector_catalog").select("*").order("name");
    if (data) setSectors(data.map((s: any) => ({ ...s, id: String(s.id) })));
  };

  const loadSpecializations = async () => {
    const { data } = await (supabase as any).from("specializations").select("*").order("name");
    if (data) setSpecializations(data.map((s: any) => ({ ...s, id: String(s.id), sector_id: String(s.sector_id) })));
  };

  const loadChapters = async () => {
    const { data } = await (supabase as any).from("chapters").select("id, name, city, state").order("name");
    if (data) setChapters(data);
  };

  const loadProfile = async () => {
    if (!user) return;
    const { data } = await (supabase as any)
      .from("professionals")
      .select("*")
      .eq("user_id", user.id)
      .single();
    
    if (data) {
      setFormData({
        full_name: data.full_name || "",
        email: data.email || "",
        phone: data.phone || "",
        company_name: data.company_name || "",
        position: data.position || "",
        sector_id: data.sector_id ? String(data.sector_id) : "",
        specialization_id: data.specialization_id ? String(data.specialization_id) : "",
        profession_specialization_id: data.profession_specialization_id || null,
        business_sphere_id: data.business_sphere_id || 0,
        chapter_id: data.chapter_id || null,
        bio: data.bio || "",
        linkedin_url: data.linkedin_url || "",
        website: data.website || "",
        address: data.address || "",
        city: data.city || "",
        state: data.state || "",
        country: data.country || "",
        postal_code: data.postal_code || "",
        logo_url: data.logo_url || "",
        photo_url: data.photo_url || "",
        video_url: data.video_url || "",
        referred_by_code: data.referred_by_code || "",
      });
    }
  };

  const uploadFile = async (file: File, bucket: string) => {
    if (!user) return null;
    
    const fileExt = file.name.split(".").pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;
    
    const { error: uploadError, data } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: "logo" | "photo" | "video") => {
    const file = e.target.files?.[0];
    if (!file) return;

    const bucket = type === "logo" ? "logos" : type === "photo" ? "photos" : "videos";
    const maxSize = type === "video" ? 50 * 1024 * 1024 : 5 * 1024 * 1024; // 50MB for video, 5MB for images

    if (file.size > maxSize) {
      toast({
        title: "Error",
        description: `El archivo es demasiado grande. Máximo ${type === "video" ? "50MB" : "5MB"}`,
        variant: "destructive",
      });
      return;
    }

    try {
      setUploading(type);
      const url = await uploadFile(file, bucket);
      if (url) {
        setFormData(prev => ({ ...prev, [`${type}_url`]: url }));
        toast({
          title: "Éxito",
          description: `${type === "logo" ? "Logo" : type === "photo" ? "Foto" : "Vídeo"} subido correctamente`,
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al subir archivo",
        variant: "destructive",
      });
    } finally {
      setUploading(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const validated = profileSchema.parse(formData);
      setLoading(true);

      const { error } = await (supabase as any)
        .from("professionals")
        .upsert({
          user_id: user.id,
          full_name: validated.full_name,
          email: formData.email,
          phone: validated.phone,
          company_name: validated.company_name,
          position: validated.position,
          sector_id: formData.sector_id ? parseInt(formData.sector_id) : null,
          specialization_id: formData.specialization_id ? parseInt(formData.specialization_id) : null,
          profession_specialization_id: formData.profession_specialization_id,
          business_sphere_id: formData.business_sphere_id || null,
          chapter_id: formData.chapter_id,
          bio: validated.bio,
          linkedin_url: validated.linkedin_url,
          website: validated.website,
          address: validated.address,
          city: validated.city,
          state: validated.state,
          country: validated.country,
          postal_code: validated.postal_code,
          logo_url: formData.logo_url,
          photo_url: formData.photo_url,
          video_url: formData.video_url,
          referred_by_code: formData.referred_by_code || null,
          status: "waiting_approval",
        });

      if (error) throw error;

      toast({
        title: "Perfil guardado",
        description: "Tu perfil ha sido enviado para revisión",
      });

      navigate("/dashboard");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al guardar perfil",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="full_name">Nombre Completo *</Label>
          <Input
            id="full_name"
            value={formData.full_name}
            onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
            required
            maxLength={100}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email *</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            disabled
            className="bg-muted"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Teléfono</Label>
          <Input
            id="phone"
            value={formData.phone}
            onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
            maxLength={20}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="referred_by_code">Código de Referido (Opcional)</Label>
          <Input
            id="referred_by_code"
            type="text"
            placeholder="Ingresa el código de quien te invitó"
            value={formData.referred_by_code}
            onChange={(e) => setFormData(prev => ({ ...prev, referred_by_code: e.target.value.toUpperCase() }))}
            maxLength={8}
          />
          <p className="text-xs text-muted-foreground">
            Si alguien te compartió un código de referido, ingrésalo aquí
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="company_name">Nombre de Empresa *</Label>
          <Input
            id="company_name"
            value={formData.company_name}
            onChange={(e) => setFormData(prev => ({ ...prev, company_name: e.target.value }))}
            required
            maxLength={100}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="position">Cargo *</Label>
          <Input
            id="position"
            value={formData.position}
            onChange={(e) => setFormData(prev => ({ ...prev, position: e.target.value }))}
            required
            maxLength={100}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="sector_id">Sector *</Label>
          <Select value={formData.sector_id} onValueChange={(value) => setFormData(prev => ({ ...prev, sector_id: value, specialization_id: "" }))}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona un sector" />
            </SelectTrigger>
            <SelectContent>
              {sectors.map((sector) => (
                <SelectItem key={sector.id} value={sector.id}>
                  {sector.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="specialization_id">Especialización *</Label>
          <Select 
            value={formData.specialization_id} 
            onValueChange={(value) => setFormData(prev => ({ ...prev, specialization_id: value }))}
            disabled={!formData.sector_id}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecciona especialización" />
            </SelectTrigger>
            <SelectContent>
              {filteredSpecs.map((spec) => (
                <SelectItem key={spec.id} value={spec.id}>
                  {spec.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <BusinessSphereSelector
          value={formData.business_sphere_id}
          onChange={(value) => setFormData({ ...formData, business_sphere_id: value })}
          specializationId={formData.specialization_id ? parseInt(formData.specialization_id) : undefined}
          required
        />

        <ProfessionSpecializationSelector
          specializationId={formData.specialization_id ? parseInt(formData.specialization_id) : null}
          chapterId={formData.chapter_id}
          value={formData.profession_specialization_id}
          onChange={(value) => setFormData({ ...formData, profession_specialization_id: value })}
          required
        />

        {formData.profession_specialization_id && formData.chapter_id && (
          <SpecializationAvailabilityIndicator
            professionSpecializationId={formData.profession_specialization_id}
            currentChapterId={formData.chapter_id}
            currentState={formData.state}
            showAlternatives
          />
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="bio">Biografía</Label>
        <Textarea
          id="bio"
          value={formData.bio}
          onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
          rows={4}
          maxLength={500}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="linkedin_url">LinkedIn</Label>
          <Input
            id="linkedin_url"
            type="url"
            value={formData.linkedin_url}
            onChange={(e) => setFormData(prev => ({ ...prev, linkedin_url: e.target.value }))}
            placeholder="https://linkedin.com/in/..."
            maxLength={255}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="website">Sitio Web</Label>
          <Input
            id="website"
            type="url"
            value={formData.website}
            onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
            placeholder="https://..."
            maxLength={255}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Dirección</Label>
        <Input
          id="address"
          value={formData.address}
          onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
          maxLength={200}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="space-y-2">
          <Label htmlFor="city">Ciudad</Label>
          <Input
            id="city"
            value={formData.city}
            onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
            maxLength={100}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="state">Provincia/Estado *</Label>
          <Input
            id="state"
            value={formData.state}
            onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value, chapter_id: null }))}
            maxLength={100}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="country">País</Label>
          <Input
            id="country"
            value={formData.country}
            onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
            maxLength={100}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="postal_code">Código Postal</Label>
          <Input
            id="postal_code"
            value={formData.postal_code}
            onChange={(e) => setFormData(prev => ({ ...prev, postal_code: e.target.value }))}
            maxLength={20}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="chapter_id">Capítulo *</Label>
        <Select 
          value={formData.chapter_id || ""} 
          onValueChange={(value) => setFormData(prev => ({ ...prev, chapter_id: value }))}
          disabled={!formData.state}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecciona tu capítulo" />
          </SelectTrigger>
          <SelectContent>
            {filteredChapters.map((chapter) => (
              <SelectItem key={chapter.id} value={chapter.id}>
                {chapter.name} - {chapter.city}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!formData.state && (
          <p className="text-sm text-muted-foreground">
            Primero selecciona tu provincia/estado para ver los capítulos disponibles
          </p>
        )}
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Multimedia</h3>
        
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="logo">Logo de Empresa</Label>
            <div className="flex flex-col gap-2">
              {formData.logo_url && (
                <img src={formData.logo_url} alt="Logo" className="w-32 h-32 object-cover rounded" />
              )}
              <Label htmlFor="logo" className="cursor-pointer">
                <div className="flex items-center gap-2 border-2 border-dashed rounded p-4 hover:bg-muted">
                  {uploading === "logo" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  <span className="text-sm">Subir logo</span>
                </div>
                <Input
                  id="logo"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => handleFileUpload(e, "logo")}
                  className="hidden"
                />
              </Label>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="photo">Foto Personal</Label>
            <div className="flex flex-col gap-2">
              {formData.photo_url && (
                <img src={formData.photo_url} alt="Foto" className="w-32 h-32 object-cover rounded" />
              )}
              <Label htmlFor="photo" className="cursor-pointer">
                <div className="flex items-center gap-2 border-2 border-dashed rounded p-4 hover:bg-muted">
                  {uploading === "photo" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  <span className="text-sm">Subir foto</span>
                </div>
                <Input
                  id="photo"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => handleFileUpload(e, "photo")}
                  className="hidden"
                />
              </Label>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="video">Vídeo de Presentación</Label>
            <div className="flex flex-col gap-2">
              {formData.video_url && (
                <video src={formData.video_url} controls className="w-full h-32 rounded" />
              )}
              <Label htmlFor="video" className="cursor-pointer">
                <div className="flex items-center gap-2 border-2 border-dashed rounded p-4 hover:bg-muted">
                  {uploading === "video" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  <span className="text-sm">Subir vídeo</span>
                </div>
                <Input
                  id="video"
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime"
                  onChange={(e) => handleFileUpload(e, "video")}
                  className="hidden"
                />
              </Label>
            </div>
          </div>
        </div>
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Guardando..." : "Guardar Perfil"}
      </Button>
    </form>
  );
}
