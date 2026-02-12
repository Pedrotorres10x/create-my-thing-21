

# Gamificacion con Badges + Sistema de Recomendacion por Ranking

## Resumen

Dos sistemas complementarios que hacen que los puntos "se sientan como dinero":

1. **Badges visuales**: Insignias desbloqueables que se muestran en el perfil y en rankings, premiando logros concretos
2. **Recomendacion por ranking**: Cuando alguien de fuera de la provincia necesita un profesional de cierta especialidad, el sistema propone automaticamente al de mayor puntuacion de cada capitulo/grupo

---

## Parte 1: Sistema de Badges

### Concepto

Los badges son insignias permanentes que se desbloquean al cumplir hitos. Se muestran en el perfil del usuario y en la lista de rankings, creando un efecto de "coleccion" que motiva a seguir participando.

### Badges propuestos (primera version)

| Badge | Condicion | Icono |
|-------|-----------|-------|
| **Primer Referido** | Completar 1 referido exitoso | Estrella |
| **Networker** | 5 reuniones Cara a Cara completadas | Apretón de manos |
| **Conector Nato** | 10 referidos completados | Red/enlaces |
| **Cerrador** | Cerrar 5 deals | Candado |
| **Veterano** | 6 meses activo sin interrupciones | Escudo |
| **Top 10** | Estar en el Top 10 del ranking general | Medalla |
| **El Consejo** | Ser miembro del Consejo de Sabios | Corona |
| **Diamante** | Alcanzar nivel Diamante | Diamante |
| **Mentor** | Invitar a 5 profesionales que se aprueben | Libro |
| **Deal Maker** | Superar 10.000 EUR en deals cerrados | Moneda |

### Base de datos

**Nueva tabla: `badges`**
- id, code (unique), name, description, icon, category ('networking', 'deals', 'engagement', 'prestige'), unlock_condition (jsonb), created_at

**Nueva tabla: `professional_badges`**
- id, professional_id (FK), badge_id (FK), unlocked_at
- UNIQUE constraint en (professional_id, badge_id)

### Logica de desbloqueo

- Un trigger o edge function (`check-badges`) que se ejecuta cuando cambian los puntos, referidos, meetings o deals
- Verifica las condiciones de cada badge no desbloqueado
- Al desbloquear uno nuevo, inserta en `professional_badges` y muestra el modal de AchievementModal existente con confetti

### UI

- **Perfil**: Seccion "Mis Insignias" con grid de badges (desbloqueados en color, bloqueados en gris con tooltip de condicion)
- **Rankings**: Mostrar los badges mas relevantes junto al nombre de cada profesional (maximo 3 iconos)
- **Dashboard**: Notificacion cuando se desbloquea un nuevo badge

---

## Parte 2: Sistema de Recomendacion por Ranking

### Concepto

Cuando un miembro necesita un profesional de una especialidad que no existe en su propio capitulo/provincia, el sistema busca en otros capitulos y **propone al profesional con mayor puntuacion** de esa especialidad. Esto convierte el ranking en acceso directo a oportunidades de negocio.

### Flujo

```text
+-------------------------------+
| Miembro busca "Arquitecto"    |
| en su capitulo/provincia      |
+-------------------------------+
         |
         v
  +--------------------+
  | Existe en su       |----SI----> Muestra los de su capitulo
  | capitulo?          |            (ordenados por puntos)
  +--------------------+
         |
         NO
         v
  +-----------------------------+
  | Busca en TODOS los          |
  | capitulos/provincias        |
  | Filtra por especialidad     |
  | Ordena por total_points     |
  +-----------------------------+
         |
         v
  +-----------------------------+
  | Muestra "Recomendados"      |
  | con badge especial:         |
  | "Top de su zona"            |
  | El #1 aparece destacado     |
  +-----------------------------+
```

### Base de datos

**Nueva tabla: `cross_chapter_requests`**
- id, requester_id (FK professionals), requested_specialization_id, requested_sector_id, description, status ('open', 'matched', 'closed'), matched_professional_id, created_at

**Nueva vista o funcion RPC: `find_top_professionals_by_specialization`**
- Parametros: specialization_id (o profession_specialization_id), exclude_chapter_id
- Retorna: profesionales ordenados por total_points, agrupados por capitulo (el top 1 de cada uno)
- Filtra solo status = 'approved'

### UI

- **Busqueda en "Mi Terreno"**: Al buscar una especialidad sin resultados locales, aparece seccion "Profesionales recomendados de otras zonas" con el top de cada capitulo
- **Nuevo componente `CrossChapterRecommendation`**: Card destacada con el badge "Top de [Ciudad]", foto, puntos, nivel, y boton para solicitar Cara a Cara
- **Notificacion al recomendado**: Cuando alguien de otra zona lo solicita, recibe notificacion push + mensaje de Alic.ia: "Te han solicitado desde [Ciudad]. Tu ranking te posiciona como el mejor de tu zona."

### Narrativa

El mensaje clave: **"Cada punto que sumas es una puerta que se abre. Cuando alguien de otra ciudad necesite lo que tu haces, tu nombre es el primero que aparece."**

---

## Archivos a crear/modificar

| Archivo | Accion |
|---------|--------|
| Migracion SQL | Crear tablas `badges`, `professional_badges`, `cross_chapter_requests`; crear RPC `find_top_professionals_by_specialization` |
| `src/components/gamification/BadgeGrid.tsx` | **Nuevo** - Grid de badges del perfil (desbloqueados/bloqueados) |
| `src/components/gamification/BadgeIcon.tsx` | **Nuevo** - Componente individual de badge con tooltip |
| `src/components/sphere/CrossChapterRecommendation.tsx` | **Nuevo** - Card de recomendacion inter-capitulo |
| `src/pages/Profile.tsx` | Agregar seccion de badges |
| `src/pages/Rankings.tsx` | Mostrar badges junto a cada profesional |
| `src/hooks/useAchievements.tsx` | Extender para verificar badges al detectar cambios |
| `src/pages/MyBusinessSphere.tsx` | Integrar busqueda cross-chapter cuando no hay resultados locales |

---

## Secuencia de implementacion

1. Migracion: tablas de badges y datos iniciales (seed de los 10 badges)
2. Componentes de badges (BadgeGrid, BadgeIcon)
3. Logica de desbloqueo en useAchievements
4. Integracion en Profile y Rankings
5. RPC de busqueda cross-chapter
6. Tabla y UI de cross_chapter_requests
7. Componente CrossChapterRecommendation
8. Notificaciones al profesional recomendado

