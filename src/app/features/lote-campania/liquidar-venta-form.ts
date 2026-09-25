import { Component, computed, inject, input, output, signal, untracked } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormField, form, validate } from '@angular/forms/signals';
import { Modal } from '../../shared/ui/modal/modal';
import { CampoImporte } from '../../shared/ui/campo-importe/campo-importe';
import { ImportePipe } from '../../shared/pipes/importe.pipe';
import { AvisoService } from '../../shared/ui/aviso/aviso.service';
import { TipoCambioMemoriaService } from '../../shared/data/tipo-cambio-memoria.service';
import { LoteCampaniaService } from './lote-campania.service';
import type { ErrorResponse, LiquidacionRequest, Venta } from '../../models';

interface ModeloLiquidacionForm {
  precioImporte: string;
  precioMoneda: 'ARS' | 'USD';
  precioTipoCambio: string;
  fechaLiquidacion: string;
  comisionImporte: string;
  fleteImporte: string;
  otrosGastosImporte: string;
}

/**
 * Completa la liquidación de una venta en consignación pendiente
 * (docs/design-brief.md §6.5 y §10.2: "el productor tiene que poder ver de un vistazo
 * qué le deben liquidar y completar esa liquidación cuando llega el papel").
 *
 * `PATCH /api/ventas/{id}/liquidacion` (docs/plan-frontend.md slice 5, shape
 * confirmado por bisección): `precioUnitario` y `fechaLiquidacion` son obligatorios;
 * `comision`/`flete`/`otrosGastos` son opcionales, cada uno un `Monto` completo. Para
 * no pedirle al productor una moneda y un tipo de cambio distintos por cada gasto (la
 * comisión y el flete casi siempre se descuentan en la misma moneda que el precio),
 * el formulario usa **una sola moneda/TC compartida** para los cuatro importes — una
 * simplificación deliberada, no una limitación del backend (que sí acepta un `Monto`
 * independiente por campo).
 */
@Component({
  selector: 'app-liquidar-venta-form',
  imports: [Modal, FormField, CampoImporte, ImportePipe, DecimalPipe],
  templateUrl: './liquidar-venta-form.html',
  styleUrl: './liquidar-venta-form.scss',
})
export class LiquidarVentaForm {
  private readonly loteCampaniaService = inject(LoteCampaniaService);
  private readonly aviso = inject(AvisoService);
  private readonly tipoCambioMemoria = inject(TipoCambioMemoriaService);

  readonly venta = input.required<Venta>();
  readonly loteCampaniaTitulo = input<string>('');
  readonly guardado = output<void>();
  readonly cancelado = output<void>();

  protected readonly modelo = signal<ModeloLiquidacionForm>({
    precioImporte: '',
    precioMoneda: 'ARS',
    precioTipoCambio: untracked(this.tipoCambioMemoria.ultimo),
    fechaLiquidacion: new Date().toISOString().slice(0, 10),
    comisionImporte: '',
    fleteImporte: '',
    otrosGastosImporte: '',
  });

  protected readonly importeBruto = computed(() => {
    const m = this.modelo();
    const precio = Number(m.precioImporte);
    return Number.isFinite(precio) && precio > 0 ? precio * Number(this.venta().cantidad) : 0;
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
    const monto = (importe: string) => {
      const numero = Number(importe);
      return importe.trim() !== '' && Number.isFinite(numero) && numero > 0
        ? { importe, moneda: valores.precioMoneda, tipoCambio: valores.precioTipoCambio }
        : undefined;
    };

    const payload: LiquidacionRequest = {
      precioUnitario: {
        importe: valores.precioImporte,
        moneda: valores.precioMoneda,
        tipoCambio: valores.precioTipoCambio,
      },
      fechaLiquidacion: valores.fechaLiquidacion,
      comision: monto(valores.comisionImporte),
      flete: monto(valores.fleteImporte),
      otrosGastos: monto(valores.otrosGastosImporte),
    };

    this.enviando.set(true);
    this.loteCampaniaService.liquidarVenta(this.venta().id, payload).subscribe({
      next: () => {
        this.tipoCambioMemoria.guardar(valores.precioTipoCambio);
        this.aviso.mostrar('Liquidación cargada');
        this.guardado.emit();
      },
      error: (error: ErrorResponse) => {
        this.enviando.set(false);
        this.aviso.mostrar(error.message || 'No se pudo cargar la liquidación. Probá de nuevo.', 'error');
      },
    });
  }
}
