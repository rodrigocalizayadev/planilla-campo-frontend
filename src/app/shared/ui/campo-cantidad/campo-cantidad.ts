import { Component, input, model } from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';
import {
  MAX_DIGITOS_DECIMALES_CANTIDAD,
  MAX_DIGITOS_DECIMALES_TIPO_CAMBIO,
  MAX_DIGITOS_ENTEROS_CANTIDAD,
  MAX_DIGITOS_ENTEROS_TIPO_CAMBIO,
  filtrarCantidad,
} from '../../utils/entrada-numerica';

/**
 * Input numérico para cantidades, superficies, tipos de cambio y demás números que no
 * son plata (docs/plan-frontend.md): a diferencia de un `<input type="text">` suelto,
 * bloquea letras y símbolos mientras se tipea en vez de solo marcarlos inválidos
 * después. No agrupa miles ni cambia el separador decimal — el valor sigue siendo el
 * mismo string plano de siempre (punto decimal), así que ningún validador ni payload
 * de los formularios existentes necesitó cambiar.
 *
 * `tipo` elige el tope de dígitos, alineado con la columna real del backend
 * (`entrada-numerica.ts`): `cantidad` (default, `DECIMAL(12,2)`) para superficie,
 * cosecha, cantidad de venta/tarea/aplicación y kg por unidad; `tipoCambio`
 * (`DECIMAL(12,4)`) para cualquier campo de cotización/tipo de cambio.
 *
 * Implementa el contrato `FormValueControl` de Signal Forms (Angular 22): basta con
 * `[formField]="form.campo"` para engancharlo, igual que un `<input>` nativo. También
 * sirve fuera de un form, con binding manual `[value]`/`(valueChange)`.
 */
@Component({
  selector: 'app-campo-cantidad',
  // Ver el comentario equivalente en CampoImporte: sin este binding, el `id` estático
  // queda duplicado en el host y un `querySelector('#id')` puede encontrar el wrapper
  // en vez del `<input>` real.
  host: { '[attr.id]': 'null' },
  template: `
    <input
      class="campo__input campo__input--numerico"
      [class]="claseExtra()"
      type="text"
      [attr.inputmode]="enteros() ? 'numeric' : 'decimal'"
      [attr.id]="id()"
      [attr.placeholder]="placeholder()"
      [value]="value()"
      (input)="onInput($event)"
    />
  `,
  styleUrl: './campo-cantidad.scss',
})
export class CampoCantidad implements FormValueControl<string> {
  readonly value = model.required<string>();
  readonly id = input<string | null>(null);
  readonly placeholder = input<string | null>(null);
  readonly claseExtra = input<string>('');
  /** Cuando es `true` no permite punto decimal (número de corte, jornales enteros). */
  readonly enteros = input(false);
  readonly tipo = input<'cantidad' | 'tipoCambio'>('cantidad');

  protected onInput(evento: Event): void {
    const elemento = evento.target as HTMLInputElement;
    const cursor = elemento.selectionStart ?? elemento.value.length;
    const esTipoCambio = this.tipo() === 'tipoCambio';
    const maxEnteros = esTipoCambio ? MAX_DIGITOS_ENTEROS_TIPO_CAMBIO : MAX_DIGITOS_ENTEROS_CANTIDAD;
    const maxDecimales = esTipoCambio ? MAX_DIGITOS_DECIMALES_TIPO_CAMBIO : MAX_DIGITOS_DECIMALES_CANTIDAD;
    const { texto, cursor: nuevoCursor } = filtrarCantidad(elemento.value, cursor, !this.enteros(), maxEnteros, maxDecimales);
    elemento.value = texto;
    elemento.setSelectionRange(nuevoCursor, nuevoCursor);
    this.value.set(texto);
  }
}
