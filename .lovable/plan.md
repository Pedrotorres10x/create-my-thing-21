

# Rebranding Tribal - Mapeo Completo de Terminologia

## Mapeo de terminos (Actual -> Nuevo)

| Seccion | Actual | Nuevo | Logica |
|---------|--------|-------|--------|
| Dashboard | Mi Tablero | **Mi Refugio** | Tu base, donde arrancas el dia |
| Perfil | Mi Marca | **Mi Totem** | Lo que te representa ante la tribu |
| Suscripciones | Mi Apuesta | **Mi Pacto** | Tu compromiso con la tribu |
| Referidos | Mi Red | **Mis Senderos** | Los caminos por donde circulan clientes y miembros |
| Chapter | Mi Trinchera | **Mi Tribu** | Tu grupo local de profesionales |
| Esfera | Mi Terreno | **Mi Aldea** | Tu territorio profesional ampliado |
| Reuniones | Cara a Cara | **El Ritual** | El encuentro sagrado 1-a-1 |
| Feed | La Calle | **La Fogata** | Donde la tribu se reune a compartir |
| Rankings | La Liga | **La Cumbre** | Los que mas han aportado estan arriba |
| Grupo nav principal | Mi Juego | **Mi Tierra** | Lo personal |
| Grupo nav comunidad | Mi Gente | **La Tribu** | Lo colectivo |

## Landing page (Index)

Se actualizara toda la terminologia: "Tu Trinchera" pasa a "Tu Tribu", y el copy se ajusta al campo semantico tribal (tribu, aldea, fogata, senderos, ritual).

## Archivos a modificar

### Sidebar y navegacion
- `src/components/AppSidebar.tsx` - Todos los nombres de menu y grupos

### Paginas (titulos y textos internos)
- `src/pages/Dashboard.tsx` - "Mi Tablero" a "Mi Refugio"
- `src/pages/Profile.tsx` - "Mi Marca" a "Mi Totem"
- `src/pages/Subscriptions.tsx` - "Mi Apuesta" a "Mi Pacto"
- `src/pages/Referrals.tsx` - "Mi Red" a "Mis Senderos", tabs internas
- `src/pages/Chapter.tsx` - "Mi Trinchera" a "Mi Tribu"
- `src/pages/MyBusinessSphere.tsx` - "Mi Terreno" a "Mi Aldea"
- `src/pages/Meetings.tsx` - "Cara a Cara" a "El Ritual"
- `src/pages/Feed.tsx` - "La Calle" a "La Fogata"
- `src/pages/Rankings.tsx` - "La Liga" a "La Cumbre"
- `src/pages/Index.tsx` - Landing completa con terminologia tribal

### Edge function (onboarding de Alic.ia)
- `supabase/functions/conector-chat/index.ts` - Actualizar el system prompt para que Alic.ia use la terminologia tribal en todo el flujo de onboarding (Mi Tribu, El Ritual, Mis Senderos, etc.)

### Otros componentes con menciones
- `src/components/ProfessionalContactWarning.tsx` - Si menciona terminologia vieja
- Cualquier componente que referencie "trinchera", "tablero", "calle", etc.

## Notas
- Las rutas URL no cambian (siguen siendo /dashboard, /chapter, /feed, etc.) - solo cambian los textos visibles
- La logica de negocio no se toca, solo presentacion
