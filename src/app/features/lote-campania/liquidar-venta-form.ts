import { Component, computed, inject, input, linkedSignal, output, signal, untracked } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormField, form, validate } from '@angular/forms/signals';
import { Modal } from '../../shared/ui/modal/modal';
import { CampoCantidad } from '../../shared/ui/campo-cantidad/campo-cantidad';
import { CampoImporte } from '../../shared/ui/campo-importe/campo-importe';
import { ImportePipe } from '../../shared/pipes/importe.pipe';
import { AvisoService } from '../../shared/ui/aviso/aviso.service';
import { TipoCambioMemoriaService } from '../../shared/data/tipo-cambio-memoria.service';
import { hoyIso } from '../../shared/utils/fecha-local';
import { LoteCampaniaService } from './lote-campania.service';
import type {
  ErrorResponse,
  LiquidacionRequest,
  LiquidacionTramoRequest,
  MontoRequest,
  Venta,
} from '../../models';

interface ModeloLiquidacionForm {
  cantidad: string;
  precioImporte: string;
  precioMoneda: 'ARS' | 'USD';
  precioTipoCambio: string;
  fechaLiquidacion: string;
  comisionImporte: string;
  fleteImporte: string;
  otrosGastosImporte: string;
}

/**
 * Liquida una venta en consignación (docs/design-brief.md §6.5 y §10.2: "el productor
 * tiene que poder ver de un vistazo qué le deben liquidar y completar esa liquidación
 * cuando llega el papel"). Tiene dos modos:
 *
 * - **`todo`** (default, "Completar liquidación"): liquida de una vez todo lo que falta
 *   con `PATCH /api/ventas/{id}/liquidacion` (docs/plan-frontend.md slice 5, shape
 *   confirmado por bisección). No pide cantidad: el backend crea un tramo por la
 *   cantidad pendiente.
 * - **`tramo`** ("Registrar liquidación"): liquida una parte con
 *   `POST /api/ventas/{id}/liquidaciones`; la cantidad arranca precargada con lo
 *   pendiente y no puede superarlo (`LIQUIDACION_EXCEDE_PENDIENTE` es la fuente de
 *   verdad final).
 *
 * `precioUnitario` y la fecha son obligatorios; `comision`/`flete`/`otrosGastos` son
 * opcionales, cada uno un `Monto` completo. Para no pedirle al productor una moneda y un
 * tipo de cambio distintos por cada gasto (la comisión y el flete casi siempre se
 * descuentan en la misma moneda que el precio), el formulario usa **una sola
 * moneda/TC compartida** para los cuatro importes — una simplificación deliberada, no
 * una limitación del backend (que sí acepta un `Monto` independiente por campo).
 */
@Component({
  selector: 'app-liquidar-venta-form',
  imports: [Modal, FormField, CampoCantidad, CampoImporte, ImportePipe, DecimalPipe],
  templateUrl: './liquidar-venta-form.html',
  styleUrl: './liquidar-venta-form.scss',
})
export class LiquidarVentaForm {
  private readonly loteCampaniaService = inject(LoteCampaniaService);
  private readonly aviso = inject(AvisoService);
  private readonly tipoCambioMemoria = inject(TipoCambioMemoriaService);

  readonly venta = input.required<Venta>();
  readonly modo = input<'todo' | 'tramo'>('todo');
  readonly loteCampaniaTitulo = input<string>('');
  readonly guardado = output<Venta>();
  readonly cancelado = output<void>();
  /** El servidor rechazó la liquidación porque la venta cambió (carrera entre usuarios,
   * `LIQUIDACION_EXCEDE_PENDIENTE` o `VENTA_YA_LIQUIDADA`): hay que refrescarla. */
  readonly desactualizada = output<void>();

  protected readonly esTramo = computed(() => this.modo() === 'tramo');

  /** Unidades que faltan liquidar. Una venta anterior a los tramos no trae el campo. */
  protected readonly pendiente = computed(() => this.venta().cantidadPendiente ?? this.venta().cantidad);
  protected readonly liquidadaEnParte = computed(() => Number(this.venta().cantidadLiquidada) > 0);

  // Se reinicia solo al cambiar de venta (no cuando la misma venta se refresca tras una
  // carrera), para no perder lo que el usuario ya tipeó.
  protected readonly modelo = linkedSignal<number, ModeloLiquidacionForm>({
    source: () => this.venta().id,
    computation: () => ({
      cantidad: untracked(this.pendiente),
      precioImporte: '',
      precioMoneda: 'ARS',
      precioTipoCambio: untracked(this.tipoCambioMemoria.ultimo),
      fechaLiquidacion: hoyIso(),
      comisionImporte: '',
      fleteImporte: '',
      otrosGastosImporte: '',
    }),
  });

  protected readonly cantidadALiquidar = computed(() =>
    this.esTramo() ? Number(this.modelo().cantidad) : Number(this.pendiente()),
  );

  protected readonly importeBruto = computed(() => {
    const m = this.modelo();
    const precio = Number(m.precioImporte);
    const cantidad = this.cantidadALiquidar();
    return Number.isFinite(precio) && precio > 0 && Number.isFinite(cantidad) && cantidad > 0
      ? precio * cantidad
      : 0;
  });

  protected readonly importeNetoEnVivo = computed(() => {
    const m = this.modelo();
    const gastos = [m.comisionImporte, m.fleteImporte, m.otrosGastosImporte]
      .map(Number)
      .filter((n) => Number.isFinite(n) && n > 0)
      .reduce((total, n) => total + n, 0);
    return this.importeBruto() - gastos;
  });

  private static validarGastoOpcional(valor: string): boolean {
    if (valor.trim() === '') {
      return true;
    }
    const numero = Number(valor);
    return Number.isFinite(numero) && numero >= 0;
  }

  protected readonly liquidacionForm = form(this.modelo, (path) => {
    validate(path.cantidad, ({ value }) => {
      if (!this.esTramo()) {
        return undefined;
      }
      const numero = Number(value());
      if (!Number.isFinite(numero) || numero <= 0) {
        return { kind: 'cantidadInvalida', message: 'Ingresá una cantidad mayor que cero' };
      }
      const pendiente = Number(this.pendiente());
      return numero > pendiente
        ? {
            kind: 'excedePendiente',
            message: `No hay tanto pendiente: quedan ${pendiente} ${this.venta().unidad} sin liquidar`,
          }
        : undefined;
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
    validate(path.comisionImporte, ({ value }) =>
      LiquidarVentaForm.validarGastoOpcional(value())
        ? undefined
        : { kind: 'gastoInvalido', message: 'Ingresá un importe válido' },
    );
    validate(path.fleteImporte, ({ value }) =>
      LiquidarVentaForm.validarGastoOpcional(value())
        ? undefined
        : { kind: 'gastoInvalido', message: 'Ingresá un importe válido' },
    );
    validate(path.otrosGastosImporte, ({ value }) =>
      LiquidarVentaForm.validarGastoOpcional(value())
        ? undefined
        : { kind: 'gastoInvalido', message: 'Ingresá un importe válido' },
    );
  });

  protected readonly enviando = signal(false);

  guardar(evento: Event): void {
    evento.preventDefault();

    const raiz = this.liquidacionForm();
    if (!raiz.valid()) {
      raiz.markAsTouched();
      return;
    }

    const valores = this.modelo();
    const monto = (importe: string): MontoRequest | undefined => {
      const numero = Number(importe);
      return importe.trim() !== '' && Number.isFinite(numero) && numero > 0
        ? { importe, moneda: valores.precioMoneda, tipoCambio: valores.precioTipoCambio }
        : undefined;
    };
    const precioUnitario: MontoRequest = {
      importe: valores.precioImporte,
      moneda: valores.precioMoneda,
      tipoCambio: valores.precioTipoCambio,
    };

    const solicitud = this.esTramo()
      ? this.loteCampaniaService.registrarTramo(this.venta().id, {
          fecha: valores.fechaLiquidacion,
          cantidad: valores.cantidad,
          precioUnitario,
          comision: monto(valores.comisionImporte),
          flete: monto(valores.fleteImporte),
          otrosGastos: monto(valores.otrosGastosImporte),
        } satisfies LiquidacionTramoRequest)
      : this.loteCampaniaService.liquidarVenta(this.venta().id, {
          precioUnitario,
          fechaLiquidacion: valores.fechaLiquidacion,
          comision: monto(valores.comisionImporte),
          flete: monto(valores.fleteImporte),
          otrosGastos: monto(valores.otrosGastosImporte),
        } satisfies LiquidacionRequest);

    this.enviando.set(true);
    solicitud.subscribe({
      next: (ventaActualizada) => {
        this.tipoCambioMemoria.guardar(valores.precioTipoCambio);
        this.aviso.mostrar('Liquidación cargada');
        this.guardado.emit(ventaActualizada);
      },
      error: (error: ErrorResponse) => {
        this.enviando.set(false);
        this.aviso.mostrar(error.message || 'No se pudo cargar la liquidación. Probá de nuevo.', 'error');
        if (error.code === 'LIQUIDACION_EXCEDE_PENDIENTE' || error.code === 'VENTA_YA_LIQUIDADA') {
          this.desactualizada.emit();
        }
      },
    });
  }
}
