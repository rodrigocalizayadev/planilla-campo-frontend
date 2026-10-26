import { Component, computed, inject, input, output, signal, untracked } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormField, form, required, validate } from '@angular/forms/signals';
import { Modal } from '../../shared/ui/modal/modal';
import { CampoImporte } from '../../shared/ui/campo-importe/campo-importe';
import { ImportePipe } from '../../shared/pipes/importe.pipe';
import { AvisoService } from '../../shared/ui/aviso/aviso.service';
import { TipoCambioMemoriaService } from '../../shared/data/tipo-cambio-memoria.service';
import { calcularRepartoPorHa } from '../../shared/utils/prorrateo';
import { CostosIndirectosService } from './costos-indirectos.service';
import { hoyIso } from '../../shared/utils/fecha-local';
import type { CostoIndirectoRequest, ErrorResponse, LoteCampania, MontoRequest } from '../../models';

type Imputacion = 'PRORRATEAR' | 'DIRECTA';
type Criterio = 'POR_HA' | 'MANUAL';

interface ModeloCostoIndirectoForm {
  concepto: string;
  fecha: string;
  importe: string;
  moneda: 'ARS' | 'USD';
  tipoCambio: string;
  imputacion: Imputacion;
  loteCampaniaId: string;
  criterio: Criterio;
}

/**
 * Alta de costo indirecto (docs/plan-frontend.md slice 6, docs/reglas-calculo.md §4).
 * Shape confirmado por bisección directa contra el backend real (usuario ADMIN, ver
 * `costo-indirecto.model.ts`): `importe` es un `Monto` completo, `criterioProrrateo` es
 * obligatorio siempre (incluso imputando directo a un lote, caso en el que el backend
 * lo ignora), y `fecha` es obligatoria.
 *
 * Dos decisiones anidadas, como en el prototipo pero con el dominio completo
 * (docs/reglas-calculo.md §4.1, no solo el caso simple del prototipo):
 * 1. **Imputación**: a prorratear entre todos los lotes (default) o directo a un único
 *    lote-campaña.
 * 2. Si prorratea, **criterio**: por hectárea (automático, con vista previa en vivo que
 *    replica exacto la fórmula de cierre del backend — única excepción de CLAUDE.md
 *    regla 1: el reparto real que se persiste lo calcula y devuelve el propio POST) o
 *    manual (un importe por lote a cargo del usuario, con la suma en vivo). El backend
 *    valida server-side que las partes manuales sumen el importe total
 *    (`422 PARTES_NO_SUMAN`); la validación del formulario es solo para no hacer ese
 *    viaje de red en el caso común, igual que ya hace `VentaForm` con el stock.
 */
@Component({
  selector: 'app-costo-indirecto-form',
  imports: [Modal, FormField, CampoImporte, ImportePipe, DecimalPipe],
  templateUrl: './costo-indirecto-form.html',
  styleUrl: './costo-indirecto-form.scss',
})
export class CostoIndirectoForm {
  private readonly costosIndirectosService = inject(CostosIndirectosService);
  private readonly aviso = inject(AvisoService);
  private readonly tipoCambioMemoria = inject(TipoCambioMemoriaService);

  readonly campaniaId = input.required<number>();
  readonly lotes = input.required<LoteCampania[]>();
  readonly guardado = output<void>();
  readonly cancelado = output<void>();

  protected readonly modelo = signal<ModeloCostoIndirectoForm>({
    concepto: '',
    fecha: hoyIso(),
    importe: '',
    moneda: 'ARS',
    tipoCambio: untracked(this.tipoCambioMemoria.ultimo),
    imputacion: 'PRORRATEAR',
    loteCampaniaId: '',
    criterio: 'POR_HA',
  });

  // Un importe por lote-campaña, cargado a mano cuando el criterio es MANUAL. Aparte de
  // `modelo`/`form()` porque es una lista dinámica por lote (sin precedente de arrays en
  // Signal Forms en esta app todavía) — mismo espíritu que el campo suelto sin `form()`
  // que ya usa la edición inline de cotización en `Tablero`.
  protected readonly partesManual = signal<Record<number, string>>({});

  protected readonly sumaManual = computed(() =>
    Object.values(this.partesManual()).reduce((suma, valor) => suma + (Number(valor) || 0), 0),
  );

  protected readonly previewPorHa = computed(() => {
    const importe = Number(this.modelo().importe);
    const reparto = calcularRepartoPorHa(
      Number.isFinite(importe) ? importe : 0,
      this.lotes().map((lc) => ({ loteCampaniaId: lc.id, superficieSembradaHa: Number(lc.superficieSembradaHa) })),
    );
    return reparto.map((parte) => ({
      ...parte,
      lote: this.lotes().find((lc) => lc.id === parte.loteCampaniaId),
    }));
  });

  protected readonly sumaPreviewPorHa = computed(() =>
    this.previewPorHa().reduce((suma, parte) => suma + parte.importe, 0),
  );

  protected readonly costoIndirectoForm = form(this.modelo, (path) => {
    required(path.concepto, { message: 'Ingresá el concepto' });
    required(path.fecha, { message: 'Elegí la fecha' });
    validate(path.importe, ({ value }) => {
      const numero = Number(value());
      return Number.isFinite(numero) && numero > 0
        ? undefined
        : { kind: 'importeInvalido', message: 'Ingresá un importe mayor que cero' };
    });
    validate(path.tipoCambio, ({ value }) => {
      const numero = Number(value());
      return Number.isFinite(numero) && numero > 0
        ? undefined
        : { kind: 'tipoCambioInvalido', message: 'Ingresá el tipo de cambio' };
    });
    validate(path.loteCampaniaId, ({ value, valueOf }) => {
      if (valueOf(path.imputacion) !== 'DIRECTA') {
        return undefined;
      }
      return value() ? undefined : { kind: 'loteRequerido', message: 'Elegí el lote-campaña' };
    });
    validate(path.importe, ({ value, valueOf }) => {
      if (valueOf(path.imputacion) !== 'PRORRATEAR' || valueOf(path.criterio) !== 'MANUAL') {
        return undefined;
      }
      const numero = Number(value());
      const diferencia = Math.round((numero - this.sumaManual()) * 100) / 100;
      return diferencia === 0
        ? undefined
        : { kind: 'partesNoSuman', message: 'Las partes cargadas por lote no suman el importe total' };
    });
  });

  protected readonly enviando = signal(false);

  elegirImputacion(imputacion: Imputacion): void {
    this.modelo.update((actual) => ({ ...actual, imputacion }));
  }

  elegirCriterio(criterio: Criterio): void {
    this.modelo.update((actual) => ({ ...actual, criterio }));
  }

  actualizarParte(loteCampaniaId: number, valor: string): void {
    this.partesManual.update((actual) => ({ ...actual, [loteCampaniaId]: valor }));
  }

  guardar(evento: Event): void {
    evento.preventDefault();

    const raiz = this.costoIndirectoForm();
    if (!raiz.valid()) {
      raiz.markAsTouched();
      return;
    }

    const valores = this.modelo();
    const importeBase: MontoRequest = {
      importe: valores.importe,
      moneda: valores.moneda,
      tipoCambio: valores.tipoCambio,
    };

    const payload: CostoIndirectoRequest = {
      concepto: valores.concepto.trim(),
      fecha: valores.fecha,
      importe: importeBase,
      criterioProrrateo: valores.imputacion === 'DIRECTA' ? 'POR_HA' : valores.criterio,
      ...(valores.imputacion === 'DIRECTA' ? { loteCampaniaId: Number(valores.loteCampaniaId) } : {}),
      ...(valores.imputacion === 'PRORRATEAR' && valores.criterio === 'MANUAL'
        ? {
            partes: Object.entries(this.partesManual())
              .filter(([, valor]) => Number(valor) > 0)
              .map(([loteCampaniaId, valor]) => ({
                loteCampaniaId: Number(loteCampaniaId),
                importe: { ...importeBase, importe: valor },
              })),
          }
        : {}),
    };

    this.enviando.set(true);
    this.costosIndirectosService.crear(this.campaniaId(), payload).subscribe({
      next: () => {
        this.tipoCambioMemoria.guardar(valores.tipoCambio);
        this.aviso.mostrar(`${valores.concepto.trim()} cargado`);
        this.guardado.emit();
      },
      error: (error: ErrorResponse) => {
        this.enviando.set(false);
        this.aviso.mostrar(error.message || 'No se pudo cargar el costo indirecto. Probá de nuevo.', 'error');
      },
    });
  }
}
