# API Endpoints — Planilla de Campo

Base URL: `http://localhost:8080`

Todos los endpoints (excepto `/api/auth/registro` y `/api/auth/login`) requieren el header:

```
Authorization: Bearer <token>
```

---

## Autenticación

### `POST /api/auth/registro`
Registra un usuario nuevo. Devuelve un JWT listo para usar.

### `POST /api/auth/login`
Inicia sesión con email y contraseña. Devuelve el JWT.

### `GET /api/auth/me`
Devuelve los datos del usuario autenticado (id, nombre, email, rol).

---

## Lotes

> Campos físicos del establecimiento. Soportan baja lógica (no se borran si tienen campañas).

### `POST /api/lotes`
Crea un lote.

### `GET /api/lotes`
Lista lotes paginados. Parámetro opcional: `activo=true|false`.

### `GET /api/lotes/{id}`
Obtiene un lote por id.

### `PUT /api/lotes/{id}`
Actualiza un lote.

### `DELETE /api/lotes/{id}`
Baja lógica del lote (`activo = false`).

### `PATCH /api/lotes/{id}/reactivar`
Reactiva un lote dado de baja.

---

## Catálogo

### Cultivos

> Cebolla, zapallo, maíz, melón, sandía, etc.

#### `POST /api/cultivos`
Crea un cultivo.

#### `GET /api/cultivos`
Lista cultivos paginados. Parámetro opcional: `activo=true|false`.

#### `GET /api/cultivos/{id}`
Obtiene un cultivo por id.

#### `PUT /api/cultivos/{id}`
Actualiza un cultivo.

#### `DELETE /api/cultivos/{id}`
Baja lógica del cultivo.

#### `PATCH /api/cultivos/{id}/reactivar`
Reactiva un cultivo.

---

### Insumos

> Semillas, agroquímicos y fertilizantes del catálogo de referencia.

#### `POST /api/insumos`
Crea un insumo.

#### `GET /api/insumos`
Lista insumos paginados. Parámetros opcionales: `tipo` (enum `TipoInsumo`), `activo=true|false`.

#### `GET /api/insumos/{id}`
Obtiene un insumo por id.

#### `PUT /api/insumos/{id}`
Actualiza un insumo.

#### `DELETE /api/insumos/{id}`
Baja lógica del insumo.

#### `PATCH /api/insumos/{id}/reactivar`
Reactiva un insumo.

---

### Compradores

> Empresas o personas a quienes se vende la cosecha.

#### `POST /api/compradores`
Crea un comprador.

#### `GET /api/compradores`
Lista compradores paginados. Parámetro opcional: `activo=true|false`.

#### `GET /api/compradores/{id}`
Obtiene un comprador por id.

#### `PUT /api/compradores/{id}`
Actualiza un comprador.

#### `DELETE /api/compradores/{id}`
Baja lógica del comprador.

#### `PATCH /api/compradores/{id}/reactivar`
Reactiva un comprador.

---

## Campañas

> Una campaña agrupa uno o más lotes bajo un mismo ciclo productivo (temporada + cultivo).

### `POST /api/campanias`
Crea una campaña.

### `GET /api/campanias`
Lista campañas paginadas.

### `GET /api/campanias/{id}`
Obtiene una campaña por id.

### `PUT /api/campanias/{id}`
Actualiza los datos de una campaña.

### `PATCH /api/campanias/{id}/estado`
Cambia el estado de la campaña (body: `CambioEstadoRequest`).

### `PATCH /api/campanias/{id}/cerrar`
Cierra la campaña. Una vez cerrada, los movimientos no se pueden borrar.

---

## Lote-Campaña

> Relación entre un lote y una campaña. Aquí se registran todos los movimientos.

### `POST /api/campanias/{id}/lote-campanias`
Asocia un lote a la campaña.

### `GET /api/campanias/{id}/lote-campanias`
Lista los lote-campaña de una campaña, paginados.

**No existe `GET /api/lote-campanias/{id}`** (confirmado contra el backend real,
docs/plan-frontend.md slice 4: responde `401` con cuerpo vacío, el mismo patrón que
cualquier ruta no mapeada del backend — no es un problema de permisos). El detalle de
lote-campaña resuelve el objeto completo buscándolo dentro de
`GET /campanias/{id}/lote-campanias` de la campaña activa, no con un fetch por id.

---

## Costos por lote-campaña

### Aplicaciones de insumo

> Registro de cada aplicación de semilla, agroquímico o fertilizante.

#### `POST /api/lote-campanias/{id}/aplicaciones`
Registra una aplicación de insumo.

**Shape confirmado por bisección directa contra el backend real** (docs/plan-frontend.md
slice 4): request `{ insumoId, fecha, cantidad, unidadMedida, precioUnitario }`, con
`precioUnitario` como `MontoRequest` completo (`{ importe, moneda, tipoCambio }`,
`monto.model.ts`) — igual value object que `Insumo.precioReferencia`, se congela en la
aplicación (docs/dominio.md §8). `unidadMedida` es el enum `unidadMedida` (no el
`unidadMedida` del insumo per se): permite cargar en una unidad distinta a la del
catálogo. Respuesta (`AplicacionInsumoResponse`):

```json
{
  "id": 1,
  "loteCampaniaId": 4,
  "insumoId": 5,
  "insumoNombre": "Urea Monto3",
  "fecha": "2026-04-01",
  "cantidad": 20,
  "unidadMedida": "KG",
  "precioUnitario": { "importe": 900.5, "moneda": "ARS", "tipoCambio": 1, "importeArs": 900.5, "importeUsd": 900.5 },
  "costoTotal": { "importe": 18010.0, "moneda": "ARS", "tipoCambio": 1, "importeArs": 18010.0, "importeUsd": 18010.0 },
  "createdAt": "2026-08-24T18:28:35.914733100Z",
  "updatedAt": "2026-08-24T18:28:35.914733100Z"
}
```

`costoTotal` (`cantidad × precioUnitario`, docs/reglas-calculo.md §2) también es un
`Monto` completo, calculado por el backend.

#### `GET /api/lote-campanias/{id}/aplicaciones`
Lista aplicaciones del lote-campaña, paginadas (mismo shape que la respuesta de arriba).

#### `DELETE /api/lote-campanias/{id}/aplicaciones/{aplicacionId}`
Elimina una aplicación (solo si la campaña no está cerrada).

---

### Tareas

> Labores culturales y de cosecha (carpida, destajo, fumigación, etc.).

#### `POST /api/lote-campanias/{id}/tareas`
Registra una tarea.

**Shape confirmado por bisección directa contra el backend real** (docs/plan-frontend.md
slice 4, las cuatro modalidades probadas una por una): request
`{ fecha, tipo, ejecutor, modoCosto, cantidad, valorUnitario }`. **El campo del tipo de
tarea es `tipo`, no `tipoTarea`** (documentado distinto en versiones previas de este
archivo, sin confirmar). **`valorUnitario` es un `Monto` completo**
(`{ importe, moneda, tipoCambio }`), no un string/número suelto — la mano de obra
también puede pagarse en dólares. `cantidad` se omite en `modoCosto = TOTAL` y
`POR_HA` (la superficie la resuelve el backend leyendo el `LoteCampania`, no se manda).
**No existe ningún campo de nota/comentario**: se probó mandar `comentario` y `nota`
en el alta y el backend no persiste ninguno de los dos.

```json
{
  "id": 2,
  "loteCampaniaId": 4,
  "tipo": "RIEGO",
  "fecha": "2026-04-02",
  "ejecutor": "JORNALERO",
  "modoCosto": "JORNAL",
  "cantidad": 24,
  "valorUnitario": { "importe": 35000, "moneda": "ARS", "tipoCambio": 1, "importeArs": 35000, "importeUsd": 35000.0 },
  "costoTotal": { "importe": 840000, "moneda": "ARS", "tipoCambio": 1, "importeArs": 840000, "importeUsd": 840000.0 },
  "createdAt": "2026-08-24T18:25:07.090472200Z",
  "updatedAt": "2026-08-24T18:25:07.090472200Z"
}
```

`costoTotal` (docs/reglas-calculo.md §3, según `modoCosto`) también es un `Monto`
completo, calculado por el backend.

#### `GET /api/lote-campanias/{id}/tareas`
Lista tareas del lote-campaña, paginadas (mismo shape que la respuesta de arriba).

#### `DELETE /api/lote-campanias/{id}/tareas/{tareaId}`
Elimina una tarea (solo si la campaña no está cerrada).

---

### Cosechas

#### `POST /api/lote-campanias/{id}/cosechas`
Registra una cosecha.

**Shape confirmado por biseccion directa contra el backend real** (docs/plan-frontend.md
slice 5, reemplaza el "sin confirmar" de slice 4): el campo del numero de corte es
**`numeroCorte`, no `corte`** (nombres "razonables" como `corte` devolvian siempre
`400 CUERPO_INVALIDO`, el mismo catch-all que un JSON malformado o un campo no
reconocido por Jackson (FAIL_ON_UNKNOWN_PROPERTIES), sin mas
pista para distinguir un caso del otro salvo probando nombres alternativos uno por uno.

Request: `{ fecha, numeroCorte, calidad, cantidad }`. **`kgEquivalente` no se manda: lo
calcula el backend** (`cantidad x Cultivo.kgPorUnidad`). Si el cultivo no tiene
`kgPorUnidad` configurado, el alta falla con `422 KG_POR_UNIDAD_NO_CONFIGURADO`.

```json
{
  "id": 1,
  "loteCampaniaId": 6,
  "fecha": "2026-07-20",
  "numeroCorte": 1,
  "calidad": "PRIMERA",
  "cantidad": 100,
  "unidad": "BOLSA",
  "kgEquivalente": 2000.0
}
```

`unidad` (la `unidadProduccion` del lote-campania) tampoco se manda en el request, la
agrega la respuesta. `cantidad` y `kgEquivalente` son numero JSON.

#### `GET /api/lote-campanias/{id}/cosechas`
Lista cosechas del lote-campaña, paginadas (mismo shape que la respuesta de arriba).

#### `DELETE /api/lote-campanias/{id}/cosechas/{cosechaId}`
Elimina una cosecha (solo si la campaña no está cerrada).

---

### Movimientos y costos consolidados

#### `GET /api/lote-campanias/{id}/movimientos`
Lista todos los movimientos (aplicaciones + tareas) del lote-campaña en orden cronológico, paginados.

**Shape confirmado leyendo la respuesta real** (docs/plan-frontend.md slice 4, no hace
falta bisección para un `GET`): `tipo` es `'TAREA' | 'INSUMO'` — **no `'APLICACION'`**.
`detalleCalculo` es un string ya formateado por el backend, se muestra tal cual sin
reparsear:

```json
{
  "content": [
    {
      "id": 2,
      "tipo": "INSUMO",
      "fecha": "2026-04-02",
      "descripcion": "Urea Monto3",
      "detalleCalculo": "15 l × US$ 25",
      "costoTotal": { "importe": 375.0, "moneda": "USD", "tipoCambio": 1350.0, "importeArs": 506250.0, "importeUsd": 375.0 }
    },
    {
      "id": 2,
      "tipo": "TAREA",
      "fecha": "2026-04-02",
      "descripcion": "RIEGO",
      "detalleCalculo": "24 jornal × $ 35.000",
      "costoTotal": { "importe": 840000.0, "moneda": "ARS", "tipoCambio": 1.0, "importeArs": 840000.0, "importeUsd": 840000.0 }
    }
  ],
  "page": { "size": 20, "number": 0, "totalElements": 8, "totalPages": 1 }
}
```

> `id` **no es único entre tipos**: una tarea y una aplicación pueden compartir el
> mismo `id` (autoincrementales de tablas distintas) — el ejemplo de arriba lo muestra
> a propósito. `descripcion` es el valor crudo del enum `tipoTarea` cuando
> `tipo === 'TAREA'` (traducir con `EnumsService.etiqueta('tipoTarea', ...)`), o el
> nombre del insumo (ya en español) cuando `tipo === 'INSUMO'`. **No incluye ningún
> campo de rubro** (mano de obra vs. labores y servicios vs. insumos): esa
> clasificación depende de `ejecutor`, que tampoco viaja acá — el desglose por rubro
> real vive en `GET .../costos`.

#### `GET /api/lote-campanias/{id}/costos`
Devuelve el desglose de costos del lote-campaña: insumos, tareas, indirectos, totales y costo por hectárea.

---

## Costos indirectos de campaña

> Gastos que no se imputan a un lote específico (flete general, gastos de acopio, etc.). Se prorratean al calcular el margen.

### `POST /api/campanias/{campaniaId}/costos-indirectos`
Registra un costo indirecto.

### `GET /api/campanias/{campaniaId}/costos-indirectos`
Lista costos indirectos de la campaña, paginados.

### `DELETE /api/campanias/{campaniaId}/costos-indirectos/{costoId}`
Elimina un costo indirecto (solo si la campaña no está cerrada).

---

## Ventas

### `POST /api/lote-campanias/{id}/ventas`
Registra una venta (entrega a comprador).

**Shape confirmado por bisección directa contra el backend real** (docs/plan-frontend.md
slice 5, reemplaza el "sin confirmar" de slice 4): la modalidad viaja en **`modalidad`,
no `modalidadVenta`**, y la fecha de entrega en **`fechaEntrega`, no `fecha`** (ambos
nombres "razonables" devolvían `400 CUERPO_INVALIDO`, mismo catch-all documentado para
`Cosecha.numeroCorte`). `precioUnitario` es un `Monto` completo (`{ importe, moneda,
tipoCambio }`), mismo value object que `Tarea.valorUnitario`/`AplicacionInsumo.precioUnitario`.

Request: `{ compradorId, fechaEntrega, calidad, cantidad, modalidad, precioUnitario? }`.
`precioUnitario` es obligatorio solo si `modalidad = PRECIO_CERRADO`
(`422 PRECIO_UNITARIO_REQUERIDO` si falta); se omite en `CONSIGNACION`, que nace
`ENTREGADA` sin precio (docs/dominio.md §10.2). El backend también acepta `comision`/
`flete`/`otrosGastos` (mismo shape `Monto`) en este mismo alta, pero el frontend no los
pide acá: docs/design-brief.md §6.5 los ubica en el flujo de completar la liquidación,
no en la entrega.

Errores de negocio confirmados: `422 CALIDAD_DESCARTE_NO_VENDIBLE` (el descarte no se
vende, docs/dominio.md §9), `422 STOCK_INSUFICIENTE` (`"La cantidad a vender (9999)
supera el stock disponible de calidad PRIMERA (50.0000)"`, docs/dominio.md invariante
5), `422 COMPRADOR_NO_ENCONTRADO`.

```json
{
  "id": 1,
  "loteCampaniaId": 6,
  "compradorId": 6,
  "compradorNombre": "Clismar",
  "calidad": "PRIMERA",
  "modalidad": "PRECIO_CERRADO",
  "estado": "LIQUIDADA",
  "fechaEntrega": "2026-07-25",
  "cantidad": 50,
  "unidad": "BOLSA",
  "fechaLiquidacion": "2026-07-25",
  "precioUnitario": { "importe": 9000, "moneda": "ARS", "tipoCambio": 1, "importeArs": 9000, "importeUsd": 9000.0 },
  "importeNeto": { "importe": 450000, "moneda": "ARS", "tipoCambio": 1, "importeArs": 450000, "importeUsd": 450000.0 }
}
```

Una venta `CONSIGNACION` recién entregada (sin liquidar) responde sin `precioUnitario`,
`comision`, `flete`, `otrosGastos`, `importeNeto` ni `fechaLiquidacion` (Jackson
`NON_NULL`, se omiten en vez de llegar `null`), y `estado: "ENTREGADA"`.

### `GET /api/lote-campanias/{id}/ventas`
Lista ventas del lote-campaña, paginadas (mismo shape que la respuesta de arriba).

### `PATCH /api/ventas/{id}/liquidacion`
Completa la liquidación de una venta en consignación pendiente (docs/design-brief.md
§6.5). **Shape confirmado por bisección directa** (docs/plan-frontend.md slice 5):
request `{ precioUnitario, fechaLiquidacion, comision?, flete?, otrosGastos? }` —
`precioUnitario` y `fechaLiquidacion` obligatorios, los tres gastos opcionales, los
cuatro campos de plata como `Monto` completo (`MontoRequest`). `importeNeto` lo calcula
el backend (`importeBruto − comision − flete − otrosGastos`, docs/reglas-calculo.md
§6.1). Devuelve el mismo shape de `Venta` de arriba, ahora `estado: "LIQUIDADA"`.

Rechaza liquidar una venta que no es de consignación con `422 MODALIDAD_INVALIDA`
(`"Solo se pueden liquidar ventas en consignación"`).

### `GET /api/lote-campanias/{id}/margen`
Calcula el margen del lote-campaña: ingresos vs costos, resultado en USD y por hectárea. Las ventas sin liquidar se consideran según la regla de cálculo del dominio.

---

## Reportes de campaña

### `GET /api/campanias/{id}/resumen`
Resumen ejecutivo de la campaña: costos totales, ingresos, margen neto, superficie total.

### `GET /api/campanias/{id}/costos-por-rubro`
Desglose de costos de la campaña agrupado por rubro (insumos, tareas, indirectos).

### `GET /api/reportes/comparativa`
Comparativa entre campañas de un mismo cultivo. Parámetros: `cultivo` (nombre), `campanias` (lista de ids).

---

## Metadata

### `GET /api/metadata/enums`
Devuelve todos los enums del sistema con sus valores y etiquetas. Útil para poblar selects y filtros en el frontend.

Incluye: `tipoInsumo`, `tipoTarea`, `ejecutor`, `modoCosto`, `calidad`, `unidadMedida`, `unidadProduccion`, `modalidadVenta`, `estadoVenta`, `estadoCampania`, `criterioProrrateo`, `moneda`, `rol`.

---

## Notas generales

- **Paginación**: los listados aceptan `page`, `size` y `sort` como query params (`?page=0&size=20&sort=createdAt,desc`).
- **Fechas**: ISO-8601 (`2026-03-15`).
- **Importes**: el default a asumir para un endpoint nuevo sin confirmar es string
  decimal con 2 decimales, acompañado de `moneda` (`ARS` o `USD`) cuando aplica. Pero
  **no es universal**: `Monto` (`Insumo.precioReferencia`, y desde slice 4 también
  `Tarea.valorUnitario`/`costoTotal` y `AplicacionInsumo.precioUnitario`/`costoTotal`),
  `PrecioReferencia` (`Cultivo.precioReferenciaPrimera`/`Segunda` — shape más chico que
  `Monto`, ver `src/app/models/monto.model.ts`), `DesgloseCostosResponse`,
  `MargenResponse`, `ResumenCampaniaResponse`, `CostosPorRubroResponse`,
  `Campania.gastosComercializacionEstimados`/`cotizacionVigente` y
  `LoteCampania.superficieSembradaHa` confirmaron ser número JSON, no string — ver el
  shape exacto de cada uno más abajo antes de asumir el default en un modelo nuevo.
- **Importes en dos monedas (Ars/Usd)**: `DesgloseCostosResponse`, `MargenResponse`,
  `ResumenCampaniaResponse` y `CostosPorRubroResponse` devuelven cada importe
  duplicado con sufijo `Ars` y `Usd` (docs/plan-frontend.md slice 3, segunda vuelta).
  Los campos `*Ars` que dependen de valorizar una estimación (stock, entregas sin
  liquidar, margen estimado) son `null` si la campaña no tiene
  `Campania.cotizacionVigente` cargada — ver el detalle de nulabilidad en cada
  endpoint. **El front nunca convierte entre monedas**: solo elige qué campo (`*Ars` o
  `*Usd`) mostrar según el selector de moneda; la conversión ya la hizo el backend.
- **Errores**: todas las respuestas de error tienen el formato `{ timestamp, status, code, message, details[] }`.
- **Establecimiento**: el backend lo resuelve desde el token; el frontend no lo envía.

---

## Shapes de respuesta (tipos exactos)

### JWT — `POST /api/auth/registro` y `POST /api/auth/login`

```json
{ "token": "eyJ..." }
```

Solo devuelve el token. No hay campo de expiración ni refresh token. El interceptor de slice 0 no necesita prever refresh; eso queda para una iteración futura.

---

### `GET /api/auth/me` → `UsuarioResponse`

```json
{
  "id": 1,
  "nombre": "Juan",
  "apellido": "García",
  "email": "juan@example.com",
  "rol": "ADMIN"
}
```

---

### `GET /api/lotes` (y cualquier listado paginado) → `PagedModel` de Spring HATEOAS

El backend migró de `PageImpl` directo a `PagedModel` (`VIA_DTO`) — los campos de
paginación viven en `page`, no en la raíz, y ya no hay `first`/`last`/`empty`/
`pageable`/`sort`. Confirmado contra la API real (`docs/resumen-slices.md`, slice 2).
Shape:

```json
{
  "content": [ ...items... ],
  "page": {
    "size": 20,
    "number": 0,
    "totalElements": 42,
    "totalPages": 3
  }
}
```

Tipo genérico para el frontend:

```ts
interface PaginaMetadata {
  size: number;
  number: number;       // página actual (0-indexed)
  totalElements: number;
  totalPages: number;
}

interface PaginaResponse<T> {
  content: T[];
  page: PaginaMetadata;
}
```

---

### `GET /api/lotes/{id}` → `LoteResponse`

```json
{
  "id": 1,
  "nombre": "Lote Norte",
  "superficieHa": "12.50",
  "tipoSuelo": "Franco arenoso",
  "comentarios": "Riego por acequia sur",
  "activo": true
}
```

---

### `POST /api/campanias` → `CampaniaResponse`

Confirmado por bisección contra el backend real (docs/plan-frontend.md slice 3):
`fechaInicio`, `fechaFin` y `gastosComercializacionEstimados` son obligatorios en el
alta, aunque no estaban documentados acá antes de confirmarlos.

```json
{
  "id": 1,
  "nombre": "2025/26",
  "fechaInicio": "2025-08-01",
  "fechaFin": "2026-07-31",
  "estado": "PLANIFICADA",
  "gastosComercializacionEstimados": 0.12,
  "cotizacionVigente": 1200.50,
  "createdAt": "2026-08-22T18:16:19.937826Z",
  "updatedAt": "2026-08-22T18:16:19.937826Z"
}
```

> `gastosComercializacionEstimados` viaja como **número JSON** (fracción 0–1, el
> backend rechaza `> 1.0000`), no como string. Es el parámetro de
> docs/reglas-calculo.md §6. Sin `activo`: campaña no tiene baja lógica, su ciclo de
> vida es `estado` (`PLANIFICADA` → `EN_CURSO` → `CERRADA`).
>
> `PATCH /{id}/estado` (body `{ "estado": "EN_CURSO" }`) y `PATCH /{id}/cerrar` (sin
> body) devuelven el mismo shape. Confirmado que `PATCH /{id}/estado` no bloquea volver
> de `CERRADA` a `EN_CURSO` — el invariante "CERRADA no admite nuevos movimientos"
> (docs/dominio.md §14) lo garantiza el backend en los endpoints de movimientos
> (`422 CAMPANIA_CERRADA`), no en la transición de estado.
>
> **`cotizacionVigente`** (sumado en docs/plan-frontend.md slice 3, segunda vuelta):
> número JSON, opcional — se omite (no `null`) cuando no se cargó. Es el tipo de cambio
> que la campaña usa para expresar en pesos (`*Ars`) los importes de
> `DesgloseCostosResponse`/`MargenResponse`/`ResumenCampaniaResponse`, que por diseño
> se calculan en dólares. Se manda en `POST`/`PUT /api/campanias` como string decimal,
> igual que `gastosComercializacionEstimados`; `null` para no cargarlo.
>
> `GET /lote-campanias/{id}/margen` acepta además el query param opcional
> `cotizacionActual` (ej. `?cotizacionActual=1200`), que pisa `cotizacionVigente` de la
> campaña sin persistir nada — sirve para simular "¿y si la cotización estuviera a X?".

---

### `GET /api/campanias/{id}/lote-campanias` → `Page<LoteCampaniaResponse>`

Cada item del `content`:

```json
{
  "id": 5,
  "campaniaId": 2,
  "loteId": 1,
  "loteNombre": "Lote Norte",
  "cultivoId": 3,
  "cultivoNombre": "Cebolla",
  "variedad": "Valenciana",
  "ciclo": 1,
  "superficieSembradaHa": 10.0,
  "unidadProduccion": "BOLSA",
  "fechaSiembra": "2026-03-10",
  "fechaTrasplante": "2026-04-05",
  "fechaCosechaEsperada": "2026-07-15",
  "comentarios": null,
  "createdAt": "2026-03-01T14:22:00Z",
  "updatedAt": "2026-03-01T14:22:00Z"
}
```

> `superficieSembradaHa` viaja como **número JSON**, no como string (corregido tras
> confirmarlo contra el backend real; mismo patrón sin corregir en `Lote.superficieHa`,
> ver docs/resumen-slices.md slice 2). `unidadProduccion` usa los valores reales del
> enum (`BOLSA`, `JAULA`, `BIN`, `KG`, `TN`, `UNIDAD`, `DOCENA`) — el ejemplo anterior
> (`BOLSA_50KG`) era inventado, no confirmado contra la API.
>
> Campos ausentes (`variedad`, `fechaTrasplante`, `comentarios`, etc.) se omiten del
> JSON cuando son `null` (Jackson `NON_NULL`), mismo patrón que `Comprador.modalidadHabitual`
> (docs/resumen-slices.md slice 2).

#### `POST /api/campanias/{id}/lote-campanias` ("sembrar un lote")

Payload mínimo: `{ "loteId": 6, "cultivoId": 8, "unidadProduccion": "BOLSA", "superficieSembradaHa": "3.0" }`.
`variedad`, `fechaSiembra`, `fechaTrasplante`, `fechaCosechaEsperada`, `comentarios` y
`ciclo` son opcionales.

**`ciclo` se autoincrementa si se omite**: el backend calcula el próximo ciclo libre
para ese `lote + cultivo + campania` (confirmado: dos POST idénticos sin `ciclo`
devuelven `ciclo: 1` y `ciclo: 2`). Si se manda un `ciclo` ya usado, responde
`422 DUPLICADO`. El frontend no pide este campo en el formulario.

Errores de negocio confirmados: `422 SUPERFICIE_EXCEDIDA` (`superficieSembradaHa` >
`Lote.superficieHa`), `422 LOTE_NO_ENCONTRADO`, `422 CAMPANIA_CERRADA`.

---

### `GET /api/campanias/{id}/resumen` → `ResumenCampaniaResponse`

**Segunda corrección de shape** (docs/plan-frontend.md slice 3, segunda vuelta): el
equipo de backend sumó el equivalente en pesos de cada importe. Todos los campos de
costo/ingreso/margen ahora tienen sufijo `Ars`/`Usd`; ya no existen sin sufijo.

```json
{
  "campaniaId": 1,
  "nombreCampania": "2025/26",
  "lotes": [
    {
      "loteCampaniaId": 4,
      "nombreLote": "Lote Norte",
      "nombreCultivo": "Cebolla",
      "superficieSembradaHa": 1.5,
      "costoInsumosArs": 0.0,
      "costoInsumosUsd": 0.0,
      "costoTareasArs": 0.0,
      "costoTareasUsd": 0.0,
      "costoIndirectosArs": 0.0,
      "costoIndirectosUsd": 0.0,
      "costoTotalArs": 0.0,
      "costoTotalUsd": 0.0,
      "costoPorHaArs": 0.0,
      "costoPorHaUsd": 0.0,
      "ingresoRealizadoArs": 0.0,
      "ingresoRealizadoUsd": 0.0,
      "margenRealizadoArs": 0.0,
      "margenRealizadoUsd": 0.0
    }
  ],
  "costoTotalCampaniaArs": 0.0,
  "costoTotalCampaniaUsd": 0.0,
  "superficieTotalHa": 1.5,
  "costoPorHaCampaniaArs": 0.0,
  "costoPorHaCampaniaUsd": 0.0,
  "ingresoRealizadoCampaniaArs": 0.0,
  "ingresoRealizadoCampaniaUsd": 0.0,
  "margenRealizadoCampaniaArs": 0.0,
  "margenRealizadoCampaniaUsd": 0.0
}
```

> Todos los importes son número JSON. A diferencia de `Margen`, los `*Ars` de este
> endpoint **no dependen de `Campania.cotizacionVigente`** (confirmado contra la API
> real): siempre vienen presentes en las dos monedas, incluso sin cotización cargada —
> son costos e ingresos ya conocidos, no una valorización a estimar.
>
> **Sigue sin incluir margen estimado**, ni a nivel campaña ni por lote — a diferencia
> de `GET /lote-campanias/{id}/margen`, que sí expone `margenRealizado*` y
> `margenEstimado*`. El tablero (slice 3) lo etiqueta siempre como "Margen realizado",
> nunca solo "Margen", para no insinuar que es el único margen del sistema.
>
> No incluye `costoPorUnidad` (por bolsa) por lote: solo existe en
> `GET /lote-campanias/{id}/costos`, que además requiere cosecha registrada para no ser
> `null`.
>
> `costoPorHaCampania*` ya viene calculado sobre los totales de la campaña
> (docs/reglas-calculo.md §7.1), no promediando el `costoPorHa*` de cada lote.

---

### `GET /api/lote-campanias/{id}/costos` → `DesgloseCostosResponse`

**Segunda corrección de shape** (docs/plan-frontend.md slice 3, segunda vuelta): todos
los importes ahora vienen duplicados con sufijo `Ars`/`Usd`. Los porcentajes y
cantidades no monetarias (`pct*`, `superficieSembradaHa`, `rendimientoPorHa`,
`tasaDescarte`) no se duplican.

```json
{
  "costoInsumosArs": 85000.0,
  "costoInsumosUsd": 85000.0,
  "costoManoObraArs": 42000.0,
  "costoManoObraUsd": 42000.0,
  "costoLaborYServiciosArs": 18000.0,
  "costoLaborYServiciosUsd": 18000.0,
  "costoIndirectosArs": 5000.0,
  "costoIndirectosUsd": 5000.0,
  "costoTareasArs": 60000.0,
  "costoTareasUsd": 60000.0,
  "costoTotalArs": 150000.0,
  "costoTotalUsd": 150000.0,
  "costoPorHaArs": 15000.0,
  "costoPorHaUsd": 15000.0,
  "superficieSembradaHa": 10.0,
  "pctInsumos": 56.67,
  "pctManoObra": 28.0,
  "pctLaborYServicios": 12.0,
  "pctIndirectos": 3.33,
  "costoPorUnidadArs": 750.0,
  "costoPorUnidadUsd": 750.0,
  "rendimientoPorHa": 20.0,
  "tasaDescarte": 0.05
}
```

> Todos los campos monetarios viajan como **número JSON**, no como string (confirmado
> por bisección contra el backend real).
>
> `costoPorUnidad*`, `rendimientoPorHa` y `tasaDescarte` son `null` (el backend omite
> la clave) si aún no hay cosecha registrada. A diferencia de `MargenResponse`, acá los
> `*Ars` **no** dependen de `cotizacionVigente` (confirmado contra una campaña real sin
> cotización cargada): todo este endpoint son costos ya conocidos, no una valorización
> a estimar con la cotización del día.
>
> Invariante, dentro de cada moneda: `costoManoObra + costoLaborYServicios == costoTareas` y `costoInsumos + costoTareas + costoIndirectos == costoTotal`.

---

### `GET /api/lote-campanias/{id}/margen` → `MargenResponse`

**Segunda corrección de shape** (docs/plan-frontend.md slice 3, segunda vuelta): todos
los importes ahora vienen duplicados con sufijo `Ars`/`Usd`.

```json
{
  "ingresoRealizadoUsd": 12000.0,
  "ingresoRealizadoArs": 12000.0,
  "valorPendienteLiqUsd": 3000.0,
  "valorPendienteLiqArs": 3000.0,
  "valorStockUsd": 500.0,
  "valorStockArs": 500.0,
  "costoTotalUsd": 10000.0,
  "costoTotalArs": 10000.0,
  "margenRealizadoUsd": 2000.0,
  "margenRealizadoArs": 2000.0,
  "margenEstimadoUsd": 5500.0,
  "margenEstimadoArs": 5500.0,
  "tieneEstimaciones": true
}
```

> Todos número JSON, no string (confirmado por bisección contra el backend real).
>
> Reglas de nulabilidad confirmadas contra la API real (el campo se omite del JSON, no
> llega como `0`):
> - `margenEstimadoUsd` es `null` si el cultivo no tiene `precioReferencia` cargado —
>   no hay forma de valorizar el stock/pendiente en ninguna moneda.
> - `valorPendienteLiqArs`, `valorStockArs` y `margenEstimadoArs` son `null` si la
>   campaña no tiene `cotizacionVigente` cargada, aunque el cultivo sí tenga
>   `precioReferencia`. `margenEstimadoUsd` se sigue calculando igual en ese caso (no
>   depende de la cotización).
>
> `tieneEstimaciones: true` indica que hay ventas entregadas sin liquidar o stock
> remanente, por lo que `margenEstimado*` incluye valores estimados.
>
> Acepta el query param opcional `cotizacionActual` (ver la nota de `Campania` más
> arriba) para pisar `cotizacionVigente` sin persistir nada.

---

### `GET /api/campanias/{id}/costos-por-rubro` → `CostosPorRubroResponse`

Todavía sin consumidor en el frontend (es para el reporte "Resumen de campaña" de
slice 6), pero con shape confirmado contra la API real:

```json
{
  "campaniaId": 1,
  "nombreCampania": "2025/26",
  "lotes": [
    {
      "loteCampaniaId": 4,
      "nombreLote": "Lote Norte",
      "nombreCultivo": "Cebolla",
      "superficieSembradaHa": 1.5,
      "insumosArs": 0.0,
      "insumosUsd": 0.0,
      "manoObraArs": 0.0,
      "manoObraUsd": 0.0,
      "laborMecanicaArs": 0.0,
      "laborMecanicaUsd": 0.0,
      "indirectosArs": 0.0,
      "indirectosUsd": 0.0,
      "totalArs": 0.0,
      "totalUsd": 0.0
    }
  ],
  "totalInsumosArs": 0.0,
  "totalInsumosUsd": 0.0,
  "totalManoObraArs": 0.0,
  "totalManoObraUsd": 0.0,
  "totalLaborMecanicaArs": 0.0,
  "totalLaborMecanicaUsd": 0.0,
  "totalIndirectosArs": 0.0,
  "totalIndirectosUsd": 0.0,
  "totalGeneralArs": 0.0,
  "totalGeneralUsd": 0.0
}
```

> `laborMecanica` es el nombre de campo real para el rubro que `docs/reglas-calculo.md`
> §5.3 y `DesgloseCostosResponse` llaman "labores y servicios"
> (`costoLaborYServicios*`) — mismo concepto, nombre distinto en este endpoint. No
> armonizado por el backend.

---

### `GET /api/metadata/enums`

```json
{
  "tipoInsumo":       [ { "valor": "SEMILLA",    "etiqueta": "Semilla" }, ... ],
  "tipoTarea":        [ { "valor": "CARPIDA",     "etiqueta": "Carpida" }, ... ],
  "ejecutor":         [ { "valor": "JORNALERO",   "etiqueta": "Jornalero" }, ... ],
  "modoCosto":        [ { "valor": "...",          "etiqueta": "..." }, ... ],
  "calidad":          [ { "valor": "...",          "etiqueta": "..." }, ... ],
  "unidadMedida":     [ { "valor": "...",          "etiqueta": "..." }, ... ],
  "unidadProduccion": [ { "valor": "BOLSA_50KG",  "etiqueta": "..." }, ... ],
  "modalidadVenta":   [ { "valor": "...",          "etiqueta": "..." }, ... ],
  "estadoVenta":      [ { "valor": "ENTREGADA",   "etiqueta": "Entregada" },
                        { "valor": "LIQUIDADA",   "etiqueta": "Liquidada" } ],
  "estadoCampania":   [ { "valor": "...",          "etiqueta": "..." }, ... ],
  "criterioProrrateo":[ { "valor": "...",          "etiqueta": "..." }, ... ],
  "moneda":           [ { "valor": "ARS",          "etiqueta": "Pesos argentinos" },
                        { "valor": "USD",          "etiqueta": "Dólares estadounidenses" } ],
  "rol":              [ { "valor": "ADMIN",        "etiqueta": "Administrador" },
                        { "valor": "OPERADOR",     "etiqueta": "Operador" } ]
}
```

Tipo para el frontend:

```ts
interface ValorEnum { valor: string; etiqueta: string; }
type MetadataEnums = Record<string, ValorEnum[]>;
```

---

### Errores

```json
{
  "timestamp": "2026-08-21T10:30:00Z",
  "status": 400,
  "code": "VALIDACION",
  "message": "Error de validación",
  "details": [
    "nombre: no debe estar vacío",
    "superficieHa: debe ser mayor que 0"
  ]
}
```

**`details` es un array de strings**, con formato `"campo: mensaje"` en errores de validación Bean Validation. Para errores de dominio (`422`) y conflictos de integridad (`422`), `details` llega como array vacío `[]`.

Códigos HTTP usados:
- `400` — validación de request (`code: "VALIDACION"`)
- `401` — no autenticado
- `403` — no autorizado
- `422` — regla de negocio violada (el `code` identifica la regla, p. ej. `"CAMPANIA_CERRADA"`, `"MONEDA_MISMATCH"`, `"CAMPANIA_NOMBRE_DUPLICADO"`)

El interceptor de errores puede mostrar `details.join('\n')` para validaciones de campo y `message` para el resto.
