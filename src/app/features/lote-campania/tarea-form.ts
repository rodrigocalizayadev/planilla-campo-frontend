import { Component, computed, inject, input, output, signal, untracked } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormField, form, required, validate } from '@angular/forms/signals';
import { Modal } from '../../shared/ui/modal/modal';
import { CampoCantidad } from '../../shared/ui/campo-cantidad/campo-cantidad';
import { CampoImporte } from '../../shared/ui/campo-importe/campo-importe';
import { ImportePipe } from '../../shared/pipes/importe.pipe';
import { AvisoService } from '../../shared/ui/aviso/aviso.service';
import { EnumsService } from '../../core/enums/enums.service';
import { TipoCambioMemoriaService } from '../../shared/data/tipo-cambio-memoria.service';
import { LoteCampaniaService } from './lote-campania.service';
import { hoyIso } from '../../shared/utils/fecha-local';
import type { ErrorResponse, TareaRequest } from '../../models';

type ModoCosto = 'JORNAL' | 'DESTAJO' | 'POR_HA' | 'TOTAL';

interface ModeloTareaForm {
  tipo: string;
  ejecutor: string;
  modoCosto: ModoCosto;
  fecha: string;
  cantidad: string;
  valorImporte: string;
  valorMoneda: 'ARS' | 'USD';
  valorTipoCambio: string;
}

const PIDE_CANTIDAD: ModoCosto[] = ['JORNAL', 'DESTAJO'];

const ETIQUETAS_CANTIDAD: Record<ModoCosto, string> = {
  JORNAL: 'Cantidad de jornales',
  DESTAJO: 'Cantidad de unidades',
  POR_HA: '',
  TOTAL: '',
};

const ETIQUETAS_VALOR: Record<ModoCosto, string> = {
  JORNAL: 'Valor del jornal',
  DESTAJO: 'Valor por unidad',
  POR_HA: 'Valor por hectárea',
  TOTAL: 'Monto total',
};

/**
 * Formulario de tarea, con las cuatro modalidades de pago (docs/design-brief.md §6.3,
 * docs/reglas-calculo.md §3). `valorUnitario` es un `Monto` completo — confirmado por
 * bisección contra el backend real (docs/plan-frontend.md slice 4): la mano de obra
 * también puede pagarse en dólares, mismo value object que insumo, con `tipoCambio`
 * siempre obligatorio (mismo patrón que `InsumoForm`, TC precargado con
 * `TipoCambioMemoriaService`).
 *
 * Sin campo de nota: confirmado que el backend no lo persiste (ver `tarea.model.ts`).
 *
 * El total en vivo del pie es la única excepción de CLAUDE.md regla 1: previsualiza
 * el cálculo que va a hacer el backend (`docs/reglas-calculo.md` §3) con los valores
 * que el usuario todavía está tipeando, pero el importe que se muestra después de
 * guardar es el que devuelve el `POST` (`costoTotal`), no este cálculo local.
 */
@Component({
  selector: 'app-tarea-form',
  imports: [Modal, FormField, CampoCantidad, CampoImporte, ImportePipe, DecimalPipe],
  templateUrl: './tarea-form.html',
  styleUrl: './tarea-form.scss',
})
export class TareaForm {
  private readonly loteCampaniaService = inject(LoteCampaniaService);
  private readonly aviso = inject(AvisoService);
  private readonly tipoCambioMemoria = inject(TipoCambioMemoriaService);
  protected readonly enums = inject(EnumsService);

  readonly loteCampaniaId = input.required<number>();
  readonly loteCampaniaTitulo = input<string>('');
  readonly superficieSembradaHa = input.required<string>();
  readonly guardado = output<void>();
  readonly cancelado = output<void>();

  protected readonly modelo = signal<ModeloTareaForm>({
    tipo: '',
    ejecutor: '',
    modoCosto: 'JORNAL',
    fecha: hoyIso(),
    cantidad: '',
    valorImporte: '',
    valorMoneda: 'ARS',
    valorTipoCambio: untracked(this.tipoCambioMemoria.ultimo),
  });

  protected readonly pideCantidad = computed(() => PIDE_CANTIDAD.includes(this.modelo().modoCosto));
  protected readonly etiquetaCantidad = computed(() => ETIQUETAS_CANTIDAD[this.modelo().modoCosto]);
  protected readonly etiquetaValor = computed(() => ETIQUETAS_VALOR[this.modelo().modoCosto]);

  protected readonly totalEnVivo = computed(() => {
    const m = this.modelo();
    const valor = Number(m.valorImporte);
    if (!Number.isFinite(valor) || valor <= 0) {
      return 0;
    }
    if (m.modoCosto === 'TOTAL') {
      return valor;
    }
    if (m.modoCosto === 'POR_HA') {
      return valor * Number(this.superficieSembradaHa());
    }
    const cantidad = Number(m.cantidad);
    return Number.isFinite(cantidad) && cantidad > 0 ? valor * cantidad : 0;
  });

  protected readonly tareaForm = form(this.modelo, (path) => {
    required(path.tipo, { message: 'Elegí qué tarea es' });
    required(path.ejecutor, { message: 'Elegí quién la hizo' });
    validate(path.valorImporte, ({ value }) => {
      const numero = Number(value());
      return Number.isFinite(numero) && numero > 0
        ? undefined
        : { kind: 'valorInvalido', message: 'Ingresá un importe mayor que cero' };
    });
    validate(path.valorTipoCambio, ({ value }) => {
      const numero = Number(value());
      return Number.isFinite(numero) && numero > 0
        ? undefined
        : { kind: 'tipoCambioInvalido', message: 'Ingresá el tipo de cambio' };
    });
    validate(path.cantidad, ({ value, valueOf }) => {
      if (!PIDE_CANTIDAD.includes(valueOf(path.modoCosto))) {
        return undefined;
      }
      const numero = Number(value());
      return Number.isFinite(numero) && numero > 0
        ? undefined
        : { kind: 'cantidadInvalida', message: 'Ingresá una cantidad mayor que cero' };
    });
  });

  protected readonly enviando = signal(false);

  elegirModo(modo: ModoCosto): void {
    this.modelo.update((actual) => ({ ...actual, modoCosto: modo }));
  }

  guardar(evento: Event): void {
    evento.preventDefault();

    const raiz = this.tareaForm();
    if (!raiz.valid()) {
      raiz.markAsTouched();
      return;
    }

    const valores = this.modelo();
    const payload: TareaRequest = {
      tipo: valores.tipo,
      fecha: valores.fecha,
      ejecutor: valores.ejecutor,
      modoCosto: valores.modoCosto,
      cantidad: PIDE_CANTIDAD.includes(valores.modoCosto) ? valores.cantidad : null,
      valorUnitario: {
        importe: valores.valorImporte,
        moneda: valores.valorMoneda,
        tipoCambio: valores.valorTipoCambio,
      },
    };

    this.enviando.set(true);
    this.loteCampaniaService.crearTarea(this.loteCampaniaId(), payload).subscribe({
      next: () => {
        this.tipoCambioMemoria.guardar(valores.valorTipoCambio);
        this.aviso.mostrar(`${this.enums.etiqueta('tipoTarea', valores.tipo)} cargada`);
        this.guardado.emit();
      },
      error: (error: ErrorResponse) => {
        this.enviando.set(false);
        this.aviso.mostrar(error.message || 'No se pudo cargar la tarea. Probá de nuevo.', 'error');
      },
    });
  }
}
