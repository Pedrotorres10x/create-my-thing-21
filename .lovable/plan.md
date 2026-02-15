
# Clasificar profesiones: Referidores vs Receptores

## El problema

En CONECTOR conviven dos tipos de profesionales con dinámicas opuestas:

- **Referidores** (panadería, bar, administración de lotería): generan muchos leads pero rara vez reciben. Nadie paga comisión por recomendar "toma un café en el bar X".
- **Receptores** (inmobiliaria, abogado, arquitecto): reciben clientes y pagan agradecimientos por los leads cerrados.

Actualmente el sistema trata a todos por igual, lo cual no refleja la realidad del ecosistema.

## La solución

Añadir un campo `referral_role` a la tabla `specializations` que clasifique cada sector profesional como:

- `referrer` -- Genera leads (negocios de proximidad/tráfico)
- `receiver` -- Recibe leads (servicios de alto valor)
- `hybrid` -- Ambos roles (puede generar y recibir, por ejemplo un consultor)

## Cambios en base de datos

**1. Migración: añadir columna a `specializations`**

```sql
ALTER TABLE specializations
ADD COLUMN referral_role text NOT NULL DEFAULT 'hybrid';
```

**2. Poblar los datos iniciales**

Clasificación propuesta:

| Sector | Rol |
|--------|-----|
| Restaurantes, Catering, Comercio Minorista, Actividad Física y Deporte, Nutrición | `referrer` |
| Inmobiliaria, Servicios Legales, Consultoría Empresarial, Arquitectura, Construcción Residencial, Asesoría Financiera, Banca y Finanzas, Seguros, Ciberseguridad, Computación en la Nube, Desarrollo de Software, Automatización, Producción Industrial | `receiver` |
| Marketing Digital, Diseño Gráfico, Redes Sociales, Coaching, Formación Corporativa, Formación Online, Comercio Electrónico, Contabilidad, Medicina General | `hybrid` |

```sql
UPDATE specializations SET referral_role = 'referrer'
WHERE name IN ('Restaurantes', 'Catering', 'Comercio Minorista', 'Actividad Física y Deporte', 'Nutrición');

UPDATE specializations SET referral_role = 'receiver'
WHERE name IN ('Inmobiliaria', 'Servicios Legales', 'Consultoría Empresarial', 'Arquitectura',
  'Construcción Residencial', 'Asesoría Financiera', 'Banca y Finanzas', 'Seguros',
  'Ciberseguridad', 'Computación en la Nube', 'Desarrollo de Software', 'Automatización', 'Producción Industrial');

UPDATE specializations SET referral_role = 'hybrid'
WHERE name IN ('Marketing Digital', 'Diseño Gráfico', 'Redes Sociales', 'Coaching',
  'Formación Corporativa', 'Formación Online', 'Comercio Electrónico', 'Contabilidad', 'Medicina General');
```

## Detalles tecnicos

### Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| Migración SQL | Añadir columna `referral_role` a `specializations` + UPDATE con datos |
| Sin cambios de frontend en esta fase | La clasificación queda lista en BD para que las siguientes funcionalidades la usen |

### Por que a nivel de `specializations` y no de `profession_specializations`

- La tabla `specializations` es el nivel "sector" (Inmobiliaria, Restaurantes, etc.)
- La tabla `profession_specializations` es el detalle (Inmobiliaria Residencial, Inmobiliaria Comercial)
- El rol referidor/receptor se determina por sector, no por sub-especialidad: todas las inmobiliarias son receptoras, todos los restaurantes son referidores

### Uso futuro de esta clasificación

Una vez implementada, esta columna será la base para:
- Adaptar la UX de recomendación (mostrar u ocultar flujos segun rol)
- Ponderar los rankings de forma diferente
- Personalizar los mensajes de Alic.IA
- Mostrar metricas relevantes segun el tipo de profesional
