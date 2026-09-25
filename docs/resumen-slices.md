# Resumen de slices

Bitácora de lo que se implementó en cada slice de `docs/plan-frontend.md`: qué se
construyó, qué decisiones no triviales se tomaron y qué quedó pendiente o abierto
para el slice siguiente. Se agrega una sección nueva al final de cada slice
cerrado; no se reescribe lo ya cerrado salvo que algo quede obsoleto.

---

## Slice 0 — Fundaciones

**Estado**: cerrado. `npm run lint`, `npm test` y `npm run build` en verde.

### Qué se construyó

- **ESLint + Prettier**: `@angular-eslint/schematics` + `eslint-config-prettier`
  para que las reglas de estilo no choquen con Prettier.
- **Tokens visuales** (`src/app/shared/styles/_tokens.scss`): paleta, tipografía
  (Helvetica Neue + IBM Plex Mono para números), espaciado, radios y los tres
  estados semánticos (positivo/negativo/estimado) como custom properties y
  clases reutilizables. Extraídos del prototipo en `docs/design-reference/`.
- **Cliente HTTP** (`src/app/core/http/`): interceptores de JWT y de errores
  (normalizan al formato `{ timestamp, status, code, message, details[] }`),
  registrados con `provideHttpClient(withFetch(), withInterceptors([...]))`.
- **Pipes de formato** (`src/app/shared/pipes/`): `importe` (string → formato
  argentino), `fecha` (`LocalDate` ISO → `dd/MM/yyyy`, sin pasar por `Date`) e
  `instante` (`Instant` UTC → hora argentina). Los tres con tests, incluido el
  de fecha en UTC−3.
- **Layout base** (`src/app/layout/`): `Shell` (sidebar en escritorio, header +
  nav inferior en móvil, breakpoint real en 900px tomado del prototipo) y
  `SelectorCampania`. Verificado con Playwright en 1280px y 390px.
- **Modelos TypeScript** (`src/app/models/`): solo los DTOs con shape
  confirmado en `docs/api-endpoints.md` — `Lote`, `LoteCampania`,
  `DesgloseCostos`, `Margen`, `Usuario`, `MetadataEnums`, `PaginaResponse`,
  `ErrorResponse`.
- **Servicio de enums** (`src/app/core/enums/enums.service.ts`): usa
  `httpResource()`, cachea como singleton y se precarga al boot con
  `provideAppInitializer`.
- Infraestructura mínima para slices futuros: `TokenStorageService`,
  `UsuarioActualService` y `CampaniaActivaService` (signals vacíos que slices 1
  y 3 van a poblar).

### Decisiones no triviales

- **Se sacó SSR del scaffold.** `ng new` lo había habilitado por defecto
  (Angular 22), pero rompía el build: la extracción de rutas bootstrapeaba la
  app en el servidor y el `EnumsService` disparaba un fetch real al backend
  inexistente en build-time. Es una app interna detrás de login sin necesidad
  de SEO, así que se eliminaron `server.ts`, `main.server.ts`,
  `app.config.server.ts`, `app.routes.server.ts`, `provideClientHydration` y
  las dependencias `@angular/platform-server`, `@angular/ssr`, `express`.
- **Breakpoints reales**: 900px (sidebar ↔ nav móvil) y 1120px (colapso de
  grillas internas), tomados de la lógica JS del prototipo
  (`window.innerWidth`), no de los 1280/360-430 genéricos del brief de diseño.
- **`instante.pipe.ts` no estaba pedido explícitamente** en el slice pero se
  agregó junto a `fecha.pipe.ts` porque CLAUDE.md distingue `LocalDate` de
  `Instant` como la misma regla de negocio (regla 2), y dejar el caso Instant
  sin resolver iba a generar el mismo bug de UTC más adelante.
- **`docs/dominio.md` §13 vs. `CLAUDE.md` regla 3**: dominio.md sugiere una
  tabla fija de traducción de enums en el frontend; CLAUDE.md prohíbe
  hardcodear enums y `GET /api/metadata/enums` ya devuelve la etiqueta en
  español. Se resolvió que `CLAUDE.md` es la fuente de verdad para este caso:
  no se hardcodeó ninguna lista de enums.

### Pendiente / abierto

- **DTOs sin modelar todavía**: `Cultivo`, `Insumo`, `Comprador`, `Campania`,
  `Tarea`, `AplicacionInsumo`, `Cosecha`, `Venta`, `CostoIndirecto`. No están
  documentados con shape exacto en `docs/api-endpoints.md`; se modelan en el
  slice que los necesite (2 a 6) para no inventar campos.

---

## Slice 1 — Auth

**Estado**: cerrado. `npm run lint`, `npm test` y `npm run build` en verde.

### Qué se construyó

- **Pantalla de login** (`src/app/features/auth/login/`): único formulario con
  Signal Forms (`form()` + `schema` inline con `required`/`email`), sin
  registro público (docs/design-brief.md §9). Valida en cliente antes de
  pegarle a la API y muestra el mensaje del backend si el login falla.
- **`AuthService`** (`src/app/core/auth/auth.service.ts`): `login()` (POST
  `/api/auth/login` → guarda el JWT → `GET /api/auth/me`), `cargarUsuarioActual()`
  y `salir()`. Pobla `UsuarioActualService`, que ya existía vacío desde slice 0.
- **`authGuard`** (`src/app/core/auth/auth.guard.ts`): sin token, redirige a
  `/login` con `returnUrl`. Con token pero sin usuario en memoria (refresh de
  página), pide `/auth/me` antes de dejar pasar; si falla (token vencido), el
  `errorInterceptor` ya limpió el token y el guard redirige a login sin dejar
  la app en un estado roto.
- **Reestructuración de rutas**: `App` pasó de renderizar `<app-shell>` fijo a
  `<router-outlet>`. `/login` vive fuera del `Shell` (sin sidebar ni nav); todo
  lo demás cuelga de una ruta `''` con `Shell` como componente y `authGuard` en
  `canActivate`. Sin esto, la pantalla de login se hubiera visto con la
  navegación completa alrededor, que no tiene sentido sin sesión.
- `Shell.salir()` ahora usa `AuthService.salir()` + `Router.navigateByUrl('/login')`
  en lugar de tocar `TokenStorageService` directo.

### Decisiones no triviales

- **Bug real encontrado verificando en navegador** (no en los tests unitarios):
  `errorInterceptor` armaba el mensaje de error leyendo `error.error?.message`
  sin chequear `error.status`. Con el backend caído, un fetch fallido llega
  como `HttpErrorResponse` con `status: 0` y `error.error` es el `TypeError`
  nativo del navegador (`"Failed to fetch"`), que por casualidad tiene un
  campo `.message` — así que ese texto en inglés se colaba tal cual a la UI en
  vez del mensaje genérico en español. Fix: `cuerpo` solo se lee de
  `error.error` cuando `error.status > 0` (fallo de red = sin cuerpo JSON del
  backend). Cubierto en `error.interceptor.spec.ts`. Sirve como recordatorio
  de que las pruebas con `HttpTestingController` no reproducen este caso solas;
  hizo falta levantar el front contra un backend inexistente para verlo.
- **`returnUrl`**: el guard agrega `?returnUrl=` al redirigir a login y el login
  navega ahí al loguearse (default `/`). No estaba explícitamente pedido en el
  slice pero es una línea de más sobre el guard que ya existía y evita perder
  la ruta que el usuario quería visitar.
- Sin guard "solo invitados" en `/login`: un usuario ya logueado que navega a
  `/login` a mano ve el formulario igual. No estaba en los criterios de
  aceptación del slice y se prefirió no sumar alcance no pedido.

### Pendiente / abierto

- Sigue sin existir ninguna ruta hija bajo `Shell` (`tablero`, `catalogos/*`,
  etc.): todavía no hay slices 2+ implementados, así que la app autenticada
  hoy muestra el layout con un contenido vacío. Es esperado hasta el slice 2.

---

## Slice 2 — Catálogos

**Estado**: cerrado. `npm run lint`, `npm test` (69/69) y `npm run build` en verde.
Verificado en navegador con Playwright (login → catálogo → alta → baja) en 1280px y
390px, sin errores de consola.

### Qué se construyó

- **Las cuatro pantallas de catálogo** (`src/app/features/catalogos/{lotes,cultivos,insumos,compradores}/`):
  listado con toggle "ver dados de baja", formulario de alta/edición en modal,
  baja lógica y reactivación sin diálogo de confirmación aparte (patrón
  confirmado en el prototipo). Insumos suma un filtro por tipo.
- **`CatalogoBaseService<T, TRequest>`** (`src/app/shared/data/catalogo-base.service.ts`):
  las cuatro entidades comparten exactamente la misma forma de API (crear,
  actualizar, `DELETE` de baja, `PATCH .../reactivar`), así que cada servicio
  concreto (`LoteService`, `CultivoService`, `InsumoService`,
  `CompradorService`) es una subclase de una línea con solo el segmento de
  URL.
- **`Modal`** (`src/app/shared/ui/modal/`): overlay + caja reusable para los
  cuatro formularios (y para los que vengan en slices futuros — tarea,
  aplicación, cosecha, venta). Caja centrada 580px en escritorio, hoja a
  pantalla completa en móvil, igual que el prototipo.
- **`AvisoService` + `Aviso`** (`src/app/shared/ui/aviso/`): toast de una
  línea montado una vez en `Shell`. El prototipo confirma que crear, editar,
  dar de baja y reactivar no llevan confirmación aparte — el toast es la
  única señal de que la acción ocurrió.
- **Partials de estilo compartidos** (`src/app/shared/styles/`):
  `_botones.scss`, `_formularios.scss` (campos, `.campo-precio` para montos
  con moneda) y `_catalogo.scss` (header de listado, filas clickeables,
  chips). `login.scss` se migró a reusarlos en vez de declarar sus propias
  clases.
- **Modelos nuevos** (`src/app/models/`): `Insumo`, `Comprador`, `Cultivo` y
  sus `*Request`, con `LoteRequest` sumado a `lote.model.ts`.
- **`pluralizar()`** (`src/app/shared/utils/pluralizar.ts`): heurística de
  plural en español para autocompletar `Cultivo.unidadPlural` a partir de la
  etiqueta del enum `unidadProduccion`.
- Rutas hijas de `Shell` para las cuatro pantallas, cableadas en
  `app.routes.ts` con `loadComponent` y las constantes ya reservadas en
  `RUTAS`.

### Decisiones no triviales

- **Shape de `Insumo`, `Comprador` y `Cultivo` inferido, no confirmado.**
  `docs/api-endpoints.md` no documenta estas tres entidades con JSON exacto
  (quedó anotado como pendiente desde el slice 0) y el backend no está en
  este repo para leer los controllers. Se modelaron con la mejor información
  disponible: `Cultivo.precioReferenciaPrimera`/`precioReferenciaSegunda`
  están confirmados por `docs/reglas-calculo.md` §6; el resto de los nombres
  de campo (`unidadSingular`, `unidadPlural`, `fechaActualizacionPrecio` en
  Cultivo; todo `Insumo` y `Comprador`) son una inferencia razonada a partir
  del dominio y del prototipo, no una lectura del backend real. **Es el
  riesgo más grande que deja este slice**: hay que confirmar contra la API
  real en cuanto haya un backend accesible, y ajustar los modelos si difieren
  (los servicios están concentrados en `CatalogoBaseService`, así que el
  ajuste sería acotado).
- **`Lote.tipoSuelo` es texto libre, no un `<select>`.** El prototipo lo
  muestra como desplegable de una lista fija (`SUELO_TIPOS`), pero
  `tipoSuelo` no es uno de los trece enums de `GET /api/metadata/enums` y su
  shape confirmado en `docs/api-endpoints.md` es un string libre
  (`"Franco arenoso"`). Hardcodear esa lista habría violado la regla 3 de
  `CLAUDE.md`.
- **Autocompletado de unidad de cultivo sin tabla de presets hardcodeada.**
  El prototipo autocompleta `unidad`/`unidadPlural`/`kgPorUnidad` desde una
  tabla local `UNIDADES_PRESET` (Bolsa=20kg, Bin=400kg, ...), que duplicaría
  el enum real `unidadProduccion` con una lista propia. En su lugar, al
  elegir la unidad de producción (poblada desde el enum real) se
  autocompleta `unidadSingular` con la etiqueta del enum y se sugiere un
  plural con `pluralizar()`; `kgPorUnidad` queda vacío porque varía
  demasiado por cultivo para adivinarlo. Los tres campos quedan editables
  después, igual que en el prototipo.
- **Comprador reusa el enum `modalidadVenta`** en vez del booleano
  `consignacion` que usa el prototipo — evita modelar dos veces el mismo
  concepto (precio cerrado / consignación) con dos representaciones
  distintas en el sistema.
- **Tres columnas del prototipo se omitieron por ahora**: "cultivo actual en
  la campaña" en la fila de lote y "ventas en la campaña" en la de comprador
  dependen de `LoteCampania` (slice 3) y `Venta` (slice 5), que no existen
  todavía. El tipo de cambio en la fila de insumo tampoco se muestra: el
  catálogo de insumo no lo tiene, se congela recién en la aplicación real
  (`docs/dominio.md` §8).
- **Filtro de tipo en insumos muestra las ocho opciones del enum siempre**,
  no solo los tipos presentes en la página cargada (como hace el prototipo
  con sus datos mock). Es más simple y no depende de qué haya en la página
  actual de un listado que en producción puede estar paginado.
- **Botón de guardar nunca se deshabilita en tiempo real.** El prototipo
  grisa el botón y muestra una pista mientras el formulario es inválido; acá
  se siguió el patrón que ya tenía `Login` de slice 1 (enviar siempre habilita
  el submit, y `markAsTouched()` revela los errores recién al intentar
  guardar). Simplifica los cuatro formularios sin perder validación.
- **httpResource + `.reload()` para los listados**, no suscripciones
  manuales a `HttpClient` — la URL se recalcula reactivamente a partir de
  los signals de filtro (`verBaja`, `tipoFiltro` en insumos) y las
  mutaciones (crear/editar/baja/reactivar) llaman `.reload()` al cerrar el
  modal. Sin paginación real: `size=200` alcanza para los catálogos chicos
  de un productor hortícola y el prototipo tampoco la tiene.
- **Bug de testing encontrado con `httpResource`**: si un test llama
  `fixture.whenStable()` antes de flushear la request pendiente del
  recurso, el test cuelga — `whenStable()` espera esa misma request, que
  solo se resuelve flusheándola primero. La regla que quedó en los specs:
  nunca `await whenStable()` con una request sin flushear en danza; flushear
  primero, después esperar estabilidad. Para requests disparadas por un
  evento del usuario (click en un toggle) dentro del test, hace falta
  `TestBed.flushEffects()` antes de que la nueva request aparezca en el
  `HttpTestingController`.
- Presupuesto de `anyComponentStyle` en `angular.json` subido de 6kB a 8kB:
  los partials compartidos (`_catalogo.scss` en particular) empujan el CSS
  compilado de cada listado un poco por encima del default, pero muy por
  debajo del error (10kB); es el costo esperado de compartir esos estilos
  en vez de duplicarlos por pantalla.

### Verificado contra el backend real (no solo mocks)

Con el backend corriendo en `localhost:8080`, se probó el flujo completo en
navegador (Playwright, proxeando `/api/**` de `:4200` hacia `:8080` porque no
hay `proxy.conf.json`) con un usuario registrado de verdad. Esto encontró y
corrigió **dos bugs reales** que ningún test con mocks podía haber visto,
porque los mocks asumían exactamente el comportamiento que resultó ser
incorrecto:

1. **`EnumsService` nunca reintentaba tras el login.** Se precarga con
   `provideAppInitializer` (slice 0) antes de que exista sesión, así que su
   primer `GET /api/metadata/enums` salía sin JWT, el backend respondía
   `401`, y como la función de la URL de `httpResource` era estática
   (`() => '.../metadata/enums'`, sin ningún signal del que depender), el
   recurso quedaba en estado de error **para siempre** — ningún desplegable
   de la app (rol en el sidebar, tipo/unidad en insumo, unidad de producción
   en cultivo, modalidad en comprador) volvía a poblarse después de loguearse.
   Fix: la URL ahora depende de `TokenStorageService.token()`
   (`src/app/core/enums/enums.service.ts`) y es `undefined` sin token, así
   que `httpResource` no dispara nada hasta que hay uno y se recalcula solo
   al loguearse. Cubierto en `enums.service.spec.ts` (nuevo). Como esto es de
   slice 0, cualquier slice futuro que dependa de enums se beneficia también.
2. **`CompradorForm` mandaba `""` en `modalidadHabitual`** cuando el
   selector quedaba sin elegir (es el único campo opcional de tipo enum de
   los cuatro catálogos). El backend intenta deserializar ese `""` como el
   enum `ModalidadVenta`, la excepción de esa conversión se traduce en un
   **`401` con cuerpo vacío** (no el `400` con `ErrorResponse` habitual de
   una validación de Bean Validation) — un caso borde real del backend que
   el frontend tiene que evitar activamente. Fix: el payload manda `null` en
   vez de `""` (`comprador-form.ts`), y `Comprador.modalidadHabitual` pasó a
   `string | null` porque el backend directamente omite la clave del JSON
   cuando no está cargada (Jackson `NON_NULL`). El listado ya no llama
   `enums.etiqueta()` con `null` (mostraba el string `"null"` en la fila).
   Cubierto explícitamente en `comprador-form.spec.ts`.

Además, confirmó que el resto del slice está bien: CRUD completo de lote
(crear, editar, baja, ver dados de baja, reactivar) y alta de comprador
funcionan de punta a punta contra datos reales, sin errores de consola. El
shape de `Comprador` (`id, nombre, cuit, contacto, telefono, localidad,
modalidadHabitual, activo`) coincidió exactamente con lo inferido.

**Hallazgo sin corregir, para tener en cuenta en slices futuros**:
`Lote.superficieHa` vuelve del backend como **número JSON** (`5.5000`), no
como string (`docs/api-endpoints.md` lo documenta como `"12.50"` entre
comillas, y CLAUDE.md regla 1 pide nunca tratar decimales como `number`
porque `JSON.parse` los pasa por `float64` antes de que el código los toque).
No rompió nada acá porque nada llama `.trim()` u otro método de string sobre
un valor leído directo de la API sin pasar antes por un input de formulario,
y los pipes (`DecimalPipe`, `ImportePipe`) aceptan number o string por igual
— pero es una violación real del contrato documentado a revisar antes de que
el slice 4/5 sumen importes de verdad. `Cultivo.kgPorUnidad` hace lo mismo
(confirmado más abajo).

### Segunda vuelta de verificación, ya con usuario ADMIN real

Repetido con credenciales `ADMIN` reales (no autoregistradas, rol
`OPERADOR` por defecto) provistas después del primer verificado. Esto
permitió por fin probar de punta a punta la creación de `Cultivo` e
`Insumo`, bloqueada antes porque `OPERADOR` no tiene permiso de escritura
sobre catálogos con precio. Encontró un error real de shape y **un bug de
backend que bloquea por completo dos de los cuatro catálogos**:

1. **Los nombres de campo de `Cultivo` inferidos eran incorrectos.**
   Confirmado por bisección directa contra la API (mandar el campo de a uno
   y ver si el backend lo reconoce o lo ignora en silencio): el shape real
   es `unidadProduccionDefault` (no `unidadProduccion`), `nombreSingular`
   (no `unidadSingular`) y `nombrePlural` (no `unidadPlural`). Corregido en
   `cultivo.model.ts`, `cultivo-form.ts/html` y sus specs — con estos
   nombres, crear un cultivo con nombre + unidad + kg funciona perfecto de
   punta a punta.
2. **`precioReferencia` (insumo) y `precioReferenciaPrimera`/
   `precioReferenciaSegunda` (cultivo) están rotos en el backend, no es un
   problema de shape que se pueda arreglar adivinando desde acá.** Los
   nombres de campo SÍ son correctos (se confirma porque el backend los
   reconoce — a diferencia de un nombre inventado, que se ignora en
   silencio y el alta sigue con `201`), pero **mandar cualquier valor ahí
   rompe la creación/edición completa** del insumo o cultivo con un `401`
   de cuerpo vacío. Se probó exhaustivamente por curl contra los tres campo:
   string (`"900.50"`), número (`900.5`, `950075` como enteros), booleano,
   objeto anidado `{importe, moneda}` y `{importe, moneda, tipoCambio}` — 
   **todas las variantes fallan igual**, en insumo y en los dos cultivo, en
   POST y en PUT. Que hasta un `boolean` dispare el mismo error descarta un
   problema de shape (Jackson aceptaría al menos algún tipo primitivo) y
   apunta a un deserializador roto del lado del backend para ese campo
   específico.
   **Consecuencia práctica**: como `InsumoForm` exige el precio de
   referencia (`validate(precioReferencia > 0)`, es un campo obligatorio
   del dominio), **hoy no se puede crear ningún insumo desde la app** —
   cualquier intento falla con "No se pudo guardar el insumo. Probá de
   nuevo." sin importar qué se cargue. En `Cultivo` el precio es opcional en
   la validación del formulario, así que ahí sí se puede crear/editar un
   cultivo dejando los dos precios de referencia vacíos; cargarlos rompe
   igual el guardado completo (no solo el precio).
   **No se tocó el frontend para este caso** — ni se relajó la validación
   de insumo ni se dejó de mandar el campo — porque es una decisión de
   producto (¿ocultar temporalmente el campo? ¿dejarlo así hasta que se
   arregle el backend?) que le corresponde al equipo, no algo para decidir
   unilateralmente. Ver "Pendiente" abajo.

Aparte de eso, quedó confirmado con ADMIN: CRUD completo de lote, comprador
y (sin precio) cultivo funcionan de punta a punta contra datos reales, sin
errores de consola. `Cultivo.kgPorUnidad` también vuelve como número JSON
(`20`, no `"20"`), mismo patrón que `Lote.superficieHa`.

### Tercera vuelta: el backend arregló el bug de precio y aclaró el shape

El equipo de backend corrigió el bug de la sección anterior y confirmó que
`precioReferencia`/`precioReferenciaPrimera`/`precioReferenciaSegunda` no
son un número/string suelto: son el value object **`Monto`**
(`docs/dominio.md` §11) — `{ importe, moneda, tipoCambio }` — y **`tipoCambio`
es obligatorio siempre, incluso en pesos** (confirmado por bisección: sin él,
o con él en `null`, el backend devuelve `400 CUERPO_INVALIDO`). Se verificó
contra la API real con usuario ADMIN antes de tocar el frontend:

- `importe` y `tipoCambio` viajan como **número JSON**, no string —
  confirmado explícitamente por el backend y no una inferencia: es la
  excepción documentada a CLAUDE.md regla 1, distinta de los endpoints de
  costos/márgenes (que sí usan string). Ver el comentario en
  `src/app/models/monto.model.ts`.
- La respuesta agrega `importeUsd` (`moneda == USD ? importe :
  importe / tipoCambio`, ya calculado por el backend) — no se manda nunca en
  el request, por eso `MontoRequest` es un tipo separado sin ese campo.
- **`Cultivo` no tiene ningún campo `fechaActualizacionPrecio`.** Estaba
  inferido de `docs/reglas-calculo.md` sin confirmar contra la API real; el
  backend simplemente no lo tiene. Se sacó el campo del modelo y el bloque
  "Precio de referencia actualizado el..." del formulario y de la fila del
  listado.

**Cambios en el frontend** (`src/app/models/monto.model.ts` nuevo,
`insumo.model.ts`, `cultivo.model.ts`, `insumo-form.ts/html`,
`cultivo-form.ts/html`, `*-listado.html`, `importe.pipe.ts` ampliado a
aceptar `number` además de `string`):

- `Insumo.precioReferencia` e `Insumo.moneda` (el campo suelto, que en
  realidad nunca existió — confirmado que el backend lo ignoraba en
  silencio) se reemplazaron por `precioReferencia: Monto | null`.
- El formulario de insumo suma un campo **"Tipo de cambio"** junto al
  precio (antes no existía: la moneda se elegía pero no había dónde cargar
  el TC). Nueva `TipoCambioMemoriaService`
  (`shared/data/tipo-cambio-memoria.service.ts`, localStorage) precarga el
  último tipo de cambio cargado, para no pedirle al usuario que lo tipee de
  cero en el caso normal (`docs/design-brief.md` §6.4). Se guarda de nuevo
  cada vez que un guardado sale bien.
- `Cultivo` no tiene selector de moneda (el prototipo nunca lo mostró para
  estos precios): el formulario sigue sin él y arma el `Monto` con
  `moneda: 'ARS'` fijo, pidiendo un único campo de tipo de cambio compartido
  entre las dos calidades. Ese campo es **obligatorio solo si se cargó algún
  precio** (`validate()` que lee las dos calidades del propio signal del
  formulario, no un `required` con `when` sobre `FieldContext` — más simple
  y consistente con cómo ya se resolvía el autofill de unidad).
- **Bug propio encontrado en el camino, no del backend**: `pluralizar()`
  (usada para sugerir el plural de la unidad de cultivo) le agregaba "es" a
  "Kilogramos" → "Kilogramoses", porque la heurística asumía abreviaturas
  cortas tipo "kg"/"tn" y el enum real del backend devuelve la palabra
  completa ya en plural ("Kilogramos", "Toneladas"). Fix: si la palabra ya
  termina en "s", se deja igual. Cubierto en `pluralizar.spec.ts` (nuevo).

Reverificado de punta a punta contra el backend real: alta de insumo con
precio + TC, alta de cultivo con las dos calidades + TC compartido, alta de
cultivo sin precio (no exige TC), sin errores de consola. `npm test` (78/78),
`npm run lint` y `npm run build` en verde.

### Cuarta vuelta: proxy — el gap que afectaba al usuario, no solo a los scripts

Las tres verificaciones anteriores usaban un proxy manual armado en cada
script de Playwright (`page.route('**/api/**', ...)` reenviando a
`:8080`). Enmascaraba un problema real: **cualquier persona usando la app
desde un navegador de verdad en `http://localhost:4200`** (no un script) se
encontraba con el login roto y el mensaje genérico "No se pudo completar la
operación" — exactamente lo que le pasó al usuario al probar la app a mano.

El fix tuvo **dos partes**, y la primera sola no alcanzaba:

1. `proxy.conf.json` en la raíz del repo, cableado en `angular.json`
   (`serve.options.proxyConfig`), para que `npm start` proxee `/api/**`
   hacia `:8080`.
2. **La parte que realmente importaba**: `environment.development.ts` tenía
   `apiBaseUrl: 'http://localhost:8080/api'` (URL absoluta) desde el
   scaffold original de slice 0. Con eso, el navegador manda el request
   directo a `:8080`, **saltándose el proxy del punto 1 por completo**, y lo
   bloquea CORS (el backend no manda
   `Access-Control-Allow-Origin`). El síntoma en el navegador era el mismo
   mensaje genérico del interceptor; recién se vio la causa real
   inspeccionando la consola/red de un navegador de verdad — `curl
   http://localhost:4200/api/...` daba `200` porque curl no aplica CORS, así
   que parecía que el proxy ya andaba. Fix: `apiBaseUrl: '/api'` (relativo,
   igual que `environment.ts` de producción).

Con las dos partes, el proxy casero de Playwright queda obsoleto — navegar
directo a `:4200` alcanza ahora, tanto a mano como en un script. **Lección
para la próxima vez que algo "funcione por curl pero no en el navegador"**:
probar con un navegador real (Playwright alcanza) antes de asumir que un fix
de infraestructura de red está completo — CORS es invisible para `curl`.

### Quinta vuelta: los cuatro formularios de edición no precargaban nada

Reportado por el usuario probando la app ya logueado: clickear una fila de
cualquier catálogo abría el modal de edición con **todos los campos en
blanco** en vez de los datos del registro. Bug real en el patrón repetido en
los cuatro formularios (`lote-form.ts`, `cultivo-form.ts`, `insumo-form.ts`,
`comprador-form.ts`), presente desde que se escribió el primero de los
cuatro — ningún test lo agarró porque ninguno afirmaba el *valor* de los
campos en modo edición, solo que el botón de baja apareciera (que sí
depende de un signal distinto, `esEdicion`, que sí es reactivo).

**Causa**: `modelo` se armaba con un `signal<Modelo>({ nombre:
this.entidad()?.nombre ?? '', ... })` leyendo el `input()` de la entidad
**en el inicializador de campo de la clase** — y en ese momento el valor
pegado a un `input()` todavía no está disponible (se resuelve recién antes
del primer render, no durante la construcción del campo). El `signal()`
capturaba ese `null` una sola vez y quedaba así para siempre; que
`this.entidad()` cambiara después no volvía a tocar `modelo`.

**Fix**: reemplazar `signal(...)` por **`linkedSignal(() => (...))`** en
los cuatro formularios (`linkedSignal`, `@angular/core`, estable desde
v20): un signal escribible que **recalcula su valor con la función cada vez
que algo que lee dentro de ella cambia** — acá, el input de la entidad — y
que el usuario puede seguir sobrescribiendo con `.set()`/`.update()`
después, exactamente el comportamiento que hacía falta (arrancar
pre-cargado, pero editable). En `cultivo-form.ts` e `insumo-form.ts`, la
lectura de `TipoCambioMemoriaService.ultimo()` dentro de esa misma función
se envolvió en `untracked(...)`: es solo un valor default de arranque, no
algo que deba resetear el formulario completo si cambia mientras el usuario
está escribiendo.

Se agregó un test de regresión por formulario (`en edición, precarga los
campos con los datos de...`) que afirma el *valor* de los inputs, no solo
que el botón de baja aparezca — el gap real que dejó pasar el bug. Reprobado
contra el backend real con Playwright: los cuatro catálogos precargan bien.
`npm test` (82/82), `npm run lint` y `npm run build` en verde.

### Sexta vuelta: el backend migró de `PageImpl` a `PagedModel`

Aviso del equipo de backend, no encontrado probando: los listados paginados
(`GET /api/lotes`, `/cultivos`, `/insumos`, `/compradores`, y cualquier otro
que use el mismo wrapper) cambiaron de forma. Antes los campos de paginación
(`totalElements`, `totalPages`, `number`, `size`, más `first`/`last`/`empty`/
`pageable`/`sort` de `PageImpl`) vivían sueltos en la raíz junto a
`content`; ahora viven anidados en `page: { size, number, totalElements,
totalPages }`, y **`first`/`last`/`empty`/`pageable`/`sort` ya no existen**.
Confirmado contra la API real.

**Impacto real en el frontend: ninguno funcional.** Los cuatro listados de
catálogo solo leían `.content` de la respuesta (`recurso.value()?.content ??
[]`) — nunca `totalElements` ni el resto, porque este slice no tiene
paginación real (`size=200` alcanza para catálogos chicos, ver slice 2 más
arriba). El build lo confirma: cambiar el modelo no rompió ni un solo
archivo de `src/app/features`.

Se actualizó igual `PaginaResponse<T>` (`src/app/models/pagina-response.model.ts`,
ahora con `PaginaMetadata` anidada) y `docs/api-endpoints.md` para que
reflejen el shape real — si no, el próximo slice que sí necesite
`totalElements`/`totalPages` (paginación de verdad, o un contador tipo "142
insumos" en vez de listar todo) iba a heredar un modelo con el shape viejo y
romper recién ahí. Los `paginaDe()` de los cuatro specs de listado se
actualizaron para matchear. `npm test` (82/82), lint y build en verde;
reverificado contra el backend real que los cuatro catálogos siguen
listando bien.

### Pendiente / abierto

- Las columnas omitidas (lote↔campaña activa, ventas de comprador) se
  completan solas cuando exista el slice 3/5 — no van a requerir tocar el
  modelo de datos, solo agregar la columna a la fila.
- El tablero (`/tablero`) y las demás rutas de `NAV_PRINCIPAL` siguen sin
  contenido: es del slice 3 en adelante.
- `TipoCambioMemoriaService` guarda el último TC cargado sin distinguir
  insumo de cultivo ni fecha — es una precarga de conveniencia, no una
  cotización real. El slice de aplicación de insumo (slice 4) va a necesitar
  algo más preciso (docs/design-brief.md §6.4 habla de "la última cotización
  usada" en ese contexto también); revisar si esta memoria alcanza o hace
  falta algo con más contexto (por moneda, por fecha) en ese momento.

---

## Slice 3 — Campaña y siembra

**Estado**: cerrado. `npm run lint`, `npm test` (107/107) y `npm run build` en verde.
Verificado en navegador con Playwright (login → sin campaña activa → elegir/crear
campaña → tablero con datos reales → sembrar un lote → cerrar/reabrir campaña) en
1280px y 390px, sin errores de consola.

### Qué se construyó

- **`CampaniaActivaService` completo** (`src/app/core/campania/campania-activa.service.ts`):
  reemplaza el signal vacío de slice 0. Persiste `{id, nombre, estado}` en
  localStorage (mismo patrón que `TokenStorageService`/`TipoCambioMemoriaService`) para
  sobrevivir a un refresh, y agrega `selectorAbierto`/`abrirSelector()`/`cerrarSelector()`
  como estado compartido: cualquier pantalla puede abrir el modal de selección
  llamando al servicio directo, sin pasar el estado por `@Input`/`@Output` entre `Shell`
  y quien lo necesite (hoy `SelectorCampania` y el estado vacío del tablero).
  `AuthService.salir()` ahora también limpia la campaña activa.
- **`CampaniaSelectorModal`** (`src/app/features/campania/`): un solo componente con
  dos vistas ("lista" / "nueva") dentro del mismo `<app-modal>` — lista las campañas
  existentes con su estado, elegir una la marca activa; "+ Nueva campaña" muestra el
  formulario de alta (Signal Forms: nombre, fecha de inicio, fecha de fin, gastos de
  comercialización estimados con default 12%) sin apilar un segundo modal.
- **Tablero** (`src/app/features/tablero/`), ruta por defecto de la app (`''` redirige a
  `/tablero`): indicadores de campaña (costo total, superficie sembrada, costo por ha,
  ingreso realizado, margen realizado) desde `GET /campanias/{id}/resumen`, tabla de
  lote-campaña con costo total/por ha y badge "Ciclo N" cuando un lote se sembró más de
  una vez, acciones de ciclo de vida de la campaña (marcar en curso / cerrar / reabrir)
  y estado vacío cuando no hay campaña activa.
- **`SembrarLoteForm`** (`src/app/features/tablero/sembrar-lote-form.ts`): "sembrar un
  lote" (crear un `LoteCampania`), con lote y cultivo primero (definen superficie máxima
  y autocompletan la unidad de producción), validación local de
  `0 < superficie <= Lote.superficieHa`, y sin campo de `ciclo` — el backend lo
  autoincrementa solo.
- **`CampaniaService`** (`src/app/features/campania/`) y **`LoteCampaniaService`**
  (`src/app/features/lote-campania/`, carpeta reservada para el slice 4): capas finas
  sobre `HttpClient`, sin extender `CatalogoBaseService` porque campaña no tiene baja
  lógica ni reactivación (su ciclo de vida es `estado`).
- **Modelos nuevos**: `Campania`, `CampaniaRequest`, `CambioEstadoRequest`
  (`campania.model.ts`), `ResumenCampania`/`ResumenCampaniaLote`
  (`resumen-campania.model.ts`), `LoteCampaniaRequest` (agregado a
  `lote-campania.model.ts`).
- Ruta `/tablero` cableada en `app.routes.ts`, con `{ path: '', redirectTo: 'tablero' }`
  como landing page — hasta ahora la app autenticada mostraba contenido vacío en `''`.

### Decisiones no triviales

- **Todo el slice se desarrolló contra el backend real corriendo en `localhost:8080`**,
  con bisección directa (crear con campos de a uno, ver qué acepta/rechaza) igual que
  hizo slice 2 con `Cultivo`/`Insumo` — `docs/api-endpoints.md` no traía shape exacto
  para `Campania`, `POST .../lote-campanias` ni `GET .../resumen`. Esto evitó repetir
  el patrón de slice 2 (inferir, enviar, descubrir después que estaba mal) y encontró
  varios shapes reales antes de escribir el modelo, no después:
  - `Campania` exige `fechaInicio`, `fechaFin` y `gastosComercializacionEstimados`
    (fracción 0–1, no documentado en ningún lado antes) además de `nombre`.
    `gastosComercializacionEstimados` es el parámetro de `docs/reglas-calculo.md` §6.
  - `ciclo` se autoincrementa en el backend si se omite en el alta — el frontend no
    necesita pedirlo ni calcularlo (ver "Qué se construyó").
  - `PATCH /{id}/estado` no bloquea volver de `CERRADA` a `EN_CURSO`: el invariante
    "cerrada no admite movimientos" se garantiza en los endpoints de movimientos
    (`422 CAMPANIA_CERRADA`), no en la transición de estado. Por eso el tablero ofrece
    "Reabrir campaña" como acción secundaria válida, no un error a evitar.
  - `GET /campanias/{id}/resumen` **no expone margen estimado**, ni a nivel campaña ni
    por lote (solo `margenRealizadoUsd`) — a diferencia de `GET
    /lote-campanias/{id}/margen`, que sí trae los dos. No es una omisión del frontend:
    el backend no lo calcula en este endpoint. El tablero lo etiqueta siempre como
    "Margen realizado" (nunca solo "Margen") para no violar la regla de
    docs/design-brief.md §6.1 por omisión — el detalle de lote-campaña (slice 4) sigue
    mostrando los dos porque ahí sí existen los dos.
  - `resumen.lotes[]` no trae `costoPorUnidad` (por bolsa) ni `ciclo`. Se decidió no
    pedir `costoPorUnidad` con un fetch extra por fila: hasta que exista cosecha
    (slice 5) siempre sería `null`, así que hoy no habría nada que mostrar. `ciclo` sí
    hacía falta (para el badge "Ciclo N", requisito explícito del slice) y se resolvió
    con una segunda request barata (`GET .../lote-campanias`, ya necesaria para poco
    más) cruzada por `loteCampaniaId`, en vez de un fetch por fila.
  - **Corrección real de shape, más allá del alcance de este slice pero encontrada en
    el camino**: `DesgloseCostosResponse` y `MargenResponse` (consumidos recién en
    slice 4) también resultaron ser número JSON, no string como decían
    `docs/api-endpoints.md` y CLAUDE.md regla 1. Se corrigieron los modelos
    (`desglose-costos.model.ts`, `margen.model.ts`), `docs/api-endpoints.md` y el
    párrafo de CLAUDE.md que lo afirmaba al revés, porque ninguno de los dos modelos
    tenía consumidores todavía (cero riesgo de romper algo) y dejarlo mal documentado
    le habría costado a slice 4 repetir la misma bisección. `LoteCampania.superficieSembradaHa`
    se corrigió por la misma razón (sin consumidores hasta ahora); `Lote.superficieHa`
    y `Cultivo.kgPorUnidad` **no se tocaron** — tienen el mismo bug de shape (documentado
    desde slice 2) pero sí tienen consumidores reales (los cuatro formularios de
    catálogo), así que arreglarlos es un cambio de alcance mayor que se deja para
    cuando el slice que realmente sume esos importes lo necesite.
- **Campaña activa persistida en localStorage, no solo en memoria**: no estaba pedido
  explícitamente, pero perder el contexto de campaña en cada refresh de página iba
  en contra de "debe estar siempre visible" (arquitectura, CLAUDE.md) para una app que
  se usa repetidas veces por sesión. Se acepta la staleness de un estado (`estado`)
  desactualizado entre pestañas/sesiones distintas como riesgo bajo: el backend igual
  rechaza cualquier movimiento con un error claro si el contexto quedó viejo, y el
  signal se refresca solo con cualquier acción hecha desde la propia app.
- **El modal de selección de campaña no vive en `Shell` como estado propio**: se movió
  a `CampaniaActivaService.selectorAbierto` para que el estado vacío del tablero
  también pudiera abrirlo con una sola llamada (`campaniaActiva.abrirSelector()`), sin
  duplicar un `@Output` en cada pantalla que necesite pedir campaña activa.
- **Sin campo `ciclo` en el formulario de siembra**: pedírselo al usuario violaría
  docs/design-brief.md §2 ("si una pantalla le exige pensar, está mal diseñada") — el
  backend ya resuelve el número solo. Si el usuario quiere sembrar el mismo lote+cultivo
  de nuevo, repite el mismo formulario y el backend arma el ciclo 2 sin pedir nada extra.
- **Presupuesto `anyComponentStyle` subido de 8kB a 10kB/12kB** (`angular.json`):
  `tablero.scss` solo (sin contar `_catalogo.scss`/`_tokens.scss` que ya empujaban el
  presupuesto desde slice 2) quedó en ~9kB compilado por la grilla de indicadores y las
  variantes de estado de campaña. Mismo costo esperado de compartir partials que ya se
  aceptó en slice 2, solo que un escalón más arriba.
- **Filas de la tabla del tablero no son clickeables**: el detalle de lote-campaña
  (slice 4, "la pantalla central") no existe como ruta todavía — un link a una pantalla
  inexistente sería peor que no tener link. Se corrige solo cuando slice 4 exista.

### Verificado contra el backend real

Con el backend corriendo en `localhost:8080` y usuario ADMIN real: alta de campaña,
selección desde el modal, "sembrar un lote" con autocompletado de unidad desde el
cultivo elegido (incluida una segunda siembra del mismo lote, que el backend etiquetó
sola como "ciclo 2"), indicadores del tablero con datos reales (4 lote-campaña
sembrados, costos en cero por no tener tareas/insumos cargados todavía), cerrar
campaña (oculta "Sembrar un lote", muestra el aviso de solo lectura) y reabrir, sin
errores de consola, en 1280px y 390px. El primer intento de captura de pantalla mostró
indicadores vacíos por una carrera entre el screenshot y el `httpResource` todavía sin
resolver — no un bug real; quedó confirmado repitiendo la verificación con
`page.waitForResponse()` antes de la captura (ver la lección de slice 2 sobre no
confiar en un estado capturado sin esperar la red).

### Pendiente / abierto

- **`Cultivo.kgPorUnidad`, `Lote.superficieHa`**: siguen mal tipados como string
  (deberían ser number, confirmado desde slice 2) — repetido acá como recordatorio
  porque este slice fue el primero en sumar hectáreas de verdad (`superficieTotalHa`
  del tablero) sin que ese bug afectara el resultado, pero slice 4/5 van a sumar
  importes de catálogo con el mismo problema y ahí sí hay que arreglarlo.
- **`costoPorUnidad` por lote-campaña no se muestra en el tablero**: `resumen.lotes[]`
  no lo trae y hoy siempre sería `null` (sin cosecha). Cuando slice 5 exista, evaluar si
  conviene pedirlo al backend en `resumen` o resolverlo con un fetch por fila.
- **Filas de la tabla sin link al detalle**: se resuelve solo en cuanto exista la ruta
  de slice 4.
- El modal de selección de campaña no tiene forma de "editar" una campaña existente
  (nombre, fechas, gastos de comercialización) ni de eliminarla — no estaba pedido y no
  hay endpoint de baja para campaña; si hace falta corregir un dato mal cargado, hoy no
  hay forma desde la UI.

### Segunda vuelta: ajustes de diseño pedidos por el usuario

Dos observaciones después de revisar la pantalla:

1. **El badge "Ciclo N" se veía desprolijo.** Reutilizaba `.chip-toggle` (pensado para
   un botón clickeable como "Ver dados de baja"), que quedaba con el peso visual de un
   control interactivo pegado al nombre del lote, sin que lo fuera. Revisando
   `docs/design-reference/` se confirmó que el prototipo **no usa ningún chip para
   esto**: no distingue el ciclo en la fila del tablero en absoluto, y en cambio avisa
   **antes de guardar**, dentro del formulario de siembra, cuando el lote+cultivo
   elegido ya se sembró ("Este lote ya tiene N siembras... esta va a quedar como ciclo
   N+1"). Se corrigieron las dos cosas para alinear con la referencia:
   - La fila del tablero cambió el chip por texto secundario dentro del mismo renglón
     de detalle ("0.5 ha sembradas · ciclo 2"), mismo tratamiento tipográfico que el
     resto de esa línea — visualmente mucho más discreto.
   - `SembrarLoteForm` suma el aviso del prototipo: recibe `existentes` (los
     lote-campaña ya cargados, que `Tablero` ya tenía pedidos — sin fetch nuevo) y
     muestra, apenas se elige lote+cultivo, cuántas siembras previas hay y qué ciclo va
     a quedar. Reusa los tokens `--color-advertencia-*` (mismo fondo/borde/texto que ya
     usaba el aviso de campaña cerrada), que además coinciden con los colores exactos
     del prototipo para este mismo aviso.
   - **Bug de verificación, no de código**: al probar el fix en el navegador, el
     cambio en `sembrar-lote-form.html` no se reflejaba pese a que el mismo tipo de
     cambio en `tablero.html` sí — el servidor de `ng serve` que ya estaba corriendo
     (heredado de la sesión anterior) tenía el HMR de ese archivo específico stale.
     Confirmado con un `<p>` de debug temporal que mostraba los signals correctos
     (`siembrasPrevias=2`) pero no llegaba a renderizarse hasta reiniciar `ng serve`
     limpio. Quedó como lección: si un cambio de template no aparece en el navegador
     pese a no haber error de compilación, probar reiniciar el dev server antes de
     asumir que el código está mal — mismo espíritu que la advertencia ya documentada
     sobre no confiar en una captura sin esperar la red.
2. **El selector $ARS / US$ del tablero, presente en el prototipo, no se implementó.**
   Confirmado contra el backend real: `GET /campanias/{id}/resumen` únicamente expone
   montos en dólares (ni campos en pesos ni un parámetro `moneda` que cambie la
   respuesta). Mostrar $ARS ahora requeriría convertir el USD ya agregado con un tipo
   de cambio "actual" cacheado en el front — pero ese total mezcla movimientos
   cargados en fechas distintas con tipos de cambio históricos distintos, así que la
   conversión daría una cifra en pesos que nunca existió realmente. Es exactamente el
   tipo de aproximación que CLAUDE.md regla 1 busca evitar. Se lo planteó al usuario,
   que confirmó dejarlo para el slice 6 (`docs/plan-frontend.md` ya lo asignaba ahí) —
   ahí conviene definir con el equipo de backend si el endpoint va a exponer los
   totales en ambas monedas o el criterio de conversión correcto, antes de tocar el
   front.

Reverificado en navegador tras el fix (Playwright, campaña con 4 lote-campaña, dos de
ellos ciclo 2): la fila del tablero muestra el ciclo como texto secundario, y elegir
un lote+cultivo ya sembrado en `SembrarLoteForm` muestra el aviso correcto antes de
guardar. `npm test` (108/108), `npm run lint` y `npm run build` en verde.

### Tercera vuelta: el backend agregó soporte para pesos (Ars) — y rompió un formulario de slice 2

El equipo de backend respondió a la limitación documentada en la segunda vuelta
(resumen sin ARS, que llevó a dejar el selector de moneda para slice 6) sumando
`Campania.cotizacionVigente` y duplicando en pesos los importes de
`DesgloseCostosResponse`, `MargenResponse`, `ResumenCampaniaResponse` y
`CostosPorRubroResponse`. Junto con eso, cambió sin avisar aparte el shape del precio
de referencia de `Cultivo`. Todo se confirmó por bisección directa contra el backend
real antes de tocar código (mismo método que las vueltas anteriores) porque la
descripción que mandó el equipo de backend no coincidía exactamente con lo que el
front ya tenía integrado (por ejemplo, describía el "antes" de
`MargenResponse`/`DesgloseCostosResponse` sin sufijo `Usd`, cuando el front ya
consumía esos campos con sufijo `Usd` desde la segunda vuelta).

**Cambios de modelo** (`src/app/models/`):

- `Campania`/`CampaniaRequest` suman `cotizacionVigente` (número en la respuesta,
  string opcional — `null` para omitir — en el request). Se omite del JSON de
  respuesta cuando no está cargada, mismo patrón `NON_NULL` que ya se veía en otros
  campos opcionales.
- `DesgloseCostos`, `Margen`, `ResumenCampania`/`ResumenCampaniaLote`: todos los campos
  de plata pasan de sufijo único (`Usd`) a par `Ars`/`Usd`. Confirmado contra la API
  real el detalle de nulabilidad de cada campo `*Ars` de una estimación: depende de
  `Campania.cotizacionVigente`, no de si el cultivo tiene precio de referencia (eso
  gobierna el `*Usd`, que es independiente).
- `CostosPorRubro` (nuevo, `costos-por-rubro.model.ts`): shape confirmado para
  `GET /campanias/{id}/costos-por-rubro`, aunque sigue sin consumidor — es del reporte
  de slice 6. Se modela ahora, con el shape ya confirmado, para no repetir la
  bisección en ese slice.
- **`monto.model.ts` se parte en dos tipos**: `Monto` (con `tipoCambio`, sigue siendo
  el shape de `Insumo.precioReferencia`) y `PrecioReferencia` (nuevo, `{ importe,
  moneda }`, sin `tipoCambio` ni `importeUsd`/`importeArs`) — este último reemplaza a
  `Monto` en `Cultivo.precioReferenciaPrimera`/`Segunda`. No es un simple recorte de
  campos: son conceptos de dominio distintos (uno se congela con la aplicación, el
  otro se convierte en el momento con `cotizacionVigente` de la campaña) que
  compartían el mismo tipo TypeScript por casualidad, y el backend terminó de separar
  también a nivel de contrato.

**Bug real encontrado y corregido, no pedido por el usuario**: `cultivo-form.ts` leía
`precioReferenciaPrimera.tipoCambio.toString()` para precargar el campo de tipo de
cambio del formulario. Con el shape nuevo, `tipoCambio` no existe más en la respuesta
→ `TypeError: Cannot read properties of undefined` al abrir para editar cualquier
cultivo con precio cargado. Se encontró simulando el flujo contra el backend real
(mismo cultivo de prueba usado en slices anteriores) antes de que llegara a
producción. Fix: se sacó el campo "Tipo de cambio" del formulario de cultivo por
completo (`cultivo-form.ts`, `.html`, `.spec.ts`) — ya no tiene sentido pedirlo, el
backend convierte con la cotización de la campaña, no con un TC propio del precio.
`InsumoForm` no se tocó: `Insumo.precioReferencia` sigue siendo `Monto` completo, con
su propio campo de tipo de cambio (se congela con la aplicación real, caso distinto).

---

## Slice 6 — Costos indirectos y reportes

**Estado**: cerrado. `npm run lint`, `npm test` (185/185) y `npm run build` en verde.
Verificado en navegador con Playwright contra el backend real (login ADMIN → campaña
"2025/26 editado" → alta de costo indirecto en los tres modos: por hectárea, manual y
directo a un lote → panel de reparto → Reportes → Resumen de campaña → Comparativa
entre campañas → selector de moneda global cambiado desde Reportes y verificado en
Tablero y en el detalle de lote-campaña) en 1280px y 390px, sin errores de consola.

### Qué se construyó

- **`MonedaVistaService`** (`src/app/core/moneda/moneda-vista.service.ts`): selector
  $ARS/US$ compartido por toda la app, mismo patrón que `CampaniaActivaService`
  (signal + localStorage). Reemplaza los dos signals locales que tenían `Tablero` y
  `LoteCampaniaDetalle` desde slice 3/4 (quedó documentado como pendiente en slice 3,
  4ª vuelta) — cambiar la moneda en cualquier pantalla la deja así en todas, incluso
  después de un refresh.
- **`CostosIndirectosListado` + `CostoIndirectoForm`** (`src/app/features/costos-indirectos/`,
  ruta `/costos-indirectos`, ya reservada en `RUTAS` y `NAV_PRINCIPAL` desde slice 3):
  alta con **dominio completo** (decisión tomada con el usuario, más allá del caso
  simple del prototipo) — imputación directa a un lote-campaña o a prorratear, y si
  prorratea, criterio `POR_HA` (automático, con vista previa en vivo) o `MANUAL`
  (importe por lote a cargo del usuario, con validación de que la suma cierre). Debajo
  del listado, un panel "Reparto entre lotes" que suma `CostoIndirecto.partes[]` de
  todos los costos cargados por lote-campaña — dato real que devuelve el propio
  backend, no una reconstrucción local.
- **`Reportes`** (`src/app/features/reportes/`, ruta nueva `/reportes`, ítem de nav
  nuevo): una pantalla con dos vistas internas.
  - **Resumen**: desglose por rubro de la campaña activa, primer consumidor real de
    `GET /campanias/{id}/costos-por-rubro` (modelado desde slice 3 sin pantalla hasta
    ahora) + tabla por lote-campaña.
  - **Comparativa**: el usuario tilda 2+ campañas, se piden en paralelo (`forkJoin`)
    sus `GET .../resumen` y se agrupan por cultivo en el cliente
    (`shared/utils/comparativa.ts`, `agruparPorCultivo()`) — sin endpoint dedicado,
    agregación sobre valores que el backend ya calculó.
- **`shared/utils/prorrateo.ts`** (`calcularRepartoPorHa`): réplica exacta de la
  fórmula de cierre de `docs/reglas-calculo.md` §4.2 (redondeo a 2 decimales por
  parte, residuo al lote de mayor superficie) para la vista previa del alta — única
  excepción de CLAUDE.md regla 1, el reparto real que se persiste lo calcula y
  devuelve el propio `POST`.
- **`.panel`/`.fila-rubro` extraídos a `shared/styles/_indicadores.scss`**: hasta este
  slice vivían solo en `lote-campania-detalle.scss` con un único consumidor; con el
  listado de costos indirectos y el reporte de resumen sumando un segundo y tercer
  consumidor, se extrajeron (mismo criterio que ya motivó extraer `.selector-modo`/
  `.total-en-vivo` en slice 5).
- **Modelo nuevo**: `CostoIndirecto`/`CostoIndirectoParte`/`CostoIndirectoRequest`
  (`src/app/models/costo-indirecto.model.ts`), shape confirmado por bisección directa
  contra el backend real (ver más abajo).

### Decisiones no triviales

- **Todo el slice se desarrolló contra el backend real** (`localhost:8080`, usuario
  ADMIN), con bisección directa campo por campo — mismo método que slices 2-5.
  `docs/api-endpoints.md` solo documentaba los tres endpoints de costos indirectos a
  alto nivel, sin JSON. Hallazgos:
  - `importe` es un **`Monto` completo** (`{importe, moneda, tipoCambio}`), no un
    número/string suelto — mismo patrón que `Tarea.valorUnitario`/
    `AplicacionInsumo.precioUnitario` en slices anteriores.
  - **`fecha` es obligatoria** (`LocalDate`, no estaba en ningún lado documentada).
  - **`criterioProrrateo` es obligatorio siempre**, incluso imputando directo a un
    lote (`loteCampaniaId` presente): el backend lo exige igual con
    `400 VALIDACION: criterioProrrateo: no debe ser nulo` y simplemente lo ignora en
    ese caso (`partes` vuelve vacío). El front manda `POR_HA` por defecto en ese
    camino y no le muestra el selector de criterio al usuario.
  - **`GET`/`POST` de un costo indirecto devuelven `partes[]`** con el reparto real ya
    calculado (`{id, loteCampaniaId, importe: Monto}`) — un hallazgo que simplificó el
    plan original: la vista previa antes de guardar sigue siendo local
    (`calcularRepartoPorHa`), pero el panel "Reparto entre lotes" del listado no
    necesita pedir `costos-por-rubro` aparte (como planeaba el plan original antes de
    bisectar): alcanza con sumar `partes[]` (y el `loteCampaniaId` de raíz de los
    costos directos) de la lista que ya se pide.
  - **`MANUAL`**: el request manda `partes: [{loteCampaniaId, importe: Monto}]` solo
    para los lotes que reciben algo (no hace falta cubrir los cinco lotes de la
    campaña con ceros). El backend valida server-side que sumen exacto el importe
    total (`422 PARTES_NO_SUMAN`); la validación del formulario es solo para no hacer
    ese viaje de red en el caso común, mismo criterio que ya usa `VentaForm` con el
    stock disponible.
  - Sin `PUT` documentado ni encontrado: solo alta y baja
    (`DELETE .../costos-indirectos/{id}`, bloqueado si la campaña está cerrada).
- **Reparto manual sin Signal Forms para los inputs por lote**: es una lista dinámica
  por lote-campaña, sin precedente de arrays en Signal Forms en esta app todavía. Se
  resolvió con un signal aparte (`Record<loteCampaniaId, string>`) y binding manual
  `(input)`, mismo espíritu que ya usa la edición inline de cotización en `Tablero`
  (un campo suelto sin `form()` cuando la ceremonia de Signal Forms no aporta).
- **Selector de moneda global**: confirmado con el usuario antes de tocar código
  (`Tablero`/`LoteCampaniaDetalle` pasaron de un signal local a inyectar
  `MonedaVistaService`, cambio de 2 líneas por pantalla ya que el resto de cada
  componente solo lee `monedaVista()`, sin importar de dónde sale el signal).
- **Comparativa sin endpoint dedicado, confirmado con el usuario**: se arma con
  `GET /campanias` (mismo `httpResource` inline que ya usa `CampaniaSelectorModal`) +
  `forkJoin` de `GET .../resumen` por cada campaña elegida, agrupado por
  `nombreCultivo`. `costoPorHa` del grupo se deriva como `Σ costoTotal / Σ ha`, no
  promediando el `costoPorHa` de cada lote — mismo principio que ya usa el propio
  backend para `costoPorHaCampania*` y que `Tablero` respeta desde slice 3. Nunca
  muestra margen estimado (`ResumenCampaniaResponse` no lo expone), mismo límite ya
  documentado y respetado por `Tablero`.
- **Estado vacío agregado a la comparativa, no pedido explícitamente**: si las
  campañas elegidas no tienen lotes sembrados, `agruparPorCultivo()` devuelve `[]` y
  sin aviso la pantalla se quedaba en blanco después de clickear "Comparar" — se
  encontró probando el flujo contra el backend real con dos campañas nuevas sin
  siembra. Se sumó `comparativaEjecutada` (signal) para distinguir "todavía no se
  comparó nada" de "se comparó y no hay datos", con un mensaje explícito en el
  segundo caso.
- **Panel de reparto y desglose de rubro reusan clases ya existentes** (`.panel`,
  `.fila-rubro`, `.catalogo`, `.fila-catalogo`, `.selector-moneda`) en vez de
  inventar variantes nuevas — el listado de costos indirectos define solo lo que le
  falta (`.fila-catalogo--indirecto`, `.fila-reparto`, `.costos-indirectos-vacio`).

### Verificado contra el backend real

Con el backend corriendo en `localhost:8080` y usuario ADMIN real, sobre la campaña
"2025/26 editado" (5 lote-campaña sembrados, 9 ha en total): alta de un costo por
hectárea (vista previa sumó exacto el importe cargado, criterio de aceptación
explícito del slice — probado también con el caso de residuo del ejemplo de
`docs/reglas-calculo.md` §4.2 en `prorrateo.spec.ts`), alta manual con las partes
repartidas entre dos lotes, alta directa a un único lote, y confirmación en el panel
"Reparto entre lotes" de que la suma por lote coincide exactamente con lo esperado
(cruzado a mano contra la API). Reportes → Resumen mostró el desglose por rubro real
de la campaña (insumos/mano de obra/labores y servicios/indirectos) y la tabla por
lote; Reportes → Comparativa, eligiendo "2025/26 editado" (con datos) y "2026/27"
(sin siembra), agrupó correctamente por cultivo mostrando una sola columna (la
campaña sin lotes no aporta filas, sin ruido de columna vacía). El selector de moneda
cambiado desde Reportes se reflejó, sin volver a tocarlo, en Tablero y en el detalle
de lote-campaña. Sin errores de consola en 1280px ni en 390px.

Quedaron datos de prueba en la base de desarrollo (varios costos indirectos de
verificación sobre la campaña "2025/26 editado") — mismo criterio que datos de prueba
dejados por slices anteriores.

### Pendiente / abierto

- **Sin edición de costo indirecto**: solo alta y baja, no hay `PUT` en el backend.
  Si se carga un concepto o importe mal, hoy la única forma de corregirlo es borrar y
  volver a cargar.
- **`Reportes` no persiste la vista elegida (Resumen/Comparativa) ni la selección de
  campañas de la comparativa** entre sesiones — se resetea al recargar la página,
  mismo alcance que el resto de la UI de esta pantalla nueva. Solo el selector de
  moneda quedó persistido globalmente, que era el requisito explícito del slice.
- **La tabla "Por lote-campaña" del Resumen es densa en 390px** (7 columnas): queda
  utilizable con scroll horizontal (`overflow-x: auto`), pero no colapsa columnas como
  sí hace la tabla del tablero en el breakpoint angosto. No se invirtió en ese ajuste
  fino porque es una pantalla de reporte de lectura ocasional, no de carga a pie de
  lote — el criterio más estricto de mobile-first de CLAUDE.md aplica con más fuerza a
  las pantallas de carga de datos.

**Nuevo campo en el alta de campaña**: `CampaniaSelectorModal` suma "Cotización del
dólar (opcional)" al formulario de "Nueva campaña", precargado con
`TipoCambioMemoriaService.ultimo()` (mismo mecanismo que ya usaban insumo y, hasta
esta vuelta, cultivo). Sin este campo, `cotizacionVigente` nunca se podría cargar
desde la UI y los `*Ars` de estimaciones quedarían `null` para siempre. Sigue sin
existir una forma de editar la cotización de una campaña ya creada (mismo pendiente
que "editar campaña" en general, documentado en la segunda vuelta) — llevaría a que
el tipo de cambio que un productor carga en agosto quede desactualizado en marzo.

Reverificado en navegador contra el backend real: editar el cultivo con precio de
referencia cargado ya no rompe (0 errores de consola), y el formulario de nueva
campaña muestra y acepta el campo de cotización. `npm test` (108/108), `npm run lint`
y `npm run build` en verde.

### Cuarta vuelta: selector $ARS/US$ y edición inline de la cotización

Con el bloqueante de backend resuelto, el usuario confirmó construir ya el selector
de moneda del tablero (deferido en la segunda vuelta) y resolver la edición de
`cotizacionVigente` con una edición inline en el tablero, no una pantalla completa de
"editar campaña".

- **`CampaniaService.actualizar()`** (PUT, nuevo): el backend exige el
  `CampaniaRequest` completo, no un PATCH parcial — para cambiar solo
  `cotizacionVigente` hay que reenviar `nombre`/`fechaInicio`/`fechaFin`/
  `gastosComercializacionEstimados` tal cual están.
- **`Tablero` suma `campaniaRecurso`**: un tercer `httpResource` con el `Campania`
  completo (no alcanza el `CampaniaActivaResumen` liviano del servicio global, que
  solo tiene `id`/`nombre`/`estado`) — hace falta para mostrar `cotizacionVigente` y
  para armar el payload del PUT con los demás campos intactos.
- **Selector $ARS/US$** (`monedaVista`, señal local, default `USD`): un `computed`
  (`vista`) centraliza el ternario Ars/Usd para los cinco indicadores, y `filas`
  hace lo mismo por fila — ningún template repite la lógica de elegir moneda campo
  por campo. Confirmado contra la API real que los `*Ars` de `resumen` **no dependen**
  de `cotizacionVigente` (a diferencia de las estimaciones de `Margen`): el toggle
  funciona igual haya o no cotización cargada, así que no hace falta deshabilitarlo
  nunca.
- **Edición inline de la cotización**: un botón con el TC actual ("TC 1.200,50 ·
  editar", o "Sin cotización cargada" si no hay) se convierte en un input + Guardar/
  Cancelar in situ — sin Signal Forms completo: es un campo suelto sin más
  dependencias, y usar `form()` para esto habría sido ceremonia de más para lo que
  hace (mismo criterio que `onCambioUnidadProduccion` en `cultivo-form`/
  `sembrar-lote-form`, que tampoco pasan por `form()` para su parte reactiva). Se
  precarga con el valor actual al abrir, valida `> 0` si no está vacío, y al guardar
  llama `campaniaRecurso.reload()` para reflejar el nuevo valor.
- Disponible incluso con la campaña cerrada: `cotizacionVigente` es metadata de
  reporte, no un movimiento de costo — el invariante "cerrada no admite movimientos"
  (docs/dominio.md §14) no aplica acá, y no tiene sentido bloquear la corrección de
  un dato mal cargado justo cuando la campaña ya no se puede tocar de otra forma.

Reverificado en navegador contra el backend real: alternar $ARS/US$ actualiza los
cinco indicadores y las dos columnas de la tabla al instante (sin nuevo fetch, ya
estaba todo en la misma respuesta de `/resumen`); editar la cotización de 1200,50 a
1350 guarda, muestra el toast "Cotización actualizada" y el botón de TC refleja el
nuevo valor. Sin errores de consola. `npm test` (110/110), `npm run lint` y
`npm run build` en verde (presupuesto `anyComponentStyle` subido de 10kB/12kB a
13kB/15kB — mismo costo esperado de sumar UI nueva a un componente que ya comparte
varios partials, documentado desde slice 2).

### Pendiente / abierto, agregado en esta vuelta

- No hay forma de editar `nombre`/`fechaInicio`/`fechaFin`/
  `gastosComercializacionEstimados` de una campaña ya creada, solo `cotizacionVigente`
  (vía la edición inline nueva). Si hace falta corregir alguno de esos otros campos,
  sigue sin haber manera desde la UI.
- El selector de moneda es una preferencia de sesión (signal en memoria, se resetea
  al recargar la página o cambiar de campaña) — no se persiste como sí pasa con
  `CampaniaActivaService`. Evaluar si conviene recordarlo cuando el slice 6 sume un
  selector de moneda más global (fuera del tablero).

---

## Slice 4 — Detalle de lote-campaña (la pantalla central)

**Estado**: cerrado. `npm run lint`, `npm test` (140/140) y `npm run build` en verde.
Verificado en navegador con Playwright contra el backend real (login ADMIN → elegir
campaña → tablero → click en una fila → detalle → cargar tarea en modo Destajo →
cargar aplicación de insumo → feed/costos/margen se actualizan en vivo) en 1280px y
390px, sin errores de consola.

### Qué se construyó

- **`LoteCampaniaDetalle`** (`src/app/features/lote-campania/lote-campania-detalle.*`),
  ruta `/lote-campanias/:id` (nueva, `withComponentInputBinding()` sumado a
  `provideRouter` en `app.config.ts` para leer el `:id` como `input()` de componente
  en vez de inyectar `ActivatedRoute` a mano): encabezado, hero de costo por bolsa con
  el input "me ofrecen por bolsa", grilla de indicadores (costo total, costo por ha,
  margen realizado/estimado), costos por rubro, "de dónde sale cada margen", paneles
  de solo lectura de cosecha (agrupada por corte) y ventas, y el feed unificado de
  movimientos. Selector $ARS/US$ propio, mismo patrón `vista()` computed que
  `Tablero` (slice 3).
- **`TareaForm`** y **`AplicacionForm`** (mismo directorio): formularios modales con
  Signal Forms, siguiendo el patrón de `SembrarLoteForm`. `TareaForm` resuelve las
  cuatro modalidades de `docs/design-brief.md` §6.3 con un selector 2×2 que decide
  qué campos mostrar; los dos formularios muestran el total en vivo en el pie
  (excepción documentada de CLAUDE.md regla 1: previsualización, nunca lo que se
  persiste).
- **`LoteCampaniaService`** ampliado: `costos`, `margen`, `crearTarea`,
  `crearAplicacion` (antes solo tenía `crear`, de slice 3).
- **Fila del tablero clickeable**: cierra el pendiente que dejó slice 3 (documentado
  ahí como "sin link porque esta ruta no existe todavía"). El `.fila-catalogo--tablero`
  pasó de `<div>` a `<a [routerLink]>`.
- **`shared/styles/_indicadores.scss`** (nuevo): extrae `.indicador` y
  `.selector-moneda` de `tablero.scss`, porque el detalle de lote-campaña necesita
  exactamente la misma tarjeta de KPI y el mismo segmentado de moneda — evita
  duplicar el partial entre las dos pantallas.
- **Modelos nuevos**: `Tarea`/`TareaRequest`, `AplicacionInsumo`/
  `AplicacionInsumoRequest`, `Movimiento`, y (sin confirmar, ver más abajo)
  `Cosecha`/`Venta`.

### Decisiones no triviales

- **Todo el slice se desarrolló contra el backend real** (`localhost:8080`, usuario
  ADMIN), con bisección directa de los dos endpoints de alta — mismo método que
  slices 2-3. Encontró shapes bien distintos de lo que `docs/plan-frontend.md`
  original inferían del prototipo:
  - El campo del tipo de tarea es **`tipo`, no `tipoTarea`**.
  - **`Tarea.valorUnitario` y `AplicacionInsumo.precioUnitario` son `Monto`
    completo** (`{ importe, moneda, tipoCambio }`), no un string/número suelto como
    se había planeado — la mano de obra también se puede pagar en dólares, mismo
    value object que `Insumo.precioReferencia`. Esto obligó a agregar un campo de
    tipo de cambio (precargado con `TipoCambioMemoriaService`, mismo mecanismo que
    `InsumoForm`) a `TareaForm`, que no estaba en el plan original.
  - **`Tarea` no tiene ningún campo de nota/comentario** — se probó mandar
    `comentario` y `nota` en el alta y el backend no persiste ninguno de los dos.
    `TareaForm` se construyó sin ese campo (el prototipo lo tiene, pero no existe
    del lado del backend).
  - `AplicacionInsumoRequest` tiene un campo `unidadMedida` propio (el enum
    `unidadMedida`, no heredado del insumo): permite cargar en una unidad distinta a
    la que el catálogo usa por defecto.
  - **No existe `GET /api/lote-campanias/{id}`** (devuelve `401` vacío, patrón de
    ruta no mapeada). El encabezado del detalle busca el `LoteCampania` dentro de
    `GET /campanias/{id}/lote-campanias` de la campaña activa — mismo endpoint que
    ya pedía el tablero, sin fetch nuevo.
  - `GET .../movimientos` usa `tipo: 'TAREA' | 'INSUMO'` (**no `'APLICACION'`** como
    sugería el prototipo), sin ningún campo de rubro (esa clasificación depende de
    `ejecutor`, que no viaja en el feed) y con `detalleCalculo`, un string ya
    formateado por el backend que se muestra tal cual. `id` no es único entre tipos
    (una tarea y una aplicación pueden compartir id), así que el `@for` trackea por
    `tipo + '-' + id`.
- **`Cosecha` y `Venta` quedaron con shape sin confirmar**: la base de desarrollo no
  tenía datos cargados y varias combinaciones razonables de payload para `POST
  .../cosechas` devolvieron `400 CUERPO_INVALIDO` sin más pistas para biseccionar sin
  entrar de lleno al alcance de slice 5 (que es quien construye esos formularios).
  Se modelaron con los campos que documenta `docs/dominio.md` §9-10 y
  `docs/reglas-calculo.md` §5.1/§6.1, marcados explícitamente como pendientes de
  confirmar — ver `src/app/models/cosecha.model.ts` y `venta.model.ts`.
- **Alcance del slice recortado a propósito, siguiendo `docs/plan-frontend.md` al
  pie de la letra**: cargar cosecha y venta es slice 5, no este. Los paneles
  "Cosecha" y "Ventas del lote" son de **solo lectura** (listan los `GET` existentes)
  y muestran el estado vacío pedido, pero los accesos "+ Cargar corte"/"+ Nueva
  venta" del prototipo no están cableados a ningún formulario — mismo criterio que
  dejó las filas del tablero sin link en slice 3 hasta que este slice existiera. Los
  botones "Cosecha" y "Venta" del encabezado del prototipo tampoco se sumaron:
  solo "+ Cargar tarea" y "Aplicación" abren algo en este slice.
- **"Me ofrecen por bolsa" (docs/design-brief.md §6.2)**: input local, nunca se
  persiste — mismo espíritu que la excepción ya documentada de CLAUDE.md regla 1
  para el total en vivo de un formulario, extendida acá a una herramienta de
  decisión ad hoc (no hay "guardar"). El stock disponible que multiplica la
  diferencia se calcula sumando `Cosecha.cantidad` de calidades vendibles (primera +
  segunda, excluye descarte — mismo criterio que el denominador de `costoPorUnidad`,
  `docs/reglas-calculo.md` §5.1) menos `Venta.cantidad` en cualquier estado (§6.3),
  a partir de las listas que ya se piden para los paneles de Cosecha/Ventas. Es
  aritmética de **cantidades**, no de plata: no viola CLAUDE.md regla 1, que habla
  específicamente de plata que se persiste.
- **Sin formulario de tarea/aplicación disponible con la campaña cerrada**: los
  accesos "+ Cargar tarea"/"Aplicación" del encabezado se ocultan por completo
  (mismo criterio que `Tablero` oculta "+ Sembrar un lote"), en vez de mostrarlos
  deshabilitados o dejar que el backend los rechace con `422 CAMPANIA_CERRADA`.
- **`withComponentInputBinding()` sumado a `provideRouter`** (`app.config.ts`): es
  la primera ruta con parámetro de toda la app (`RUTAS` pasó de ser un objeto de
  strings fijos a sumar `rutaLoteCampania(id)`, una función — documentado como caso
  especial en `core/config/rutas.ts`). Preferido sobre inyectar `ActivatedRoute` a
  mano porque sigue el idiom de Angular 22 (`input()` como función, CLAUDE.md).
- **Presupuesto `anyComponentStyle` subido de 13kB/15kB a 15kB/17kB**
  (`angular.json`): el detalle de lote-campaña es la pantalla con más secciones de
  toda la app (hero + KPIs + rubros + desglose de margen + cosecha + ventas +
  movimientos), su SCSS solo quedó en ~14.5kB — mismo costo esperado de sumar una
  pantalla grande, documentado desde slice 2.

### Verificado contra el backend real

Con el backend corriendo en `localhost:8080` y usuario ADMIN real, contra un
lote-campaña sin cosecha ni ventas cargadas (a propósito, para poder probar también
los estados vacíos de esos dos paneles en la misma corrida): las cuatro modalidades
de tarea se probaron por bisección (`JORNAL`, `DESTAJO`, `POR_HA`, `TOTAL`) y dieron
`costoTotal` correcto en cada caso; una aplicación en ARS y otra en USD (con
`tipoCambio` distinto) también calcularon bien. En el navegador: cargar una tarea en
modo Destajo (500 unidades × $1.500 = $750.000) desde la pantalla de detalle
actualizó el feed, el costo total, el desglose por rubro (mano de obra vs. labores y
servicios según `ejecutor`) y el margen realizado sin recargar la página; cargar una
aplicación de insumo (10 kg de un insumo con precio de referencia, autocompletado y
editable) hizo lo mismo. Sin errores de consola en 1280px ni en 390px; en 390px se
confirmó además que el modal de tarea se abre como hoja a pantalla completa (una
captura `fullPage` de Playwright lo mostró superpuesto con el contenido de abajo,
pero era un artefacto conocido de esa herramienta con elementos `position: fixed`,
no un bug real — se confirmó con una captura de viewport simple).

Quedaron datos de prueba reales en la base de desarrollo (tareas y aplicaciones
sobre un lote-campaña de la campaña "2025/26 editado", id 4) porque son los mismos
que sirvieron para verificar la pantalla — mismo criterio que datos de prueba
dejados por slices anteriores (ej. "Lote ADMIN 1787334362095" de slice 2/3).

### Pendiente / abierto

- **Formularios de cosecha y venta**: quedan para slice 5, incluida la confirmación
  del shape exacto de `Cosecha`/`Venta` contra el backend real (ver "Decisiones no
  triviales" arriba).
- **Accesos "Cosecha" y "Venta" del encabezado, y "+ Cargar corte"/"+ Nueva venta"
  de los paneles**: sin cablear a ningún formulario todavía — se resuelven solos
  cuando slice 5 exista.
- El feed de movimientos no muestra ningún indicador de rubro (mano de obra vs.
  labores y servicios vs. insumos) porque `GET .../movimientos` no lo expone; solo
  distingue `tipo` (Tarea/Insumo). Si el backend lo suma más adelante, se puede
  agregar sin cambios de layout grandes.
- `Movimiento.costoTotal.importeArs`/`importeUsd` se asumen siempre presentes para
  tareas y aplicaciones (confirmado en los casos probados) — no se volvió a
  verificar la nulabilidad exhaustivamente como sí se hizo para `Margen` en slice 3.

---

## Slice 5 — Cosecha y ventas

**Estado**: cerrado. `npm run lint`, `npm test` (162/162) y `npm run build` en verde.
Verificado en navegador con Playwright contra el backend real (login ADMIN → campaña
"2025/26 editado" → detalle de un lote-campaña → cargar cosecha con dos calidades de
un mismo corte → cargar venta a precio cerrado → intentar vender más stock del
disponible → completar la liquidación de una consignación pendiente) en 1280px y
390px, sin errores de consola.

### Qué se construyó

- **`CosechaForm`** (`src/app/features/lote-campania/cosecha-form.*`): carga las tres
  calidades de un mismo corte (fecha + número de corte compartidos) en un solo
  formulario, sin repetirlo por calidad (docs/design-brief.md §7 pantalla 5). Cada
  calidad con cantidad cargada dispara su propio `POST .../cosechas` — el backend
  modela una fila por corte+calidad, no hay alta múltiple — y `forkJoin` los manda en
  paralelo. El número de corte se precarga con el máximo cargado + 1 (o 1 si no hay
  ninguno).
- **`VentaForm`** (`venta-form.*`): las dos modalidades de docs/dominio.md §10 en un
  selector 2×2 igual al de `TareaForm` — Precio cerrado pide precio/moneda/TC y deja
  la venta `LIQUIDADA`; Consignación entrega sin precio (`ENTREGADA`). Solo ofrece
  `PRIMERA`/`SEGUNDA` como calidad (el descarte no se vende) y valida en el cliente
  que la cantidad no supere el stock disponible de la calidad elegida, calculado por
  `LoteCampaniaDetalle` a partir de cosecha menos ventas ya cargadas.
- **`LiquidarVentaForm`** (`liquidar-venta-form.*`): completa una consignación
  pendiente (`PATCH /api/ventas/{id}/liquidacion`) con precio, fecha de liquidación y
  tres gastos opcionales (comisión, flete, otros gastos), mostrando el neto en vivo.
- **`LoteCampaniaDetalle`** ampliado: botones "+ Cargar corte" y "+ Nueva venta" en
  los paneles de Cosecha/Ventas (ocultos con la campaña cerrada, mismo criterio que
  "+ Cargar tarea"), y "Completar liquidación" por fila de venta `ENTREGADA`. El
  importe neto de una venta pendiente se muestra como "—" (`ImportePipe` ya lo
  resuelve con `null`). Nuevos computados `proximoCorte` y `disponiblePorCalidad`
  (cosechado − vendido, solo PRIMERA/SEGUNDA).
- **`LoteCampaniaService`** ampliado: `crearCosecha`, `crearVenta`, `liquidarVenta`
  (esta última cuelga de `/api/ventas/{id}/liquidacion`, no de
  `/lote-campanias/{id}/...`: el backend identifica la venta a liquidar por su propio
  id).
- **Modelos reescritos con shape confirmado**: `Cosecha`/`CosechaRequest`,
  `Venta`/`VentaRequest`/`LiquidacionRequest` (antes inferidos y marcados
  explícitamente como pendientes desde slice 4).
- `.selector-modo` y `.total-en-vivo` (antes duplicados en `tarea-form.scss` y
  parcialmente en `aplicacion-form.scss`) se movieron a
  `shared/styles/_formularios.scss`: con `VentaForm`/`LiquidarVentaForm` sumando un
  tercer y cuarto consumidor, mantener la duplicación ya no se justificaba.

### Decisiones no triviales

- **Todo el slice se desarrolló contra el backend real** (`localhost:8080`, usuario
  ADMIN), con bisección directa campo por campo — mismo método que slices 2-4. Los
  shapes de `Cosecha` y `Venta` que traía `docs/plan-frontend.md`/los modelos
  heredados de slice 4 estaban inferidos y resultaron tener nombres de campo
  distintos a los adivinados:
  - `Cosecha`: el campo es **`numeroCorte`, no `corte`**. La pista para encontrarlo
    fue indirecta: mandar cualquier combinación de campos "razonables" devolvía
    siempre `400 CUERPO_INVALIDO` sin `details`, el mismo catch-all que un JSON
    directamente malformado — recién se entendió que ese código también cubre
    nombres de campo no reconocidos (Jackson con `FAIL_ON_UNKNOWN_PROPERTIES`)
    probando nombres alternativos uno por uno hasta que `numeroCorte` dejó de dar
    ese error y pasó a devolver un `422` de negocio real
    (`KG_POR_UNIDAD_NO_CONFIGURADO`, ver más abajo). `kgEquivalente` no se manda en
    el alta: lo calcula el backend con `Cultivo.kgPorUnidad`.
  - `Venta`: los campos son **`modalidad`** (no `modalidadVenta`) y
    **`fechaEntrega`** (no `fecha`) — mismo patrón de bisección por catch-all.
    `precioUnitario` confirmó ser `Monto` completo, igual que `Tarea.valorUnitario`.
  - **Hallazgo no pedido explícitamente pero necesario para el flujo de
    liquidación**: `comision`, `flete` y `otrosGastos` (docs/reglas-calculo.md §6.1)
    también son `Monto` completo, no números sueltos con una `moneda` común — se
    encontraron con el mismo método (un número suelto en `comision` daba
    `400 CUERPO_INVALIDO`; el mismo campo como `{ importe, moneda, tipoCambio }`
    pasó la deserialización). Confirmado además que el backend acepta los tres
    gastos tanto en el alta de una venta a precio cerrado como en la liquidación de
    una consignación, aunque el frontend solo los pide en el segundo caso (ver
    siguiente punto).
- **`VentaForm` no pide comisión/flete/gastos en el alta**, aunque el backend los
  acepta ahí también: `docs/design-brief.md` §6.5 los ubica explícitamente en "el
  flujo de completar la liquidación", no en la entrega. Pedirlos en los dos lugares
  sería alcance no pedido y una pantalla más larga de lo necesario en el caso común
  (precio cerrado sin gastos).
- **`LiquidarVentaForm` usa una sola moneda/tipo de cambio compartida** para
  `precioUnitario` + los tres gastos, en vez de un selector de moneda independiente
  por campo (que el backend sí soportaría, cada uno es un `Monto` propio). La
  comisión y el flete de una liquidación casi siempre se descuentan en la misma
  moneda que el precio pactado; pedir cuatro selectores de moneda y cuatro tipos de
  cambio para un caso de uso que en la práctica es "un solo TC" habría violado
  docs/design-brief.md §3 ("si una pantalla le exige pensar, está mal diseñada") sin
  aportar nada en el caso real.
- **Validación de stock en el cliente, además de la del servidor**: `VentaForm`
  recibe `disponiblePorCalidad` (calculado por `LoteCampaniaDetalle`) y rechaza
  cantidades por encima del disponible antes de mandar el `POST`, con el mismo
  mensaje que después daría el `422 STOCK_INSUFICIENTE` del backend. No reemplaza la
  validación del servidor (que sigue siendo la fuente de verdad — por ejemplo, ante
  una venta cargada en otra pestaña mientras el formulario estaba abierto), pero
  evita el viaje de red en el caso común, más acorde con "cargar un gasto a pie de
  lote en menos de 30 segundos" (docs/design-brief.md §1). Por la misma razón,
  `VentaForm` ni siquiera ofrece `DESCARTE` como opción de calidad — no tiene
  sentido esperar el `422 CALIDAD_DESCARTE_NO_VENDIBLE` cuando se puede no mostrar
  la opción.
- **Bug de punto flotante encontrado verificando en navegador, no en los tests**: el
  disponible por calidad (`cosechado − vendido`, sumado con `reduce` sobre varias
  filas) arrastraba basura de `float64` en casos con muchas operaciones
  (`115.49699999999999` en vez de `115.497`) — visible en el mensaje de "no hay
  stock" y en la ayuda "Disponible: X" de `VentaForm`. No es una violación de
  CLAUDE.md regla 1 (es aritmética de cantidades que nunca se persiste, no de
  plata), pero se ve mal en pantalla. Fix: `redondearCantidad()` en
  `lote-campania-detalle.ts`, redondeo a 4 decimales (misma precisión que
  `DECIMAL(14,4)` del backend, docs/reglas-calculo.md §1.1), aplicado a
  `disponiblePorCalidad` y `stockDisponible` (este último ya existía desde slice 4
  con el mismo riesgo, sin haberlo manifestado todavía con los datos de prueba
  usados en ese momento).
- **`forkJoin` para el alta múltiple de `CosechaForm`**, no un bucle secuencial de
  `subscribe` anidados: las calidades de un mismo corte son independientes entre sí
  (no hay necesidad de esperar a que una termine para mandar la siguiente), y
  `forkJoin` da un único punto de éxito/error para todo el conjunto — más simple que
  coordinar N callbacks a mano.
- **`.selector-modo`/`.total-en-vivo` extraídos a `shared/styles/_formularios.scss`**:
  hasta slice 4 estaban duplicados en `tarea-form.scss` (los dos) y
  `aplicacion-form.scss` (el segundo) porque solo había dos consumidores; con
  `VentaForm` sumando un tercero y `LiquidarVentaForm` un cuarto, mantener la
  duplicación dejó de tener sentido. `tarea-form.scss` y `aplicacion-form.scss` ahora
  solo importan el partial compartido.
- **Presupuesto `anyComponentStyle` subido de 15kB/17kB a 17kB/19kB**
  (`angular.json`): `lote-campania-detalle.scss` sumó las clases de la fila de venta
  con acción de liquidar y quedó en ~15.7kB — mismo costo esperado de sumar UI nueva
  a la pantalla más grande de la app, documentado desde slice 2.

### Verificado contra el backend real

Con el backend corriendo en `localhost:8080` y usuario ADMIN real, sobre un
lote-campaña sembrado a propósito para este slice (`Cebolla C`, id 6, con
`Cultivo.kgPorUnidad` configurado — el lote-campaña que venía de slices anteriores
usaba un cultivo sin ese campo, que hace fallar cualquier alta de cosecha con
`422 KG_POR_UNIDAD_NO_CONFIGURADO`): cargar un corte con Primera y Segunda a la vez
agregó las dos filas y actualizó rendimiento/tasa de descarte al instante; cargar una
venta a precio cerrado actualizó el margen realizado sin recargar la página; intentar
vender más que el stock disponible mostró el error en el cliente sin llegar a pegarle
al servidor; completar la liquidación de una consignación pendiente calculó el neto
en vivo y, al guardar, la fila pasó de "ENTREGADA" a "LIQUIDADA" con el importe
correcto. Sin errores de consola en 1280px ni en 390px.

**Verificación del artefacto de captura `fullPage` con `position: fixed`** (mismo
caso ya documentado en slice 4 para el modal de tarea): la primera captura en 390px
mostró la nav inferior fija superpuesta en medio del contenido, sobre el panel
"Costos por rubro". Una segunda captura de solo viewport (sin `fullPage`, con scroll
manual hasta esa sección) confirmó que no es un bug real — la nav inferior es
`position: fixed`, Playwright la compone en su posición de viewport dentro de la
captura completa mientras el resto del contenido se compone en su posición de
scroll, y el resultado se superpone. Queda como recordatorio: ante cualquier
elemento `position: fixed`/`sticky`, preferir una captura de viewport simple (con
scroll manual a la sección de interés) sobre `fullPage` para no confundir el
artefacto con un bug de layout.

Quedaron datos de prueba en la base de desarrollo (varias cosechas y ventas sobre el
lote-campaña id 6, incluida una consignación liquidada) — mismo criterio que datos de
prueba dejados por slices anteriores.

### Pendiente / abierto

- **`Movimiento` sigue sin incluir cosecha ni venta**: `GET .../movimientos` solo
  expone tareas e insumos (confirmado desde slice 4). Cosecha y venta se muestran
  únicamente en sus paneles propios, no en el feed unificado — no es una omisión del
  frontend, el backend no los agrega a ese endpoint.
- **Sin edición ni baja de cosecha/venta desde la UI**: `DELETE
  .../cosechas/{id}` y no hay endpoint de edición documentado para ninguna de las
  dos entidades; si se carga un dato mal, hoy no hay forma de corregirlo desde la
  app. No estaba pedido en el slice.
- **`LiquidarVentaForm` con moneda/TC compartida entre precio y gastos** (ver
  "Decisiones no triviales"): si en la práctica el productor necesita liquidar con
  el precio en una moneda y algún gasto en otra, esta simplificación no alcanza —
  no surgió como caso real en el dominio documentado, se puede revisar si aparece.

### Segunda vuelta: confirmación del equipo de backend sobre los tres pendientes

Se le planteó al equipo de backend los tres puntos de arriba más una discrepancia
encontrada al revisar `docs/api-endpoints-v2.md`. Respuesta, punto por punto:

1. **Feed de movimientos sin cosecha/venta — confirmado, gap real de backend.**
   `MovimientoService` arma el feed con un `UNION ALL` entre `aplicacion_insumo` y
   `tarea`; el enum `TipoMovimiento` solo tiene `INSUMO`/`TAREA`. No hay ninguna rama
   para cosecha ni venta. No es una omisión de documentación: si se necesita ese dato
   en el feed unificado, hay que agregarlo en el backend primero.
2. **Sin edición de cosecha, sin edición ni baja de venta — confirmado, gap real de
   backend.** Revisado contra todos los controllers: no existe `PUT` sobre cosechas,
   ni `PUT`/`DELETE` sobre ventas. Mismo caso que el punto 1 — requiere trabajo de
   backend, el frontend no tiene con qué construir esas acciones hoy.
3. **Paginación — la corrección de slice 2 (sexta vuelta) estaba equivocada.**
   El backend no tiene `spring-boot-starter-hateoas` en `pom.xml` — nunca devolvió
   `PagedModel`. El shape real siempre fue (y sigue siendo) el `Page<T>` de Spring
   Data serializado plano: `content` junto a `pageable`/`totalElements`/`totalPages`/
   `first`/`last`/`empty`/etc. sueltos en la raíz, el mismo que documentaba
   `docs/api-endpoints.md` original antes de la sexta vuelta de slice 2. No se pudo
   establecer con el equipo de backend si la bisección de aquella vuelta leyó una
   respuesta real distinta en su momento o si fue un error de esa verificación; lo
   único confirmado es que hoy el shape es el plano.
   **Corregido**: `PaginaResponse<T>` (`src/app/models/pagina-response.model.ts`)
   volvió al shape plano — ya no existe `PaginaMetadata` ni el campo `page` anidado.
   Sin impacto funcional (mismo motivo que en slice 2: los listados solo leen
   `.content`), pero los 12 mocks de test que construían el shape anidado
   (`paginaDe()` en los specs de los cuatro catálogos, tablero, sembrar-lote-form,
   costos-indirectos-listado, reportes, campania-selector-modal, aplicacion-form,
   venta-form y lote-campania-detalle) se actualizaron para reflejar el shape real,
   para que dejen de mentir sobre el contrato aunque hoy no se ejerciten. `npm test`
   (191/191), `npm run lint` y `npm run build` en verde.
   `docs/api-endpoints-v1.md` §"Paginación" sigue documentando el shape `PagedModel`
   viejo — quedó desactualizado por esta corrección; `docs/api-endpoints-v2.md` ya
   tiene el shape correcto y es la fuente de verdad vigente (ver tabla de
   documentación en `CLAUDE.md`).

### Tercera vuelta: el backend cerró los dos gaps confirmados (puntos 1 y 2) — edición y baja de cosecha y venta

El equipo de backend implementó los cuatro endpoints que la segunda vuelta había
confirmado como gaps reales (no de documentación): `PUT
/api/lote-campanias/{id}/cosechas/{cosechaId}`, `PUT /api/ventas/{id}` y `DELETE
/api/ventas/{id}` (`DELETE` de cosecha ya existía desde slice 5). Documentado en
`docs/api-endpoints-v2.md` §11 y §13. Se construyó la UI que faltaba para estas cuatro
operaciones — el punto 1 (feed de movimientos sin cosecha/venta) sigue sin resolverse,
el equipo de backend confirmó que es una limitación real del `UNION ALL` de
`MovimientoService`, no algo que vaya a cambiar en el corto plazo.

**Decisiones de producto acordadas con el usuario antes de construir** (no había
precedente en `docs/design-reference/`: el prototipo no tiene ninguna acción de
editar/eliminar en cosecha ni venta, es terreno que el backend recién habilitó):

- **Cosecha se edita reabriendo el mismo `CosechaForm` de alta, precargado con las
  filas del corte elegido** — mismo patrón mental que ya usa el productor para
  cargar, en vez de una pantalla nueva por calidad. Clickear la fila del corte (ahora
  un `<button>`, mismo patrón que `.fila-catalogo` de los catálogos) abre el
  formulario; un botón "Eliminar" aparte (mismo patrón de
  `costos-indirectos-listado`) borra el corte completo con confirmación
  (`ConfirmarAccion`) porque, a diferencia de la baja de catálogo, acá no hay
  reactivar posible.
- **Venta solo se implementó completo, no acotado**: alcance confirmado con el
  usuario como "cosecha + venta juntas", no separarlo en una sesión aparte de
  modelos/servicio sin UI.

**Qué se construyó**:

- `LoteCampaniaService`: `actualizarCosecha`/`eliminarCosecha` (ya existía
  `crearCosecha`) y `actualizarVenta`/`eliminarVenta` (ya existía `crearVenta`;
  `liquidarVenta` sigue siendo el camino aparte para cargar precio).
- `CosechaForm` suma `cosechasExistentes: Cosecha[]` (vacío = alta). Cada calidad se
  resuelve por separado contra lo que había antes de guardar: fila previa + cantidad
  nueva → `PUT`; fila previa + campo vaciado → `DELETE` (saca esa calidad del corte
  sin tocar las demás); sin fila previa + cantidad cargada → `POST` (agrega una
  calidad nueva a un corte existente). Vaciar las tres calidades a la vez no manda
  nada — el mensaje de error pide usar "Eliminar corte" en su lugar, para que un
  borrado completo pase siempre por la confirmación explícita, no por accidente
  guardando un formulario en blanco.
- `VentaForm` suma `venta: Venta | null` (`null` = alta). En edición, el selector de
  modalidad se oculta y queda fijo en `CONSIGNACION`: el backend acepta cambiar a
  `PRECIO_CERRADO` en el mismo `PUT` (liquida la venta como efecto colateral), pero
  eso mezclaría el `PUT` de edición con el flujo de dos pasos que ya existe
  (`LiquidarVentaForm`) — se decidió no exponer ese camino desde acá, "Completar
  liquidación" sigue siendo la única forma de cargar un precio. El disponible de
  stock que valida la cantidad se ajusta sumando de vuelta la cantidad actual de la
  propia venta a su calidad (mismo criterio que aplica el backend al revalidar en el
  `PUT`, documentado en `docs/api-endpoints-v2.md`), para no contarla dos veces
  contra sí misma.
- `LoteCampaniaDetalle`: filas de cosecha clickeables (editar) + botón "Eliminar" por
  corte; filas de venta con "Editar" (solo `ENTREGADA`, oculto en `LIQUIDADA` porque
  el backend rechaza esa combinación con `422 VENTA_YA_LIQUIDADA`) y "Eliminar"
  (cualquier estado, mientras la campaña no esté cerrada). Dos `ConfirmarAccion`
  nuevos (borrado de corte, borrado de venta) — es borrado físico sin reactivar
  posible, a diferencia de la baja lógica de catálogo, que no lleva confirmación
  aparte.
- Estilos: `.fila-cosecha` pasó de `<div>` a `<button>` con reset de estilos (mismo
  patrón que `.fila-catalogo`), reutilizando `.fila-catalogo-fila`/
  `.fila-catalogo__accion` de `shared/styles/_catalogo.scss` (nuevo `@use` en
  `lote-campania-detalle.scss`) en vez de duplicar el wrapper. Presupuesto
  `anyComponentStyle` subido de 17kB/19kB a 20kB/22kB (mismo costo esperado de sumar
  UI a la pantalla más grande de la app, documentado desde slice 2).

**Verificado contra el backend real** (Playwright, usuario ADMIN, campaña
"2025/26 editado", lote-campaña "Cebolla C"): editar un corte agregando una calidad
nueva (`POST`), editar una calidad existente (`PUT`), vaciar una calidad existente
(`DELETE`, la fila desaparece y el resto del corte queda igual), cargar un corte de
prueba y eliminarlo completo con confirmación, cargar una venta en consignación,
editarla (comprador/calidad/fecha/cantidad, con el disponible ajustado mostrado
correctamente) y eliminarla — todo sin errores de consola, en 1280px y 390px (sheet a
pantalla completa en el formulario, confirmación centrada). `npm test` (208/208),
`npm run lint` y `npm run build` en verde.
