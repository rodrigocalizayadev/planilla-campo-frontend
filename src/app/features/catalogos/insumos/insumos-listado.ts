import { Component, computed, effect, inject, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { ImportePipe } from '../../../shared/pipes/importe.pipe';
import { EnumsService } from '../../../core/enums/enums.service';
import { InsumoForm } from './insumo-form';
import { InsumoService } from './insumo.service';
import { AvisoService } from '../../../shared/ui/aviso/aviso.service';
import { ConfirmarAccion } from '../../../shared/ui/confirmar-accion/confirmar-accion';
import { Buscador } from '../../../shared/ui/buscador/buscador';
import { ControlOrden, type OpcionOrden } from '../../../shared/ui/control-orden/control-orden';
import { Paginador } from '../../../shared/ui/paginador/paginador';
import { mantenerUltimoValor } from '../../../shared/data/mantener-ultimo-valor';
import { filtrarPorTexto } from '../../../shared/utils/listado-cliente';
import type { ErrorResponse, Insumo, PaginaResponse } from '../../../models';

const TODOS = 'todos';
const OPCIONES_ORDEN: OpcionOrden[] = [
  { valor: 'nombre', etiqueta: 'Nombre' },
  { valor: 'tipo', etiqueta: 'Tipo' },
  { valor: 'precio', etiqueta: 'Precio' },
];
const TAMANIO_PAGINA = 20;
// "precio" es precioReferencia.importe (Monto embebido) — ruta con punto verificada
// contra la API real.
const CAMPO_ORDEN_BACKEND: Record<string, string> = {
  nombre: 'nombre',
  tipo: 'tipo',
  precio: 'precioReferencia.importe',
};

/**
 * Catálogo de insumos (docs/plan-frontend.md slice 2). Mismo patrón que lotes, con un
 * filtro adicional por tipo — es el único catálogo que lo tiene (docs/plan-frontend.md).
 * A diferencia del prototipo (que solo listaba los tipos presentes en los datos
 * cargados), el filtro muestra siempre las ocho opciones reales del enum `tipoInsumo`:
 * más simple y no depende de qué haya en la página actual. Dar de baja/reactivar vive en
 * la fila del listado, no en el modal de edición, y dar de baja pide confirmación aparte.
 *
 * Paginado real contra el backend — ver el comentario equivalente en lotes-listado.ts.
 */
@Component({
  selector: 'app-insumos-listado',
  imports: [ImportePipe, InsumoForm, ConfirmarAccion, Buscador, ControlOrden, Paginador],
  templateUrl: './insumos-listado.html',
  styleUrl: './insumos-listado.scss',
})
export class InsumosListado {
  protected readonly enums = inject(EnumsService);
  private readonly insumoService = inject(InsumoService);
  private readonly aviso = inject(AvisoService);

  protected readonly verBaja = signal(false);
  protected readonly tipoFiltro = signal(TODOS);
  protected readonly modalAbierto = signal(false);
  protected readonly insumoEditando = signal<Insumo | null>(null);
  protected readonly confirmandoBaja = signal<Insumo | null>(null);

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

  private readonly recurso = httpResource<PaginaResponse<Insumo>>(() => {
    const params = new URLSearchParams({
      page: String(this.paginaSolicitada()),
      size: String(TAMANIO_PAGINA),
    });
    if (!this.verBaja()) {
      params.set('activo', 'true');
    }
    if (this.tipoFiltro() !== TODOS) {
      params.set('tipo', this.tipoFiltro());
    }
    const campo = this.ordenCampo() ? CAMPO_ORDEN_BACKEND[this.ordenCampo()!] : null;
    if (campo) {
      params.set('sort', `${campo},${this.ordenDireccion()}`);
    }
    return `${environment.apiBaseUrl}/insumos?${params.toString()}`;
  });

  private readonly ultimaPagina = mantenerUltimoValor(this.recurso.value);
  protected readonly insumos = computed(() => this.ultimaPagina()?.content ?? []);
  protected readonly cargando = this.recurso.isLoading;
  protected readonly totalElementos = computed(() => this.ultimaPagina()?.page.totalElements ?? 0);
  protected readonly totalPaginas = computed(() => this.ultimaPagina()?.page.totalPages ?? 0);

  protected readonly insumosVisibles = computed(() =>
    filtrarPorTexto(this.insumos(), this.textoBusqueda(), (insumo) => insumo.nombre),
  );

  alternarVerBaja(): void {
    this.verBaja.update((valor) => !valor);
    this.paginaSolicitada.set(0);
  }

  setTipoFiltro(evento: Event): void {
    this.tipoFiltro.set((evento.target as HTMLSelectElement).value);
    this.paginaSolicitada.set(0);
  }

  etiquetaTipo(valor: string): string {
    return this.enums.etiqueta('tipoInsumo', valor);
  }

  abrirNuevo(): void {
    this.insumoEditando.set(null);
    this.modalAbierto.set(true);
  }

  editar(insumo: Insumo): void {
    this.insumoEditando.set(insumo);
    this.modalAbierto.set(true);
  }

  cerrarModal(): void {
    this.modalAbierto.set(false);
  }

  onGuardado(): void {
    this.modalAbierto.set(false);
    this.recurso.reload();
  }

  pedirBaja(insumo: Insumo): void {
    this.confirmandoBaja.set(insumo);
  }

  cancelarBaja(): void {
    this.confirmandoBaja.set(null);
  }

  confirmarBaja(): void {
    const insumo = this.confirmandoBaja();
    if (!insumo) {
      return;
    }
    this.confirmandoBaja.set(null);
    this.insumoService.darDeBaja(insumo.id).subscribe({
      next: () => {
        this.aviso.mostrar('Insumo dado de baja: sale de los desplegables, el histórico queda igual');
        this.recurso.reload();
      },
      error: (error: ErrorResponse) => {
        this.aviso.mostrar(error.message || 'No se pudo dar de baja el insumo. Probá de nuevo.', 'error');
      },
    });
  }

  reactivar(insumo: Insumo): void {
    this.insumoService.reactivar(insumo.id).subscribe({
      next: () => {
        this.aviso.mostrar('Insumo reactivado');
        this.recurso.reload();
      },
      error: (error: ErrorResponse) => {
        this.aviso.mostrar(error.message || 'No se pudo reactivar el insumo. Probá de nuevo.', 'error');
      },
    });
  }
}
