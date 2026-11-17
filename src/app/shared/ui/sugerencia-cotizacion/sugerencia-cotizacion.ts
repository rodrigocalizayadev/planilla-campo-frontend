import { Component, computed, input } from '@angular/core';
import { FechaPipe } from '../../pipes/fecha.pipe';
import {
  MAX_DIGITOS_DECIMALES_TIPO_CAMBIO,
  formatearImporteDesdeCrudo,
} from '../../utils/entrada-numerica';
import type { SugerenciaTipoCambio } from '../../data/sugerencia-tipo-cambio';

/**
 * Línea de ayuda debajo de un campo de tipo de cambio con la cotización BCRA sugerida
 * (`sugerirTipoCambio`): fecha real de la cotización, valor y, si el campo tiene otro
 * valor, el botón "Usar". Mientras carga o si falla, lo dice sin bloquear el campo.
 */
@Component({
  selector: 'app-sugerencia-cotizacion',
  imports: [FechaPipe],
  template: `
    @if (sugerencia().cargando()) {
      <span class="sugerencia-cotizacion">Buscando cotización del BCRA…</span>
    } @else if (sugerencia().mensajeError(); as error) {
      <span class="sugerencia-cotizacion">{{ error }}</span>
    } @else if (sugerencia().cotizacion(); as cotizacion) {
      <span class="sugerencia-cotizacion">
        <span>
          BCRA del {{ cotizacion.fechaCotizacion | fecha }}:
          <span class="numero">{{ valorMostrado() }}</span>
        </span>
        @if (sugerencia().difiere()) {
          <button
            type="button"
            class="sugerencia-cotizacion__usar"
            [attr.aria-label]="'Usar la cotización del BCRA: ' + valorMostrado()"
            (click)="sugerencia().usar()"
          >
            Usar
          </button>
        }
      </span>
    }
  `,
  styleUrl: './sugerencia-cotizacion.scss',
})
export class SugerenciaCotizacion {
  readonly sugerencia = input.required<SugerenciaTipoCambio>();

  protected readonly valorMostrado = computed(() => {
    const valor = this.sugerencia().cotizacion()?.valor ?? '';
    return formatearImporteDesdeCrudo(valor, MAX_DIGITOS_DECIMALES_TIPO_CAMBIO);
  });
}
