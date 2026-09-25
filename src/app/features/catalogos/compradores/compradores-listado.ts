import { Component, computed, effect, inject, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { EnumsService } from '../../../core/enums/enums.service';
import { CompradorForm } from './comprador-form';
import { CompradorService } from './comprador.service';
import { AvisoService } from '../../../shared/ui/aviso/aviso.service';
import { ConfirmarAccion } from '../../../shared/ui/confirmar-accion/confirmar-accion';
import { Buscador } from '../../../shared/ui/buscador/buscador';
import { ControlOrden, type OpcionOrden } from '../../../shared/ui/control-orden/control-orden';
import { Paginador } from '../../../shared/ui/paginador/paginador';
import { mantenerUltimoValor } from '../../../shared/data/mantener-ultimo-valor';
import { filtrarPorTexto } from '../../../shared/utils/listado-cliente';
import type { Comprador, ErrorResponse, PaginaResponse } from '../../../models';

const OPCIONES_ORDEN: OpcionOrden[] = [{ valor: 'nombre', etiqueta: 'Nombre' }];
const TAMANIO_PAGINA = 20;
const CAMPO_ORDEN_BACKEND: Record<string, string> = { nombre: 'nombre' };

/**
 * Catálogo de compradores (docs/plan-frontend.md slice 2). Mismo patrón que lotes: dar
 * de baja/reactivar vive en la fila del listado, no en el modal de edición, y dar de
 * baja pide confirmación aparte.
 *
 * Paginado real contra el backend — ver el comentario equivalente en lotes-listado.ts.
 */
@Component({
  selector: 'app-compradores-listado',
  imports: [CompradorForm, ConfirmarAccion, Buscador, ControlOrden, Paginador],
  templateUrl: './compradores-listado.html',
  styleUrl: './compradores-listado.scss',
})
export class CompradoresListado {
  protected readonly enums = inject(EnumsService);
  private readonly compradorService = inject(CompradorService);
  private readonly aviso = inject(AvisoService);

  protected readonly verBaja = signal(false);
  protected readonly modalAbierto = signal(false);
  protected readonly compradorEditando = signal<Comprador | null>(null);
  protected readonly confirmandoBaja = signal<Comprador | null>(null);

  protected readonly opcionesOrden = OPCIONES_ORDEN;
  protected readonly textoBusqueda = signal('');
  protected readonly ordenCampo = signal<string | null>(null);
  protected readonly ordenDireccion = signal<'asc' | 'desc'>('asc');
  protected readonly paginaSolicitada = signal(0);

  private readonly resetearPaginaAlOrdenar = effect(() => {
    this.ordenCampo();
    this.ordenDireccion();
    this.paginaSolicitada.set(0);
  });

  private readonly recurso = httpResource<PaginaResponse<Comprador>>(() => {
    const params = new URLSearchParams({
      page: String(this.paginaSolicitada()),
      size: String(TAMANIO_PAGINA),
    });
    if (!this.verBaja()) {
      params.set('activo', 'true');
    }
    const campo = this.ordenCampo() ? CAMPO_ORDEN_BACKEND[this.ordenCampo()!] : null;
    if (campo) {
      params.set('sort', `${campo},${this.ordenDireccion()}`);
    }
    return `${environment.apiBaseUrl}/compradores?${params.toString()}`;
  });

  private readonly ultimaPagina = mantenerUltimoValor(this.recurso.value);
  protected readonly compradores = computed(() => this.ultimaPagina()?.content ?? []);
  protected readonly cargando = this.recurso.isLoading;
  protected readonly totalElementos = computed(() => this.ultimaPagina()?.page.totalElements ?? 0);
  protected readonly totalPaginas = computed(() => this.ultimaPagina()?.page.totalPages ?? 0);

  protected readonly compradoresVisibles = computed(() =>
    filtrarPorTexto(this.compradores(), this.textoBusqueda(), (comprador) => comprador.nombre),
  );

  alternarVerBaja(): void {
    this.verBaja.update((valor) => !valor);
    this.paginaSolicitada.set(0);
  }

  abrirNuevo(): void {
    this.compradorEditando.set(null);
    this.modalAbierto.set(true);
  }

  editar(comprador: Comprador): void {
    this.compradorEditando.set(comprador);
    this.modalAbierto.set(true);
  }

  cerrarModal(): void {
    this.modalAbierto.set(false);
  }

  onGuardado(): void {
    this.modalAbierto.set(false);
    this.recurso.reload();
  }

  pedirBaja(comprador: Comprador): void {
    this.confirmandoBaja.set(comprador);
  }

  cancelarBaja(): void {
    this.confirmandoBaja.set(null);
  }

  confirmarBaja(): void {
    const comprador = this.confirmandoBaja();
    if (!comprador) {
      return;
    }
    this.confirmandoBaja.set(null);
    this.compradorService.darDeBaja(comprador.id).subscribe({
      next: () => {
        this.aviso.mostrar('Comprador dado de baja: sale de los desplegables, el histórico queda igual');
        this.recurso.reload();
      },
      error: (error: ErrorResponse) => {
        this.aviso.mostrar(error.message || 'No se pudo dar de baja el comprador. Probá de nuevo.', 'error');
      },
    });
  }

  reactivar(comprador: Comprador): void {
    this.compradorService.reactivar(comprador.id).subscribe({
      next: () => {
        this.aviso.mostrar('Comprador reactivado');
        this.recurso.reload();
      },
      error: (error: ErrorResponse) => {
        this.aviso.mostrar(error.message || 'No se pudo reactivar el comprador. Probá de nuevo.', 'error');
      },
    });
  }
}
