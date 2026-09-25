/**
 * GET /api/campanias/{id}/costos-por-rubro. Confirmado contra el backend real
 * (docs/plan-frontend.md slice 3, segunda vuelta) aunque todavía no lo consume ninguna
 * pantalla — es para el reporte "Resumen de campaña" de slice 6
 * (docs/plan-frontend.md). Se modela ahora, con el shape ya confirmado, para no repetir
 * la bisección en ese slice.
 *
 * **`laborMecanica` es el nombre real del rubro** que `docs/reglas-calculo.md` §5.3
 * documenta como "Labores y servicios" — mismo concepto (`Tarea` con
 * `ejecutor IN (PROPIO, CONTRATISTA)`), nombre de campo distinto en este endpoint que
 * en `DesgloseCostosResponse` (que sí usa `costoLaborYServiciosArs`/`Usd`). No
 * armonizado por el backend; el front solo lo muestra tal cual.
 *
 * Todos los importes con sufijo `Ars`/`Usd` son string JSON (CLAUDE.md regla 1: todo
 * `BigDecimal` viaja como string, sin excepciones).
 */
export interface CostosPorRubroLote {
  loteCampaniaId: number;
  nombreLote: string;
  nombreCultivo: string;
  superficieSembradaHa: string;
  insumosArs: string;
  insumosUsd: string;
  manoObraArs: string;
  manoObraUsd: string;
  laborMecanicaArs: string;
  laborMecanicaUsd: string;
  indirectosArs: string;
  indirectosUsd: string;
  totalArs: string;
  totalUsd: string;
}

export interface CostosPorRubro {
  campaniaId: number;
  nombreCampania: string;
  lotes: CostosPorRubroLote[];
  totalInsumosArs: string;
  totalInsumosUsd: string;
  totalManoObraArs: string;
  totalManoObraUsd: string;
  totalLaborMecanicaArs: string;
  totalLaborMecanicaUsd: string;
  totalIndirectosArs: string;
  totalIndirectosUsd: string;
  totalGeneralArs: string;
  totalGeneralUsd: string;
}
