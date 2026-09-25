import { Component, computed, inject, input, linkedSignal, output, signal, untracked } from '@angular/core';
import { FormField, form, required, validate } from '@angular/forms/signals';
import { Modal } from '../../../shared/ui/modal/modal';
import { CampoImporte } from '../../../shared/ui/campo-importe/campo-importe';
import { AvisoService } from '../../../shared/ui/aviso/aviso.service';
import { EnumsService } from '../../../core/enums/enums.service';
import { TipoCambioMemoriaService } from '../../../shared/data/tipo-cambio-memoria.service';
import { InsumoService } from './insumo.service';
import type { ErrorResponse, Insumo, InsumoRequest } from '../../../models';

interface ModeloInsumoForm {
  nombre: string;
  tipo: string;
  unidadMedida: string;
  precioImporte: string;
  precioMoneda: 'ARS' | 'USD';
  precioTipoCambio: string;
}

/**
 * Alta/edición de insumo (docs/plan-frontend.md slice 2). El precio de referencia es
 * solo para autocompletar el formulario de aplicación de insumo (docs/dominio.md §8):
 * nunca se recalcula un costo ya cargado si este valor cambia después.
 *
 * `precioReferencia` viaja como `Monto` (docs/dominio.md §11): el backend exige
 * `tipoCambio` siempre, incluso en pesos, así que el campo se precarga con el último
 * valor cargado (`TipoCambioMemoriaService`) para no pedirle al usuario que lo escriba
 * a mano en el caso normal.
 */
@Component({
  selector: 'app-insumo-form',
  imports: [Modal, FormField, CampoImporte],
  templateUrl: './insumo-form.html',
  styleUrl: './insumo-form.scss',
})
export class InsumoForm {
  private readonly insumoService = inject(InsumoService);
  private readonly aviso = inject(AvisoService);
  private readonly tipoCambioMemoria = inject(TipoCambioMemoriaService);
  protected readonly enums = inject(EnumsService);

  readonly insumo = input<Insumo | null>(null);
  readonly guardado = output<void>();
  readonly cancelado = output<void>();

  protected readonly esEdicion = computed(() => this.insumo() !== null);

  // linkedSignal, no signal: `insumo` (input) todavía no está disponible en el
  // inicializador de campo cuando el modal recién se abre para editar — con un signal
  // común, el formulario queda con los campos en blanco (bug real, encontrado probando
  // la app). linkedSignal recalcula reactivamente en cuanto `insumo()` llega, y sigue
  // siendo editable por el usuario después.
  private readonly modelo = linkedSignal<ModeloInsumoForm>(() => ({
    nombre: this.insumo()?.nombre ?? '',
    tipo: this.insumo()?.tipo ?? '',
    unidadMedida: this.insumo()?.unidadMedida ?? '',
    precioImporte: this.insumo()?.precioReferencia?.importe ?? '',
    precioMoneda: this.insumo()?.precioReferencia?.moneda ?? 'ARS',
    precioTipoCambio: this.insumo()?.precioReferencia?.tipoCambio ?? untracked(this.tipoCambioMemoria.ultimo),
  }));

  protected readonly insumoForm = form(this.modelo, (path) => {
    required(path.nombre, { message: 'Ingresá el nombre del insumo' });
    required(path.tipo, { message: 'Elegí el tipo de insumo' });
    required(path.unidadMedida, { message: 'Elegí la unidad de medida' });
    validate(path.precioImporte, ({ value }) => {
      const numero = Number(value());
      return Number.isFinite(numero) && numero > 0
        ? undefined
        : { kind: 'precioInvalido', message: 'El precio de referencia tiene que ser mayor que cero' };
    });
    validate(path.precioTipoCambio, ({ value }) => {
      const numero = Number(value());
      return Number.isFinite(numero) && numero > 0
        ? undefined
        : { kind: 'tipoCambioInvalido', message: 'Ingresá el tipo de cambio' };
    });
  });

  protected readonly enviando = signal(false);

  guardar(evento: Event): void {
    evento.preventDefault();

    const raiz = this.insumoForm();
    if (!raiz.valid()) {
      raiz.markAsTouched();
      return;
    }

    const valores = this.modelo();
    const payload: InsumoRequest = {
      nombre: valores.nombre.trim(),
      tipo: valores.tipo,
      unidadMedida: valores.unidadMedida,
      precioReferencia: {
        importe: valores.precioImporte,
        moneda: valores.precioMoneda,
        tipoCambio: valores.precioTipoCambio,
      },
    };

    const insumoActual = this.insumo();
    this.enviando.set(true);
    const solicitud = insumoActual
      ? this.insumoService.actualizar(insumoActual.id, payload)
      : this.insumoService.crear(payload);

    solicitud.subscribe({
      next: () => {
        this.tipoCambioMemoria.guardar(valores.precioTipoCambio);
        this.aviso.mostrar(insumoActual ? 'Insumo actualizado' : 'Insumo creado');
        this.guardado.emit();
      },
      error: (error: ErrorResponse) => {
        this.enviando.set(false);
        this.aviso.mostrar(error.message || 'No se pudo guardar el insumo. Probá de nuevo.', 'error');
      },
    });
  }
}
