import { Component, computed, inject, input, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CampoImporte } from '../../shared/ui/campo-importe/campo-importe';
import { ImportePipe } from '../../shared/pipes/importe.pipe';
import { FechaPipe } from '../../shared/pipes/fecha.pipe';
import { EnumsService } from '../../core/enums/enums.service';
import { CampaniaActivaService } from '../../core/campania/campania-activa.service';
import { MonedaVistaService } from '../../core/moneda/moneda-vista.service';
import { RUTAS } from '../../core/config/rutas';
import { AvisoService } from '../../shared/ui/aviso/aviso.service';
import { ConfirmarAccion } from '../../shared/ui/confirmar-accion/confirmar-accion';
import { TareaForm } from './tarea-form';
import { AplicacionForm } from './aplicacion-form';
import { CosechaForm } from './cosecha-form';
import { VentaForm } from './venta-form';
import { LiquidarVentaForm } from './liquidar-venta-form';
import { LoteCampaniaService } from './lote-campania.service';
import { pluralizar } from '../../shared/utils/pluralizar';
import { ControlOrden, type OpcionOrden } from '../../shared/ui/control-orden/control-orden';
import { Paginador } from '../../shared/ui/paginador/paginador';
import { mantenerUltimoValor } from '../../shared/data/mantener-ultimo-valor';
import { ordenarPor, paginarCliente, totalPaginasCliente } from '../../shared/utils/listado-cliente';
import type {
  Cosecha,
  DesgloseCostos,
  ErrorResponse,
  LoteCampania,
  Margen,
  Movimiento,
  PaginaResponse,
  Venta,
} from '../../models';

const CALIDADES_VENDIBLES = ['PRIMERA', 'SEGUNDA'];
// Tamaño chico: son paneles secundarios dentro de una pantalla ya cargada de
// información, no listados de pantalla completa como los catálogos.
const TAMANIO_PAGINA_PANEL = 8;
const OPCIONES_ORDEN_COSECHA: OpcionOrden[] = [
  { valor: 'fecha', etiqueta: 'Fecha' },
  { valor: 'corte', etiqueta: 'Corte' },
];
const OPCIONES_ORDEN_VENTA: OpcionOrden[] = [
  { valor: 'fechaEntrega', etiqueta: 'Fecha de entrega' },
  { valor: 'importe', etiqueta: 'Importe' },
];
const OPCIONES_ORDEN_MOVIMIENTO: OpcionOrden[] = [
  { valor: 'fecha', etiqueta: 'Fecha' },
  { valor: 'monto', etiqueta: 'Monto' },
];
const OPCIONES_TIPO_MOVIMIENTO: { valor: 'todos' | 'INSUMO' | 'TAREA'; etiqueta: string }[] = [
  { valor: 'todos', etiqueta: 'Todos los tipos' },
  { valor: 'INSUMO', etiqueta: 'Insumo' },
  { valor: 'TAREA', etiqueta: 'Tarea' },
];
// Movimientos es el panel de ancho completo (no una columna secundaria como cosecha/
// venta), entran más filas cómodas por página.
const TAMANIO_PAGINA_MOVIMIENTOS = 15;

// Redondea a la misma precisión que `DECIMAL(14,4)` del backend (docs/reglas-calculo.md
// §1.1): sumar/restar cantidades en float64 (nunca se persiste, es solo la
// previsualización de stock disponible) puede arrastrar basura de punto flotante
// (ej. "115.49699999999999" en vez de "115.497") que se ve mal en pantalla.
function redondearCantidad(valor: number): number {
  return Math.round(valor * 10000) / 10000;
}

/**
 * Detalle de lote-campaña — "la pantalla central" (docs/plan-frontend.md slices 4 y 5,
 * docs/design-brief.md §1). Sin `GET /api/lote-campanias/{id}` propio (confirmado que
 * no existe, ver `LoteCampaniaService`): el `LoteCampania` se busca dentro de la lista
 * de la campaña activa, mismo endpoint que ya usa el tablero.
 *
 * Los seis accesos de carga ("+ Cargar tarea", "Aplicación", "+ Cargar corte",
 * "+ Nueva venta" y, por fila, "Completar liquidación") abren un formulario modal
 * propio; ninguno recalcula nada localmente más allá de la previsualización permitida
 * por CLAUDE.md regla 1.
 *
 * **Editar/eliminar cosecha y venta** (sumado cuando el backend agregó
 * `PUT .../cosechas/{id}`, `PUT /api/ventas/{id}` y `DELETE /api/ventas/{id}`,
 * `docs/resumen-slices.md` slice 5 segunda vuelta — antes no existían, era un
 * pendiente documentado): clickear una fila de cosecha reabre `CosechaForm`
 * precargado con ese corte; "Eliminar" en cosecha o venta pide confirmación con
 * `ConfirmarAccion` (a diferencia de la baja de catálogo, acá es un borrado físico sin
 * reactivar posible). Venta solo ofrece "Editar" en estado `ENTREGADA` — el backend no
 * permite editar una `LIQUIDADA`, para eso está "Completar liquidación".
 */
@Component({
  selector: 'app-lote-campania-detalle',
  imports: [
    CampoImporte,
    ImportePipe,
    FechaPipe,
    DecimalPipe,
    RouterLink,
    TareaForm,
    AplicacionForm,
    CosechaForm,
    VentaForm,
    LiquidarVentaForm,
    ConfirmarAccion,
    ControlOrden,
    Paginador,
  ],
  templateUrl: './lote-campania-detalle.html',
  styleUrl: './lote-campania-detalle.scss',
})
export class LoteCampaniaDetalle {
  protected readonly campaniaActiva = inject(CampaniaActivaService);
  protected readonly enums = inject(EnumsService);
  protected readonly rutas = RUTAS;
  private readonly loteCampaniaService = inject(LoteCampaniaService);
  private readonly aviso = inject(AvisoService);

  // Route param vía withComponentInputBinding (app.config.ts) — siempre string.
  readonly id = input.required<string>();
  protected readonly loteCampaniaId = computed(() => Number(this.id()));

  private readonly campaniaId = computed(() => this.campaniaActiva.campania()?.id ?? null);
  protected readonly esCerrada = computed(() => this.campaniaActiva.campania()?.estado === 'CERRADA');

  private readonly loteCampaniasRecurso = httpResource<PaginaResponse<LoteCampania>>(() => {
    const id = this.campaniaId();
    return id ? `${environment.apiBaseUrl}/campanias/${id}/lote-campanias?size=200` : undefined;
  });
  protected readonly loteCampania = computed(() =>
    (this.loteCampaniasRecurso.value()?.content ?? []).find((lc) => lc.id === this.loteCampaniaId()),
  );

  private readonly costosRecurso = httpResource<DesgloseCostos>(
    () => `${environment.apiBaseUrl}/lote-campanias/${this.loteCampaniaId()}/costos`,
  );
  protected readonly costos = this.costosRecurso.value;

  private readonly margenRecurso = httpResource<Margen>(
    () => `${environment.apiBaseUrl}/lote-campanias/${this.loteCampaniaId()}/margen`,
  );
  protected readonly margen = this.margenRecurso.value;

  // El feed de movimientos (GET .../movimientos) acepta `page`/`size` pero ignora
  // `sort` — es un feed armado a mano mezclando AplicacionInsumo y Tarea, no un
  // `findAll(Pageable)` simple como el resto de los listados (confirmado: pedir
  // `sort=fecha,asc` vs `,desc` devuelve exactamente el mismo orden). Por eso, a
  // diferencia de lo que se intentó en un primer momento, filtro/orden/paginado acá se
  // resuelven en el cliente, igual que cosecha/venta más abajo — se carga completo una
  // sola vez.
  protected readonly opcionesOrdenMovimiento = OPCIONES_ORDEN_MOVIMIENTO;
  protected readonly opcionesTipoMovimiento = OPCIONES_TIPO_MOVIMIENTO;

  private readonly movimientosRecurso = httpResource<PaginaResponse<Movimiento>>(
    () => `${environment.apiBaseUrl}/lote-campanias/${this.loteCampaniaId()}/movimientos?size=200`,
  );
  private readonly ultimaPaginaMovimientos = mantenerUltimoValor(this.movimientosRecurso.value);
  protected readonly movimientosCargando = this.movimientosRecurso.isLoading;
  protected readonly movimientosCompletos = computed(() => this.ultimaPaginaMovimientos()?.content ?? []);

  protected readonly movimientoTipoFiltro = signal<'todos' | 'INSUMO' | 'TAREA'>('todos');
  protected readonly movimientoFechaDesde = signal('');
  protected readonly movimientoFechaHasta = signal('');
  protected readonly movimientoOrdenCampo = signal<string | null>(null);
  protected readonly movimientoOrdenDireccion = signal<'asc' | 'desc'>('desc');
  protected readonly movimientoPagina = signal(0);

  // Comparación lexicográfica de strings ISO (`"2026-01-05" < "2026-06-15"`), nunca
  // `new Date(...)` — mismo criterio que el resto del front para fechas de negocio.
  protected readonly movimientosFiltrados = computed(() => {
    const tipo = this.movimientoTipoFiltro();
    const desde = this.movimientoFechaDesde();
    const hasta = this.movimientoFechaHasta();
    return this.movimientosCompletos().filter((mv) => {
      if (tipo !== 'todos' && mv.tipo !== tipo) return false;
      if (desde && mv.fecha < desde) return false;
      if (hasta && mv.fecha > hasta) return false;
      return true;
    });
  });

  private readonly extractorOrdenMovimiento = computed<((mv: Movimiento) => string | number) | null>(() => {
    switch (this.movimientoOrdenCampo()) {
      case 'fecha':
        return (mv) => mv.fecha;
      case 'monto':
        return (mv) =>
          Number((this.monedaVista() === 'ARS' ? mv.costoTotal.importeArs : mv.costoTotal.importeUsd) ?? 0);
      default:
        return null;
    }
  });

  protected readonly movimientosOrdenados = computed(() =>
    ordenarPor(this.movimientosFiltrados(), this.extractorOrdenMovimiento(), this.movimientoOrdenDireccion()),
  );
  protected readonly movimientosVisibles = computed(() =>
    paginarCliente(this.movimientosOrdenados(), this.movimientoPagina(), TAMANIO_PAGINA_MOVIMIENTOS),
  );
  protected readonly movimientosTotalPaginas = computed(() =>
    totalPaginasCliente(this.movimientosFiltrados().length, TAMANIO_PAGINA_MOVIMIENTOS),
  );

  // Cosechas y ventas se siguen cargando completas (size=200): `disponiblePorCalidad`,
  // `stockDisponible`, `proximoCorte` y `cosechasPorCorte` más abajo necesitan ver TODO
  // el historial del lote-campaña para calcular bien, no solo la página visible. El
  // orden/paginado de estos dos paneles se resuelve en el cliente, sobre listas
  // derivadas que no tocan esos cálculos — mismo criterio que movimientos arriba.
  private readonly cosechasRecurso = httpResource<PaginaResponse<Cosecha>>(
    () => `${environment.apiBaseUrl}/lote-campanias/${this.loteCampaniaId()}/cosechas?size=200`,
  );
  private readonly ultimaPaginaCosechas = mantenerUltimoValor(this.cosechasRecurso.value);
  protected readonly cosechas = computed(() => this.ultimaPaginaCosechas()?.content ?? []);

  private readonly ventasRecurso = httpResource<PaginaResponse<Venta>>(
    () => `${environment.apiBaseUrl}/lote-campanias/${this.loteCampaniaId()}/ventas?size=200`,
  );
  private readonly ultimaPaginaVentas = mantenerUltimoValor(this.ventasRecurso.value);
  protected readonly ventas = computed(() => this.ultimaPaginaVentas()?.content ?? []);

  protected readonly opcionesOrdenCosecha = OPCIONES_ORDEN_COSECHA;
  protected readonly cosechaOrdenCampo = signal<string | null>(null);
  protected readonly cosechaOrdenDireccion = signal<'asc' | 'desc'>('desc');
  protected readonly cosechaPagina = signal(0);

  private readonly extractorOrdenCosecha = computed<
    ((corte: { corte: number; fecha: string }) => string | number) | null
  >(() => {
    switch (this.cosechaOrdenCampo()) {
      case 'corte':
        return (corte) => corte.corte;
      case 'fecha':
        return (corte) => corte.fecha;
      default:
        return null;
    }
  });

  protected readonly cortesOrdenados = computed(() =>
    ordenarPor(this.cosechasPorCorte(), this.extractorOrdenCosecha(), this.cosechaOrdenDireccion()),
  );
  protected readonly cortesVisibles = computed(() =>
    paginarCliente(this.cortesOrdenados(), this.cosechaPagina(), TAMANIO_PAGINA_PANEL),
  );
  protected readonly cortesTotalPaginas = computed(() =>
    totalPaginasCliente(this.cosechasPorCorte().length, TAMANIO_PAGINA_PANEL),
  );

  protected readonly opcionesOrdenVenta = OPCIONES_ORDEN_VENTA;
  protected readonly ventaOrdenCampo = signal<string | null>(null);
  protected readonly ventaOrdenDireccion = signal<'asc' | 'desc'>('desc');
  protected readonly ventaPagina = signal(0);

  private readonly extractorOrdenVenta = computed<((venta: Venta) => string | number) | null>(() => {
    switch (this.ventaOrdenCampo()) {
      case 'fechaEntrega':
        return (venta) => venta.fechaEntrega;
      // Ventas en consignación sin liquidar todavía no tienen `importeNeto` — se ordenan
      // como si fuera 0, quedan al principio/final según la dirección, nunca se descartan.
      case 'importe':
        return (venta) => Number(this.importeVenta(venta) ?? 0);
      default:
        return null;
    }
  });

  protected readonly ventasOrdenadas = computed(() =>
    ordenarPor(this.ventas(), this.extractorOrdenVenta(), this.ventaOrdenDireccion()),
  );
  protected readonly ventasVisibles = computed(() =>
    paginarCliente(this.ventasOrdenadas(), this.ventaPagina(), TAMANIO_PAGINA_PANEL),
  );
  protected readonly ventasTotalPaginas = computed(() =>
    totalPaginasCliente(this.ventas().length, TAMANIO_PAGINA_PANEL),
  );

  protected readonly cargando = computed(
    () =>
      this.loteCampaniasRecurso.isLoading() ||
      this.costosRecurso.isLoading() ||
      this.margenRecurso.isLoading(),
  );

  /** Agrupa las cosechas (una fila por calidad, docs/dominio.md §9) por corte, como
   * las muestra el panel — el prototipo las carga juntas pero el backend las persiste
   * separadas. */
  protected readonly cosechasPorCorte = computed(() => {
    const porCorte = new Map<
      number,
      { corte: number; fecha: string; primera: number; segunda: number; descarteKg: number }
    >();
    for (const c of this.cosechas()) {
      const fila = porCorte.get(c.numeroCorte) ?? {
        corte: c.numeroCorte,
        fecha: c.fecha,
        primera: 0,
        segunda: 0,
        descarteKg: 0,
      };
      if (c.calidad === 'PRIMERA') fila.primera += Number(c.cantidad);
      else if (c.calidad === 'SEGUNDA') fila.segunda += Number(c.cantidad);
      else if (c.calidad === 'DESCARTE') fila.descarteKg += Number(c.kgEquivalente);
      porCorte.set(c.numeroCorte, fila);
    }
    return Array.from(porCorte.values()).sort((a, b) => b.corte - a.corte);
  });

  /** Cosechas agrupadas por número de corte, sin agregar por calidad — a diferencia de
   * `cosechasPorCorte()`, conserva cada fila (`id` incluido) para poder editarlas o
   * eliminarlas individualmente. */
  protected readonly cosechasPorNumeroCorte = computed(() => {
    const porCorte = new Map<number, Cosecha[]>();
    for (const c of this.cosechas()) {
      const filas = porCorte.get(c.numeroCorte) ?? [];
      filas.push(c);
      porCorte.set(c.numeroCorte, filas);
    }
    return porCorte;
  });

  /** Próximo número de corte sugerido en `CosechaForm`: el mayor cargado + 1, o 1 si
   * todavía no hay ninguno (docs/design-brief.md §3: no exigirle al usuario pensar). */
  protected readonly proximoCorte = computed(() => {
    const cortes = this.cosechas().map((c) => c.numeroCorte);
    return cortes.length > 0 ? Math.max(...cortes) + 1 : 1;
  });

  /** Stock disponible por calidad (cosechado − vendido en cualquier estado,
   * docs/reglas-calculo.md §6.3): lo usa `VentaForm` para no dejar vender más de lo
   * cosechado por calidad (docs/dominio.md invariante 5). Solo PRIMERA/SEGUNDA: el
   * descarte no se vende. */
  protected readonly disponiblePorCalidad = computed(() => {
    const disponible: Record<string, number> = { PRIMERA: 0, SEGUNDA: 0 };
    for (const c of this.cosechas()) {
      if (c.calidad in disponible) disponible[c.calidad] += Number(c.cantidad);
    }
    for (const v of this.ventas()) {
      if (v.calidad in disponible) disponible[v.calidad] -= Number(v.cantidad);
    }
    for (const calidad of Object.keys(disponible)) {
      disponible[calidad] = redondearCantidad(Math.max(0, disponible[calidad]));
    }
    return disponible;
  });

  /** Cantidad disponible en galpón: cosechado vendible (primera+segunda, excluye
   * descarte, mismo criterio que el denominador de costoPorUnidad,
   * docs/reglas-calculo.md §5.1) menos entregado en cualquier estado (§6.3). Es
   * aritmética de cantidades, no de plata — no viola CLAUDE.md regla 1. */
  protected readonly stockDisponible = computed(() => {
    const vendible = this.cosechas()
      .filter((c) => CALIDADES_VENDIBLES.includes(c.calidad))
      .reduce((total, c) => total + Number(c.cantidad), 0);
    const entregado = this.ventas().reduce((total, v) => total + Number(v.cantidad), 0);
    return redondearCantidad(Math.max(0, vendible - entregado));
  });

  protected readonly monedaVistaService = inject(MonedaVistaService);
  protected readonly monedaVista = this.monedaVistaService.moneda;

  protected readonly vista = computed(() => {
    const c = this.costos();
    const ars = this.monedaVista() === 'ARS';
    return {
      costoTotal: c && (ars ? c.costoTotalArs : c.costoTotalUsd),
      costoPorHa: c && (ars ? c.costoPorHaArs : c.costoPorHaUsd),
      costoPorUnidad: c && (ars ? c.costoPorUnidadArs : c.costoPorUnidadUsd),
    };
  });

  protected readonly vistaMargen = computed(() => {
    const m = this.margen();
    const ars = this.monedaVista() === 'ARS';
    return {
      ingresoRealizado: m && (ars ? m.ingresoRealizadoArs : m.ingresoRealizadoUsd),
      valorPendienteLiq: m && (ars ? m.valorPendienteLiqArs : m.valorPendienteLiqUsd),
      valorStock: m && (ars ? m.valorStockArs : m.valorStockUsd),
      margenRealizado: m && (ars ? m.margenRealizadoArs : m.margenRealizadoUsd),
      margenEstimado: m && (ars ? m.margenEstimadoArs : m.margenEstimadoUsd),
    };
  });

  protected readonly hayCosecha = computed(() => this.costos()?.costoPorUnidadUsd != null);

  protected readonly tasaDescartePct = computed(() => Number(this.costos()?.tasaDescarte ?? 0) * 100);

  protected readonly margenRealizadoNumero = computed(() => Number(this.vistaMargen().margenRealizado ?? 0));

  protected readonly etiquetaUnidad = computed(() => {
    const lc = this.loteCampania();
    return lc ? this.enums.etiqueta('unidadProduccion', lc.unidadProduccion) : '';
  });

  // Aproximación razonable, no el `nombrePlural` exacto del cultivo (ese vive en
  // `Cultivo`, que esta pantalla no pide aparte): alcanza para las etiquetas de
  // cantidad de CosechaForm/VentaForm ("Primera (bolsas)").
  protected readonly etiquetaUnidadPlural = computed(() => pluralizar(this.etiquetaUnidad()));

  protected readonly rubros = computed(() => {
    const c = this.costos();
    if (!c) {
      return [];
    }
    const ars = this.monedaVista() === 'ARS';
    const total = ars ? c.costoTotalArs : c.costoTotalUsd;
    const filas = [
      { nombre: 'Insumos', importe: ars ? c.costoInsumosArs : c.costoInsumosUsd, pct: c.pctInsumos },
      { nombre: 'Mano de obra', importe: ars ? c.costoManoObraArs : c.costoManoObraUsd, pct: c.pctManoObra },
      {
        nombre: 'Labores y servicios',
        importe: ars ? c.costoLaborYServiciosArs : c.costoLaborYServiciosUsd,
        pct: c.pctLaborYServicios,
      },
      { nombre: 'Indirectos', importe: ars ? c.costoIndirectosArs : c.costoIndirectosUsd, pct: c.pctIndirectos },
    ];
    return filas.map((f) => ({ ...f, total }));
  });

  // "Me ofrecen por bolsa" (docs/design-brief.md §6.2): previsualización hipotética,
  // nunca se persiste — mismo espíritu que la excepción de CLAUDE.md regla 1 para el
  // total en vivo de un formulario.
  protected readonly precioOfrecido = signal('');
  protected readonly resultadoOferta = computed(() => {
    const ofrecido = Number(this.precioOfrecido());
    const costoPorUnidadTexto = this.vista().costoPorUnidad;
    if (!Number.isFinite(ofrecido) || ofrecido <= 0 || costoPorUnidadTexto == null) {
      return null;
    }
    const costoPorUnidad = Number(costoPorUnidadTexto);
    const diferencia = ofrecido - costoPorUnidad;
    return {
      diferencia,
      ganancia: diferencia >= 0,
      total: diferencia * this.stockDisponible(),
    };
  });

  protected readonly modalTareaAbierto = signal(false);
  protected readonly modalAplicacionAbierto = signal(false);
  // 'nuevo' = alta; un número = editando el corte con ese numeroCorte; null = cerrado.
  protected readonly cosechaFormCorte = signal<'nuevo' | number | null>(null);
  protected readonly modalVentaAbierto = signal(false);
  protected readonly ventaAEditar = signal<Venta | null>(null);
  protected readonly ventaALiquidar = signal<Venta | null>(null);

  protected readonly corteAEliminar = signal<number | null>(null);
  protected readonly eliminandoCorte = signal(false);
  protected readonly ventaAEliminar = signal<Venta | null>(null);
  protected readonly eliminandoVenta = signal(false);
  protected readonly errorEliminar = signal<string | null>(null);

  importeMovimiento(movimiento: Movimiento): string | undefined {
    return this.monedaVista() === 'ARS' ? movimiento.costoTotal.importeArs : movimiento.costoTotal.importeUsd;
  }

  etiquetaMovimiento(movimiento: Movimiento): string {
    return movimiento.tipo === 'TAREA' ? this.enums.etiqueta('tipoTarea', movimiento.descripcion) : movimiento.descripcion;
  }

  onTipoMovimientoChange(evento: Event): void {
    this.movimientoTipoFiltro.set((evento.target as HTMLSelectElement).value as 'todos' | 'INSUMO' | 'TAREA');
    this.movimientoPagina.set(0);
  }

  onFechaDesdeMovimientoChange(evento: Event): void {
    this.movimientoFechaDesde.set((evento.target as HTMLInputElement).value);
    this.movimientoPagina.set(0);
  }

  onFechaHastaMovimientoChange(evento: Event): void {
    this.movimientoFechaHasta.set((evento.target as HTMLInputElement).value);
    this.movimientoPagina.set(0);
  }

  etiquetaEstadoVenta(estado: string): string {
    return this.enums.etiqueta('estadoVenta', estado);
  }

  // `importeNeto` es `null` mientras la venta está en consignación sin liquidar
  // (docs/dominio.md §10.2): la fila muestra "—" vía ImportePipe en ese caso.
  importeVenta(venta: Venta): string | null | undefined {
    if (!venta.importeNeto) {
      return null;
    }
    return this.monedaVista() === 'ARS' ? venta.importeNeto.importeArs : venta.importeNeto.importeUsd;
  }

  abrirTarea(): void {
    this.modalTareaAbierto.set(true);
  }

  abrirAplicacion(): void {
    this.modalAplicacionAbierto.set(true);
  }

  abrirCosecha(): void {
    this.cosechaFormCorte.set('nuevo');
  }

  editarCorte(corte: number): void {
    if (!this.esCerrada()) {
      this.cosechaFormCorte.set(corte);
    }
  }

  abrirVenta(): void {
    this.ventaAEditar.set(null);
    this.modalVentaAbierto.set(true);
  }

  editarVenta(venta: Venta): void {
    this.ventaAEditar.set(venta);
    this.modalVentaAbierto.set(true);
  }

  abrirLiquidacion(venta: Venta): void {
    this.ventaALiquidar.set(venta);
  }

  pedirEliminarCorte(corte: number): void {
    this.errorEliminar.set(null);
    this.corteAEliminar.set(corte);
  }

  cancelarEliminarCorte(): void {
    this.corteAEliminar.set(null);
  }

  confirmarEliminarCorte(): void {
    const corte = this.corteAEliminar();
    if (corte === null) {
      return;
    }
    const filas = this.cosechasPorNumeroCorte().get(corte) ?? [];
    this.corteAEliminar.set(null);
    this.errorEliminar.set(null);
    this.eliminandoCorte.set(true);
    forkJoin(filas.map((fila) => this.loteCampaniaService.eliminarCosecha(this.loteCampaniaId(), fila.id))).subscribe({
      next: () => {
        this.eliminandoCorte.set(false);
        this.aviso.mostrar(`Corte ${corte} eliminado`);
        this.costosRecurso.reload();
        this.margenRecurso.reload();
        this.cosechasRecurso.reload();
        this.cosechaPagina.set(0);
      },
      error: (error: ErrorResponse) => {
        this.eliminandoCorte.set(false);
        this.errorEliminar.set(error.message || 'No se pudo eliminar el corte. Probá de nuevo.');
      },
    });
  }

  pedirEliminarVenta(venta: Venta): void {
    this.errorEliminar.set(null);
    this.ventaAEliminar.set(venta);
  }

  cancelarEliminarVenta(): void {
    this.ventaAEliminar.set(null);
  }

  confirmarEliminarVenta(): void {
    const venta = this.ventaAEliminar();
    if (!venta) {
      return;
    }
    this.ventaAEliminar.set(null);
    this.errorEliminar.set(null);
    this.eliminandoVenta.set(true);
    this.loteCampaniaService.eliminarVenta(venta.id).subscribe({
      next: () => {
        this.eliminandoVenta.set(false);
        this.aviso.mostrar('Venta eliminada');
        this.margenRecurso.reload();
        this.ventasRecurso.reload();
        this.ventaPagina.set(0);
      },
      error: (error: ErrorResponse) => {
        this.eliminandoVenta.set(false);
        this.errorEliminar.set(error.message || 'No se pudo eliminar la venta. Probá de nuevo.');
      },
    });
  }

  onMovimientoCargado(): void {
    this.modalTareaAbierto.set(false);
    this.modalAplicacionAbierto.set(false);
    this.costosRecurso.reload();
    this.margenRecurso.reload();
    this.movimientosRecurso.reload();
    this.movimientoPagina.set(0);
  }

  // Cosecha y venta no aparecen en el feed de movimientos (solo tareas/aplicaciones,
  // docs/plan-frontend.md slice 4), pero sí cambian costoPorUnidad/rendimiento
  // (costos) e ingresoRealizado/márgenes (margen) — y en el caso de venta, además el
  // stock disponible para la próxima venta (cosechas/ventas).
  onCosechaCargada(): void {
    this.cosechaFormCorte.set(null);
    this.costosRecurso.reload();
    this.margenRecurso.reload();
    this.cosechasRecurso.reload();
    this.cosechaPagina.set(0);
  }

  onVentaCargada(): void {
    this.modalVentaAbierto.set(false);
    this.ventaAEditar.set(null);
    this.ventaALiquidar.set(null);
    this.margenRecurso.reload();
    this.ventasRecurso.reload();
    this.ventaPagina.set(0);
  }
}
