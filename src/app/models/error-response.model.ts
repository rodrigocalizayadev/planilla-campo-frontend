/** Formato uniforme de error de la API (docs/api-endpoints.md). */
export interface ErrorResponse {
  timestamp: string;
  status: number;
  code: string;
  message: string;
  details: string[];
}
