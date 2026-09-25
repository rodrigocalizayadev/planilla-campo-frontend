import { Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { CampoImporte } from '../../shared/ui/campo-importe/campo-importe';
import { ImportePipe } from '../../shared/pipes/importe.pipe';
import { AvisoService } from '../../shared/ui/aviso/aviso.service';
import { EnumsService } from '../../core/enums/enums.service';
import { CampaniaActivaService } from '../../core/campania/campania-activa.service';
import { MonedaVistaService } from '../../core/moneda/moneda-vista.service';
import { rutaLoteCampania } from '../../core/config/rutas';
import { CampaniaService } from '../campania/campania.service';
import { SembrarLoteForm } from './sembrar-lote-form';
import type { Campania, CampaniaRequest, ErrorResponse, LoteCampania, PaginaResponse, ResumenCampania } from '../../models';

/**
 * Tablero de campaña (docs/design-brief.md §7 pantalla 2, docs/plan-frontend.md
 * slice 3): resumen de indicadores + tabla de lote-campaña para comparar entre lotes.
 *
 * Los indicadores y el `costoPorHa` por lote salen de `GET .../resumen`, que ya los
 * calcula el backend sobre totales (docs/reglas-calculo.md §7.1) y en las dos monedas
 * (`*Ars`/`*Usd`) — el front no promedia ni convierte nada, solo elige qué sufijo
 * mostrar según `MonedaVistaService.moneda` (docs/design-reference, selector $ARS/US$
 * del tablero; habilitado en la tercera vuelta de slice 3 cuando el backend sumó
 * soporte para pesos). Desde slice 6 el selector es global (antes era un signal local
 * de esta pantalla): cambiarlo acá también cambia `LoteCampaniaDetalle` y `Reportes`.
 * `resumen.lotes[]` no trae `ciclo` (identifica el lote-campaña, no lo
 * describe), así que se cruza con `GET .../lote-campanias` por `loteCampaniaId` para
 * anotar "· ciclo N" en la fila cuando un mismo lote se sembró más de una vez en la
 * campaña. Esa misma lista se pasa a `SembrarLoteForm` para que avise, antes de
 * guardar, cuando el lote+cultivo elegido ya se sembró antes en la campaña.
 *
 * `campaniaRecurso` trae el `Campania` completo (no solo el `CampaniaActivaResumen`
 * liviano del servicio global) porque hace falta `cotizacionVigente` para mostrar el
 * TC y `gastosComercializacionEstimados`/fechas para poder editarlo (el backend exige
 * el `CampaniaRequest` completo en el PUT, no un PATCH parcial).
 *
 * No se pidió `costoPorUnidad` (por bolsa) por lote: `resumen.lotes[]` no lo expone, y
 * hasta que exista cosecha (slice 5) siempre sería `null`. Se suma cuando el slice 4/5
 * lo necesiten.
 *
 * Las filas de la tabla no son clickeables todavía: el detalle de lote-campaña
 * (docs/plan-frontend.md slice 4, "la pantalla central") no existe como ruta hasta
 * ese slice.
 */
@Component({
  selector: 'app-tablero',
  imports: [CampoImporte, ImportePipe, DecimalPipe, RouterLink, SembrarLoteForm],
  templateUrl: './tablero.html',
  styleUrl: './tablero.scss',
})
export class Tablero {
  protected readonly rutaLoteCampania = rutaLoteCampania;
  protected readonly campaniaActiva = inject(CampaniaActivaService);
  private readonly campaniaService = inject(CampaniaService);
  private readonly aviso = inject(AvisoService);
  protected readonly enums = inject(EnumsService);

  private readonly campaniaId = computed(() => this.campaniaActiva.campania()?.id ?? null);
  protected readonly esCerrada = computed(() => this.campaniaActiva.campania()?.estado === 'CERRADA');

  private readonly campaniaRecurso = httpResource<Campania>(() => {
    const id = this.campaniaId();
    return id ? `${environment.apiBaseUrl}/campanias/${id}` : undefined;
  });
  protected readonly campaniaDetalle = this.campaniaRecurso.value;

  private readonly resumenRecurso = httpResource<ResumenCampania>(() => {
    const id = this.campaniaId();
    return id ? `${environment.apiBaseUrl}/campanias/${id}/resumen` : undefined;
  });
  protected readonly resumen = this.resumenRecurso.value;

  private readonly loteCampaniasRecurso = httpResource<PaginaResponse<LoteCampania>>(() => {
    const id = this.campaniaId();
    return id ? `${environment.apiBaseUrl}/campanias/${id}/lote-campanias?size=200` : undefined;
  });

  protected readonly cargando = computed(
    () => this.resumenRecurso.isLoading() || this.loteCampaniasRecurso.isLoading(),
  );

  protected readonly loteCampanias = computed(() => this.loteCampaniasRecurso.value()?.content ?? []);

  protected readonly monedaVistaService = inject(MonedaVistaService);
  protected readonly monedaVista = this.monedaVistaService.moneda;

  // Un solo lugar donde se elige Ars vs Usd, para no repetir el ternario en cada bloque
  // del template (5 indicadores + 2 columnas por fila).
  protected readonly vista = computed(() => {
    const r = this.resumen();
    const ars = this.monedaVista() === 'ARS';
    return {
      costoTotal: r && (ars ? r.costoTotalCampaniaArs : r.costoTotalCampaniaUsd),
      costoPorHa: r && (ars ? r.costoPorHaCampaniaArs : r.costoPorHaCampaniaUsd),
      ingresoRealizado: r && (ars ? r.ingresoRealizadoCampaniaArs : r.ingresoRealizadoCampaniaUsd),
      margenRealizado: r && (ars ? r.margenRealizadoCampaniaArs : r.margenRealizadoCampaniaUsd),
    };
  });

  protected readonly margenRealizadoNumero = computed(() => Number(this.vista().margenRealizado ?? 0));

  protected readonly filas = computed(() => {
    const ciclos = new Map(this.loteCampanias().map((lc) => [lc.id, lc.ciclo]));
    const ars = this.monedaVista() === 'ARS';
    return (this.resumen()?.lotes ?? []).map((fila) => ({
      ...fila,
      ciclo: ciclos.get(fila.loteCampaniaId) ?? 1,
      costoTotal: ars ? fila.costoTotalArs : fila.costoTotalUsd,
      costoPorHa: ars ? fila.costoPorHaArs : fila.costoPorHaUsd,
    }));
  });

  protected readonly modalSembrarAbierto = signal(false);
  protected readonly cambiandoEstado = signal(false);
  protected readonly errorEstado = signal<string | null>(null);

  protected readonly editandoCotizacion = signal(false);
  protected readonly cotizacionEditada = signal('');
  protected readonly guardandoCotizacion = signal(false);

  etiquetaEstado(): string {
    const estado = this.campaniaActiva.campania()?.estado;
    return estado ? this.enums.etiqueta('estadoCampania', estado) : '';
  }

  abrirSembrar(): void {
    this.modalSembrarAbierto.set(true);
  }

  cerrarSembrar(): void {
    this.modalSembrarAbierto.set(false);
  }

  onLoteSembrado(): void {
    this.modalSembrarAbierto.set(false);
    this.resumenRecurso.reload();
    this.loteCampaniasRecurso.reload();
  }

  marcarEnCurso(): void {
    this.cambiarEstado('EN_CURSO', 'Campaña en curso');
  }

  reabrir(): void {
    this.cambiarEstado('EN_CURSO', 'Campaña reabierta');
  }

  cerrarCampania(): void {
    const id = this.campaniaId();
    if (id === null) {
      return;
    }
    this.errorEstado.set(null);
    this.cambiandoEstado.set(true);
    this.campaniaService.cerrar(id).subscribe({
      next: (campania) => {
        this.cambiandoEstado.set(false);
        this.campaniaActiva.establecer({ id: campania.id, nombre: campania.nombre, estado: campania.estado });
        this.campaniaRecurso.reload();
        this.aviso.mostrar('Campaña cerrada: queda de solo lectura, no admite nuevos movimientos');
      },
      error: (error: ErrorResponse) => {
        this.cambiandoEstado.set(false);
        this.errorEstado.set(error.message || 'No se pudo cerrar la campaña. Probá de nuevo.');
      },
    });
  }

  private cambiarEstado(estado: string, mensajeExito: string): void {
    const id = this.campaniaId();
    if (id === null) {
      return;
    }
    this.errorEstado.set(null);
    this.cambiandoEstado.set(true);
    this.campaniaService.cambiarEstado(id, estado).subscribe({
      next: (campania) => {
        this.cambiandoEstado.set(false);
        this.campaniaActiva.establecer({ id: campania.id, nombre: campania.nombre, estado: campania.estado });
        this.campaniaRecurso.reload();
        this.aviso.mostrar(mensajeExito);
      },
      error: (error: ErrorResponse) => {
        this.cambiandoEstado.set(false);
        this.errorEstado.set(error.message || 'No se pudo actualizar el estado. Probá de nuevo.');
      },
    });
  }

  abrirEdicionCotizacion(): void {
    this.errorEstado.set(null);
    this.cotizacionEditada.set(this.campaniaDetalle()?.cotizacionVigente ?? '');
    this.editandoCotizacion.set(true);
  }

  cancelarEdicionCotizacion(): void {
    this.editandoCotizacion.set(false);
  }

  guardarCotizacion(evento: Event): void {
    evento.preventDefault();
    const campania = this.campaniaDetalle();
    if (!campania) {
      return;
    }

    const texto = this.cotizacionEditada().trim();
    const numero = Number(texto);
    if (texto && (!Number.isFinite(numero) || numero <= 0)) {
      this.errorEstado.set('Ingresá una cotización mayor que cero.');
      return;
    }

    this.errorEstado.set(null);
    this.guardandoCotizacion.set(true);
    const payload: CampaniaRequest = {
      nombre: campania.nombre,
      fechaInicio: campania.fechaInicio,
      fechaFin: campania.fechaFin,
      gastosComercializacionEstimados: campania.gastosComercializacionEstimados,
      cotizacionVigente: texto || null,
    };

    this.campaniaService.actualizar(campania.id, payload).subscribe({
      next: () => {
        this.guardandoCotizacion.set(false);
        this.editandoCotizacion.set(false);
        this.campaniaRecurso.reload();
        this.aviso.mostrar('Cotización actualizada');
      },
      error: (error: ErrorResponse) => {
        this.guardandoCotizacion.set(false);
        this.errorEstado.set(error.message || 'No se pudo actualizar la cotización. Probá de nuevo.');
      },
    });
  }
}
