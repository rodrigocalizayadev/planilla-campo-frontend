/**
 * Filtrado y formateo en vivo para los inputs numéricos de la app (docs/design-brief.md
 * §6.4). Dos familias:
 *  - "Cantidad": deja pasar dígitos y un único punto decimal, sin agrupar. Lo usan
 *    superficie, jornales, cantidades — números que en ningún otro lado de la app se
 *    muestran con separador de miles.
 *  - "Importe": mientras se tipea, agrupa miles con "." y usa "," como separador
 *    decimal (mismo formato que `ImportePipe`, y el mismo que usa el resto de la app
 *    para mostrar cualquier número con esa magnitud — incluido el tipo de cambio, que
 *    aunque no es plata se escribe y se lee igual que un importe en toda la pantalla).
 *    El valor "crudo" que viaja al modelo (y de ahí al backend) sigue siendo un string
 *    plano estilo BigDecimal: punto decimal, sin miles.
 *
 * Todas las funciones reciben también la posición del cursor para poder reubicarlo
 * después de filtrar/formatear: sin esto, cada tecleo tira el cursor al final del
 * input, que es inutilizable para editar un número ya cargado.
 */

/**
 * Topes de dígitos alineados con las columnas reales del backend (ampliadas respecto
 * de docs/reglas-calculo.md §1.1 — pendiente actualizar ese documento):
 *  - Importes/montos: `DECIMAL(20,2)` → 18 enteros, 2 decimales.
 *  - Cantidades (superficie, cosecha, cantidad de venta/tarea/aplicación,
 *    kg por unidad): `DECIMAL(12,2)` → 10 enteros, 2 decimales.
 *  - Tipo de cambio: `DECIMAL(12,4)` → 8 enteros, 4 decimales.
 */
export const MAX_DIGITOS_ENTEROS_CANTIDAD = 10;
export const MAX_DIGITOS_DECIMALES_CANTIDAD = 2;
export const MAX_DIGITOS_ENTEROS_TIPO_CAMBIO = 8;
export const MAX_DIGITOS_DECIMALES_TIPO_CAMBIO = 4;
export const MAX_DIGITOS_ENTEROS_IMPORTE = 18;

/** Cuenta, entre los caracteres conservados de `bruto`, cuántos caían antes del cursor. */
function contarConservadosAntes(bruto: string, cursor: number, esConservable: (indice: number) => boolean): number {
  let conservados = 0;
  for (let i = 0; i < bruto.length && i < cursor; i++) {
    if (esConservable(i)) {
      conservados++;
    }
  }
  return conservados;
}

export interface ResultadoFiltrado {
  readonly texto: string;
  readonly cursor: number;
}

/**
 * Cantidad: dígitos y un único punto decimal. No agrupa miles. La parte entera se
 * corta en `maxDigitosEnteros` dígitos y la decimal en `maxDigitosDecimales` (ver
 * `MAX_DIGITOS_ENTEROS_CANTIDAD`/`MAX_DIGITOS_DECIMALES_CANTIDAD` y sus equivalentes
 * de tipo de cambio): los dígitos de más simplemente no se insertan, igual que una
 * letra inválida.
 */
export function filtrarCantidad(
  bruto: string,
  cursorOriginal: number,
  permiteDecimales = true,
  maxDigitosEnteros = MAX_DIGITOS_ENTEROS_CANTIDAD,
  maxDigitosDecimales = MAX_DIGITOS_DECIMALES_CANTIDAD,
): ResultadoFiltrado {
  let resultado = '';
  let enterosVistos = 0;
  let decimalesVistos = 0;
  let vioPunto = false;
  const conservables: boolean[] = [];
  for (const caracter of bruto) {
    let conservar = false;
    if (caracter >= '0' && caracter <= '9') {
      if (!vioPunto && enterosVistos < maxDigitosEnteros) {
        conservar = true;
        enterosVistos++;
      } else if (vioPunto && decimalesVistos < maxDigitosDecimales) {
        conservar = true;
        decimalesVistos++;
      }
    } else if (permiteDecimales && caracter === '.' && !vioPunto) {
      vioPunto = true;
      conservar = true;
    }
    conservables.push(conservar);
    if (conservar) {
      resultado += caracter;
    }
  }
  const cursor = contarConservadosAntes(bruto, cursorOriginal, (i) => conservables[i]);
  return { texto: resultado, cursor };
}

/** Agrupa la parte entera de un importe con "." cada tres dígitos. */
export function agruparMiles(enteros: string): string {
  return enteros.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/**
 * Filtra y formatea en vivo un importe: dígitos + una única "," decimal (hasta
 * `maxDigitosDecimales` dígitos decimales, parte entera de hasta `maxDigitosEnteros`
 * — ver `MAX_DIGITOS_ENTEROS_IMPORTE`/`MAX_DIGITOS_DECIMALES_CANTIDAD` y sus
 * equivalentes de tipo de cambio), agrupando la parte entera con ".". Devuelve el
 * texto ya formateado para mostrar y la cantidad de caracteres "significativos"
 * (dígitos + coma) que quedaban antes del cursor, para poder ubicarlo con
 * `ubicarCursorImporte`.
 */
export function filtrarImporte(
  bruto: string,
  cursorOriginal: number,
  maxDigitosEnteros = MAX_DIGITOS_ENTEROS_IMPORTE,
  maxDigitosDecimales = 2,
): { texto: string; significativosAntes: number } {
  let enteros = '';
  let decimales = '';
  let vioComa = false;
  const conservables: boolean[] = [];
  for (const caracter of bruto) {
    let conservar = false;
    if (caracter === ',' && !vioComa) {
      vioComa = true;
      conservar = true;
    } else if (caracter >= '0' && caracter <= '9') {
      if (!vioComa) {
        if (enteros.length < maxDigitosEnteros) {
          enteros += caracter;
          conservar = true;
        }
      } else if (decimales.length < maxDigitosDecimales) {
        decimales += caracter;
        conservar = true;
      }
    }
    conservables.push(conservar);
  }
  const significativosAntes = contarConservadosAntes(bruto, cursorOriginal, (i) => conservables[i]);
  const texto = vioComa ? `${agruparMiles(enteros)},${decimales}` : agruparMiles(enteros);
  return { texto, significativosAntes };
}

/** Ubica el cursor en `texto` (ya formateado) tras `significativosAntes` caracteres que no sean "." de agrupación. */
export function ubicarCursorImporte(texto: string, significativosAntes: number): number {
  if (significativosAntes <= 0) {
    return 0;
  }
  let contados = 0;
  for (let i = 0; i < texto.length; i++) {
    if (texto[i] !== '.') {
      contados++;
      if (contados === significativosAntes) {
        return i + 1;
      }
    }
  }
  return texto.length;
}

/** Importe mostrado ("1.234,56") → crudo estilo BigDecimal ("1234.56") para el modelo/backend. */
export function importeMostradoACrudo(mostrado: string): string {
  if (!mostrado) {
    return '';
  }
  return mostrado.replace(/\./g, '').replace(',', '.');
}

/** Crudo estilo BigDecimal ("1234.5") → importe para mostrar ("1.234,50"), siempre con `maxDigitosDecimales` decimales. */
export function formatearImporteDesdeCrudo(crudo: string, maxDigitosDecimales = 2): string {
  if (crudo === '' || crudo == null) {
    return '';
  }
  const numero = Number(crudo);
  if (!Number.isFinite(numero)) {
    return '';
  }
  const [enterosPart, decimalesPart] = numero.toFixed(maxDigitosDecimales).split('.');
  return `${agruparMiles(enterosPart)},${decimalesPart}`;
}
