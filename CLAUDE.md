# CLAUDE.md

Frontend de Planilla de Campo: app web para costeo de campañas hortícolas. El backend
(Spring Boot 4.1 + MySQL 8.4) ya está terminado y funcionando.

**Antes de escribir código leé `docs/dominio.md`.** El dominio es horticultura
(cebolla, zapallo, maíz, melón, sandía), no agricultura extensiva de granos. Las
suposiciones de granos son incorrectas acá y están listadas en `docs/dominio.md` §1.1.

## Documentación

| Archivo | Contenido |
|---|---|
| `docs/design-brief.md` | Usuarios, dirección visual, pantallas, reglas de producto |
| `docs/dominio.md` | Glosario y semántica del negocio |
| `docs/reglas-calculo.md` | Fórmulas de costo y margen (el back las calcula, el front las muestra) |
| `docs/plan-frontend.md` | Slices de desarrollo |
| `docs/resumen-slices.md` | Bitácora de qué se construyó en cada slice cerrado |
| `docs/design-reference/` | Prototipo navegable validado con el usuario |
| `docs/api-endpoints-v2.md/` | Archivo actualizado con el contrato de servicios de back |

---

## `design-reference/` es una especificación, NO código para portar

Es un prototipo generado con Claude Design y **validado con el usuario final**. La
navegación, la jerarquía de información, los formularios y el tratamiento visual son
decisiones de producto ya tomadas.

Pero es HTML/JS de prototipo, con arquitectura de prototipo y datos en memoria.
**No lo portes componente por componente**: copiar su estructura sale peor que
rehacerla en Angular.

Respetar al pie de la letra: paleta y tokens visuales, jerarquía de cada pantalla, qué
dato va dónde, textos y vocabulario, flujos de navegación.

---

## Stack

- **Angular 22** (estable desde junio 2026, LTS hasta mayo 2028)
- TypeScript en modo estricto
- **Zoneless change detection** (default desde v21 — no agregar Zone.js)
- **Signal Forms** (estables en v22)
- **Vitest** (reemplazó a Karma en v21)
- SCSS
- Angular Aria para accesibilidad
- Sin librería de componentes: el diseño es propio y está definido

## Comandos

```bash
npm start              # dev server en localhost:4200
npm test               # Vitest
npm run build          # build de producción
npm run lint
```

## Reglas de versión: esto es Angular 22, NO Angular 15-19

**Tu conocimiento de Angular está sesgado hacia versiones viejas.** Estos idioms son
incorrectos en este proyecto:

- **Nada de `NgModule`.** Componentes standalone (el default).
- **Signals antes que RxJS** para estado. RxJS solo donde aporta de verdad: debounce
  en búsquedas, cancelación de requests.
- **`@if`, `@for`, `@switch`** — no `*ngIf`, `*ngFor`, `*ngSwitch`.
- **Signal Forms** — no `FormsModule` ni `ReactiveFormsModule` con `FormBuilder`.
- **`input()` y `output()`** como funciones — no los decoradores `@Input`/`@Output`.
- **`inject()`** — no inyección por constructor.
- **`httpResource()`** y las APIs de reactividad asincrónica donde apliquen, en vez de
  suscripciones manuales a `HttpClient`.
- Nada de Karma, ni `TestBed` a la vieja usanza, ni `async`/`fakeAsync` heredado.
- Componentes sin selector donde simplifique la composición.

Ante la duda sobre una API, consultá la documentación de Angular 22. No asumas desde
memoria.

---

## Reglas no negociables

### 1. El front NUNCA calcula plata que se persiste

Todos los costos, márgenes e indicadores vienen calculados del backend. El front los
muestra, no los recalcula. El backend usa `BigDecimal`; JavaScript usa float64 y no
puede reproducir esa aritmética sin errores de centavos.

**Única excepción**: el total en vivo de un formulario antes de guardar. Es una
previsualización; el valor que se persiste es el que devuelve la API al guardar, y es
ese el que se muestra después.

**Todo campo `BigDecimal` del backend viaja como string JSON, siempre, sin
excepciones** — importes, cantidades, superficies, kilos, tipo de cambio, porcentajes,
en request Y en response. Es una configuración global de Jackson (`toPlainString()` al
serializar, para no arriesgar notación científica en números grandes; deserialización
lenta que acepta tanto `"1500.50"` como `1500.50` si algo manda número por error, pero
el front nunca debe depender de esa tolerancia). Se parsean solo para formatear o para
la excepción del total en vivo de arriba — nunca para mandar de vuelta un número.

**Esto reemplaza una regla vieja que ya no aplica**: hasta hace poco, `Monto`
(`docs/dominio.md` §11: `Insumo.precioReferencia` y quien use el mismo shape),
`PrecioReferencia`, y los cuatro endpoints de costos/márgenes/resumen
(`DesgloseCostosResponse`, `MargenResponse`, `ResumenCampaniaResponse`,
`CostosPorRubroResponse`) eran una excepción confirmada con `importe`/`tipoCambio`/etc.
como **número JSON** (ver `docs/resumen-slices.md` para el historial). El backend
unificó todo a string. Si en código o en docs viejos ves un modelo con estos campos
tipados `number`, está desactualizado: corregilo a `string` en cuanto lo toques.

**`Monto` sigue siendo `{ importe, moneda, tipoCambio }`** (ahora los tres campos de
importe/tipoCambio son string) y **`tipoCambio` sigue siendo obligatorio siempre**,
incluso en pesos. Ver `src/app/models/monto.model.ts`.

**`Cultivo.precioReferenciaPrimera`/`Segunda` sigue sin usar `Monto`**: es
`PrecioReferencia`, un shape más chico, `{ importe, moneda }`, sin `tipoCambio` ni
`importeUsd`/`importeArs`. Es una diferencia real de dominio, no un simple recorte:
este precio no se congela nunca — se convierte con la `cotizacionVigente` de la
campaña en el momento de calcular el margen estimado (ver `docs/dominio.md` §11 y
`monto.model.ts`).

**Al armar un payload, mandá el string tal cual viene del formulario — nunca
`Number(valores.importe)`.** Convertir a `number` antes de enviar es exactamente el
error que esta regla existe para evitar: para importes grandes (el backend ahora
acepta hasta 18 dígitos enteros en `DECIMAL(20,2)`) `Number(...)` puede perder
precisión en float64 antes de que el valor salga del navegador, mandando un importe
distinto del que el usuario tipeó.

**Los cuatro endpoints de costos/márgenes/resumen exponen cada importe dos veces**
(sufijo `Ars` y `Usd`, sumado en slice 3 segunda vuelta): el front **nunca convierte
entre monedas**, solo elige qué campo mostrar según el selector activo. Los campos
`*Ars` de una estimación (stock, entregas sin liquidar, margen estimado) son `null`
si `Campania.cotizacionVigente` no está cargada — ver el detalle de nulabilidad exacto
en `docs/api-endpoints-v1.md` y en el comentario de `margen.model.ts`.

### 2. Fechas

- La API habla **ISO-8601**. Un `LocalDate` llega como `"2026-03-15"`.
- **Nunca `new Date("2026-03-15")`** para una fecha de negocio: lo interpreta como
  medianoche UTC y en Argentina (UTC−3) se muestra el día anterior. Es un bug
  silencioso. Manejá `LocalDate` como string y formatealo, o usá un tipo sin zona.
- La interfaz muestra **`dd/MM/yyyy`**. La API siempre recibe y devuelve ISO.
- Los `Instant` de auditoría sí son momentos reales: UTC del back, conversión a
  `America/Argentina/Buenos_Aires` en el front.

### 3. Enums desde la API

Los desplegables se pueblan desde `GET /api/metadata/enums`, que devuelve valor y
etiqueta en español para los trece enums del sistema. Se cachea al iniciar la app.

**No hardcodees listas de enums**: se desincronizan cuando el back agrega un valor.

El backend siempre recibe y devuelve el **valor** (`FITOSANITARIO`), nunca la etiqueta
("Agroquímico").

### 4. Valores estimados

Todo valor estimado —margen estimado, valorización de stock, entregas sin liquidar—
lleva **tratamiento visual propio y consistente**, distinto de los confirmados. El
prototipo lo resuelve con fondo rayado y badge "ESTIMADO": respetá ese patrón.

Es requisito de producto, no decoración: confundir un estimado con un confirmado lleva
a decisiones de venta equivocadas. Las respuestas de la API traen el flag
`tieneEstimaciones` y el desglose. Usalos.

### 5. Idioma y vocabulario

- Interfaz **en español rioplatense**, con los términos del productor: carpida,
  arrancado, destajo, jornal, bolsa, consignación, curado.
- Código: inglés para lo técnico (`Service`, `Component`, `Resolver`), español para el
  dominio (`Cosecha`, `superficieSembradaHa`), igual que el backend.
- Sin `ñ` ni acentos en identificadores: `campania`, no `campaña`.

---

## Arquitectura

Carpetas **por feature**, espejando el backend.

```
src/app/
├── core/           auth, interceptors, guards, config, cliente HTTP
├── shared/         componentes de UI, pipes de formato, tokens visuales
├── features/
│   ├── auth/
│   ├── tablero/
│   ├── campania/
│   ├── lote-campania/     ← la pantalla central del producto
│   ├── movimientos/       aplicaciones de insumo y tareas
│   ├── cosecha/
│   ├── venta/
│   ├── costos-indirectos/
│   └── catalogos/         lotes, cultivos, insumos, compradores
└── layout/         navegación, selector de campaña activa
```

- Rutas con **lazy loading** por feature.
- Interceptor para el JWT y para el manejo uniforme de errores. El back devuelve
  `{ timestamp, status, code, message, details[] }`.
- Estado global mínimo con signals: usuario autenticado y **campaña activa**, que es
  contexto de toda la app y debe estar siempre visible.
- Los modelos TypeScript espejan los DTOs del backend. Generalos leyendo los
  controllers, no los inventes.

---

## Responsive

Una sola app con breakpoints reales, no dos versiones.

- **Escritorio (1280px+)**: carga intensiva y análisis. Tablas, varias columnas.
- **Móvil (360–430px)**: carga puntual. Una acción por pantalla, formularios de una
  columna, teclado numérico en cantidades, objetivos táctiles de 44px mínimo.

En formularios móviles, **los campos obligatorios y vacíos van arriba** y los que
traen valor por defecto abajo. Excepción: cuando hay dependencia entre campos (en la
aplicación de insumo el insumo va primero, porque define la unidad y autocompleta el
precio).

Contraste alto de verdad: la app se usa con sol directo sobre la pantalla.

---

## Tests

- Vitest para unitarios: pipes de formato de importes y fechas, lógica de
  presentación, total en vivo de los formularios.
- Tests de componente para formularios con lógica condicional, en particular el de
  tarea con sus cuatro modalidades de pago.
- **Un test específico de que una fecha ISO se muestra con el día correcto en UTC−3.**
  Es el bug más probable de todo el front.
- Sin e2e en esta etapa.

---

## Verificación visual antes de dar por terminada una pantalla

`npm test` prueba lógica, no que la pantalla funcione. Antes de cerrar una
feature de UI, levantala y navegala en un navegador real. Vale la pena: en el
slice 1, el bug de `error.interceptor.ts` que mostraba "Failed to fetch" en
inglés en vez del mensaje genérico en español (`error.error` de un fetch
fallido es un `TypeError` nativo, no el body JSON del backend) solo apareció
así — `HttpTestingController` no simula ese caso de red.

No hay `chromium-cli` en este entorno. Usar Playwright vía `npx`:

### Backend local y usuarios de prueba

- El backend corre en `http://localhost:8080` (Spring Boot). Chequeá con
  `curl -s http://localhost:8080/api/metadata/enums -o /dev/null -w '%{http_code}'`
  — un `401` confirma que está arriba (ese endpoint exige JWT).
- **`proxy.conf.json`** (raíz del repo) proxea `/api/**` de `:4200` hacia
  `:8080`, ya cableado en `angular.json` (`serve.options.proxyConfig`) — `npm
  start` lo levanta solo, sin flags. **El proxy solo se lee al arrancar el
  dev server**: si lo tocás, hace falta reiniciar `ng serve`, no alcanza con
  el hot-reload.
- **`src/environments/environment.development.ts` tiene que usar
  `apiBaseUrl: '/api'` (relativo), nunca una URL absoluta tipo
  `http://localhost:8080/api`.** Con una URL absoluta el navegador manda el
  request directo a `:8080` saltándose el proxy de arriba por completo, y lo
  bloquea CORS (`No 'Access-Control-Allow-Origin' header...`) porque el
  backend no manda ese header — **esto rompió el login real en el navegador
  incluso después de agregar `proxy.conf.json`**, porque el proxy estaba
  bien pero nunca se usaba. `curl http://localhost:4200/api/...` no lo
  detecta (curl no aplica CORS), así que si vas a verificar el proxy, probá
  con un navegador real (Playwright headless alcanza) y mirá la consola, no
  solo `curl`. Con `/api` relativo, Playwright ya no necesita proxear a mano
  (`page.route`) — navegar directo a `http://localhost:4200` alcanza, tanto
  para el navegador real del usuario como para un script.
- **Usuarios de prueba ya cargados en la base local** (contraseña incluida
  a propósito: son de desarrollo, no de producción):
  - **ADMIN**: `admin@planillacampo.com` / `Admin1234`
  - **OPERADOR**: `operador@planillacampo.com` / `Operador1234`
  - `POST /api/auth/registro` (autoregistro) crea usuarios con rol
    `OPERADOR` por defecto, sin permiso de escritura en catálogos con precio
    (insumo, cultivo — devuelven `401`). Para probar esas pantallas, usar
    siempre el usuario **ADMIN** de arriba.

1. **Chequeá si ya hay un `npm start` corriendo antes de lanzar otro**:
   `curl -sf http://localhost:4200`. Si responde, ya hay uno activo (a veces
   en otra terminal del usuario); `ng serve` recompila solo con cada archivo
   guardado, así que ese proceso ya está viendo tus cambios. Lanzar uno nuevo
   sólo va a chocar con el puerto ocupado.
2. Si no hay nada corriendo, `npm start &` y esperar con polling, nunca
   `sleep` a ciegas:
   `timeout 30 bash -c 'until curl -sf http://localhost:4200 >/dev/null; do sleep 1; done'`.
3. **`playwright` no es dependencia del proyecto.** `npx playwright` puede
   resolver una copia cacheada bajo
   `~/AppData/Local/npm-cache/_npx/<hash>/node_modules`, pero un script ESM
   corrido con `node script.mjs` desde la raíz del repo falla con
   `ERR_MODULE_NOT_FOUND` porque no la encuentra ahí. Ubicar el hash correcto
   (`for d in ~/AppData/Local/npm-cache/_npx/*/node_modules; do [ -d "$d/playwright" ] && echo "$d"; done`),
   copiar el script ahí y correrlo desde esa carpeta.
4. **Usar siempre rutas absolutas para los screenshots.** Si el script corre
   desde la carpeta de caché de npx (punto anterior), una ruta relativa como
   `'shot.png'` lo escribe ahí y no en el proyecto. El síntoma es confuso: se
   ve una captura que no cambia aunque el fix ya esté aplicado, porque en
   realidad se está leyendo una corrida vieja. Si un screenshot no refleja un
   cambio que sabés que hiciste, comprobá el timestamp del archivo antes de
   asumir que el fix no funcionó.
5. Guion mínimo: navegar a una ruta protegida sin sesión → confirmar el
   redirect a `/login` → completar el formulario y accionarlo → screenshot +
   `page.on('console')` para pescar errores (incluidos los de tipo `log`, no
   solo `error`: ahí apareció el mensaje real que develó el bug de arriba).
6. Los `.mjs` de verificación y los `.png` son descartables: no se commitean,
   borralos al terminar.

---

## Cosas que NO hay que hacer

- No recalcular en el front ningún importe que se persiste.
- No usar `new Date()` para fechas de negocio.
- No hardcodear listas de enums.
- No mostrar un solo margen: siempre realizado y estimado.
- No dar el mismo tratamiento visual a estimados y confirmados.
- No usar terminología de granos: quintales, rinde qq/ha, humedad.
- No portar el código de `design-reference/` componente por componente.
- No usar idioms de Angular ≤19 (ver "Reglas de versión").
- No agregar Zone.js.
