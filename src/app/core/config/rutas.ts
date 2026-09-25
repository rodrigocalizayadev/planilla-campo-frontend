/**
 * Paths de nivel superior, centralizados para que el layout y las rutas de cada
 * feature (que se agregan slice a slice) no dupliquen los strings.
 */
export const RUTAS = {
  tablero: '/tablero',
  costosIndirectos: '/costos-indirectos',
  reportes: '/reportes',
  catalogoLotes: '/catalogos/lotes',
  catalogoCultivos: '/catalogos/cultivos',
  catalogoInsumos: '/catalogos/insumos',
  catalogoCompradores: '/catalogos/compradores',
} as const;

/**
 * Único caso de ruta con parámetro (docs/plan-frontend.md slice 4): a diferencia del
 * resto de `RUTAS`, no puede ser un string fijo porque el id del lote-campaña es
 * dinámico.
 */
export function rutaLoteCampania(id: number): string {
  return `/lote-campanias/${id}`;
}
