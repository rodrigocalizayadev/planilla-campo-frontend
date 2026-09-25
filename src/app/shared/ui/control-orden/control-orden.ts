import { Component, input, model } from '@angular/core';

export interface OpcionOrden {
  valor: string;
  etiqueta: string;
}

/**
 * Selector de campo + dirección de orden, reusado tanto en listados de catálogo
 * (orden resuelto en el cliente) como en el feed de movimientos de lote-campania-detalle
 * (orden vía `sort` contra el backend) — a este componente le da igual quién procesa el
 * cambio, solo expone los dos signals. Con una sola opción (el feed de movimientos solo
 * se ordena por fecha) oculta el <select> y deja nada más el botón de dirección.
 */
@Component({
  selector: 'app-control-orden',
  templateUrl: './control-orden.html',
  styleUrl: './control-orden.scss',
})
export class ControlOrden {
  readonly opciones = input.required<OpcionOrden[]>();
  readonly campo = model<string | null>(null);
  readonly direccion = model<'asc' | 'desc'>('asc');

  protected campoActivo(): string {
    return this.campo() ?? this.opciones()[0]?.valor ?? '';
  }

  protected etiquetaActiva(): string {
    const valor = this.campoActivo();
    return this.opciones().find((o) => o.valor === valor)?.etiqueta ?? '';
  }

  protected onCampoChange(evento: Event): void {
    this.campo.set((evento.target as HTMLSelectElement).value);
  }

  alternarDireccion(): void {
    if (this.campo() === null && this.opciones().length > 0) {
      this.campo.set(this.opciones()[0].valor);
    }
    this.direccion.update((d) => (d === 'asc' ? 'desc' : 'asc'));
  }
}
