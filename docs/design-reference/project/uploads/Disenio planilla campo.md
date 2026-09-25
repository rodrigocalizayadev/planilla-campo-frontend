# Brief de diseño — Planilla de Campo

Documento para pasar a Claude Design. Contiene todo el contexto necesario para
diseñar las pantallas sin haber leído el resto de la documentación técnica.

---

## 1. Qué es el producto

Una aplicación web para que un **productor hortícola** registre lo que gasta en cada
lote durante una campaña y sepa cuánto le costó producir, cuánto vendió y cuánto ganó.

Reemplaza el cuaderno de papel y la planilla de Excel que hoy se llenan a mano.

**El trabajo principal de la interfaz**: que cargar un gasto a pie de lote lleve
menos de 30 segundos, y que la pregunta "¿cuánto me está costando este lote?" se
responda en un solo pantallazo.

**La pantalla más importante de todo el sistema** es el detalle de un lote-campaña
con su costo acumulado y su costo por bolsa. Ese número es la razón de existir del
producto.

---

## 2. Usuarios

Hoy son **dos personas, las dos con acceso total**: el productor y su padre. Ambos
son dueños del negocio y necesitan ver todo, incluidos precios y márgenes. **No
diseñar pantallas ni menús recortados por rol.**

**El productor (rol ADMIN)**
Entre 40 y 60 años, competente con tecnología pero no técnico. Carga datos, y sobre
todo consulta: quiere saber si va ganando plata. Trabaja mayormente en PC, en la
oficina o la casa.

**El padre (rol ADMIN)**
El mismo acceso. Perfil menos afín a la tecnología: es el usuario contra el que hay
que medir la simplicidad de cada pantalla. Carga cosas puntuales desde el celular,
a veces a pie de lote, con sol directo sobre la pantalla y sin ganas de aprender
nada nuevo. **Si una pantalla le exige pensar, está mal diseñada.**

**Rol OPERADOR — previsto, sin uso hoy**
El sistema contempla un rol de carga con menos accesos (sin precios de venta ni
márgenes) para un encargado futuro. **No hay que diseñar sus pantallas ahora**, pero
la navegación tiene que tolerar que más adelante se oculten secciones enteras sin
que la estructura se rompa ni quede un menú con un solo ítem. Tenerlo en cuenta al
definir la jerarquía, nada más.

---

## 3. Dispositivos

Web responsive, una sola aplicación, sin app nativa.

**Escritorio (1280px+)** — carga intensiva y análisis. Es donde se arma la campaña,
se cargan tandas de comprobantes y se leen los reportes. Acá el ancho se aprovecha:
tablas, comparativas, varias columnas.

**Móvil (360–430px)** — carga puntual y rápida. Un jornal, una pulverización, una
cosecha del día. Objetivos táctiles grandes, formularios de una columna, teclado
numérico en los campos de cantidad, y los botones de acción al alcance del pulgar.

**No es "el diseño de escritorio comprimido".** En móvil el objetivo es una sola
acción por pantalla; en escritorio, ver mucho a la vez. Diseñar los dos estados de
las pantallas principales, no solo uno.

---

## 4. Dirección visual

**SaaS moderno y limpio, con prioridad absoluta en la claridad.**

- Simple antes que impresionante. El usuario no es técnico y no debería tener que
  aprender nada.
- Superficies claras, buen espaciado, jerarquía tipográfica marcada. Un solo color
  de acento usado con intención.
- **Los números son el contenido principal.** Importes y cantidades en una
  tipografía tabular, alineados a la derecha, con separador de miles. Que una
  columna de importes se lea de un vistazo es un requisito, no un detalle.
- Densidad media. Ni un ERP apretado ni un dashboard con tres datos y mucho aire.
- Iconografía sobria y consistente. Sin ilustraciones decorativas, sin fotos de
  stock de campos al atardecer.

### Paleta: verde y blanco

Se aprueba una paleta **verde sobre blanco**, con dos condiciones firmes: **que no
se vea anticuada** y **que el verde no sea chillón**.

Cómo se logra:

- **Verde profundo y desaturado**, del lado del bosque o la oliva, no el verde
  brillante de semáforo ni el lima. Si al mirarlo se piensa "software del 2010", está
  mal elegido.
- **El verde es acento, no fondo.** Se usa en acciones primarias, elementos activos
  de navegación y algún detalle estructural. La superficie de trabajo es blanca o
  casi blanca. Una interfaz mayormente verde se ve vieja de inmediato.
- **Grises fríos y neutros** para texto, bordes y superficies secundarias. La
  legibilidad la sostiene el gris, no el verde.
- Una escala del verde de al menos tres pasos (claro para fondos de estado, medio
  para acentos, oscuro para texto sobre claro), no un único tono usado para todo.

Errores que datan un diseño y hay que evitar:

- Gradientes verdes, sobre todo en botones y encabezados.
- Sombras marcadas o efectos de relieve.
- Verde y marrón juntos como paleta "de campo".
- Bordes gruesos, esquinas muy redondeadas, o tablas con filas alternadas en verde.
- Verde como fondo de barras superiores anchas.

**Sobre el acento**: el verde no puede ser el único color con significado, porque ya
está ocupado por la semántica de abajo. Hace falta una decisión explícita sobre cómo
convive el verde de marca con el verde de "margen positivo" — resolverlo con tono,
peso o contexto, y dejarlo documentado en el sistema de tokens.

**Semántica de color reservada** (no usar estos significados para nada más):
positivo para margen a favor, negativo para pérdida, y un tercer estado visual
distinto para **valores estimados**, que se explica en la sección 6.

---

## 5. Vocabulario

La interfaz está **en español rioplatense**, con los términos que el productor usa.
No traducir ni "profesionalizar" el lenguaje: si dice *carpida*, la pantalla dice
carpida.

| Término | Qué es |
|---|---|
| **Campaña** | El ciclo productivo anual. Se nombra "2025/26" |
| **Lote** | La parcela de terreno |
| **Lote-campaña** | Un lote sembrado con un cultivo en una campaña. La unidad de costeo |
| **Insumo** | Material consumido: semilla, fertilizante, agroquímico, bolsas |
| **Aplicación** | El consumo de un insumo en un lote |
| **Tarea** | Una labor: laboreo, siembra, carpida, riego, arrancado, embolsado |
| **Jornal** | Una jornada de trabajo, y su pago |
| **Destajo** | Pago por unidad producida (por bolsa, por bin), no por tiempo |
| **Cuadrilla** | Grupo de trabajadores contratado por un monto total |
| **Arrancado** | La cosecha manual de la cebolla |
| **Curado** | Secado del bulbo a campo antes de embolsar |
| **Corte** | Cada pasada de cosecha (melón y sandía se cosechan en varias) |
| **Calidad** | Primera, segunda o descarte |
| **Consignación** | Entregar sin precio; el comprador liquida semanas después |
| **Canon de riego** | Tarifa anual por hectárea por el derecho de agua |
| **Costo por bolsa** | Lo que cuesta producir una bolsa vendible. El número clave |

Cultivos: cebolla, zapallo, maíz, melón, sandía.
Unidades de producción: bolsa, jaula, bin, kilo, unidad, docena.

**No usar jerga de granos**: no existen quintales, ni rinde en qq/ha, ni humedad de
grano. Es horticultura, no soja.

---

## 6. Las cinco reglas de negocio que el diseño tiene que resolver

Esto es lo que distingue un diseño correcto de uno genérico. Cada punto es un
problema de interfaz real.

### 6.1 Dos márgenes, siempre los dos

Parte de la producción se entrega **sin precio** (consignación) y se liquida
semanas después. Entonces existen dos números y los dos son verdad:

- **Margen realizado** — plata ya liquidada, con precio confirmado.
- **Margen estimado** — incluye lo entregado sin liquidar y el stock en galpón,
  valorizado a precio de referencia.

Pueden diferir muchísimo: en un caso real, 3,5 millones contra 29,2 millones. **Si
la pantalla muestra solo el realizado, el productor cree que la campaña va mal
cuando va bien.**

El diseño necesita una forma clara y no técnica de mostrar los dos, con el desglose
de dónde sale cada parte (liquidado / pendiente de liquidación / stock) y una
**marca visual consistente para todo valor estimado**. Que un número estimado no se
pueda confundir con uno confirmado es requisito de diseño, no una nota al pie.

### 6.2 El costo por bolsa es el precio de indiferencia

`costo por bolsa` = costo total ÷ bolsas vendibles (excluye descarte).

Por debajo de ese número, vender da pérdida. Es lo que el productor compara contra
el precio que le ofrecen por teléfono. **Tiene que ser el dato más prominente del
detalle de lote-campaña**, y tiene que ser consultable en dos toques desde el
celular, porque se mira parado en el campo mientras negocia.

Si todavía no hay cosecha, el número no existe: mostrar un estado vacío honesto,
nunca un cero.

### 6.3 El formulario de tarea cambia de forma

Una tarea se paga de cuatro maneras y **cada una pide campos distintos**:

| Modo | Qué se carga |
|---|---|
| Por hectárea | Valor por ha (la superficie ya se conoce) |
| Total | Un único monto acordado |
| Jornal | Cantidad de jornales × valor del jornal |
| Destajo | Cantidad de unidades × valor por unidad |

El formulario debe adaptarse a la modalidad elegida sin sentirse como un formulario
que muta ni mostrar campos que no aplican. **Es el formulario más usado del sistema
y el que más se carga desde el celular.** Mostrar siempre el total calculado en vivo,
antes de guardar.

### 6.4 Importes en dos monedas

Los insumos importados se cotizan en dólares, la mano de obra se paga en pesos. Cada
importe tiene moneda y, si es en dólares, tipo de cambio. Hay que resolver un
**input de monto con moneda** que no moleste en el caso normal (pesos) pero permita
dólares sin fricción, precargando la última cotización usada.

En las vistas de totales, el usuario elige ver en pesos o en dólares.

### 6.5 La venta tiene dos caminos

- **Precio cerrado**: se carga con precio y queda liquidada.
- **Consignación**: se entrega sin precio, queda pendiente, y después llega la
  liquidación con precio, comisión y gastos.

El estado "entregada sin liquidar" debe ser visible y accionable: el productor tiene
que poder ver de un vistazo qué le deben liquidar y completar esa liquidación cuando
llega el papel.

---

## 7. Pantallas a diseñar

En orden de importancia. Las marcadas con ⭐ son las que definen el producto.

**1. ⭐ Detalle de lote-campaña**
La pantalla central. Encabezado con lote, cultivo, variedad, superficie sembrada y
fechas. Bloque de indicadores: costo total, costo por hectárea, **costo por bolsa**,
margen realizado y estimado. Desglose de costos por rubro (insumos, mano de obra,
labores, indirectos). Accesos a cargar aplicación, tarea, cosecha y venta.
Diseñar en escritorio y en móvil.

**2. ⭐ Tablero de campaña**
Resumen de la campaña activa: costo total, superficie sembrada, márgenes, y una
lista o tabla de los lote-campaña con sus costos por hectárea y por unidad, para
comparar entre lotes. Punto de entrada al detalle.

**3. ⭐ Formulario de tarea**
Con las cuatro modalidades de costo. Optimizado para móvil. Total en vivo.

**4. Formulario de aplicación de insumo**
Insumo, fecha, cantidad, precio unitario con moneda, total calculado. Debe
autocompletar el precio de referencia del catálogo dejándolo editable, y quedar
claro que el precio se guarda con la aplicación.

**5. Carga de cosecha**
Fecha, número de corte, calidad y cantidad. Permitir cargar varias calidades de un
mismo corte sin repetir el formulario entero.

**6. Ventas del lote-campaña**
Lista con estado (liquidada / pendiente), y el flujo de completar una liquidación.

**7. Costos indirectos de campaña**
Alta de un costo con su criterio de prorrateo, y vista previa de cómo queda
repartido entre los lotes antes de confirmar.

**8. Listado de lotes** y **catálogo de insumos**
CRUD estándar. Diseñar uno de los dos como patrón y dejar el otro implícito.

**9. Login**
Simple. Sin registro público.

**10. Navegación general**
Cómo se estructura la app: qué hay en el nivel superior, cómo se cambia de campaña
activa, y cómo se reduce en móvil. La campaña activa es contexto global y tiene que
estar siempre visible: cargar un gasto en la campaña equivocada es el error más
costoso posible.

---

## 8. Estados que hay que diseñar

Los estados vacíos y de error son la mitad de la experiencia real, sobre todo el
primer día de uso:

- **Campaña sin lotes sembrados** — primera vez que se usa el sistema.
- **Lote-campaña sin cosecha** — costo sí, costo por bolsa no.
- **Lote-campaña sin ventas** — margen realizado negativo, y hay que explicar por
  qué eso es normal y no un problema.
- **Sin conexión en el campo** — qué se ve al intentar cargar algo sin señal.
- **Campaña cerrada** — solo lectura, y tiene que quedar claro por qué no se puede
  editar.
- **Error de validación** — vender más bolsas de las cosechadas, superficie sembrada
  mayor que el lote. Decir qué pasó y cómo arreglarlo, sin culpar al usuario.

---

## 9. Restricciones

- Se implementa en **Angular**. Diseñar componentes reutilizables y consistentes, no
  pantallas sueltas cada una con su propio criterio.
- Sin modo oscuro en esta etapa.
- Accesibilidad: contraste alto de verdad (se usa con sol directo en la pantalla),
  objetivos táctiles de 44px como mínimo, foco de teclado visible, y no depender del
  color como único portador de información.
- El texto tiene que sobrevivir a nombres largos: "Fosfato diamónico", "Limpieza de
  canales", "Mercado Cooperativo de Productores".
- Los importes en pesos argentinos son números grandes: un costo de campaña puede
  tener nueve dígitos. Que no se rompa el layout ni se pierda la legibilidad.

---

## 10. Qué no hacer

- No inventar métricas que el sistema no calcula. Si un indicador no está en la
  sección 6, no existe.
- No usar terminología de granos (quintales, rinde qq/ha, humedad).
- No diseñar gráficos decorativos. Si hay un gráfico, tiene que responder una
  pregunta concreta que el productor se hace.
- No esconder el costo por bolsa detrás de un tab o un scroll.
- No mostrar un solo margen.
- No presentar valores estimados con el mismo tratamiento visual que los confirmados.
- No fotos de campos, tractores ni atardeceres. Es una herramienta de trabajo.
- No usar verde brillante o saturado, ni gradientes verdes, ni verde como fondo de
  barras anchas. El verde va en acentos (ver sección 4).
- No combinar verde con marrón como paleta "de campo".
- No diseñar accesos recortados por rol: hoy los dos usuarios ven todo.
- No usar `float` ni redondeos que hagan que una suma de importes no cierre en
  pantalla: los totales tienen que coincidir exactamente con la suma de las filas.

---

## 11. Entregable

Para cada pantalla de las marcadas ⭐: **estado de escritorio y estado móvil**.
Para el resto, el estado principal alcanza.

Antes de las pantallas, definir y mostrar: paleta con valores concretos,
tipografías por rol (incluyendo la utilitaria para números), escala de espaciado, y
el tratamiento visual de los tres estados semánticos (positivo, negativo,
estimado). Todo lo demás se deriva de ahí.

Usar **datos realistas** en todas las pantallas, nunca lorem ipsum ni cifras
redondas: nombres de lote como "Lote 3", cultivos reales de la lista, importes
argentinos verosímiles, costos por bolsa de cuatro dígitos. Un diseño con datos
falsos esconde exactamente los problemas de layout que hay que descubrir ahora.
