import type { ResumenCampania } from '../../models';

export interface CampaniaResumenPar {
  campaniaId: number;
  nombreCampania: string;
  resumen: ResumenCampania;
}

export interface FilaComparativaCultivo {
  cultivo: string;
  campaniaId: number;
  nombreCampania: string;
  superficieSembradaHa: number;
  costoTotalArs: number;
  costoTotalUsd: number;
  costoPorHaArs: number;
  costoPorHaUsd: number;
  margenRealizadoArs: number;
  margenRealizadoUsd: number;
}

/**
 * Comparativa entre campañas por cultivo (docs/plan-frontend.md slice 6): sin endpoint
 * dedicado, se arma agrupando `ResumenCampaniaLote[]` (ya calculado por el backend, uno
 * por campaña elegida por el usuario) por `nombreCultivo` dentro de cada campaña.
 *
 * Solo suma valores que el backend ya calculó (`costoTotal*`, `margenRealizado*`,
 * `superficieSembradaHa`) — no recalcula plata (CLAUDE.md regla 1). `costoPorHa` del
 * grupo se deriva como `Σ costoTotal / Σ ha`, no promediando el `costoPorHa` de cada
 * lote: mismo principio que ya usa el propio backend para `costoPorHaCampania*`
 * (docs/reglas-calculo.md §7.1) y que `Tablero` respeta desde slice 3 ("sobre totales,
 * no promediando lotes").
 *
 * Nunca incluye margen estimado: `ResumenCampania` no lo expone a nivel campaña/lote
 * (solo `GET /lote-campanias/{id}/margen` lo hace), mismo límite ya documentado y
 * respetado por `Tablero`.
 */
export function agruparPorCultivo(pares: CampaniaResumenPar[]): FilaComparativaCultivo[] {
  const filas: FilaComparativaCultivo[] = [];

  for (const { campaniaId, nombreCampania, resumen } of pares) {
    const porCultivo = new Map<string, ResumenCampania['lotes']>();
    for (const lote of resumen.lotes) {
      const lista = porCultivo.get(lote.nombreCultivo) ?? [];
      lista.push(lote);
      porCultivo.set(lote.nombreCultivo, lista);
    }

    for (const [cultivo, lotes] of porCultivo) {
      const superficieSembradaHa = lotes.reduce((s, l) => s + Number(l.superficieSembradaHa), 0);
      const costoTotalArs = lotes.reduce((s, l) => s + Number(l.costoTotalArs), 0);
      const costoTotalUsd = lotes.reduce((s, l) => s + Number(l.costoTotalUsd), 0);
      const margenRealizadoArs = lotes.reduce((s, l) => s + Number(l.margenRealizadoArs), 0);
      const margenRealizadoUsd = lotes.reduce((s, l) => s + Number(l.margenRealizadoUsd), 0);

      filas.push({
        cultivo,
        campaniaId,
        nombreCampania,
        superficieSembradaHa,
        costoTotalArs,
        costoTotalUsd,
        costoPorHaArs: superficieSembradaHa > 0 ? costoTotalArs / superficieSembradaHa : 0,
        costoPorHaUsd: superficieSembradaHa > 0 ? costoTotalUsd / superficieSembradaHa : 0,
        margenRealizadoArs,
        margenRealizadoUsd,
      });
    }
  }

  return filas;
}
