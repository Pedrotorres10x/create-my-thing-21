

# Plan: Sistema de Comisiones del 10% con Plazo de 30 Dias

## Resumen

Cuando un miembro recibe un trato gracias a una recomendacion, declara su beneficio y tiene 30 dias para pagar el 10% al recomendador. Sin Stripe por ahora -- se prepara la logica y la UI, el pago real se conectara mas adelante.

---

## Cambios en la Base de Datos

Ampliar la tabla `deals` con los campos necesarios para la comision:

| Campo nuevo | Tipo | Descripcion |
|---|---|---|
| `declared_profit` | NUMERIC | Beneficio que declara el receptor |
| `commission_amount` | NUMERIC | 10% calculado automaticamente |
| `commission_status` | TEXT | `pending`, `paid`, `overdue` |
| `commission_due_date` | TIMESTAMPTZ | `completed_at + 30 dias` |
| `commission_paid_at` | TIMESTAMPTZ | Cuando se paga |

Actualizar el trigger `update_deal_counters`:
- Cuando un deal pasa a `completed`, calcular `commission_amount = declared_profit * 0.10` y fijar `commission_due_date = completed_at + 30 dias`
- El `total_deal_value` del receptor se basa en `declared_profit` (no en `deal_value`)

---

## Flujo del Trato (Deal Flow)

```text
+------------------+     +-------------------+     +--------------------+
| Referrer crea    | --> | Receiver confirma | --> | Receiver declara   |
| deal (pending)   |     | (confirmed)       |     | beneficio y cierra |
+------------------+     +-------------------+     | (completed)        |
                                                    +--------------------+
                                                            |
                                                    Auto: comision = 10%
                                                    Auto: due_date = +30d
                                                            |
                                                    +--------------------+
                                                    | Boton "Pagar       |
                                                    | comision" visible  |
                                                    | hasta 30 dias      |
                                                    +--------------------+
```

---

## Cambios en la UI

### 1. Pagina de Referidos (`Referrals.tsx`) - Tab "Referir Cliente"
Transformar el placeholder actual en un flujo funcional:
- Formulario para crear un deal: seleccionar miembro de la tribu, descripcion del contacto que le pasas
- El deal se crea con status `pending`

### 2. Nuevo componente: `DealCard.tsx`
Tarjeta que muestra un deal con:
- Nombre del referrer / receiver
- Descripcion del trato
- Estado actual (pendiente, confirmado, completado)
- Si completado: beneficio declarado, comision calculada, dias restantes para pagar
- Boton "Pagar comision" (deshabilitado por ahora, dira "Proximamente via Stripe")
- Indicador visual cuando quedan menos de 7 dias o esta vencido

### 3. Nuevo componente: `DealsList.tsx`
Lista de deals del usuario (como referrer y como receiver), con tabs:
- "Tratos enviados" (donde yo recomende a alguien)
- "Tratos recibidos" (donde me recomendaron un cliente)

### 4. Nuevo componente: `CloseDealDialog.tsx`
Dialog para que el receptor cierre un deal:
- Campo para declarar beneficio obtenido
- Muestra automaticamente el 10% de comision
- Confirmar cierre (actualiza deal a `completed`)

### 5. Integracion en el Dashboard
- El `DealLimitBanner` ya existe y funciona con `deals_completed`
- El `DealUpgradePrompt` usa `total_deal_value` que ahora sera el `declared_profit` acumulado

### 6. Chapter page
- Anadir boton "Referir" junto al boton existente de "Cara a Cara" en cada miembro de la tribu, que abre un dialog para crear el deal

---

## Seccion Tecnica

### Migracion SQL
1. `ALTER TABLE deals ADD COLUMN declared_profit NUMERIC, commission_amount NUMERIC, commission_status TEXT DEFAULT 'pending', commission_due_date TIMESTAMPTZ, commission_paid_at TIMESTAMPTZ`
2. Actualizar funcion `update_deal_counters()` para calcular comision automaticamente
3. Crear funcion `check_overdue_commissions()` que marque como `overdue` las comisiones vencidas (se puede invocar periodicamente)

### Archivos a crear
- `src/components/deals/DealCard.tsx`
- `src/components/deals/DealsList.tsx`
- `src/components/deals/CloseDealDialog.tsx`
- `src/components/deals/CreateDealDialog.tsx`

### Archivos a modificar
- `src/pages/Referrals.tsx` - reemplazar placeholder del tab "Referir" con `CreateDealDialog` y `DealsList`
- `src/pages/Chapter.tsx` - anadir boton "Referir" en cada miembro
- `src/pages/Dashboard.tsx` - ajustar para usar `declared_profit` en vez de `deal_value`

### Stripe (para despues)
- El boton "Pagar comision" quedara preparado pero deshabilitado
- Cuando se conecte Stripe, se habilitara el pago real mediante Stripe Connect
