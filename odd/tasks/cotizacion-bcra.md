# cotizacion-bcra

Objetivo: integrar `GET /api/cotizaciones/dolar` (cotización BCRA, BNA vendedor divisa) para sugerir `tipoCambio` en los formularios con fecha y `cotizacionVigente` de la campaña. Rama: `feat/cotizacion-bcra`, desde `dev`. Estrategia de entrega: una sola rama de feature, sin cadena de PRs (mismo criterio que `ventas-cobros-liquidaciones`; supuesto, corregible por el usuario); push y PR quedan a decisión del usuario. Test runner: Vitest (`npm test`), lint `npm run lint`.

## Specs

Fuente: documentación del endpoint (L1, citada textual), verificación contra el backend real (L3) y decisión del usuario (L2, L4). Los textos entre comillas son literales.

- **S1 Propósito.** "Cotización del dólar sugerida para autocompletar tipoCambio en vistas y formularios (aplicaciones, tareas, costos indirectos, ventas, cobros, tramos de liquidación y cotizacionVigente de la campaña). El backend no rellena tipoCambio: sigue siendo obligatorio en cada request." El front sigue mandando `tipoCambio` en cada payload como hoy.
- **S2 Request.** `GET /api/cotizaciones/dolar`, query `fecha` "LocalDate ISO — opcional — por defecto, hoy en Argentina (America/Argentina/Buenos_Aires)". "El front debe enviar la fecha del movimiento, no la de hoy: el tipo de cambio se congela a la fecha del movimiento." Formularios de movimiento: fecha del movimiento (`fecha`, `fechaEntrega`, `fechaLiquidacion`). `cotizacionVigente` de la campaña: sin `fecha` (hoy).
- **S3 Response.** `CotizacionResponse { fechaSolicitada, fechaCotizacion, valor, fuente }`. "`fechaCotizacion` — fecha real de la cotización usada; puede ser anterior (fin de semana, feriado o cierre del día aún no publicado)". `valor` "ARS por USD". Confirmado contra el backend real (L3): `valor` viaja como **string con 4 decimales** (`"1551.0000"`). La UI muestra la `fechaCotizacion` en `dd/MM/yyyy` sin `new Date` (CLAUDE.md regla 2).
- **S4 Errores.** `422 FECHA_COTIZACION_FUTURA` "fecha posterior a hoy"; `503 COTIZACION_NO_DISPONIBLE` "el BCRA no responde (o no publicó nada) y no hay cotización persistida en la ventana"; `401` sin token. Un error de cotización nunca bloquea el formulario: el campo sigue editable a mano. Una fecha futura no se consulta al back.
- **S5 Comportamiento de autocompletado (decisión del usuario, opción B).** "Se autocompleta solo mientras el usuario no haya tocado el campo (o vino del insumo); si lo tocó, se muestra un botón 'Usar BCRA (1.543,50 del 13/11)'." Cambiar la fecha vuelve a consultar; si el campo no fue editado a mano, se pisa con la nueva sugerencia.
- **S6 Pantallas afectadas.** Aplicación de insumo, tarea, venta (precio cerrado), liquidación (todo y tramo), cobro, costo indirecto, alta de campaña (`cotizacionVigente`) y edición inline de `cotizacionVigente` en el tablero. No se tocan: insumo (precio de referencia sin fecha de movimiento), cultivo (`PrecioReferencia` sin TC), vistas de costos/márgenes. En el tablero (edición de un valor existente) no se autocompleta: solo se ofrece el botón (supuesto, derivado de S5).
- **S7 Fallback.** `TipoCambioMemoriaService` (último TC cargado) se mantiene como valor inicial mientras la cotización carga o si falla (supuesto).
- **S8 Docs y tests.** Agregar la sección 16 a `docs/api-endpoints-v2.md`, anotar en `docs/resumen-slices.md`. Tests de la pieza compartida (autocompletado, edición manual, botón, error, fecha futura, fecha en dd/MM/yyyy) y ajuste de los specs de cada formulario. Verificación visual en navegador real (CLAUDE.md).

## Tasks

Ruta de todas: inline. Evidencia (sin Writer trigger): T2–T4 dependen de la pieza compartida de T1, no son independientes. Forecast: ~700–900 líneas autoradas (incluye tests); la estrategia de una sola rama aplica.

- [x] **T1** Modelo `CotizacionResponse`, helper `sugerirTipoCambio` y componente `SugerenciaCotizacion` con tests — S2, S3, S4, S5, S7 — inline — RED: módulo inexistente; GREEN: 10/10 en `sugerencia-cotizacion.spec.ts` — commit: primer commit de la rama
- [ ] **T2** Formularios de lote-campaña: aplicación, tarea, venta, liquidación, cobro — S5, S6 — inline — commit: —
- [ ] **T3** Costo indirecto — S5, S6 — inline — commit: —
- [ ] **T4** Campaña: modal de alta y edición inline del tablero — S2, S5, S6 — inline — commit: —
- [ ] **T5** Docs (§16 en api-endpoints-v2, resumen-slices) + verificación visual — S8 — inline — commit: —

## Log

- **L1 (2026-11-17, pedido original, textual):** "Hay que desarrollar una nueva feature para integrar un nuevo servicio del backend que recupera la tasa de cambio del BCRA, primero analiza que pantallas afectara y el impacto general en la app de forma exaustiva. Esta es la documentacion del nuevo endpoint: 16. Cotizaciones — Cotización del dólar sugerida para autocompletar tipoCambio en vistas y formularios (aplicaciones, tareas, costos indirectos, ventas, cobros, tramos de liquidación y cotizacionVigente de la campaña). El backend no rellena tipoCambio: sigue siendo obligatorio en cada request. Ver docs/adr/0004. Fuente: API Estadísticas Cambiarias del BCRA, valor BNA vendedor divisa. GET /api/cotizaciones/dolar — fecha LocalDate ISO opcional, por defecto hoy en Argentina (America/Argentina/Buenos_Aires). El front debe enviar la fecha del movimiento, no la de hoy: el tipo de cambio se congela a la fecha del movimiento. Response 200 — CotizacionResponse: { fechaSolicitada, fechaCotizacion, valor, fuente }. Reglas: Si la fecha no tiene publicación se usa la última dentro de los 7 días anteriores. Las cotizaciones se persisten en la tabla cotizacion: una fecha ya consultada no vuelve a llamar al BCRA. Si el BCRA no responde se usa lo persistido dentro de la ventana. Errores: 422 FECHA_COTIZACION_FUTURA (fecha posterior a hoy); 503 COTIZACION_NO_DISPONIBLE (el BCRA no responde o no publicó nada y no hay cotización persistida en la ventana); 401 sin token."
- **L2 (2026-11-17, usuario):** "Ya cambie el back para que devuelva en String los montos. Ahora tambien la tasa de cambio a solo 4 decimales. Sobre la decision de producto: Si, la B me parece mejor"
- **L3 (2026-11-17, verificación):** backend local: `GET /api/cotizaciones/dolar` → `{"fechaSolicitada":"2026-11-17","fechaCotizacion":"2026-11-16","valor":"1551.0000","fuente":"BCRA"}`; `?fecha=2026-11-15` → `fechaCotizacion "2026-11-13"`, `valor "1543.5000"`; `?fecha=2026-12-30` → 422 `FECHA_COTIZACION_FUTURA`.
- **L4 (2026-11-17, usuario):** "Creaste un plan o tarea como sugiere ODD para una tarea de este tamaño? Ademas deberias trabajar sobre una nueva rama a partir de dev" → rama `feat/cotizacion-bcra` creada desde `dev` (87bbd41) y este documento antes de la primera escritura de código.
- Hallazgos del análisis: todos los formularios precargan hoy desde `TipoCambioMemoriaService`; en aplicación, elegir insumo pisa el TC con `insumo.precioReferencia.tipoCambio` (cuenta como "tocado" para S5); el interceptor de errores solo normaliza (sin toast global); los specs de tarea, cobro, liquidación y costo indirecto no proveen `HttpClient` y hay que sumarlo.
- T1: `httpResource` mantiene pendiente `whenStable()` hasta el flush; en specs, usar `TestBed.tick()` antes de `expectOne`.
- Próximo paso: T2.
