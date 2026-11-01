import { Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { HttpClient, httpResource } from '@angular/common/http';
import { forkJoin, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ImportePipe } from '../../shared/pipes/importe.pipe';
import { CampaniaActivaService } from '../../core/campania/campania-activa.service';
import { MonedaVistaService } from '../../core/moneda/moneda-vista.service';
import { agruparPorCultivo, type FilaComparativaCultivo } from '../../shared/utils/comparativa';
import type { Campania, CostosPorRubro, ErrorResponse, PaginaResponse, ResumenCampania } from '../../models';

type Vista = 'resumen' | 'comparativa';

/**
 * Reportes de campaña (docs/plan-frontend.md slice 6): dos vistas dentro de una misma
 * pantalla, sin prototipo previo que las especifique (design-reference no las incluye).
 *
 * **Resumen**: desglose por rubro de la campaña activa, primer consumidor real de
 * `GET /campanias/{id}/costos-por-rubro` (shape confirmado y modelado desde slice 3,
 * sin pantalla hasta ahora). El % de cada rubro se calcula en el cliente
 * (`importe / totalGeneral`) porque este endpoint, a diferencia de
 * `DesgloseCostosResponse`, no trae `pct*` — es solo para dibujar la barra, no un
 * importe que se persiste (CLAUDE.md regla 1).
 *
 * **Comparativa**: sin endpoint dedicado. El usuario tilda 2+ campañas de
 * `GET /campanias` y se piden en paralelo (`forkJoin`, mismo patrón que usa
 * `CosechaForm`) sus `GET .../resumen` — shape ya confirmado, string JSON, Ars/Usd — y
 * se agrupan por cultivo con `agruparPorCultivo()` (`shared/utils/comparativa.ts`):
 * agregación sobre valores que el backend ya calculó, no un recálculo de plata.
 */
@Component({
  selector: 'app-reportes',
  imports: [ImportePipe, DecimalPipe],
  templateUrl: './reportes.html',
  styleUrl: './reportes.scss',
})
export class Reportes {
  private readonly http = inject(HttpClient);
  protected readonly campaniaActiva = inject(CampaniaActivaService);
  protected readonly monedaVistaService = inject(MonedaVistaService);
  protected readonly monedaVista = this.monedaVistaService.moneda;

  protected readonly vista = signal<Vista>('resumen');

  // --- Resumen ---

  private readonly campaniaId = computed(() => this.campaniaActiva.campania()?.id ?? null);

  private readonly costosPorRubroRecurso = httpResource<CostosPorRubro>(() => {
    const id = this.campaniaId();
    return id ? `${environment.apiBaseUrl}/campanias/${id}/costos-por-rubro` : undefined;
  });
  protected readonly costosPorRubro = this.costosPorRubroRecurso.value;
  protected readonly cargandoResumen = this.costosPorRubroRecurso.isLoading;

  protected readonly rubros = computed(() => {
    const c = this.costosPorRubro();
    if (!c) {
      return [];
    }
    const ars = this.monedaVista() === 'ARS';
    const total = ars ? c.totalGeneralArs : c.totalGeneralUsd;
    const filas = [
      { nombre: 'Insumos', importe: ars ? c.totalInsumosArs : c.totalInsumosUsd },
      { nombre: 'Mano de obra', importe: ars ? c.totalManoObraArs : c.totalManoObraUsd },
      { nombre: 'Labores y servicios', importe: ars ? c.totalLaborMecanicaArs : c.totalLaborMecanicaUsd },
      { nombre: 'Indirectos', importe: ars ? c.totalIndirectosArs : c.totalIndirectosUsd },
    ];
    const totalNumero = Number(total);
    return filas.map((f) => ({ ...f, total, pct: totalNumero > 0 ? (Number(f.importe) / totalNumero) * 100 : 0 }));
  });

  protected readonly totalGeneral = computed(() => {
    const c = this.costosPorRubro();
    if (!c) {
      return 0;
    }
    return this.monedaVista() === 'ARS' ? c.totalGeneralArs : c.totalGeneralUsd;
  });

  protected readonly filasLotes = computed(() => {
    const ars = this.monedaVista() === 'ARS';
    return (this.costosPorRubro()?.lotes ?? []).map((l) => ({
      ...l,
      insumos: ars ? l.insumosArs : l.insumosUsd,
      manoObra: ars ? l.manoObraArs : l.manoObraUsd,
      laborMecanica: ars ? l.laborMecanicaArs : l.laborMecanicaUsd,
      indirectos: ars ? l.indirectosArs : l.indirectosUsd,
      total: ars ? l.totalArs : l.totalUsd,
    }));
  });

  // --- Comparativa ---

  private readonly campaniasRecurso = httpResource<PaginaResponse<Campania>>(
    () => `${environment.apiBaseUrl}/campanias?size=200&sort=id,desc`,
  );
  protected readonly campanias = computed(() => this.campaniasRecurso.value()?.content ?? []);

  protected readonly seleccionadas = signal<Set<number>>(new Set());
  protected readonly comparativaFilas = signal<FilaComparativaCultivo[]>([]);
  protected readonly comparativaEjecutada = signal(false);
  protected readonly cargandoComparativa = signal(false);
  protected readonly errorComparativa = signal<string | null>(null);

  protected readonly cultivosComparativa = computed(() =>
    Array.from(new Set(this.comparativaFilas().map((f) => f.cultivo))).sort(),
  );

  protected readonly campaniasComparativa = computed(() => {
    const vistas = new Map<number, string>();
    for (const fila of this.comparativaFilas()) {
      vistas.set(fila.campaniaId, fila.nombreCampania);
    }
    return Array.from(vistas, ([campaniaId, nombreCampania]) => ({ campaniaId, nombreCampania }));
  });

  protected readonly gruposComparativa = computed(() => {
    const cultivos = this.cultivosComparativa();
    const campanias = this.campaniasComparativa();
    const filas = this.comparativaFilas();
    return cultivos.map((cultivo) => {
      const entries = campanias.map((c) => filas.find((f) => f.cultivo === cultivo && f.campaniaId === c.campaniaId));
      const validas = entries.filter((e) => e !== undefined) as FilaComparativaCultivo[];
      const maxArs = Math.max(...validas.map((e) => e.costoPorHaArs), 0);
      const maxUsd = Math.max(...validas.map((e) => e.costoPorHaUsd), 0);
      return { cultivo, campanias: entries, maxCostoPorHaArs: maxArs, maxCostoPorHaUsd: maxUsd };
    });
  });

  barraAncho(
    fila: FilaComparativaCultivo,
    grupo: { maxCostoPorHaArs: number; maxCostoPorHaUsd: number },
    moneda: 'ARS' | 'USD',
  ): number {
    const max = moneda === 'ARS' ? grupo.maxCostoPorHaArs : grupo.maxCostoPorHaUsd;
    const val = moneda === 'ARS' ? fila.costoPorHaArs : fila.costoPorHaUsd;
    return max > 0 ? (val / max) * 100 : 0;
  }

  celda(cultivo: string, campaniaId: number): FilaComparativaCultivo | undefined {
    return this.comparativaFilas().find((f) => f.cultivo === cultivo && f.campaniaId === campaniaId);
  }

  elegirVista(vista: Vista): void {
    this.vista.set(vista);
  }

  toggleCampania(id: number): void {
    this.seleccionadas.update((actual) => {
      const copia = new Set(actual);
      if (copia.has(id)) {
        copia.delete(id);
      } else {
        copia.add(id);
      }
      return copia;
    });
  }

  compararSeleccionadas(): void {
    const elegidas = this.campanias().filter((c) => this.seleccionadas().has(c.id));
    if (elegidas.length < 2) {
      return;
    }

    this.errorComparativa.set(null);
    this.cargandoComparativa.set(true);
    forkJoin(
      elegidas.map((campania) =>
        this.http
          .get<ResumenCampania>(`${environment.apiBaseUrl}/campanias/${campania.id}/resumen`)
          .pipe(map((resumen) => ({ campaniaId: campania.id, nombreCampania: campania.nombre, resumen }))),
      ),
    ).subscribe({
      next: (pares) => {
        this.cargandoComparativa.set(false);
        this.comparativaEjecutada.set(true);
        this.comparativaFilas.set(agruparPorCultivo(pares));
      },
      error: (error: ErrorResponse) => {
        this.cargandoComparativa.set(false);
        this.errorComparativa.set(error.message || 'No se pudo armar la comparativa. Probá de nuevo.');
      },
    });
  }
}
