import { Component, computed, input, model } from '@angular/core';
import { transformedValue, type FormValueControl } from '@angular/forms/signals';
import {
  MAX_DIGITOS_DECIMALES_TIPO_CAMBIO,
  MAX_DIGITOS_ENTEROS_IMPORTE,
  MAX_DIGITOS_ENTEROS_TIPO_CAMBIO,
  filtrarImporte,
  formatearImporteDesdeCrudo,
  importeMostradoACrudo,
  ubicarCursorImporte,
} from '../../utils/entrada-numerica';

const MAX_DIGITOS_DECIMALES_IMPORTE = 2;

/**
 * Input para importes de plata: precio unitario, comisión, flete, importe de costo
 * indirecto, etc. Mientras se tipea, agrupa miles con "." y separa decimales con ","
 * — el mismo formato en que `ImportePipe` muestra cualquier importe ya guardado
 * (docs/plan-frontend.md). El valor que viaja al modelo del formulario (y de ahí al
 * body que recibe el backend) es un string plano estilo BigDecimal — punto decimal,
 * sin separador de miles — exactamente el mismo formato que se mandaba antes de este
 * componente, así que la validación y el payload de los formularios no cambiaron.
 *
 * `variante` elige la clase visual: `precio` (default) es el `campo-precio__monto`
 * de siempre, pegado a un `<select>` de moneda dentro de `.campo-precio`. `numerico`
 * es para importes sueltos sin selector propio (comisión y flete de la liquidación,
 * precio de referencia del cultivo): mismo formateo, look de `campo__input--numerico`.
 *
 * `tipo` elige el tope de dígitos (ver `entrada-numerica.ts`): `importe` (default,
 * `DECIMAL(20,2)`, 18 enteros / 2 decimales) para plata; `tipoCambio`
 * (`DECIMAL(12,4)`, 8 enteros / 4 decimales) para cualquier campo de cotización — que
 * aunque no es plata, en toda la app se escribe y se lee con el mismo formato
 * argentino (agrupado con "." y coma decimal), no en punto como una cantidad suelta.
 *
 * Implementa `FormValueControl` (Signal Forms, Angular 22) apoyándose en
 * `transformedValue` para separar el valor "de pantalla" (formateado) del valor
 * "de modelo" (crudo) — ver la guía de Angular sobre controles custom con
 * transformación de valor.
 */
@Component({
  selector: 'app-campo-importe',
  // El `id` estático que llega por atributo queda también en el propio host
  // (`<app-campo-importe id="...">`) además de pasar como input: sin este binding, un
  // `querySelector('#id')` puede encontrar el wrapper (sin listeners) en vez del
  // `<input>` real de adentro, que es donde se necesita.
  host: { '[attr.id]': 'null' },
  template: `
    <input
      [class]="clases()"
      type="text"
      inputmode="decimal"
      [attr.id]="id()"
      [attr.placeholder]="placeholder()"
      [value]="mostrado()"
      (input)="onInput($event)"
    />
  `,
  styleUrl: './campo-importe.scss',
})
export class CampoImporte implements FormValueControl<string> {
  readonly value = model.required<string>();
  readonly variante = input<'precio' | 'numerico'>('precio');
  readonly tipo = input<'importe' | 'tipoCambio'>('importe');
  readonly id = input<string | null>(null);
  readonly placeholder = input<string | null>('0,00');
  readonly claseExtra = input<string>('');

  private readonly maxEnteros = computed(() =>
    this.tipo() === 'tipoCambio' ? MAX_DIGITOS_ENTEROS_TIPO_CAMBIO : MAX_DIGITOS_ENTEROS_IMPORTE,
  );
  private readonly maxDecimales = computed(() =>
    this.tipo() === 'tipoCambio' ? MAX_DIGITOS_DECIMALES_TIPO_CAMBIO : MAX_DIGITOS_DECIMALES_IMPORTE,
  );

  protected readonly clases = computed(() => {
    const base = this.variante() === 'precio' ? 'campo-precio__monto' : 'campo__input campo__input--numerico';
    const extra = this.claseExtra();
    return extra ? `${base} ${extra}` : base;
  });

  protected readonly mostrado = transformedValue(this.value, {
    parse: (texto: string) => ({ value: importeMostradoACrudo(texto) }),
    format: (crudo: string) => formatearImporteDesdeCrudo(crudo, this.maxDecimales()),
  });

  protected onInput(evento: Event): void {
    const elemento = evento.target as HTMLInputElement;
    const cursor = elemento.selectionStart ?? elemento.value.length;
    const { texto, significativosAntes } = filtrarImporte(elemento.value, cursor, this.maxEnteros(), this.maxDecimales());
    const nuevoCursor = ubicarCursorImporte(texto, significativosAntes);
    elemento.value = texto;
    elemento.setSelectionRange(nuevoCursor, nuevoCursor);
    this.mostrado.set(texto);
  }
}
