import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Star } from "lucide-react";

const testimonials = [
  {
    name: "María González",
    role: "CEO, Consultoría Tech",
    region: "Madrid",
    plan: "Nacional",
    quote: "En 3 meses cerré dos colaboraciones que cubrieron con creces mi inversión anual. El acceso nacional fue clave.",
    rating: 5,
  },
  {
    name: "Carlos Ruiz",
    role: "Director Comercial",
    region: "Barcelona",
    plan: "Nacional",
    quote: "Pasé del plan regional al nacional y mi red de contactos se multiplicó por 5. La mejor inversión en mi carrera.",
    rating: 5,
  },
  {
    name: "Ana Martín",
    role: "Emprendedora",
    region: "Valencia",
    plan: "Nacional",
    quote: "El ROI es increíble. Cada mes genero nuevas oportunidades de negocio que no hubiera conseguido sin el acceso nacional.",
    rating: 5,
  },
];

export function SocialProof() {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold">Lo que dicen nuestros miembros Nacional</h2>
        <p className="text-muted-foreground">Historias reales de profesionales que invirtieron en su red</p>
      </div>
      
      <div className="grid md:grid-cols-3 gap-6">
        {testimonials.map((testimonial, index) => (
          <Card key={index} className="relative overflow-hidden border-primary/20 hover:border-primary/40 transition-colors">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full" />
            <CardContent className="pt-6 space-y-4">
              <div className="flex gap-1">
                {Array.from({ length: testimonial.rating }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-primary text-primary" />
                ))}
              </div>
              
              <p className="text-sm italic text-muted-foreground">
                "{testimonial.quote}"
              </p>
              
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                    {testimonial.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-sm">{testimonial.name}</p>
                  <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                  <p className="text-xs text-primary font-medium">Plan {testimonial.plan} • {testimonial.region}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      <div className="text-center">
        <div className="inline-flex flex-col items-center gap-2 p-6 bg-primary/10 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              {[1,2,3,4,5].map((i) => (
                <Avatar key={i} className="border-2 border-background">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {String.fromCharCode(65 + i)}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>
            <span className="text-sm font-medium">+200 miembros Nacional activos</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Tasa de renovación del 94% • Satisfacción promedio 4.8/5
          </p>
        </div>
      </div>
    </div>
  );
}
