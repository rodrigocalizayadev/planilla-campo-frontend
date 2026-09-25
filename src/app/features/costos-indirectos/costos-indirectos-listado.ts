import { Component, computed, inject, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ImportePipe } from '../../shared/pipes/importe.pipe';
import { FechaPipe } from '../../shared/pipes/fecha.pipe';
import { AvisoService } from '../../shared/ui/aviso/aviso.service';
import { EnumsService } from '../../core/enums/enums.service';
import { CampaniaActivaService } from '../../core/campania/campania-activa.service';
import { MonedaVistaService } from '../../core/moneda/moneda-vista.service';
import { CostosIndirectosService } from './costos-indirectos.service';
import { CostoIndirectoForm } from './costo-indirecto-form';
import { ConfirmarAccion } from '../../shared/ui/confirmar-accion/confirmar-accion';
import { Buscador } from '../../shared/ui/buscador/buscador';
import { ControlOrden, type OpcionOrden } from '../../shared/ui/control-orden/control-orden';
import { Paginador } from '../../shared/ui/paginador/paginador';
import { mantenerUltimoValor } from '../../shared/data/mantener-ultimo-valor';
import { filtrarPorTexto, ordenarPor, paginarCliente, totalPaginasCliente } from '../../shared/utils/listado-cliente';
import type { CostoIndirecto, ErrorResponse, LoteCampania, PaginaResponse } from '../../models';

const OPCIONES_ORDEN: OpcionOrden[] = [
  { valor: 'concepto', etiqueta: 'Concepto' },
  { valor: 'fecha', etiqueta: 'Fecha' },
  { valor: 'importe', etiqueta: 'Importe' },
];
const TAMANIO_PAGINA = 20;

/**
 * Listado de costos indirectos de la campaña activa (docs/plan-frontend.md slice 6,
 * docs/design-brief.md §7 pantalla 7). Además de la lista, un panel "Reparto entre
 * lotes": la suma de `CostoIndirecto.partes[]` de todos los costos cargados, por
 * lote-campaña — dato real que devuelve el propio backend en cada alta/listado, no una
 * reconstrucción local (CLAUDE.md regla 1). Los costos con imputación directa
 * (`loteCampaniaId` en la raíz, `partes` vacío) también entran al reparto: van enteros
 * a ese lote.
 */
@Component({
  selector: 'app-costos-indirectos-listado',
  imports: [ImportePipe, FechaPipe, CostoIndirectoForm, ConfirmarAccion, Buscador, ControlOrden, Paginador],
  templateUrl: './costos-indirectos-listado.html',
  styleUrl: './costos-indirectos-listado.scss',
})
export class CostosIndirectosListado {
  protected readonly campaniaActiva = inject(CampaniaActivaService);
  protected readonly enums = inject(EnumsService);
  protected readonly monedaVistaService = inject(MonedaVistaService);
  protected readonly monedaVista = this.monedaVistaService.moneda;
  private readonly costosIndirectosService = inject(CostosIndirectosService);
  private readonly aviso = inject(AvisoService);

  protected readonly opcionesOrden = OPCIONES_ORDEN;
  protected readonly textoBusqueda = signal('');
  protected readonly ordenCampo = signal<string | null>(null);
  protected readonly ordenDireccion = signal<'asc' | 'desc'>('asc');

  private readonly campaniaId = computed(() => this.campaniaActiva.campania()?.id ?? null);
  protected readonly esCerrada = computed(() => this.campaniaActiva.campania()?.estado === 'CERRADA');

  private readonly costosRecurso = httpResource<PaginaResponse<CostoIndirecto>>(() => {
    const id = this.campaniaId();
    return id ? `${environment.apiBaseUrl}/campanias/${id}/costos-indirectos?size=200` : undefined;
  });
  private readonly ultimaPagina = mantenerUltimoValor(this.costosRecurso.value);
  protected readonly costos = computed(() => this.ultimaPagina()?.content ?? []);
  protected readonly cargando = this.costosRecurso.isLoading;

  private readonly extractorOrden = computed<((costo: CostoIndirecto) => string | number) | null>(() => {
    switch (this.ordenCampo()) {
      case 'concepto':
        return (costo) => costo.concepto;
      case 'fecha':
        return (costo) => costo.fecha;
      // Según la moneda elegida en el selector ARS/US$ de la pantalla — igual que el
      // importe que ya se muestra en cada fila, nunca convierte, solo elige el campo.
      case 'importe':
        return (costo) =>
          Number((this.monedaVista() === 'ARS' ? costo.importe.importeArs : costo.importe.importeUsd) ?? 0);
      default:
        return null;
    }
  });

  // `reparto`/`totalReparto` más abajo siguen usando `costos()` completo, no esta
  // lista derivada: la búsqueda/orden es solo para la vista, nunca puede afectar el
  // total que se muestra como "Reparto entre lotes" (CLAUDE.md regla 1, aplicado acá
  // por analogía: un filtro de UI no puede cambiar un cálculo).
  protected readonly costosVisibles = computed(() =>
    ordenarPor(
      filtrarPorTexto(this.costos(), this.textoBusqueda(), (costo) => costo.concepto),
      this.extractorOrden(),
      this.ordenDireccion(),
    ),
  );

  protected readonly paginaSolicitada = signal(0);
  protected readonly totalPaginas = computed(() => totalPaginasCliente(this.costosVisibles().length, TAMANIO_PAGINA));
  protected readonly pagina = computed(() => Math.min(this.paginaSolicitada(), this.totalPaginas() - 1));
  protected readonly costosPagina = computed(() =>
    paginarCliente(this.costosVisibles(), this.pagina(), TAMANIO_PAGINA),
  );

  private readonly loteCampaniasRecurso = httpResource<PaginaResponse<LoteCampania>>(() => {
    const id = this.campaniaId();
    return id ? `${environment.apiBaseUrl}/campanias/${id}/lote-campanias?size=200` : undefined;
  });
  protected readonly lotes = computed(() => this.loteCampaniasRecurso.value()?.content ?? []);

  protected readonly reparto = computed(() => {
    const ars = this.monedaVista() === 'ARS';
    const porLote = new Map<number, number>();
    for (const costo of this.costos()) {
      if (costo.loteCampaniaId != null) {
        const importe = Number(ars ? (costo.importe.importeArs ?? 0) : (costo.importe.importeUsd ?? 0));
        porLote.set(costo.loteCampaniaId, (porLote.get(costo.loteCampaniaId) ?? 0) + importe);
        continue;
      }
      for (const parte of costo.partes) {
        const importe = Number(ars ? (parte.importe.importeArs ?? 0) : (parte.importe.importeUsd ?? 0));
        porLote.set(parte.loteCampaniaId, (porLote.get(parte.loteCampaniaId) ?? 0) + importe);
      }
    }
    return this.lotes()
      .map((lc) => ({ lote: lc, importe: porLote.get(lc.id) ?? 0 }))
      .filter((fila) => fila.importe > 0);
  });

  protected readonly totalReparto = computed(() => this.reparto().reduce((s, f) => s + f.importe, 0));

  protected readonly modalAbierto = signal(false);
  protected readonly eliminando = signal<number | null>(null);
  protected readonly errorEliminar = signal<string | null>(null);
  protected readonly confirmandoEliminar = signal<CostoIndirecto | null>(null);

  etiquetaImputacion(costo: CostoIndirecto): string {
    if (costo.loteCampaniaId != null) {
      const lote = this.lotes().find((lc) => lc.id === costo.loteCampaniaId);
      return lote ? `Directo a ${lote.loteNombre} · ${lote.cultivoNombre}` : 'Directo a un lote';
    }
    return `A prorratear · ${this.enums.etiqueta('criterioProrrateo', costo.criterioProrrateo)}`;
  }

  abrirNuevo(): void {
    this.modalAbierto.set(true);
  }

  cerrarModal(): void {
    this.modalAbierto.set(false);
  }

  onGuardado(): void {
    this.modalAbierto.set(false);
    this.costosRecurso.reload();
  }

  pedirEliminar(costo: CostoIndirecto): void {
    this.confirmandoEliminar.set(costo);
  }

  cancelarEliminar(): void {
    this.confirmandoEliminar.set(null);
  }

  confirmarEliminar(): void {
    const costo = this.confirmandoEliminar();
    const campaniaId = this.campaniaId();
    if (!costo || campaniaId === null) {
      return;
    }
    this.confirmandoEliminar.set(null);
    this.errorEliminar.set(null);
    this.eliminando.set(costo.id);
    this.costosIndirectosService.eliminar(campaniaId, costo.id).subscribe({
      next: () => {
        this.eliminando.set(null);
        this.aviso.mostrar(`${costo.concepto} eliminado`);
        this.costosRecurso.reload();
      },
      error: (error: ErrorResponse) => {
        this.eliminando.set(null);
        this.errorEliminar.set(error.message || 'No se pudo eliminar el costo indirecto. Probá de nuevo.');
      },
    });
  }
}
