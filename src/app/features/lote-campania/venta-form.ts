import { Component, computed, inject, input, linkedSignal, output, signal, untracked } from '@angular/core';
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
import { hoyIso } from '../../shared/utils/fecha-local';
import type { Comprador, ErrorResponse, PaginaResponse, Venta, VentaRequest } from '../../models';

type Modalidad = 'PRECIO_CERRADO' | 'CONSIGNACION';

interface ModeloVentaForm {
  compradorId: string;
  fechaEntrega: string;
  calidad: string;
  cantidad: string;
  modalidad: Modalidad;
  precioImporte: string;
  precioMoneda: 'ARS' | 'USD';
  precioTipoCambio: string;
}

/**
 * Registra una venta del lote-campaña (docs/design-brief.md §6.5 y §7 pantalla 6,
 * docs/dominio.md §10). Las dos modalidades comparten entidad y formulario: a precio
 * cerrado se carga con precio y la venta nace `LIQUIDADA`; en consignación se entrega
 * sin precio (`ENTREGADA`) y se completa después con `LiquidarVentaForm`.
 *
 * Shape confirmado por bisección directa contra el backend real
 * (docs/plan-frontend.md slice 5): el campo es `modalidad` (no `modalidadVenta`) y la
 * fecha es `fechaEntrega` (no `fecha`). `precioUnitario` es un `Monto` completo, mismo
 * patrón que `AplicacionForm`/`TareaForm`, y solo se manda en `PRECIO_CERRADO`.
 *
 * Solo permite elegir `PRIMERA`/`SEGUNDA` (docs/dominio.md §9: el descarte no se
 * vende, el backend lo rechaza con `422 CALIDAD_DESCARTE_NO_VENDIBLE`) y valida en el
 * cliente que la cantidad no supere el stock disponible de la calidad elegida
 * (`disponiblePorCalidad`, calculado por `LoteCampaniaDetalle` a partir de cosecha
 * menos ventas ya cargadas) — mejor UX a pie de lote que esperar el `422
 * STOCK_INSUFICIENTE` del servidor, que sigue siendo la validación final.
 *
 * **Edición** (sumada cuando el backend agregó `PUT /api/ventas/{id}`,
 * `docs/resumen-slices.md` slice 5 segunda vuelta): `venta` precarga el formulario con
 * una venta `ENTREGADA` existente — el backend solo permite editar ese estado, nunca
 * una `LIQUIDADA` (`422 VENTA_YA_LIQUIDADA`), así que `LoteCampaniaDetalle` únicamente
 * ofrece "Editar" en filas `ENTREGADA`. El selector de modalidad se oculta en edición y
 * queda fijo en `CONSIGNACION`: el backend acepta cambiar a `PRECIO_CERRADO` en el
 * mismo `PUT` (liquida la venta como efecto colateral), pero eso rompería el flujo en
 * dos pasos que ya existe (`LiquidarVentaForm`) — para liquidar sigue siendo el único
 * camino. El stock disponible de la calidad de la venta que se edita se ajusta sumando
 * de vuelta su propia cantidad actual (mismo criterio que aplica el backend al
 * revalidar en el `PUT`), para no contarla dos veces contra sí misma.
 */
@Component({
  selector: 'app-venta-form',
  imports: [Modal, FormField, CampoCantidad, CampoImporte, ImportePipe],
  templateUrl: './venta-form.html',
  styleUrl: './venta-form.scss',
})
export class VentaForm {
  private readonly loteCampaniaService = inject(LoteCampaniaService);
  private readonly aviso = inject(AvisoService);
  private readonly tipoCambioMemoria = inject(TipoCambioMemoriaService);
  protected readonly enums = inject(EnumsService);

  readonly loteCampaniaId = input.required<number>();
  readonly loteCampaniaTitulo = input<string>('');
  readonly etiquetaUnidadPlural = input<string>('unidades');
  readonly disponiblePorCalidad = input<Record<string, number>>({});
  /** Venta ENTREGADA a editar. `null` = alta nueva. */
  readonly venta = input<Venta | null>(null);
  readonly guardado = output<void>();
  readonly cancelado = output<void>();

  protected readonly editando = computed(() => this.venta() !== null);

  private readonly compradoresRecurso = httpResource<PaginaResponse<Comprador>>(
    () => `${environment.apiBaseUrl}/compradores?activo=true&size=200`,
  );
  protected readonly compradores = computed(() => this.compradoresRecurso.value()?.content ?? []);

  // El descarte no se vende (docs/dominio.md §9): ni siquiera se ofrece como opción.
  protected readonly calidadesVendibles = computed(() =>
    this.enums.opciones('calidad').filter((opcion) => opcion.valor !== 'DESCARTE'),
  );

  protected readonly modelo = linkedSignal<ModeloVentaForm>(() => {
    const v = this.venta();
    if (v) {
      return {
        compradorId: String(v.compradorId),
        fechaEntrega: v.fechaEntrega,
        calidad: v.calidad,
        cantidad: v.cantidad,
        modalidad: 'CONSIGNACION',
        precioImporte: '',
        precioMoneda: 'ARS',
        precioTipoCambio: untracked(this.tipoCambioMemoria.ultimo),
      };
    }
    return {
      compradorId: '',
      fechaEntrega: hoyIso(),
      calidad: '',
      cantidad: '',
      modalidad: 'PRECIO_CERRADO',
      precioImporte: '',
      precioMoneda: 'ARS',
      precioTipoCambio: untracked(this.tipoCambioMemoria.ultimo),
    };
  });

  protected readonly esPrecioCerrado = computed(() => this.modelo().modalidad === 'PRECIO_CERRADO');

  // Ajusta el disponible sumando de vuelta la cantidad actual de la venta que se está
  // editando (para su propia calidad): si no, se contaría dos veces contra sí misma —
  // mismo criterio que aplica el backend al revalidar en el PUT.
  protected readonly disponibleAjustado = computed(() => {
    const base = this.disponiblePorCalidad();
    const v = this.venta();
    if (!v) {
      return base;
    }
    return { ...base, [v.calidad]: (base[v.calidad] ?? 0) + Number(v.cantidad) };
  });

  protected readonly disponibleCalidadElegida = computed(
    () => this.disponibleAjustado()[this.modelo().calidad] ?? null,
  );

  protected readonly totalEnVivo = computed(() => {
    if (!this.esPrecioCerrado()) {
      return 0;
    }
    const m = this.modelo();
    const cantidad = Number(m.cantidad);
    const precio = Number(m.precioImporte);
    return Number.isFinite(cantidad) && Number.isFinite(precio) && cantidad > 0 && precio > 0
      ? cantidad * precio
      : 0;
  });

  protected readonly ventaForm = form(this.modelo, (path) => {
    required(path.compradorId, { message: 'Elegí un comprador' });
    required(path.calidad, { message: 'Elegí la calidad' });
    validate(path.cantidad, ({ value, valueOf }) => {
      const numero = Number(value());
      if (!Number.isFinite(numero) || numero <= 0) {
        return { kind: 'cantidadInvalida', message: 'Ingresá una cantidad mayor que cero' };
      }
      const calidad = valueOf(path.calidad);
      const disponible = this.disponibleAjustado()[calidad];
      if (calidad && disponible != null && numero > disponible) {
        return {
          kind: 'stockInsuficiente',
          message: `No hay tanto stock: quedan ${disponible} ${this.etiquetaUnidadPlural()} de esta calidad`,
        };
      }
      return undefined;
    });
    validate(path.precioImporte, ({ value, valueOf }) => {
      if (valueOf(path.modalidad) !== 'PRECIO_CERRADO') {
        return undefined;
      }
      const numero = Number(value());
      return Number.isFinite(numero) && numero > 0
        ? undefined
        : { kind: 'precioInvalido', message: 'Ingresá un precio mayor que cero' };
    });
    validate(path.precioTipoCambio, ({ value, valueOf }) => {
      if (valueOf(path.modalidad) !== 'PRECIO_CERRADO') {
        return undefined;
      }
      const numero = Number(value());
      return Number.isFinite(numero) && numero > 0
        ? undefined
        : { kind: 'tipoCambioInvalido', message: 'Ingresá el tipo de cambio' };
    });
  });

  protected readonly enviando = signal(false);

  elegirModalidad(modalidad: Modalidad): void {
    this.modelo.update((actual) => ({ ...actual, modalidad }));
  }

  guardar(evento: Event): void {
    evento.preventDefault();

    const raiz = this.ventaForm();
    if (!raiz.valid()) {
      raiz.markAsTouched();
      return;
    }

    const valores = this.modelo();
    const payload: VentaRequest = {
      compradorId: Number(valores.compradorId),
      fechaEntrega: valores.fechaEntrega,
      calidad: valores.calidad,
      cantidad: valores.cantidad,
      modalidad: valores.modalidad,
      ...(valores.modalidad === 'PRECIO_CERRADO'
        ? {
            precioUnitario: {
              importe: valores.precioImporte,
              moneda: valores.precioMoneda,
              tipoCambio: valores.precioTipoCambio,
            },
          }
        : {}),
    };

    const ventaEditando = this.venta();
    const solicitud = ventaEditando
      ? this.loteCampaniaService.actualizarVenta(ventaEditando.id, payload)
      : this.loteCampaniaService.crearVenta(this.loteCampaniaId(), payload);

    this.enviando.set(true);
    solicitud.subscribe({
      next: () => {
        if (valores.modalidad === 'PRECIO_CERRADO') {
          this.tipoCambioMemoria.guardar(valores.precioTipoCambio);
        }
        this.aviso.mostrar(
          ventaEditando ? 'Venta actualizada' : valores.modalidad === 'PRECIO_CERRADO' ? 'Venta cargada' : 'Entrega registrada',
        );
        this.guardado.emit();
      },
      error: (error: ErrorResponse) => {
        this.enviando.set(false);
        this.aviso.mostrar(error.message || 'No se pudo guardar la venta. Probá de nuevo.', 'error');
      },
    });
  }
}
