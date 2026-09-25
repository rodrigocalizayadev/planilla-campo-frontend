import { Component, inject } from '@angular/core';
import { CampaniaActivaService } from '../../core/campania/campania-activa.service';

/**
 * Contexto de campaña activa, siempre visible (docs/design-brief.md §10). Abre
 * `CampaniaSelectorModal` (montado en `Shell`) llamando directo al servicio en vez de
 * emitir un `output()`: así el mismo modal se puede abrir también desde el estado
 * vacío del tablero, sin duplicar el `@Output` en cada pantalla que lo necesite.
 */
@Component({
  selector: 'app-selector-campania',
  templateUrl: './selector-campania.html',
  styleUrl: './selector-campania.scss',
})
export class SelectorCampania {
  private readonly campaniaActiva = inject(CampaniaActivaService);
  readonly campania = this.campaniaActiva.campania;

  abrir(): void {
    this.campaniaActiva.abrirSelector();
  }
}
