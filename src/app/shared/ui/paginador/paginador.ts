import { Component, input, output } from '@angular/core';

/**
 * Controles de paginado (`pagina` 0-based, igual que Spring Data Pageable) — le da
 * igual si quien cambia de página dispara un GET nuevo (movimientos, paginado real
 * contra el backend) o recorta un array ya cargado en memoria (catálogos, cosechas,
 * ventas). Si se pasa `totalElementos`, muestra el total además de la navegación — y
 * lo sigue mostrando aunque entre todo en una sola página (ahí sin botones, solo el
 * conteo). Sin `totalElementos` y con una sola página, no se muestra nada.
 */
@Component({
  selector: 'app-paginador',
  templateUrl: './paginador.html',
  styleUrl: './paginador.scss',
})
export class Paginador {
  readonly pagina = input.required<number>();
  readonly totalPaginas = input.required<number>();
  readonly totalElementos = input<number | null>(null);
  /** Ya en plural (ej. "insumos", "costos indirectos") — se muestra tal cual. */
  readonly etiqueta = input<string>('resultados');
  readonly cambiarPagina = output<number>();

  protected anterior(): void {
    if (this.pagina() > 0) {
      this.cambiarPagina.emit(this.pagina() - 1);
    }
  }

  protected siguiente(): void {
    if (this.pagina() < this.totalPaginas() - 1) {
      this.cambiarPagina.emit(this.pagina() + 1);
    }
  }
}
