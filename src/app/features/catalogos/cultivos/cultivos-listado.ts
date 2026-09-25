import { Component, computed, effect, inject, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { ImportePipe } from '../../../shared/pipes/importe.pipe';
import { CultivoForm } from './cultivo-form';
import { CultivoService } from './cultivo.service';
import { AvisoService } from '../../../shared/ui/aviso/aviso.service';
import { ConfirmarAccion } from '../../../shared/ui/confirmar-accion/confirmar-accion';
import { Buscador } from '../../../shared/ui/buscador/buscador';
import { ControlOrden, type OpcionOrden } from '../../../shared/ui/control-orden/control-orden';
import { Paginador } from '../../../shared/ui/paginador/paginador';
import { mantenerUltimoValor } from '../../../shared/data/mantener-ultimo-valor';
import { filtrarPorTexto } from '../../../shared/utils/listado-cliente';
import type { Cultivo, ErrorResponse, PaginaResponse } from '../../../models';

const OPCIONES_ORDEN: OpcionOrden[] = [
  { valor: 'nombre', etiqueta: 'Nombre' },
  { valor: 'precio', etiqueta: 'Precio 1ª' },
];
const TAMANIO_PAGINA = 20;
// "precio" es precioReferenciaPrimera.importe (Monto embebido) — la ruta con punto está
// verificada contra la API real, Spring Data la resuelve bien en `sort=`.
const CAMPO_ORDEN_BACKEND: Record<string, string> = {
  nombre: 'nombre',
  precio: 'precioReferenciaPrimera.importe',
};

/**
 * Catálogo de cultivos (docs/plan-frontend.md slice 2). Mismo patrón que lotes: dar de
 * baja/reactivar vive en la fila del listado, no en el modal de edición, y dar de baja
 * pide confirmación aparte (reactivar no, por ser reversible y de bajo riesgo).
 *
 * Paginado real contra el backend — ver el comentario equivalente en lotes-listado.ts.
 */
@Component({
  selector: 'app-cultivos-listado',
  imports: [ImportePipe, CultivoForm, ConfirmarAccion, Buscador, ControlOrden, Paginador],
  templateUrl: './cultivos-listado.html',
  styleUrl: './cultivos-listado.scss',
})
export class CultivosListado {
  private readonly cultivoService = inject(CultivoService);
  private readonly aviso = inject(AvisoService);

  protected readonly verBaja = signal(false);
  protected readonly modalAbierto = signal(false);
  protected readonly cultivoEditando = signal<Cultivo | null>(null);
  protected readonly confirmandoBaja = signal<Cultivo | null>(null);

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

  private readonly recurso = httpResource<PaginaResponse<Cultivo>>(() => {
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
    return `${environment.apiBaseUrl}/cultivos?${params.toString()}`;
  });

  private readonly ultimaPagina = mantenerUltimoValor(this.recurso.value);
  protected readonly cultivos = computed(() => this.ultimaPagina()?.content ?? []);
  protected readonly cargando = this.recurso.isLoading;
  protected readonly totalElementos = computed(() => this.ultimaPagina()?.page.totalElements ?? 0);
  protected readonly totalPaginas = computed(() => this.ultimaPagina()?.page.totalPages ?? 0);

  protected readonly cultivosVisibles = computed(() =>
    filtrarPorTexto(this.cultivos(), this.textoBusqueda(), (cultivo) => cultivo.nombre),
  );

  alternarVerBaja(): void {
    this.verBaja.update((valor) => !valor);
    this.paginaSolicitada.set(0);
  }

  abrirNuevo(): void {
    this.cultivoEditando.set(null);
    this.modalAbierto.set(true);
  }

  editar(cultivo: Cultivo): void {
    this.cultivoEditando.set(cultivo);
    this.modalAbierto.set(true);
  }

  cerrarModal(): void {
    this.modalAbierto.set(false);
  }

  onGuardado(): void {
    this.modalAbierto.set(false);
    this.recurso.reload();
  }

  pedirBaja(cultivo: Cultivo): void {
    this.confirmandoBaja.set(cultivo);
  }

  cancelarBaja(): void {
    this.confirmandoBaja.set(null);
  }

  confirmarBaja(): void {
    const cultivo = this.confirmandoBaja();
    if (!cultivo) {
      return;
    }
    this.confirmandoBaja.set(null);
    this.cultivoService.darDeBaja(cultivo.id).subscribe({
      next: () => {
        this.aviso.mostrar('Cultivo dado de baja: sale de los desplegables, el histórico queda igual');
        this.recurso.reload();
      },
      error: (error: ErrorResponse) => {
        this.aviso.mostrar(error.message || 'No se pudo dar de baja el cultivo. Probá de nuevo.', 'error');
      },
    });
  }

  reactivar(cultivo: Cultivo): void {
    this.cultivoService.reactivar(cultivo.id).subscribe({
      next: () => {
        this.aviso.mostrar('Cultivo reactivado');
        this.recurso.reload();
      },
      error: (error: ErrorResponse) => {
        this.aviso.mostrar(error.message || 'No se pudo reactivar el cultivo. Probá de nuevo.', 'error');
      },
    });
  }
}
