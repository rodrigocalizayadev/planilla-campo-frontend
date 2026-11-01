import type { Monto, MontoRequest } from './monto.model';

/**
 * Elemento de GET /api/ventas/{id}/cobros (`Page<Cobro>`). Solo existe en ventas
 * `PRECIO_CERRADO`: cada cobro reduce el saldo en ARS de la venta. `fecha` es un
 * `LocalDate` ISO (se muestra `dd/MM/yyyy`, CLAUDE.md regla 2).
 */
export interface Cobro {
  id: number;
  ventaId: number;
  fecha: string;
  monto: Monto;
  comentarios: string | null;
}

/**
 * Payload de POST /api/ventas/{id}/cobros. El cobro es **siempre en ARS**
 * (`MONEDA_COBRO_INVALIDA` si no) pero el `tipoCambio` del día se manda igual, como en
 * los demás movimientos: el backend calcula con él el equivalente en USD. `importe` y
 * `tipoCambio` viajan como string, tal cual salen del formulario (CLAUDE.md regla 1).
 * `comentarios` se omite si está vacío.
 */
export interface CobroRequest {
  fecha: string;
  monto: MontoRequest;
  comentarios?: string;
}
