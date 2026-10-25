/** Unidades entregadas y todavía sin liquidar, agrupadas por cultivo, calidad y unidad. */
export interface PendienteLiquidar {
  cultivoId: number;
  cultivoNombre: string;
  calidad: string;
  unidad: string;
  cantidadPendiente: string;
}

/**
 * GET /api/compradores/{id}/saldo. Son **dos magnitudes distintas que no se suman**:
 * `saldoCobrarArs` es plata (ventas a precio cerrado, en ARS) y `pendientesLiquidar` son
 * unidades de consignación que todavía no tienen precio — no se valúan en el front.
 */
export interface CompradorSaldo {
  compradorId: number;
  compradorNombre: string;
  saldoCobrarArs: string;
  pendientesLiquidar: PendienteLiquidar[];
}
