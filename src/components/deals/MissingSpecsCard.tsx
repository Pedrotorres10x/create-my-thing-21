import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertTriangle, CheckCircle, Target } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface SphereExample {
  name: string;
  why: string;
}

// Fallback examples per sphere with persuasive descriptions
const SPHERE_EXAMPLES: Record<string, SphereExample[]> = {
  "Esfera Inmobiliaria": [
    { name: "Tasador", why: "Tu cliente necesita saber cuánto vale su casa antes de vender. Tú se lo mandas, él te manda compradores." },
    { name: "Arquitecto", why: "Reformas, certificados energéticos, cédulas… el mismo cliente que compra una casa necesita un arquitecto." },
    { name: "Abogado hipotecario", why: "Cada operación inmobiliaria necesita asesoría legal. Compartís exactamente el mismo cliente." },
    { name: "Home staging", why: "Tú vendes más rápido con sus servicios, él solo trabaja si tú le pasas pisos. Simbiosis pura." },
    { name: "Reformista", why: "El comprador siempre quiere reformar. Si tú le das el contacto, vuelven a ti para la siguiente operación." },
    { name: "Notaría", why: "Toda compraventa pasa por notaría. Tener uno en tu Tribu acelera los cierres." },
    { name: "Administrador de fincas", why: "Gestiona las comunidades de tus clientes. Él detecta propietarios que quieren vender." },
    { name: "Interiorista", why: "El comprador de alto valor siempre busca interiorista. Tú se lo das, él te refiere clientes premium." },
  ],
  "Esfera Digital": [
    { name: "Diseñador web", why: "Tu cliente de marketing necesita web. Tú se lo mandas, él te manda clientes que necesitan tráfico." },
    { name: "SEO", why: "Compartís el mismo cliente: empresas que quieren vender online. Uno sin el otro pierde dinero." },
    { name: "Community manager", why: "Las redes son la puerta de entrada. Él capta, tú cierras. El mismo cliente os necesita a los dos." },
    { name: "Desarrollo de apps", why: "Cuando el negocio crece, quieren app. Tú detectas la necesidad antes que nadie." },
    { name: "Fotografía profesional", why: "Todo proyecto digital necesita fotos. Es el complemento perfecto que tu cliente siempre pide." },
    { name: "Copywriter", why: "Sin textos que vendan, tu web no convierte. Os necesitáis mutuamente." },
    { name: "Publicidad online", why: "Tú creas el activo digital, él le mete gasolina. El cliente os contrata a los dos." },
    { name: "Analista de datos", why: "Mide lo que tú construyes. Tu cliente quiere resultados, y él los demuestra." },
  ],
  "Esfera Salud y Bienestar": [
    { name: "Fisioterapeuta", why: "Tu paciente con dolor de espalda necesita fisio. Tú le mandas pacientes, él te manda los suyos." },
    { name: "Nutricionista", why: "Salud integral: tu cliente quiere cuidarse. Si tú le recomiendas, confía más en ti." },
    { name: "Psicólogo", why: "Salud mental y física van de la mano. El mismo perfil de cliente os busca a los dos." },
    { name: "Dentista", why: "Todo el mundo necesita dentista. Es el profesional con más potencial de referencias cruzadas." },
    { name: "Osteópata", why: "Complementa tu servicio. Entre los dos cubrís más necesidades del mismo paciente." },
    { name: "Entrenador personal", why: "Tu paciente quiere ponerse en forma. Tú le curas, él le fortalece. Mismo cliente." },
    { name: "Podólogo", why: "Especialista que todo el mundo necesita. Detecta problemas posturales y te refiere casos." },
    { name: "Farmacéutico", why: "Ve a cientos de personas al día. Es una máquina de detectar necesidades de salud." },
  ],
  "Esfera Servicios Empresariales": [
    { name: "Gestoría", why: "Toda empresa necesita gestoría. Él ve las cuentas y detecta necesidades que tú cubres." },
    { name: "Abogado mercantil", why: "Contratos, sociedades, conflictos… tu cliente empresarial siempre necesita abogado." },
    { name: "Consultor fiscal", why: "Ahorra dinero a tu mismo cliente. Cuando uno ahorra, el otro factura más." },
    { name: "RRHH", why: "Empresas que crecen necesitan contratar. Él ve la necesidad antes que nadie." },
    { name: "Seguros", why: "Todo empresario necesita seguros. Es el perfil que más clientes ve cada semana." },
    { name: "Auditoría", why: "Revisa las tripas del negocio. Detecta oportunidades que tú puedes cubrir." },
    { name: "Coach empresarial", why: "Trabaja la mentalidad del empresario. Cuando el jefe crece, toda la empresa invierte." },
    { name: "Traductor jurado", why: "Empresas internacionales necesitan traducciones. Nicho pequeño pero con clientes de alto valor." },
  ],
  "Esfera Producción e Industria": [
    { name: "Logística", why: "Toda fábrica necesita mover producto. Él conecta con empresas industriales a diario." },
    { name: "Control de calidad", why: "Certificaciones, auditorías… el mismo cliente industrial os necesita a los dos." },
    { name: "Mantenimiento industrial", why: "Máquinas paradas = dinero perdido. Él entra en todas las fábricas de la zona." },
    { name: "Automatización", why: "La industria se digitaliza. Tú aportas producción, él aporta eficiencia. Mismo cliente." },
    { name: "Ingeniería", why: "Proyectos técnicos de alto valor. Cada proyecto genera necesidades que tú puedes cubrir." },
    { name: "Prevención de riesgos", why: "Obligatorio por ley. Él entra en todas las empresas. Máquina de contactos industriales." },
    { name: "Compras", why: "Gestiona proveedores. Conoce a todas las empresas del sector y sus necesidades." },
    { name: "Embalaje", why: "Toda producción necesita embalaje. Complemento natural que comparte tu cartera de clientes." },
  ],
  "Esfera Alimentación y Hostelería": [
    { name: "Chef", why: "El alma del negocio gastronómico. Conoce a todos los dueños de restaurantes de la zona." },
    { name: "Sumiller", why: "Bodegas, eventos, restaurantes premium… mueve un sector de alto margen." },
    { name: "Proveedor de producto", why: "Entra en todos los restaurantes cada semana. Ve necesidades antes que nadie." },
    { name: "Diseño de cartas", why: "Todo restaurante renueva su carta. Él entra, tú le sigues. Mismo cliente." },
    { name: "Marketing gastronómico", why: "Redes, fotos, reseñas… el hostelero necesita visibilidad y tú se la das." },
    { name: "Gestión de sala", why: "Formación de equipos, servicio al cliente… complementa tu oferta gastronómica." },
    { name: "Dietista", why: "Menús saludables, alérgenos, tendencias… el hostelero moderno lo necesita." },
    { name: "Delivery", why: "El canal que más crece. Conecta con todos los restaurantes que quieren vender online." },
  ],
  "Esfera Retail y Comercio": [
    { name: "Visual merchandising", why: "Tu tienda vende más con mejor presentación. Él necesita tiendas, tú necesitas clientes." },
    { name: "E-commerce", why: "Todo comercio quiere vender online. Es el complemento digital natural del retail." },
    { name: "Escaparatismo", why: "La primera impresión vende. Él entra en todos los comercios de la zona." },
    { name: "Franquicias", why: "Expansión, nuevas aperturas… cada franquicia necesita todo tipo de servicios." },
    { name: "Logística retail", why: "Almacén, distribución, última milla… el comercio no funciona sin logística." },
    { name: "Atención al cliente", why: "Formación de equipos de venta. Mejora la conversión de tu tienda." },
    { name: "Trade marketing", why: "Promociones, PLV, campañas en punto de venta. El mismo cliente que compra en tu tienda." },
    { name: "Gestión de stock", why: "Inventario optimizado = más margen. Complemento técnico que todo comercio necesita." },
  ],
  "Esfera Formación y Desarrollo": [
    { name: "Coach ejecutivo", why: "Directivos que invierten en sí mismos. Alto ticket, clientes recurrentes." },
    { name: "Formador de ventas", why: "Toda empresa quiere vender más. Él entra por la puerta grande de las empresas." },
    { name: "E-learning", why: "Digitaliza la formación. Complemento natural para escalar tu servicio." },
    { name: "Oratoria", why: "Hablar en público es la habilidad más demandada. Conecta con directivos y emprendedores." },
    { name: "Team building", why: "Empresas que cuidan a su equipo. Alto presupuesto, eventos recurrentes." },
    { name: "Mentoring", why: "Acompañamiento personalizado. El mismo perfil de cliente que busca formación premium." },
    { name: "PNL", why: "Programación neurolingüística aplicada a ventas y liderazgo. Mismo público objetivo." },
    { name: "Gamificación", why: "Hace la formación más efectiva. Complemento innovador que diferencia tu propuesta." },
  ],
};

interface MissingSpec {
  id: number;
  name: string;
  description?: string;
}

interface MissingSpecsProps {
  professionalId: string;
}

export const MissingSpecsCard = ({ professionalId }: MissingSpecsProps) => {
  const [missing, setMissing] = useState<MissingSpec[]>([]);
  const [covered, setCovered] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [sphereName, setSphereName] = useState("");

  useEffect(() => {
    fetchMissingSpecs();
  }, [professionalId]);

  const fetchMissingSpecs = async () => {
    try {
      const { data: prof } = await (supabase as any)
        .from("professionals")
        .select("business_sphere_id, chapter_id, business_spheres(name)")
        .eq("id", professionalId)
        .single();

      if (!prof?.business_sphere_id || !prof?.chapter_id) {
        setLoading(false);
        return;
      }

      const sName = prof.business_spheres?.name || "";
      setSphereName(sName);

      const { data: sphereSpecs } = await (supabase as any)
        .from("sphere_specializations")
        .select("specialization_id, specializations(id, name)")
        .eq("business_sphere_id", prof.business_sphere_id);

      const { data: chapterMembers } = await (supabase as any)
        .from("professionals")
        .select("specialization_id, specializations(name)")
        .eq("chapter_id", prof.chapter_id)
        .eq("status", "approved")
        .not("specialization_id", "is", null);

      const coveredIds = new Set(
        (chapterMembers || []).map((m: any) => m.specialization_id)
      );
      const coveredNames: string[] = (chapterMembers || [])
        .filter((m: any) => m.specializations?.name)
        .map((m: any) => m.specializations.name as string);
      setCovered([...new Set(coveredNames)]);

      let missingSpecs: MissingSpec[] = (sphereSpecs || [])
        .filter((ss: any) => !coveredIds.has(ss.specialization_id))
        .map((ss: any) => ({
          id: ss.specializations?.id,
          name: ss.specializations?.name,
        }))
        .filter((s: MissingSpec) => s.name);

      // Always ensure 5 examples using fallback
      const fallbackExamples = SPHERE_EXAMPLES[sName] || [];
      const coveredSet = new Set(coveredNames.map(n => n.toLowerCase()));
      const existingNames = new Set(missingSpecs.map(s => s.name.toLowerCase()));

      if (missingSpecs.length < 5 && fallbackExamples.length > 0) {
        const extras = fallbackExamples
          .filter(ex => !coveredSet.has(ex.name.toLowerCase()) && !existingNames.has(ex.name.toLowerCase()))
          .slice(0, 5 - missingSpecs.length)
          .map((ex, i) => ({ id: -(i + 1), name: ex.name, description: ex.why }));
        missingSpecs = [...missingSpecs, ...extras];
      }

      // Add descriptions to DB specs that don't have one
      missingSpecs = missingSpecs.map(spec => {
        if (!spec.description) {
          const fallback = fallbackExamples.find(ex => ex.name.toLowerCase() === spec.name.toLowerCase());
          return { ...spec, description: fallback?.why };
        }
        return spec;
      });

      setMissing(missingSpecs);
    } catch (error) {
      console.error("Error fetching missing specs:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Skeleton className="h-32 w-full" />;
  if (!sphereName) return null;

  const displayMissing = missing.slice(0, 5);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Target className="h-4 w-4" />
          Huecos en tu Trinchera
        </CardTitle>
        <CardDescription>
          Profesiones de <span className="font-medium">{sphereName}</span> que aún no tiene tu grupo. Compartís el mismo tipo de cliente — ficha a uno y todos ganáis más.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {displayMissing.length === 0 ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-primary">
              <CheckCircle className="h-4 w-4" />
              ¡Tu tribu cubre todas las profesiones de tu esfera!
            </div>
            {covered.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {covered.slice(0, 5).map((name) => (
                  <Badge key={name} variant="secondary">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    {name}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              {missing.length} {missing.length === 1 ? "profesión sin cubrir" : "profesiones sin cubrir"} — cada hueco es dinero que se escapa
            </p>
            <div className="space-y-2">
              {displayMissing.map((spec) => (
                <div
                  key={spec.id}
                  className="flex items-start gap-3 p-3 rounded-lg border border-destructive/20 bg-destructive/5"
                >
                  <Badge variant="outline" className="border-destructive text-destructive shrink-0 mt-0.5">
                    {spec.name}
                  </Badge>
                  {spec.description && (
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {spec.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
            {missing.length > 5 && (
              <p className="text-xs text-muted-foreground">
                Y {missing.length - 5} profesiones más sin cubrir...
              </p>
            )}
            {covered.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-medium text-muted-foreground mb-2">✅ Ya cubiertas en tu Tribu</p>
                <div className="flex flex-wrap gap-2">
                  {covered.map((name) => (
                    <Badge key={name} variant="secondary">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      {name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
