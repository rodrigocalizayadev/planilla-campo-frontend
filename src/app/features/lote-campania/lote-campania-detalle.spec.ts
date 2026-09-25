import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { LoteCampaniaDetalle } from './lote-campania-detalle';
import { CampaniaActivaService } from '../../core/campania/campania-activa.service';
import { EnumsService } from '../../core/enums/enums.service';
import { environment } from '../../../environments/environment';
import type { Cosecha, DesgloseCostos, LoteCampania, Margen, Movimiento, PaginaResponse, Venta, ValorEnum } from '../../models';

const TIPOS_TAREA: ValorEnum[] = [{ valor: 'CARPIDA', etiqueta: 'Carpida' }];
const ESTADOS_VENTA: ValorEnum[] = [
  { valor: 'ENTREGADA', etiqueta: 'Entregada' },
  { valor: 'LIQUIDADA', etiqueta: 'Liquidada' },
];

const enumsStub = {
  opciones: () => [],
  etiqueta: (clave: string, valor: string) => {
    if (clave === 'tipoTarea') return TIPOS_TAREA.find((o) => o.valor === valor)?.etiqueta ?? valor;
    if (clave === 'estadoVenta') return ESTADOS_VENTA.find((o) => o.valor === valor)?.etiqueta ?? valor;
    if (clave === 'unidadProduccion') return 'bolsa';
    return valor;
  },
};

const LOTE_CAMPANIA: LoteCampania = {
  id: 4,
  campaniaId: 1,
  loteId: 6,
  loteNombre: 'Lote Norte',
  cultivoId: 1,
  cultivoNombre: 'Cebolla',
  variedad: 'Valenciana',
  ciclo: 1,
  superficieSembradaHa: '1.5',
  unidadProduccion: 'BOLSA',
  fechaSiembra: '2026-03-10',
  fechaTrasplante: null,
  fechaCosechaEsperada: null,
  comentarios: null,
  createdAt: '2026-08-01T00:00:00Z',
  updatedAt: '2026-08-01T00:00:00Z',
};

const COSTOS_SIN_COSECHA: DesgloseCostos = {
  costoInsumosArs: '524260',
  costoInsumosUsd: '18385',
  costoManoObraArs: '9040200',
  costoManoObraUsd: '9040200',
  costoLaborYServiciosArs: '180000',
  costoLaborYServiciosUsd: '180000',
  costoIndirectosArs: '0',
  costoIndirectosUsd: '0',
  costoTareasArs: '9220200',
  costoTareasUsd: '9220200',
  costoTotalArs: '9744460',
  costoTotalUsd: '9238585',
  costoPorHaArs: '6496306.67',
  costoPorHaUsd: '6159056.67',
  superficieSembradaHa: '1.5',
  pctInsumos: '5.38',
  pctManoObra: '92.77',
  pctLaborYServicios: '1.85',
  pctIndirectos: '0',
  costoPorUnidadArs: null,
  costoPorUnidadUsd: null,
  rendimientoPorHa: null,
  tasaDescarte: null,
};

const COSTOS_CON_COSECHA: DesgloseCostos = {
  ...COSTOS_SIN_COSECHA,
  costoPorUnidadArs: '1082.72',
  costoPorUnidadUsd: '1026.51',
  rendimientoPorHa: '20000',
  tasaDescarte: '0.05',
};

const MARGEN: Margen = {
  ingresoRealizadoUsd: '0',
  ingresoRealizadoArs: '0',
  valorPendienteLiqUsd: '0',
  valorPendienteLiqArs: '0',
  valorStockUsd: '0',
  valorStockArs: '0',
  costoTotalUsd: '9238585',
  costoTotalArs: '9744460',
  margenRealizadoUsd: '-9238585',
  margenRealizadoArs: '-9744460',
  margenEstimadoUsd: null,
  margenEstimadoArs: null,
  tieneEstimaciones: false,
};

function pagina<T>(items: T[]): PaginaResponse<T> {
  return {
    content: items,
    page: { size: 200, number: 0, totalElements: items.length, totalPages: 1 },
  };
}

describe('LoteCampaniaDetalle', () => {
  let fixture: ComponentFixture<LoteCampaniaDetalle>;
  let http: HttpTestingController;
  let campaniaActiva: CampaniaActivaService;

  beforeEach(async () => {
    localStorage.clear();

    await TestBed.configureTestingModule({
      imports: [LoteCampaniaDetalle],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: EnumsService, useValue: enumsStub },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoteCampaniaDetalle);
    fixture.componentRef.setInput('id', '4');
    http = TestBed.inject(HttpTestingController);
    campaniaActiva = TestBed.inject(CampaniaActivaService);
    campaniaActiva.establecer({ id: 1, nombre: '2025/26', estado: 'EN_CURSO' });
  });

  afterEach(() => http.verify());

  function flushBase(opciones: {
    costos?: DesgloseCostos;
    cosechas?: Cosecha[];
    ventas?: Venta[];
    movimientos?: Movimiento[];
  } = {}): void {
    http.expectOne(`${environment.apiBaseUrl}/campanias/1/lote-campanias?size=200`).flush(pagina([LOTE_CAMPANIA]));
    http.expectOne(`${environment.apiBaseUrl}/lote-campanias/4/costos`).flush(opciones.costos ?? COSTOS_SIN_COSECHA);
    http.expectOne(`${environment.apiBaseUrl}/lote-campanias/4/margen`).flush(MARGEN);
    http
      .expectOne(`${environment.apiBaseUrl}/lote-campanias/4/movimientos?size=200`)
      .flush(pagina(opciones.movimientos ?? []));
    http.expectOne(`${environment.apiBaseUrl}/lote-campanias/4/cosechas?size=200`).flush(pagina(opciones.cosechas ?? []));
    http.expectOne(`${environment.apiBaseUrl}/lote-campanias/4/ventas?size=200`).flush(pagina(opciones.ventas ?? []));
  }

  it('muestra el encabezado con lote, cultivo, variedad y superficie', async () => {
    fixture.autoDetectChanges();
    flushBase();
    await fixture.whenStable();

    const texto = fixture.nativeElement.textContent;
    expect(texto).toContain('Lote Norte · Cebolla');
    expect(texto).toContain('Valenciana');
    expect(texto).toContain('1.5 ha sembradas');
  });

  it('sin cosecha, muestra el estado vacío del costo por unidad y no muestra el input de oferta', async () => {
    fixture.autoDetectChanges();
    flushBase();
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('Todavía no se puede calcular');
    expect(fixture.nativeElement.querySelector('#precioOfrecido')).toBeNull();
  });

  it('con cosecha, muestra el costo por unidad y calcula el resultado de "me ofrecen"', async () => {
    fixture.autoDetectChanges();
    flushBase({ costos: COSTOS_CON_COSECHA });
    await fixture.whenStable();

    const input: HTMLInputElement = fixture.nativeElement.querySelector('#precioOfrecido');
    expect(input).toBeTruthy();

    input.value = '1200';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    const resultado = fixture.nativeElement.querySelector('.hero-costo__resultado');
    expect(resultado.textContent).toContain('Ganás');
    expect(resultado.className).toContain('valor-positivo');
  });

  it('calcula el stock disponible como cosecha vendible menos lo entregado', async () => {
    const cosechas: Cosecha[] = [
      {
        id: 1,
        loteCampaniaId: 4,
        fecha: '2026-06-01',
        numeroCorte: 1,
        calidad: 'PRIMERA',
        cantidad: '100',
        unidad: 'BOLSA',
        kgEquivalente: '2000',
      },
      {
        id: 2,
        loteCampaniaId: 4,
        fecha: '2026-06-01',
        numeroCorte: 1,
        calidad: 'SEGUNDA',
        cantidad: '20',
        unidad: 'BOLSA',
        kgEquivalente: '400',
      },
      {
        id: 3,
        loteCampaniaId: 4,
        fecha: '2026-06-01',
        numeroCorte: 1,
        calidad: 'DESCARTE',
        cantidad: '0',
        unidad: 'BOLSA',
        kgEquivalente: '100',
      },
    ];
    const ventas: Venta[] = [
      {
        id: 1,
        loteCampaniaId: 4,
        compradorId: 1,
        compradorNombre: 'Comprador X',
        calidad: 'PRIMERA',
        modalidad: 'PRECIO_CERRADO',
        cantidad: '30',
        unidad: 'BOLSA',
        precioUnitario: { importe: '9000', moneda: 'ARS', tipoCambio: '1', importeArs: '9000', importeUsd: '9000' },
        comision: null,
        flete: null,
        otrosGastos: null,
        importeNeto: { importe: '270000', moneda: 'ARS', tipoCambio: '1', importeArs: '270000', importeUsd: '270000' },
        estado: 'LIQUIDADA',
        fechaEntrega: '2026-06-05',
        fechaLiquidacion: '2026-06-05',
      },
    ];
    fixture.autoDetectChanges();
    flushBase({ costos: COSTOS_CON_COSECHA, cosechas, ventas });
    await fixture.whenStable();

    const input: HTMLInputElement = fixture.nativeElement.querySelector('#precioOfrecido');
    input.value = '1200';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    // vendible = 100 + 20 = 120 (descarte no cuenta); entregado = 30 → stock = 90.
    expect(fixture.nativeElement.querySelector('.hero-costo__resultado').textContent).toContain(
      'sobre las 90 unidades en stock',
    );
  });

  it('agrupa las cosechas por corte para el panel', async () => {
    const cosechas: Cosecha[] = [
      {
        id: 1,
        loteCampaniaId: 4,
        fecha: '2026-06-01',
        numeroCorte: 1,
        calidad: 'PRIMERA',
        cantidad: '100',
        unidad: 'BOLSA',
        kgEquivalente: '2000',
      },
      {
        id: 2,
        loteCampaniaId: 4,
        fecha: '2026-06-01',
        numeroCorte: 1,
        calidad: 'SEGUNDA',
        cantidad: '20',
        unidad: 'BOLSA',
        kgEquivalente: '400',
      },
    ];
    fixture.autoDetectChanges();
    flushBase({ costos: COSTOS_CON_COSECHA, cosechas });
    await fixture.whenStable();

    const fila = fixture.nativeElement.querySelector('.fila-cosecha');
    expect(fila.textContent).toContain('Corte 1');
    const cantidades = fila.querySelectorAll('.fila-cosecha__cantidad');
    expect(cantidades[0].textContent).toContain('100');
    expect(cantidades[1].textContent).toContain('20');
  });

  it('sin ventas, muestra el texto que explica el margen realizado negativo', async () => {
    fixture.autoDetectChanges();
    flushBase();
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('Todavía no vendiste nada de este lote');
  });

  it('el feed de movimientos traduce el tipo de tarea y muestra el importe según la moneda elegida', async () => {
    const movimientos: Movimiento[] = [
      {
        id: 1,
        tipo: 'TAREA',
        fecha: '2026-04-01',
        descripcion: 'CARPIDA',
        detalleCalculo: '$ 2.800.000 (total)',
        costoTotal: { importe: '2800000', moneda: 'ARS', tipoCambio: '1', importeArs: '2800000', importeUsd: '2075.5' },
      },
    ];
    fixture.autoDetectChanges();
    flushBase({ movimientos });
    await fixture.whenStable();

    const fila = fixture.nativeElement.querySelector('.fila-movimiento');
    expect(fila.textContent).toContain('Carpida');
    expect(fila.textContent).toContain('$ 2.800.000 (total)');
    // Por defecto la vista está en USD.
    expect(fila.querySelector('.fila-movimiento__importe').textContent).toContain('2.075,50');
  });

  it('con campaña cerrada, oculta los accesos de carga y muestra el aviso de solo lectura', async () => {
    campaniaActiva.establecer({ id: 1, nombre: '2025/26', estado: 'CERRADA' });
    fixture.autoDetectChanges();
    flushBase();
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).not.toContain('+ Cargar tarea');
    expect(fixture.nativeElement.querySelector('.detalle__aviso-cerrada')).toBeTruthy();
  });

  it('abre el formulario de tarea al clickear "+ Cargar tarea"', async () => {
    fixture.autoDetectChanges();
    flushBase();
    await fixture.whenStable();

    const botones: HTMLButtonElement[] = Array.from(fixture.nativeElement.querySelectorAll('button'));
    botones.find((b) => b.textContent?.includes('+ Cargar tarea'))!.click();
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('app-tarea-form')).toBeTruthy();
  });

  it('abre el formulario de cosecha al clickear "+ Cargar corte"', async () => {
    fixture.autoDetectChanges();
    flushBase();
    await fixture.whenStable();

    const botones: HTMLButtonElement[] = Array.from(fixture.nativeElement.querySelectorAll('button'));
    botones.find((b) => b.textContent?.includes('+ Cargar corte'))!.click();
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('app-cosecha-form')).toBeTruthy();
  });

  it('clickear un corte abre CosechaForm precargado con sus filas', async () => {
    const cosechas: Cosecha[] = [
      {
        id: 1,
        loteCampaniaId: 4,
        fecha: '2026-06-01',
        numeroCorte: 1,
        calidad: 'PRIMERA',
        cantidad: '100',
        unidad: 'BOLSA',
        kgEquivalente: '2000',
      },
    ];
    fixture.autoDetectChanges();
    flushBase({ costos: COSTOS_CON_COSECHA, cosechas });
    await fixture.whenStable();

    const fila: HTMLButtonElement = fixture.nativeElement.querySelector('.fila-cosecha');
    fila.click();
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('app-cosecha-form')).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Editar corte 1');
    const numeroCorte: HTMLInputElement = fixture.nativeElement.querySelector('input[inputmode="numeric"]');
    expect(numeroCorte.value).toBe('1');
  });

  it('pide confirmación y elimina un corte completo (una calidad por fila)', async () => {
    const cosechas: Cosecha[] = [
      {
        id: 1,
        loteCampaniaId: 4,
        fecha: '2026-06-01',
        numeroCorte: 1,
        calidad: 'PRIMERA',
        cantidad: '100',
        unidad: 'BOLSA',
        kgEquivalente: '2000',
      },
      {
        id: 2,
        loteCampaniaId: 4,
        fecha: '2026-06-01',
        numeroCorte: 1,
        calidad: 'SEGUNDA',
        cantidad: '20',
        unidad: 'BOLSA',
        kgEquivalente: '400',
      },
    ];
    fixture.autoDetectChanges();
    flushBase({ costos: COSTOS_CON_COSECHA, cosechas });
    await fixture.whenStable();

    const botones: HTMLButtonElement[] = Array.from(fixture.nativeElement.querySelectorAll('button'));
    botones.find((b) => b.textContent?.trim() === 'Eliminar')!.click();
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('¿Eliminar el corte 1?');

    const confirmar: HTMLButtonElement = fixture.nativeElement.querySelector('app-confirmar-accion .boton-baja');
    confirmar.click();

    http.expectOne(`${environment.apiBaseUrl}/lote-campanias/4/cosechas/1`).flush(null);
    http.expectOne(`${environment.apiBaseUrl}/lote-campanias/4/cosechas/2`).flush(null);
    // Recarga tras eliminar: los `httpResource.reload()` recién encolan su request
    // después de un flush de efectos (mismo caveat que un toggle disparado por click).
    TestBed.flushEffects();
    http.expectOne(`${environment.apiBaseUrl}/lote-campanias/4/costos`).flush(COSTOS_SIN_COSECHA);
    http.expectOne(`${environment.apiBaseUrl}/lote-campanias/4/margen`).flush(MARGEN);
    http.expectOne(`${environment.apiBaseUrl}/lote-campanias/4/cosechas?size=200`).flush(pagina([]));
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('app-confirmar-accion')).toBeNull();
  });

  it('abre el formulario de venta al clickear "+ Nueva venta"', async () => {
    fixture.autoDetectChanges();
    flushBase();
    await fixture.whenStable();

    const botones: HTMLButtonElement[] = Array.from(fixture.nativeElement.querySelectorAll('button'));
    botones.find((b) => b.textContent?.includes('+ Nueva venta'))!.click();

    // VentaForm pide sus compradores al montarse (httpResource propio): hay que
    // flushear esa request ANTES de esperar estabilidad, nunca después — llamar
    // whenStable() con una request pendiente sin flushear cuelga el test (mismo
    // caveat documentado en docs/resumen-slices.md slice 2).
    TestBed.flushEffects();
    http.expectOne(`${environment.apiBaseUrl}/compradores?activo=true&size=200`).flush(pagina([]));
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('app-venta-form')).toBeTruthy();
  });

  it('una venta entregada sin liquidar muestra "Completar liquidación" y el importe neto como "—"', async () => {
    const ventaPendiente: Venta = {
      id: 2,
      loteCampaniaId: 4,
      compradorId: 1,
      compradorNombre: 'Comprador Y',
      calidad: 'SEGUNDA',
      modalidad: 'CONSIGNACION',
      cantidad: '10',
      unidad: 'BOLSA',
      precioUnitario: null,
      comision: null,
      flete: null,
      otrosGastos: null,
      importeNeto: null,
      estado: 'ENTREGADA',
      fechaEntrega: '2026-06-05',
      fechaLiquidacion: null,
    };
    fixture.autoDetectChanges();
    flushBase({ ventas: [ventaPendiente] });
    await fixture.whenStable();

    const fila = fixture.nativeElement.querySelector('.fila-venta');
    expect(fila.querySelector('.fila-venta__importe').textContent).toContain('—');
    const botones: HTMLButtonElement[] = Array.from(fila.querySelectorAll('.fila-venta__accion'));
    const boton = botones.find((b) => b.textContent?.includes('Completar liquidación'))!;

    boton.click();
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('app-liquidar-venta-form')).toBeTruthy();
  });

  it('una venta ENTREGADA ofrece "Editar", que abre VentaForm precargado con esa venta', async () => {
    const ventaPendiente: Venta = {
      id: 2,
      loteCampaniaId: 4,
      compradorId: 1,
      compradorNombre: 'Comprador Y',
      calidad: 'SEGUNDA',
      modalidad: 'CONSIGNACION',
      cantidad: '10',
      unidad: 'BOLSA',
      precioUnitario: null,
      comision: null,
      flete: null,
      otrosGastos: null,
      importeNeto: null,
      estado: 'ENTREGADA',
      fechaEntrega: '2026-06-05',
      fechaLiquidacion: null,
    };
    fixture.autoDetectChanges();
    flushBase({ ventas: [ventaPendiente] });
    await fixture.whenStable();

    const botones: HTMLButtonElement[] = Array.from(
      fixture.nativeElement.querySelector('.fila-venta').querySelectorAll('button'),
    );
    botones.find((b) => b.textContent?.trim() === 'Editar')!.click();

    TestBed.flushEffects();
    http.expectOne(`${environment.apiBaseUrl}/compradores?activo=true&size=200`).flush(pagina([]));
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('app-venta-form')).toBeTruthy();
  });

  it('una venta LIQUIDADA no ofrece "Editar", solo "Eliminar"', async () => {
    fixture.autoDetectChanges();
    flushBase({
      ventas: [
        {
          id: 1,
          loteCampaniaId: 4,
          compradorId: 1,
          compradorNombre: 'Comprador X',
          calidad: 'PRIMERA',
          modalidad: 'PRECIO_CERRADO',
          cantidad: '30',
          unidad: 'BOLSA',
          precioUnitario: { importe: '9000', moneda: 'ARS', tipoCambio: '1', importeArs: '9000', importeUsd: '9000' },
          comision: null,
          flete: null,
          otrosGastos: null,
          importeNeto: { importe: '270000', moneda: 'ARS', tipoCambio: '1', importeArs: '270000', importeUsd: '270000' },
          estado: 'LIQUIDADA',
          fechaEntrega: '2026-06-05',
          fechaLiquidacion: '2026-06-05',
        },
      ],
    });
    await fixture.whenStable();

    const botones: HTMLButtonElement[] = Array.from(
      fixture.nativeElement.querySelector('.fila-venta').querySelectorAll('button'),
    );
    expect(botones.some((b) => b.textContent?.trim() === 'Editar')).toBe(false);
    expect(botones.some((b) => b.textContent?.trim() === 'Eliminar')).toBe(true);
  });

  it('pide confirmación y elimina una venta con DELETE /api/ventas/{id}', async () => {
    const venta: Venta = {
      id: 5,
      loteCampaniaId: 4,
      compradorId: 1,
      compradorNombre: 'Comprador Y',
      calidad: 'SEGUNDA',
      modalidad: 'CONSIGNACION',
      cantidad: '10',
      unidad: 'BOLSA',
      precioUnitario: null,
      comision: null,
      flete: null,
      otrosGastos: null,
      importeNeto: null,
      estado: 'ENTREGADA',
      fechaEntrega: '2026-06-05',
      fechaLiquidacion: null,
    };
    fixture.autoDetectChanges();
    flushBase({ ventas: [venta] });
    await fixture.whenStable();

    const botones: HTMLButtonElement[] = Array.from(
      fixture.nativeElement.querySelector('.fila-venta').querySelectorAll('button'),
    );
    botones.find((b) => b.textContent?.trim() === 'Eliminar')!.click();
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('¿Eliminar esta venta?');

    const confirmar: HTMLButtonElement = fixture.nativeElement.querySelector('app-confirmar-accion .boton-baja');
    confirmar.click();

    http.expectOne(`${environment.apiBaseUrl}/ventas/5`).flush(null);
    TestBed.flushEffects();
    http.expectOne(`${environment.apiBaseUrl}/lote-campanias/4/margen`).flush(MARGEN);
    http.expectOne(`${environment.apiBaseUrl}/lote-campanias/4/ventas?size=200`).flush(pagina([]));
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('app-confirmar-accion')).toBeNull();
  });

  it('con campaña cerrada, no ofrece cargar cosecha, venta ni completar liquidación', async () => {
    const ventaPendiente: Venta = {
      id: 2,
      loteCampaniaId: 4,
      compradorId: 1,
      compradorNombre: 'Comprador Y',
      calidad: 'SEGUNDA',
      modalidad: 'CONSIGNACION',
      cantidad: '10',
      unidad: 'BOLSA',
      precioUnitario: null,
      comision: null,
      flete: null,
      otrosGastos: null,
      importeNeto: null,
      estado: 'ENTREGADA',
      fechaEntrega: '2026-06-05',
      fechaLiquidacion: null,
    };
    const cosechas: Cosecha[] = [
      {
        id: 1,
        loteCampaniaId: 4,
        fecha: '2026-06-01',
        numeroCorte: 1,
        calidad: 'PRIMERA',
        cantidad: '100',
        unidad: 'BOLSA',
        kgEquivalente: '2000',
      },
    ];
    campaniaActiva.establecer({ id: 1, nombre: '2025/26', estado: 'CERRADA' });
    fixture.autoDetectChanges();
    flushBase({ costos: COSTOS_CON_COSECHA, cosechas, ventas: [ventaPendiente] });
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).not.toContain('+ Cargar corte');
    expect(fixture.nativeElement.textContent).not.toContain('+ Nueva venta');
    expect(fixture.nativeElement.querySelector('.fila-venta__accion')).toBeNull();
    const filaCosecha: HTMLButtonElement = fixture.nativeElement.querySelector('.fila-cosecha');
    expect(filaCosecha.disabled).toBe(true);
    expect(fixture.nativeElement.textContent).not.toContain('Eliminar');
  });

  it('no encuentra el lote-campaña, muestra el estado vacío con link al tablero', async () => {
    fixture.componentRef.setInput('id', '999');
    fixture.autoDetectChanges();
    http.expectOne(`${environment.apiBaseUrl}/campanias/1/lote-campanias?size=200`).flush(pagina([LOTE_CAMPANIA]));
    // Los recursos por id se piden igual con el id de la ruta, aunque no exista en la
    // lista de la campaña activa — el estado "no encontrado" se decide después.
    http.expectOne(`${environment.apiBaseUrl}/lote-campanias/999/costos`).flush(COSTOS_SIN_COSECHA);
    http.expectOne(`${environment.apiBaseUrl}/lote-campanias/999/margen`).flush(MARGEN);
    http.expectOne(`${environment.apiBaseUrl}/lote-campanias/999/movimientos?size=200`).flush(pagina([]));
    http.expectOne(`${environment.apiBaseUrl}/lote-campanias/999/cosechas?size=200`).flush(pagina([]));
    http.expectOne(`${environment.apiBaseUrl}/lote-campanias/999/ventas?size=200`).flush(pagina([]));
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('.detalle-vacio')).toBeTruthy();
  });
});
