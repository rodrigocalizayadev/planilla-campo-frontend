import { Component, computed, inject, input, output, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { EnumsService } from '../../core/enums/enums.service';
import { MonedaVistaService } from '../../core/moneda/moneda-vista.service';
import { FechaPipe } from '../../shared/pipes/fecha.pipe';
import { ImportePipe } from '../../shared/pipes/importe.pipe';
import { AvisoService } from '../../shared/ui/aviso/aviso.service';
import { ConfirmarAccion } from '../../shared/ui/confirmar-accion/confirmar-accion';
import { Modal } from '../../shared/ui/modal/modal';
import { mantenerUltimoValor } from '../../shared/data/mantener-ultimo-valor';
import { ordenarPor } from '../../shared/utils/listado-cliente';
import { CobroForm } from './cobro-form';
import { LiquidarVentaForm } from './liquidar-venta-form';
import { LoteCampaniaService } from './lote-campania.service';
import type { Cobro, ErrorResponse, LiquidacionTramo, PaginaResponse, Venta } from '../../models';

type Formulario = 'cobro' | 'tramo' | 'todo';

/**
 * Modal "Detalle de venta": muestra cómo se va pagando una venta y es el lugar para
 * registrar sus pagos. Ramifica por **`venta.modalidad`**, nunca por cultivo:
 *
 * - `PRECIO_CERRADO` se paga con **cobros** en pesos: estado de cobro, cobrado, saldo y
 *   la lista de cobros ("Registrar cobro" deshabilitado si ya está `COBRADA`).
 * - `CONSIGNACION` se paga con **tramos de liquidación**: estado, liquidado, pendiente y
 *   la lista de tramos. "Registrar liquidación" liquida una parte; "Liquidar todo lo
 *   pendiente" es el atajo del `PATCH`.
 *
 * Todas las escrituras (alta y baja de cobros y tramos) devuelven la venta actualizada:
 * se re-emite en `ventaActualizada` y quien hospeda el modal la usa para refrescar la
 * pantalla sin volver a pedirla. Los pagos siguen habilitados con la campaña `CERRADA`
 * porque llegan después del cierre; editar y eliminar la venta, que viven en el panel de
 * ventas, no. `refrescar` avisa que el servidor rechazó algo por una carrera entre
 * usuarios y hay que volver a pedir las ventas.
 */
@Component({
  selector: 'app-venta-detalle',
  imports: [Modal, ConfirmarAccion, CobroForm, LiquidarVentaForm, DecimalPipe, ImportePipe, FechaPipe],
  templateUrl: './venta-detalle.html',
  styleUrl: './venta-detalle.scss',
})
export class VentaDetalle {
  private readonly loteCampaniaService = inject(LoteCampaniaService);
  private readonly aviso = inject(AvisoService);
  private readonly enums = inject(EnumsService);
  protected readonly monedaVista = inject(MonedaVistaService).moneda;

  readonly venta = input.required<Venta>();
  readonly loteCampaniaTitulo = input<string>('');
  readonly cerrado = output<void>();
  readonly ventaActualizada = output<Venta>();
  readonly refrescar = output<void>();

  protected readonly esPrecioCerrado = computed(() => this.venta().modalidad === 'PRECIO_CERRADO');

  protected readonly cobrada = computed(() => this.venta().estadoCobro === 'COBRADA');
  protected readonly liquidada = computed(() => this.venta().estado === 'LIQUIDADA');
  protected readonly pendiente = computed(() => this.venta().cantidadPendiente ?? this.venta().cantidad);
  protected readonly tienePagos = computed(
    () => Number(this.venta().cobradoArs) > 0 || Number(this.venta().cantidadLiquidada) > 0,
  );

  // Los recursos leen `ventaId` y no `venta()`: la venta se reemplaza por una versión
  // nueva con cada cobro o tramo, y eso no tiene que volver a pedir la lista por sí solo
  // (se recarga explícitamente cuando cambia su contenido).
  private readonly ventaId = computed(() => this.venta().id);

  // Una sola lista según la modalidad; la otra no se pide (el backend responde
  // `MODALIDAD_INVALIDA`). `size=200` como el resto de los paneles del lote.
  private readonly cobrosRecurso = httpResource<PaginaResponse<Cobro>>(() =>
    this.esPrecioCerrado() ? `${environment.apiBaseUrl}/ventas/${this.ventaId()}/cobros?size=200` : undefined,
  );
  private readonly ultimaPaginaCobros = mantenerUltimoValor(this.cobrosRecurso.value);
  protected readonly cobros = computed(() =>
    ordenarPor(this.ultimaPaginaCobros()?.content ?? [], (cobro) => cobro.fecha, 'desc'),
  );

  private readonly tramosRecurso = httpResource<PaginaResponse<LiquidacionTramo>>(() =>
    this.esPrecioCerrado()
      ? undefined
      : `${environment.apiBaseUrl}/ventas/${this.ventaId()}/liquidaciones?size=200`,
  );
  private readonly ultimaPaginaTramos = mantenerUltimoValor(this.tramosRecurso.value);
  protected readonly tramos = computed(() =>
    ordenarPor(this.ultimaPaginaTramos()?.content ?? [], (tramo) => tramo.fecha, 'desc'),
  );

  protected readonly formulario = signal<Formulario | null>(null);
  protected readonly cobroAQuitar = signal<Cobro | null>(null);
  protected readonly tramoAQuitar = signal<LiquidacionTramo | null>(null);
  protected readonly quitando = signal(false);

  etiquetaEstadoVenta(estado: string): string {
    return this.enums.etiqueta('estadoVenta', estado);
  }

  etiquetaEstadoCobro(estado: string): string {
    return this.enums.etiqueta('estadoCobro', estado);
  }

  importeTramo(tramo: LiquidacionTramo): string | undefined {
    return this.monedaVista() === 'ARS' ? tramo.importeNeto.importeArs : tramo.importeNeto.importeUsd;
  }

  abrirFormulario(formulario: Formulario): void {
    this.formulario.set(formulario);
  }

  cerrarFormulario(): void {
    this.formulario.set(null);
  }

  onPagoGuardado(venta: Venta): void {
    this.formulario.set(null);
    this.recargarLista();
    this.ventaActualizada.emit(venta);
  }

  // El servidor dijo que la venta cambió por debajo (otro usuario cobró o liquidó):
  // se vuelve a pedir la lista y la venta; el formulario sigue abierto con los datos
  // nuevos para que el usuario corrija.
  onDesactualizada(): void {
    this.recargarLista();
    this.refrescar.emit();
  }

  pedirQuitarCobro(cobro: Cobro): void {
    this.cobroAQuitar.set(cobro);
  }

  pedirQuitarTramo(tramo: LiquidacionTramo): void {
    this.tramoAQuitar.set(tramo);
  }

  cancelarQuitar(): void {
    this.cobroAQuitar.set(null);
    this.tramoAQuitar.set(null);
  }

  confirmarQuitarCobro(): void {
    const cobro = this.cobroAQuitar();
    if (!cobro) {
      return;
    }
    this.quitar(this.loteCampaniaService.eliminarCobro(cobro.id), 'Cobro eliminado', 'COBRO_NO_ENCONTRADO');
  }

  confirmarQuitarTramo(): void {
    const tramo = this.tramoAQuitar();
    if (!tramo) {
      return;
    }
    this.quitar(
      this.loteCampaniaService.eliminarTramo(tramo.id),
      'Liquidación eliminada',
      'LIQUIDACION_NO_ENCONTRADA',
    );
  }

  private quitar(
    solicitud: ReturnType<LoteCampaniaService['eliminarCobro']>,
    mensajeExito: string,
    codigoNoEncontrado: string,
  ): void {
    this.cancelarQuitar();
    this.quitando.set(true);
    solicitud.subscribe({
      next: (venta) => {
        this.quitando.set(false);
        this.aviso.mostrar(mensajeExito);
        this.recargarLista();
        this.ventaActualizada.emit(venta);
      },
      error: (error: ErrorResponse) => {
        this.quitando.set(false);
        this.aviso.mostrar(error.message || 'No se pudo eliminar. Probá de nuevo.', 'error');
        // Otro usuario ya lo había borrado: la lista y la venta que se ven están viejas.
        if (error.code === codigoNoEncontrado) {
          this.onDesactualizada();
        }
      },
    });
  }

  private recargarLista(): void {
    if (this.esPrecioCerrado()) {
      this.cobrosRecurso.reload();
    } else {
      this.tramosRecurso.reload();
    }
  }
}
