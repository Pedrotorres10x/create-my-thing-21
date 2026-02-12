

# Consejo de Sabios: Poder Real sobre Expulsiones + Narrativa de Prestigio

## Resumen

Convertir el Consejo de Sabios en el organo que **decide** las expulsiones por inactividad, en lugar de que sean automaticas. Ademas, reforzar la narrativa para que estar en el Consejo se sienta como "ser el que manda" -- prestigio real con poder real.

## Cambios en el flujo de expulsion

Actualmente, cuando un usuario llega a 6 meses sin dar referidos, el sistema (`check-inactivity`) lo expulsa directamente. El nuevo flujo sera:

1. Los **3 primeros avisos** (meses 3, 4 y 5) siguen siendo automaticos -- no cambian
2. Al llegar a **6 meses**, en lugar de expulsar directamente:
   - Se crea una **solicitud de expulsion** (`expulsion_reviews`) dirigida al Consejo de Sabios
   - El usuario queda en estado `pending_expulsion` (no se expulsa aun)
   - Se notifica a los 3 miembros del Consejo
3. Los miembros del Consejo **votan**: expulsar, dar prorroga (1 mes mas), o absolver
4. **Mayoria simple** (2 de 3 votos) decide el resultado
5. Si el Consejo no actua en 7 dias, se ejecuta la expulsion automaticamente (fallback)

## Cambios en solicitudes de reentrada

Las `reentry_requests` existentes tambien pasan por el Consejo:
- El usuario expulsado solicita reentrada (tras 6 meses de espera)
- El Consejo revisa y vota: aprobar o rechazar
- Misma mecanica de mayoria simple

## Esquema de base de datos

### Nueva tabla: `expulsion_reviews`

| Columna | Tipo | Descripcion |
|---------|------|-------------|
| id | uuid (PK) | ID unico |
| professional_id | uuid (FK) | Usuario propuesto para expulsion |
| trigger_type | text | 'inactivity' / 'red_flag' / 'reports' |
| trigger_details | jsonb | Evidencia (meses inactivo, etc) |
| status | text | 'pending' / 'approved' / 'rejected' / 'extended' / 'auto_expired' |
| votes_for_expulsion | int | Contador de votos a favor |
| votes_against | int | Contador en contra |
| votes_extend | int | Votos por prorroga |
| decided_at | timestamptz | Cuando se alcanzo mayoria |
| auto_expire_at | timestamptz | 7 dias tras creacion (fallback) |
| created_at | timestamptz | Fecha creacion |

### Nueva tabla: `expulsion_votes`

| Columna | Tipo | Descripcion |
|---------|------|-------------|
| id | uuid (PK) | ID unico |
| review_id | uuid (FK) | Referencia a expulsion_reviews |
| voter_id | uuid (FK) | Miembro del Consejo que vota |
| vote | text | 'expel' / 'absolve' / 'extend' |
| reasoning | text | Justificacion del voto |
| created_at | timestamptz | Fecha del voto |

Restriccion UNIQUE en (review_id, voter_id) para evitar doble voto.

### Modificacion de `reentry_requests`

Agregar columna `committee_review_id` (uuid, FK a expulsion_reviews) para vincular reentradas al mismo sistema de votacion del Consejo.

## Cambios en Edge Function `check-inactivity`

- En el nivel 4 (6 meses), **ya no expulsa directamente**
- En su lugar, crea un registro en `expulsion_reviews` con status `pending`
- Calcula `auto_expire_at` = ahora + 7 dias
- Envia notificacion a los 3 miembros del Consejo via Alic.ia y push

## Nueva Edge Function: `process-expulsion-votes`

- Se ejecuta via cron diario
- Busca `expulsion_reviews` donde:
  - Ya hay 2+ votos iguales (mayoria) --> ejecuta decision
  - `auto_expire_at` ha pasado sin mayoria --> expulsion automatica
- Actualiza el estado del profesional segun la decision

## Cambios en la UI del Consejo de Sabios

### Rebranding narrativo

- Titulo: **"El Consejo"** (subtitulo: "Los que deciden")
- Descripcion: "Los 3 profesionales con mayor ranking tienen el poder de decidir quien se queda y quien se va"
- Miembros mostrados con badges especiales: el #1 es "El Estratega", #2 "El Guardian", #3 "El Juez"
- Cada miembro ve su poder como algo exclusivo y aspiracional

### Nueva pestana: "Expulsiones"

Ademas de las pestanas existentes (Pendientes, En revision), se anade:
- **"Expulsiones"**: muestra los casos de inactividad pendientes de voto
- Cada caso muestra:
  - Nombre y datos del usuario propuesto
  - Meses de inactividad y evidencia
  - Estado de los votos actuales (quien ha votado que, sin revelar el voto especifico hasta que haya mayoria)
  - Botones: "Expulsar", "Absolver", "Dar prorroga (1 mes)"
  - Campo de texto para justificacion obligatoria

### Nueva pestana: "Reentradas"

- Solicitudes de usuarios expulsados que piden volver
- Misma mecanica de votacion
- Muestra historial del usuario (por que fue expulsado, cuanto tiempo lleva fuera)

### Historial de decisiones

Al final de la pagina, seccion de "Decisiones pasadas" con las votaciones resueltas, mostrando:
- Caso, resultado, votos de cada miembro
- Transparencia total entre los 3 miembros

## Notificaciones

- Cuando se crea un caso de expulsion, los 3 miembros reciben notificacion push + mensaje de Alic.ia:
  "Tienes un caso pendiente en El Consejo. Tu voto es necesario."
- Cuando se resuelve un caso, el usuario afectado recibe notificacion con la decision
- Si un miembro no ha votado a las 48h, recibe recordatorio

## Archivos a crear/modificar

| Archivo | Accion |
|---------|--------|
| Migracion SQL | Crear tablas `expulsion_reviews` y `expulsion_votes`, modificar `reentry_requests` |
| `supabase/functions/check-inactivity/index.ts` | Cambiar nivel 4 para crear review en vez de expulsar |
| `supabase/functions/process-expulsion-votes/index.ts` | **Nuevo** - Cron para procesar votos y fallback |
| `src/hooks/useEthicsCommittee.tsx` | Agregar queries para expulsion reviews, votos y reentradas |
| `src/pages/EthicsCommittee.tsx` | Rebranding + pestanas Expulsiones y Reentradas + sistema de votacion |
| `supabase/config.toml` | Agregar cron para `process-expulsion-votes` |

