# Plan de desarrollo — Frontend

Slices verticales: cada uno termina navegable y con tests, no con una capa a medias.
Uno por sesión, con `/clear` entre medio.

Las reglas permanentes están en `CLAUDE.md` y aplican a todos los slices.

---

## Slice 0 — Fundaciones

El scaffolding base ya está hecho con `ng new` (Angular 22, SCSS, zoneless, routing).
Este slice completa lo que falta:

- ESLint + Prettier configurados
- Vitest andando con un test trivial
- **Tokens visuales** extraídos de `docs/design-reference/`: paleta con valores concretos,
  tipografías por rol (incluida la utilitaria para números), escala de espaciado,
  y los tres estados semánticos (positivo, negativo, **estimado**)
- Cliente HTTP con interceptor de JWT y manejo uniforme de errores
- Pipes de formato: importes (string → formato argentino con separador de miles) y
  fechas (ISO → `dd/MM/yyyy`)
- Layout base: navegación lateral, selector de campaña activa, header
- Modelos TypeScript de los DTOs, leídos de los controllers del backend
- Servicio de enums que consume `GET /api/metadata/enums` y cachea

**Aceptación**: `npm test` y `npm run build` en verde. Los pipes tienen tests, incluido
el de fecha en UTC−3 (`"2026-03-15"` se muestra como `15/03/2026`, no `14/03/2026`).

---

## Slice 1 — Auth

- Pantalla de login (sin registro público)
- Manejo del JWT y su persistencia
- Guard de rutas
- `GET /api/auth/me` y signal de usuario autenticado
- Logout

**Aceptación**: una ruta protegida redirige a login sin token; el token expirado se
maneja sin dejar la app en estado roto.

---

## Slice 2 — Catálogos

Lotes, cultivos, insumos y compradores. **Es el slice que más patrones reutilizables
deja**: listado, formulario modal, baja lógica, validación y errores. Resolverlo bien
acelera todo lo que sigue.

- Listado, alta, edición, baja lógica y reactivación de las cuatro entidades
- Filtro por tipo en insumos; toggle de ver dados de baja en todos
- Formulario de cultivo con unidad de producción, kilos por unidad, singular/plural y
  **precios de referencia por calidad** (son los que producen el margen estimado, así
  que tienen que ser fáciles de actualizar)
- Desplegables poblados desde el servicio de enums

**Aceptación**: dar de baja un insumo lo saca de los desplegables pero no afecta el
histórico; los formularios validan antes de habilitar el guardado.

---

## Slice 3 — Campaña y siembra

- Alta de campaña y cierre (pasa a solo lectura)
- Selector de campaña activa como contexto global, siempre visible
- "Sembrar un lote": crea un `LoteCampania` eligiendo lote y cultivo de los catálogos.
  **No confundir con crear un lote**, que es del catálogo
- Manejo de `ciclo` para sembrar el mismo lote dos veces en una campaña
- Tablero: indicadores de campaña y tabla de lote-campaña

**Aceptación**: una campaña cerrada no permite cargar nada y se ve claramente por qué;
el tablero recalcula indicadores sobre totales, no promediando lotes.

---

## Slice 4 — La pantalla central ⭐

El detalle de lote-campaña. Es la razón de existir del producto.

- Encabezado con lote, cultivo, variedad, superficie y fechas
- **Costo por bolsa como dato dominante**, con la leyenda de precio de indiferencia
- Input "me ofrecen por bolsa" con su resultado: cuánto se gana o pierde por unidad y
  sobre el stock disponible
- Indicadores: costo total, costo por hectárea, rendimiento por hectárea, tasa de
  descarte
- **Desglose por los cuatro rubros** (insumos, mano de obra, labores y servicios,
  indirectos) con importe y porcentaje
- Feed unificado de movimientos desde `GET /lote-campanias/{id}/movimientos`
- Formulario de **tarea** con las cuatro modalidades de pago y total en vivo
- Formulario de **aplicación de insumo** con precio multimoneda y total en vivo
- Estados vacíos: sin cosecha, sin ventas

**Aceptación**: los cuatro rubros suman el costo total; el formulario de tarea cambia
de campos según la modalidad sin mostrar los que no aplican; funciona en ancho de
celular.

---

## Slice 5 — Cosecha y ventas

- Carga de cosecha con número de corte y las tres calidades juntas
- Ventas en las dos modalidades (precio cerrado y consignación)
- Flujo de completar la liquidación de una consignación pendiente
- **Los dos márgenes con su desglose**: liquidado, entregado sin liquidar, stock en
  galpón, menos costo total
- Estado "pendiente de liquidar" visible y accionable

**Aceptación**: el margen realizado y el estimado se muestran siempre los dos, con los
estimados marcados visualmente; no se puede vender más de lo cosechado por calidad ni
vender descarte.

---

## Slice 6 — Costos indirectos y reportes

- Alta de costo indirecto con criterio de prorrateo y **vista previa del reparto**
  entre lotes antes de confirmar
- Resumen de campaña
- Comparativa entre campañas por cultivo
- Selector global de moneda (pesos / dólares)

**Aceptación**: la vista previa del prorrateo suma exactamente el importe original.

---

## Checklist por slice

- [ ] Componentes standalone, sin `NgModule`
- [ ] `@if` / `@for`, no `*ngIf` / `*ngFor`
- [ ] Signal Forms, no `FormBuilder`
- [ ] Ningún importe recalculado en el front
- [ ] Ninguna fecha de negocio pasada por `new Date()`
- [ ] Enums desde la API, no hardcodeados
- [ ] Estimados con su tratamiento visual propio
- [ ] Probado en ancho de celular
- [ ] `npm test` y `npm run lint` en verde
- [ ] Ningún término de granos se coló
