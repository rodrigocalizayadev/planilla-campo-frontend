import { Component, computed, inject, input, output, signal, untracked } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { FormField, form, required, validate } from '@angular/forms/signals';
import { environment } from '../../../environments/environment';
import { Modal } from '../../shared/ui/modal/modal';
import { CampoCantidad } from '../../shared/ui/campo-cantidad/campo-cantidad';
import { CampoImporte } from '../../shared/ui/campo-importe/campo-importe';
import { ImportePipe } from '../../shared/pipes/importe.pipe';
import { AvisoService } from '../../shared/ui/aviso/aviso.service';
import { EnumsService } from '../../core/enums/enums.service';
import { TipoCambioMemoriaService } from '../../shared/data/tipo-cambio-memoria.service';
import { LoteCampaniaService } from './lote-campania.service';
import type { AplicacionInsumoRequest, ErrorResponse, Insumo, PaginaResponse } from '../../models';

interface ModeloAplicacionForm {
  insumoId: string;
  fecha: string;
  cantidad: string;
  unidadMedida: string;
  precioImporte: string;
  precioMoneda: 'ARS' | 'USD';
  precioTipoCambio: string;
}

/**
 * Formulario de aplicación de insumo (docs/design-brief.md §7 pantalla 4,
 * docs/dominio.md §8). `precioUnitario` es un `Monto` completo — confirmado por
 * bisección contra el backend real (docs/plan-frontend.md slice 4), mismo patrón que
 * `InsumoForm`. `unidadMedida` es un campo propio de la aplicación (no fijo al del
 * insumo): se autocompleta desde `Insumo.unidadMedida` al elegir el insumo, pero queda
 * editable por si se carga en otra unidad.
 *
 * Al elegir un insumo se autocompleta cantidad vacía + precio/moneda desde
 * `Insumo.precioReferencia`, dejándolo editable (regla explícita de docs/dominio.md
 * §8: el precio del catálogo es solo referencia, se congela en la aplicación).
 */
@Component({
  selector: 'app-aplicacion-form',
  imports: [Modal, FormField, CampoCantidad, CampoImporte, ImportePipe],
  templateUrl: './aplicacion-form.html',
  styleUrl: './aplicacion-form.scss',
})
export class AplicacionForm {
  private readonly loteCampaniaService = inject(LoteCampaniaService);
  private readonly aviso = inject(AvisoService);
  private readonly tipoCambioMemoria = inject(TipoCambioMemoriaService);
  protected readonly enums = inject(EnumsService);

  readonly loteCampaniaId = input.required<number>();
  readonly loteCampaniaTitulo = input<string>('');
  readonly guardado = output<void>();
  readonly cancelado = output<void>();

  private readonly insumosRecurso = httpResource<PaginaResponse<Insumo>>(
    () => `${environment.apiBaseUrl}/insumos?activo=true&size=200`,
  );
  protected readonly insumos = computed(() => this.insumosRecurso.value()?.content ?? []);

  protected readonly modelo = signal<ModeloAplicacionForm>({
    insumoId: '',
    fecha: new Date().toISOString().slice(0, 10),
    cantidad: '',
    unidadMedida: '',
    precioImporte: '',
    precioMoneda: 'ARS',
    precioTipoCambio: untracked(this.tipoCambioMemoria.ultimo),
  });

  protected readonly totalEnVivo = computed(() => {
    const m = this.modelo();
    const cantidad = Number(m.cantidad);
    const precio = Number(m.precioImporte);
    return Number.isFinite(cantidad) && Number.isFinite(precio) && cantidad > 0 && precio > 0
      ? cantidad * precio
      : 0;
  });

  protected readonly aplicacionForm = form(this.modelo, (path) => {
    required(path.insumoId, { message: 'Elegí un insumo' });
    required(path.unidadMedida, { message: 'Elegí la unidad de medida' });
    validate(path.cantidad, ({ value }) => {
      const numero = Number(value());
      return Number.isFinite(numero) && numero > 0
        ? undefined
        : { kind: 'cantidadInvalida', message: 'Ingresá una cantidad mayor que cero' };
    });
    validate(path.precioImporte, ({ value }) => {
      const numero = Number(value());
      return Number.isFinite(numero) && numero > 0
        ? undefined
        : { kind: 'precioInvalido', message: 'Ingresá un precio mayor que cero' };
    });
    validate(path.precioTipoCambio, ({ value }) => {
      const numero = Number(value());
      return Number.isFinite(numero) && numero > 0
        ? undefined
        : { kind: 'tipoCambioInvalido', message: 'Ingresá el tipo de cambio' };
    });
  });

  protected readonly enviando = signal(false);

  onCambioInsumo(evento: Event): void {
    const insumoId = (evento.target as HTMLSelectElement).value;
    const insumo = this.insumos().find((i) => i.id === Number(insumoId));
    this.modelo.update((actual) => ({
      ...actual,
      insumoId,
      unidadMedida: insumo?.unidadMedida ?? actual.unidadMedida,
      precioImporte: insumo?.precioReferencia?.importe ?? actual.precioImporte,
      precioMoneda: insumo?.precioReferencia?.moneda ?? actual.precioMoneda,
      precioTipoCambio: insumo?.precioReferencia?.tipoCambio ?? actual.precioTipoCambio,
    }));
  }

  guardar(evento: Event): void {
    evento.preventDefault();

    const raiz = this.aplicacionForm();
    if (!raiz.valid()) {
      raiz.markAsTouched();
      return;
    }

    const valores = this.modelo();
    const payload: AplicacionInsumoRequest = {
      insumoId: Number(valores.insumoId),
      fecha: valores.fecha,
      cantidad: valores.cantidad,
      unidadMedida: valores.unidadMedida,
      precioUnitario: {
        importe: valores.precioImporte,
        moneda: valores.precioMoneda,
        tipoCambio: valores.precioTipoCambio,
      },
    };

    this.enviando.set(true);
    this.loteCampaniaService.crearAplicacion(this.loteCampaniaId(), payload).subscribe({
      next: () => {
        this.tipoCambioMemoria.guardar(valores.precioTipoCambio);
        this.aviso.mostrar('Aplicación cargada');
        this.guardado.emit();
      },
      error: (error: ErrorResponse) => {
        this.enviando.set(false);
        this.aviso.mostrar(error.message || 'No se pudo cargar la aplicación. Probá de nuevo.', 'error');
      },
    });
  }
}
