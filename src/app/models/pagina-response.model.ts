/**
 * `Page<T>` de Spring Data, serializado con el formato simplificado de Spring Boot
 * (`content` + metadata de paginado anidada en `page`, no HATEOAS). Shape confirmado
 * por bisección directa contra la API real (`curl`) en tres endpoints distintos
 * (`/api/insumos`, `/api/lotes`, `/api/campanias`), con y sin `sort` — siempre el mismo
 * shape reducido. Reemplaza un shape plano anterior (`content` + `pageable`/
 * `totalElements`/`totalPages`/etc. todos sueltos en la raíz) que nunca coincidió con lo
 * que devuelve el backend hoy: no se había notado porque hasta ahora ningún consumidor
 * leía más que `.content`.
 */
export interface PaginaResponse<T> {
  content: T[];
  page: {
    size: number;
    number: number;
    totalElements: number;
    totalPages: number;
  };
}
