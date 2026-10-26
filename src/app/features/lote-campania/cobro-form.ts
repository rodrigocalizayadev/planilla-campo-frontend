import { Component, inject, input, output, signal, untracked } from '@angular/core';
import { FormField, form, validate } from '@angular/forms/signals';
import { Modal } from '../../shared/ui/modal/modal';
import { CampoImporte } from '../../shared/ui/campo-importe/campo-importe';
import { ImportePipe } from '../../shared/pipes/importe.pipe';
import { AvisoService } from '../../shared/ui/aviso/aviso.service';
import { TipoCambioMemoriaService } from '../../shared/data/tipo-cambio-memoria.service';
import { hoyIso } from '../../shared/utils/fecha-local';
import { LoteCampaniaService } from './lote-campania.service';
import type { CobroRequest, ErrorResponse, Venta } from '../../models';

interface ModeloCobroForm {
  fecha: string;
  importe: string;
  tipoCambio: string;
  comentarios: string;
}

/**
 * Registra un cobro de una venta a precio cerrado (`POST /api/ventas/{id}/cobros`).
 * El cobro es siempre en pesos (`MONEDA_COBRO_INVALIDA` si no): no hay selector de
 * moneda, pero el `tipoCambio` del día se manda igual, como en los demás movimientos
 * (el backend calcula con él el equivalente en dólares). `importe` y `tipoCambio`
 * viajan como string, tal cual salen del formulario (CLAUDE.md regla 1).
 *
 * El tope contra el saldo es una ayuda de UX: el backend es la fuente de verdad
 * (`COBRO_EXCEDE_SALDO`). Si dos usuarios cobran a la vez y el servidor lo rechaza, se
 * avisa con `desactualizada` para que la pantalla refresque la venta.
 */
@Component({
  selector: 'app-cobro-form',
  imports: [Modal, FormField, CampoImporte, ImportePipe],
  templateUrl: './cobro-form.html',
  styleUrl: './cobro-form.scss',
})
export class CobroForm {
  private readonly loteCampaniaService = inject(LoteCampaniaService);
  private readonly aviso = inject(AvisoService);
  private readonly tipoCambioMemoria = inject(TipoCambioMemoriaService);
  private readonly formatoImporte = new ImportePipe();

  readonly venta = input.required<Venta>();
  readonly guardado = output<Venta>();
  readonly cancelado = output<void>();
  /** El servidor rechazó el cobro por una carrera (`COBRO_EXCEDE_SALDO`): la venta que
   * se ve ya no es la vigente. */
  readonly desactualizada = output<void>();

  protected readonly modelo = signal<ModeloCobroForm>({
    fecha: hoyIso(),
    importe: '',
    tipoCambio: untracked(this.tipoCambioMemoria.ultimo),
    comentarios: '',
  });

  protected readonly cobroForm = form(this.modelo, (path) => {
    validate(path.importe, ({ value }) => {
      const numero = Number(value());
      if (!Number.isFinite(numero) || numero <= 0) {
        return { kind: 'importeInvalido', message: 'Ingresá un importe mayor que cero' };
      }
      const saldo = Number(this.venta().saldoArs);
      if (Number.isFinite(saldo) && numero > saldo) {
        return {
          kind: 'excedeSaldo',
          message: `El cobro supera el saldo pendiente (${this.formatoImporte.transform(this.venta().saldoArs)})`,
        };
      }
      return undefined;
    });
    validate(path.tipoCambio, ({ value }) => {
      const numero = Number(value());
      return Number.isFinite(numero) && numero > 0
        ? undefined
        : { kind: 'tipoCambioInvalido', message: 'Ingresá el tipo de cambio' };
    });
    validate(path.fecha, ({ value }) =>
      value() ? undefined : { kind: 'fechaRequerida', message: 'Elegí la fecha del cobro' },
    );
  });

  protected readonly enviando = signal(false);

  guardar(evento: Event): void {
    evento.preventDefault();

    const raiz = this.cobroForm();
    if (!raiz.valid()) {
      raiz.markAsTouched();
      return;
    }

    const valores = this.modelo();
    const comentarios = valores.comentarios.trim();
    const payload: CobroRequest = {
      fecha: valores.fecha,
      monto: { importe: valores.importe, moneda: 'ARS', tipoCambio: valores.tipoCambio },
      ...(comentarios ? { comentarios } : {}),
    };

    this.enviando.set(true);
    this.loteCampaniaService.registrarCobro(this.venta().id, payload).subscribe({
      next: (ventaActualizada) => {
        this.tipoCambioMemoria.guardar(valores.tipoCambio);
        this.aviso.mostrar('Cobro registrado');
        this.guardado.emit(ventaActualizada);
      },
      error: (error: ErrorResponse) => {
        this.enviando.set(false);
        this.aviso.mostrar(error.message || 'No se pudo registrar el cobro. Probá de nuevo.', 'error');
        if (error.code === 'COBRO_EXCEDE_SALDO') {
          this.desactualizada.emit();
        }
      },
    });
  }
}
