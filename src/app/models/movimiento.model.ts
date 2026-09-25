import type { Monto } from './monto.model';

/**
 * GET /api/lote-campanias/{id}/movimientos. Shape confirmado leyendo la respuesta real
 * (docs/plan-frontend.md slice 4) contra un lote-campaña con tareas y aplicaciones
 * cargadas: feed unificado en orden cronológico descendente, ya resuelto por el
 * backend (el front no ordena ni pagina a mano).
 *
 * `tipo` es `'TAREA' | 'INSUMO'` — **no `'APLICACION'`**, a diferencia de lo que
 * sugería el prototipo. `id` **no es único entre tipos**: una tarea y una aplicación
 * pueden compartir el mismo `id` (son autoincrementales de tablas distintas), así que
 * el track de `@for` tiene que combinar `tipo` + `id`.
 *
 * `descripcion` es el valor crudo del enum `tipo` de tarea (ej. `"CARPIDA"`, hay que
 * traducirlo con `EnumsService.etiqueta('tipoTarea', ...)`) cuando `tipo === 'TAREA'`,
 * o el nombre del insumo (ya en español, sin traducir) cuando `tipo === 'INSUMO'`.
 *
 * `detalleCalculo` es un string **ya formateado por el backend** (ej.
 * `"24 jornal × $ 35.000"`, `"— ha × $ 120.000"`, `"$ 2.800.000 (total)"`,
 * `"15 l × US$ 25"`): se muestra tal cual, nunca se reparsea ni se reformatea con
 * `ImportePipe`.
 *
 * A diferencia del mock del prototipo, esta respuesta **no incluye un campo de
 * rubro** (mano de obra vs. labores y servicios vs. insumos): esa clasificación
 * depende de `ejecutor` (docs/reglas-calculo.md §5.3), que tampoco viaja acá. El feed
 * muestra `tipo` (Insumo/Tarea) como único badge; el desglose por rubro real vive en
 * `DesgloseCostos` (bloque aparte de la pantalla).
 */
export interface Movimiento {
  id: number;
  tipo: 'TAREA' | 'INSUMO';
  fecha: string;
  descripcion: string;
  detalleCalculo: string;
  costoTotal: Monto;
}
