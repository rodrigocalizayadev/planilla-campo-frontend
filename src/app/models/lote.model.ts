/** GET /api/lotes/{id}. superficieHa viaja como string: se muestra, no se recalcula. */
export interface Lote {
  id: number;
  nombre: string;
  superficieHa: string;
  tipoSuelo: string;
  comentarios: string | null;
  activo: boolean;
}

/** Payload de POST/PUT /api/lotes. */
export interface LoteRequest {
  nombre: string;
  superficieHa: string;
  tipoSuelo: string;
  comentarios: string | null;
}
