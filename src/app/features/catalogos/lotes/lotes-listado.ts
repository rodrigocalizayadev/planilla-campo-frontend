import { Component, computed, effect, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { LoteForm } from './lote-form';
import { LoteService } from './lote.service';
import { AvisoService } from '../../../shared/ui/aviso/aviso.service';
import { ConfirmarAccion } from '../../../shared/ui/confirmar-accion/confirmar-accion';
import { Buscador } from '../../../shared/ui/buscador/buscador';
import { ControlOrden, type OpcionOrden } from '../../../shared/ui/control-orden/control-orden';
import { Paginador } from '../../../shared/ui/paginador/paginador';
import { mantenerUltimoValor } from '../../../shared/data/mantener-ultimo-valor';
import { filtrarPorTexto } from '../../../shared/utils/listado-cliente';
import type { ErrorResponse, Lote, PaginaResponse } from '../../../models';

const OPCIONES_ORDEN: OpcionOrden[] = [
  { valor: 'nombre', etiqueta: 'Nombre' },
  { valor: 'superficieHa', etiqueta: 'Superficie' },
];
const TAMANIO_PAGINA = 20;
// Mapea el valor de la UI al nombre de campo real que espera el backend en `sort=` —
// acá coinciden porque son campos simples, pero no siempre es así (ver insumos/cultivos).
const CAMPO_ORDEN_BACKEND: Record<string, string> = {
  nombre: 'nombre',
  superficieHa: 'superficieHa',
};

/**
 * Catálogo de lotes (docs/plan-frontend.md slice 2). Patrón de referencia que repiten
 * cultivos, insumos y compradores: httpResource reactivo al toggle "ver dados de baja",
 * fila completa clickeable que abre el formulario en modo edición dentro de <app-modal>.
 * Dar de baja/reactivar es una acción aparte, en la fila del listado (no en el modal de
 * edición): dar de baja pide confirmación por ser difícil de notar si se toca por error;
 * reactivar no, porque es una acción de bajo riesgo y fácilmente reversible.
 *
 * Paginado real contra el backend (`page`/`size`/`sort`, verificado que Spring Data
 * los aplica de verdad en este endpoint — a diferencia del feed de movimientos de
 * lote-campania-detalle.ts). La búsqueda de texto sigue resolviéndose en el cliente,
 * pero ahora solo ve la página cargada (~20 filas), no el catálogo completo: no hay
 * filtro de texto en el backend todavía.
 */
@Component({
  selector: 'app-lotes-listado',
  imports: [DecimalPipe, LoteForm, ConfirmarAccion, Buscador, ControlOrden, Paginador],
  templateUrl: './lotes-listado.html',
  styleUrl: './lotes-listado.scss',
})
export class LotesListado {
  private readonly loteService = inject(LoteService);
  private readonly aviso = inject(AvisoService);

  protected readonly verBaja = signal(false);
  protected readonly modalAbierto = signal(false);
  protected readonly loteEditando = signal<Lote | null>(null);
  protected readonly confirmandoBaja = signal<Lote | null>(null);

  protected readonly opcionesOrden = OPCIONES_ORDEN;
  protected readonly textoBusqueda = signal('');
  protected readonly ordenCampo = signal<string | null>(null);
  protected readonly ordenDireccion = signal<'asc' | 'desc'>('asc');
  protected readonly paginaSolicitada = signal(0);

  // Cambiar de campo/dirección de orden re-pagina desde el principio: quedarse en la
  // página 6 de un orden nuevo no tiene sentido. `ControlOrden` es two-way bind directo
  // a estos signals, así que no hay un handler propio donde enganchar el reset.
  private readonly resetearPaginaAlOrdenar = effect(() => {
    this.ordenCampo();
    this.ordenDireccion();
    this.paginaSolicitada.set(0);
  });

  private readonly recurso = httpResource<PaginaResponse<Lote>>(() => {
    const params = new URLSearchParams({
      page: String(this.paginaSolicitada()),
      size: String(TAMANIO_PAGINA),
    });
    // Sin toggle: solo activos. Con el toggle activado se piden todos (activos e
    // inactivos juntos) omitiendo el parámetro — los inactivos se marcan en la fila
    // con el chip "Dado de baja", no se ocultan los activos mientras tanto.
    if (!this.verBaja()) {
      params.set('activo', 'true');
    }
    const campo = this.ordenCampo() ? CAMPO_ORDEN_BACKEND[this.ordenCampo()!] : null;
    if (campo) {
      params.set('sort', `${campo},${this.ordenDireccion()}`);
    }
    return `${environment.apiBaseUrl}/lotes?${params.toString()}`;
  });

  // Retiene la última página resuelta mientras cambia página/orden/toggle — sin esto la
  // lista parpadea (desaparece y vuelve a aparecer) en cada pedido nuevo.
  private readonly ultimaPagina = mantenerUltimoValor(this.recurso.value);
  protected readonly lotes = computed(() => this.ultimaPagina()?.content ?? []);
  protected readonly cargando = this.recurso.isLoading;
  protected readonly totalElementos = computed(() => this.ultimaPagina()?.page.totalElements ?? 0);
  protected readonly totalPaginas = computed(() => this.ultimaPagina()?.page.totalPages ?? 0);

  // Solo filtra dentro de la página ya cargada (~20 filas): todavía no hay búsqueda de
  // texto en el backend. Orden y paginado ya no se resuelven acá, viajan en la URL.
  protected readonly lotesVisibles = computed(() =>
    filtrarPorTexto(this.lotes(), this.textoBusqueda(), (lote) => lote.nombre),
  );

  alternarVerBaja(): void {
    this.verBaja.update((valor) => !valor);
    this.paginaSolicitada.set(0);
  }

  abrirNuevo(): void {
    this.loteEditando.set(null);
    this.modalAbierto.set(true);
  }

  editar(lote: Lote): void {
    this.loteEditando.set(lote);
    this.modalAbierto.set(true);
  }

  cerrarModal(): void {
    this.modalAbierto.set(false);
  }

  onGuardado(): void {
    this.modalAbierto.set(false);
    this.recurso.reload();
  }

  pedirBaja(lote: Lote): void {
    this.confirmandoBaja.set(lote);
  }

  cancelarBaja(): void {
    this.confirmandoBaja.set(null);
  }

  confirmarBaja(): void {
    const lote = this.confirmandoBaja();
    if (!lote) {
      return;
    }
    this.confirmandoBaja.set(null);
    this.loteService.darDeBaja(lote.id).subscribe({
      next: () => {
        this.aviso.mostrar('Lote dado de baja: sale de los desplegables, el histórico queda igual');
        this.recurso.reload();
      },
      error: (error: ErrorResponse) => {
        this.aviso.mostrar(error.message || 'No se pudo dar de baja el lote. Probá de nuevo.', 'error');
      },
    });
  }

  reactivar(lote: Lote): void {
    this.loteService.reactivar(lote.id).subscribe({
      next: () => {
        this.aviso.mostrar('Lote reactivado');
        this.recurso.reload();
      },
      error: (error: ErrorResponse) => {
        this.aviso.mostrar(error.message || 'No se pudo reactivar el lote. Probá de nuevo.', 'error');
      },
    });
  }
}
