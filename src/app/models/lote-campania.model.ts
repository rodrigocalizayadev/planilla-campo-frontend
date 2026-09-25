/**
 * GET /api/campanias/{id}/lote-campanias. Agregado raíz del costeo
 * (docs/dominio.md §4): intersección de lote, campaña y cultivo. Fechas en
 * ISO-8601 (`LocalDate`), nunca pasar por `new Date()`.
 *
 * `superficieSembradaHa` viaja como string JSON (CLAUDE.md regla 1: todo `BigDecimal`
 * viaja como string, sin excepciones — el backend unificó esto para todos los DTOs).
 *
 * `ciclo` es lo que distingue dos siembras del mismo lote+cultivo en la misma campaña
 * (docs/dominio.md §4): el backend lo autoincrementa solo si se omite en el alta — el
 * frontend no necesita pedirlo ni calcularlo, solo mostrarlo cuando es mayor a 1.
 */
export interface LoteCampania {
  id: number;
  campaniaId: number;
  loteId: number;
  loteNombre: string;
  cultivoId: number;
  cultivoNombre: string;
  variedad: string | null;
  ciclo: number;
  superficieSembradaHa: string;
  unidadProduccion: string;
  fechaSiembra: string | null;
  fechaTrasplante: string | null;
  fechaCosechaEsperada: string | null;
  comentarios: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Payload de POST /api/campanias/{id}/lote-campanias ("sembrar un lote").
 *
 * Sin `ciclo`: se omite a propósito para que el backend lo autoincremente. Si se manda
 * un `ciclo` ya usado para el mismo lote+cultivo+campaña, el backend responde
 * `422 DUPLICADO` (confirmado contra la API real).
 */
export interface LoteCampaniaRequest {
  loteId: number;
  cultivoId: number;
  variedad: string | null;
  superficieSembradaHa: string;
  unidadProduccion: string;
  fechaSiembra: string | null;
  fechaTrasplante: string | null;
  fechaCosechaEsperada: string | null;
  comentarios: string | null;
}
