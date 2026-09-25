import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { environment } from '../../../environments/environment';
import { Tablero } from './tablero';
import { CampaniaActivaService } from '../../core/campania/campania-activa.service';
import { CampaniaService } from '../campania/campania.service';
import { EnumsService } from '../../core/enums/enums.service';
import { AvisoService } from '../../shared/ui/aviso/aviso.service';
import type { Campania, LoteCampania, PaginaResponse, ResumenCampania, ValorEnum } from '../../models';

const ESTADOS: ValorEnum[] = [
  { valor: 'PLANIFICADA', etiqueta: 'Planificada' },
  { valor: 'EN_CURSO', etiqueta: 'En curso' },
  { valor: 'CERRADA', etiqueta: 'Cerrada' },
];

const enumsStub = {
  opciones: () => [],
  etiqueta: (_clave: string, valor: string) => ESTADOS.find((e) => e.valor === valor)?.etiqueta ?? valor,
};

const CAMPANIA: Campania = {
  id: 1,
  nombre: '2025/26',
  fechaInicio: '2025-08-01',
  fechaFin: '2026-07-31',
  estado: 'EN_CURSO',
  gastosComercializacionEstimados: '0.12',
  createdAt: '2026-08-01T00:00:00Z',
  updatedAt: '2026-08-01T00:00:00Z',
};

const RESUMEN: ResumenCampania = {
  campaniaId: 1,
  nombreCampania: '2025/26',
  lotes: [
    {
      loteCampaniaId: 4,
      nombreLote: 'Lote Norte',
      nombreCultivo: 'Cebolla',
      superficieSembradaHa: '1.5',
      costoInsumosArs: '100000',
      costoInsumosUsd: '100',
      costoTareasArs: '200000',
      costoTareasUsd: '200',
      costoIndirectosArs: '50000',
      costoIndirectosUsd: '50',
      costoTotalArs: '350000',
      costoTotalUsd: '350',
      costoPorHaArs: '233330',
      costoPorHaUsd: '233.33',
      ingresoRealizadoArs: '0',
      ingresoRealizadoUsd: '0',
      margenRealizadoArs: '-350000',
      margenRealizadoUsd: '-350',
    },
    {
      loteCampaniaId: 1,
      nombreLote: 'Lote Norte',
      nombreCultivo: 'Cebolla Monto',
      superficieSembradaHa: '3',
      costoInsumosArs: '0',
      costoInsumosUsd: '0',
      costoTareasArs: '0',
      costoTareasUsd: '0',
      costoIndirectosArs: '0',
      costoIndirectosUsd: '0',
      costoTotalArs: '0',
      costoTotalUsd: '0',
      costoPorHaArs: '0',
      costoPorHaUsd: '0',
      ingresoRealizadoArs: '0',
      ingresoRealizadoUsd: '0',
      margenRealizadoArs: '0',
      margenRealizadoUsd: '0',
    },
  ],
  costoTotalCampaniaArs: '350000',
  costoTotalCampaniaUsd: '350',
  superficieTotalHa: '4.5',
  costoPorHaCampaniaArs: '77780',
  costoPorHaCampaniaUsd: '77.78',
  ingresoRealizadoCampaniaArs: '0',
  ingresoRealizadoCampaniaUsd: '0',
  margenRealizadoCampaniaArs: '-350000',
  margenRealizadoCampaniaUsd: '-350',
};

const LOTE_CAMPANIAS: LoteCampania[] = [
  {
    id: 4,
    campaniaId: 1,
    loteId: 6,
    loteNombre: 'Lote Norte',
    cultivoId: 1,
    cultivoNombre: 'Cebolla',
    variedad: null,
    ciclo: 1,
    superficieSembradaHa: '1.5',
    unidadProduccion: 'BOLSA',
    fechaSiembra: null,
    fechaTrasplante: null,
    fechaCosechaEsperada: null,
    comentarios: null,
    createdAt: '2026-08-01T00:00:00Z',
    updatedAt: '2026-08-01T00:00:00Z',
  },
  {
    id: 1,
    campaniaId: 1,
    loteId: 6,
    loteNombre: 'Lote Norte',
    cultivoId: 8,
    cultivoNombre: 'Cebolla Monto',
    variedad: null,
    ciclo: 2,
    superficieSembradaHa: '3',
    unidadProduccion: 'BOLSA',
    fechaSiembra: null,
    fechaTrasplante: null,
    fechaCosechaEsperada: null,
    comentarios: null,
    createdAt: '2026-08-01T00:00:00Z',
    updatedAt: '2026-08-01T00:00:00Z',
  },
];

function paginaDe<T>(items: T[]): PaginaResponse<T> {
  return {
    content: items,
    page: { size: 200, number: 0, totalElements: items.length, totalPages: 1 },
  };
}

describe('Tablero', () => {
  let fixture: ComponentFixture<Tablero>;
  let http: HttpTestingController;
  let campaniaActiva: CampaniaActivaService;
  let campaniaService: {
    cambiarEstado: ReturnType<typeof vi.fn>;
    cerrar: ReturnType<typeof vi.fn>;
    actualizar: ReturnType<typeof vi.fn>;
  };
  let aviso: AvisoService;

  beforeEach(async () => {
    localStorage.clear();
    campaniaService = { cambiarEstado: vi.fn(), cerrar: vi.fn(), actualizar: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [Tablero],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: CampaniaService, useValue: campaniaService },
        { provide: EnumsService, useValue: enumsStub },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Tablero);
    http = TestBed.inject(HttpTestingController);
    campaniaActiva = TestBed.inject(CampaniaActivaService);
    aviso = TestBed.inject(AvisoService);
    vi.spyOn(aviso, 'mostrar');
  });

  afterEach(() => http.verify());

  function establecer(estado: string): void {
    campaniaActiva.establecer({ id: 1, nombre: '2025/26', estado });
  }

  function flushDatos(): void {
    http.expectOne(`${environment.apiBaseUrl}/campanias/1`).flush(CAMPANIA);
    http.expectOne(`${environment.apiBaseUrl}/campanias/1/resumen`).flush(RESUMEN);
    http.expectOne(`${environment.apiBaseUrl}/campanias/1/lote-campanias?size=200`).flush(paginaDe(LOTE_CAMPANIAS));
  }

  it('sin campaña activa, muestra el estado vacío y abre el selector desde el botón', async () => {
    fixture.autoDetectChanges();
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('.tablero-vacio')).toBeTruthy();

    const boton: HTMLButtonElement = fixture.nativeElement.querySelector('.tablero-vacio button');
    boton.click();

    expect(campaniaActiva.selectorAbierto()).toBe(true);
  });

  it('con campaña activa en curso, muestra los indicadores y la tabla con la anotación de ciclo', async () => {
    establecer('EN_CURSO');
    fixture.autoDetectChanges();
    flushDatos();
    await fixture.whenStable();

    const texto = fixture.nativeElement.textContent;
    expect(texto).toContain('2025/26');
    expect(texto).toContain('En curso');

    const filas = fixture.nativeElement.querySelectorAll('.fila-catalogo--tablero');
    expect(filas.length).toBe(2);
    expect(fixture.nativeElement.querySelector('.fila-catalogo__detalle')?.textContent).not.toContain('ciclo');
    expect(filas[1].querySelector('.fila-catalogo__detalle')?.textContent).toContain('ciclo 2');
    expect(fixture.nativeElement.querySelector('.tablero__aviso-cerrada')).toBeNull();
  });

  it('campaña cerrada: oculta "Sembrar un lote" y muestra el aviso de solo lectura', async () => {
    establecer('CERRADA');
    fixture.autoDetectChanges();
    flushDatos();
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).not.toContain('+ Sembrar un lote');
    expect(fixture.nativeElement.querySelector('.tablero__aviso-cerrada')).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Reabrir campaña');
  });

  it('cerrar campaña llama al servicio y actualiza el estado global', async () => {
    establecer('EN_CURSO');
    campaniaService.cerrar.mockReturnValue(of({ id: 1, nombre: '2025/26', estado: 'CERRADA' } as Campania));
    fixture.autoDetectChanges();
    flushDatos();
    await fixture.whenStable();

    const botones: HTMLButtonElement[] = Array.from(fixture.nativeElement.querySelectorAll('.tablero__acciones button'));
    const cerrarBoton = botones.find((b) => b.textContent?.includes('Cerrar campaña'))!;
    cerrarBoton.click();
    // cerrarCampania() exitoso dispara campaniaRecurso.reload() en el mismo tick —
    // hay que flushear esa request antes de esperar whenStable(), o el test cuelga
    // (mismo patrón documentado en docs/resumen-slices.md, slice 2).
    TestBed.flushEffects();
    http.expectOne(`${environment.apiBaseUrl}/campanias/1`).flush({ ...CAMPANIA, estado: 'CERRADA' });
    await fixture.whenStable();

    expect(campaniaService.cerrar).toHaveBeenCalledWith(1);
    expect(campaniaActiva.campania()?.estado).toBe('CERRADA');
    expect(aviso.mostrar).toHaveBeenCalledWith('Campaña cerrada: queda de solo lectura, no admite nuevos movimientos');
  });

  it('el selector de moneda cambia los indicadores y la tabla de Usd a Ars', async () => {
    establecer('EN_CURSO');
    fixture.autoDetectChanges();
    flushDatos();
    await fixture.whenStable();

    // Por defecto en dólares: el costo total del primer indicador es 350.
    expect(fixture.nativeElement.querySelector('.indicador__valor')?.textContent).toContain('350');

    const [botonArs]: HTMLButtonElement[] = fixture.nativeElement.querySelectorAll('.selector-moneda__opcion');
    botonArs.click();
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('.indicador__valor')?.textContent).toContain('350.000');
    const filas = fixture.nativeElement.querySelectorAll('.fila-catalogo--tablero');
    expect(filas[0].textContent).toContain('350.000');
  });

  it('sin cotización cargada, el botón de TC lo indica y permite cargarla', async () => {
    establecer('EN_CURSO');
    fixture.autoDetectChanges();
    flushDatos();
    await fixture.whenStable();

    const botonTc: HTMLButtonElement = fixture.nativeElement.querySelector('.tablero__tc');
    expect(botonTc.textContent).toContain('Sin cotización cargada');

    campaniaService.actualizar.mockReturnValue(of({ ...CAMPANIA, cotizacionVigente: '1200.5' } as Campania));
    botonTc.click();
    await fixture.whenStable();

    const input: HTMLInputElement = fixture.nativeElement.querySelector('.tablero__tc-form input');
    input.value = '1200,5';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    const formulario: HTMLFormElement = fixture.nativeElement.querySelector('.tablero__tc-form');
    formulario.dispatchEvent(new Event('submit', { cancelable: true }));
    TestBed.flushEffects();
    http.expectOne(`${environment.apiBaseUrl}/campanias/1`).flush({ ...CAMPANIA, cotizacionVigente: '1200.5' });
    await fixture.whenStable();

    expect(campaniaService.actualizar).toHaveBeenCalledWith(1, {
      nombre: CAMPANIA.nombre,
      fechaInicio: CAMPANIA.fechaInicio,
      fechaFin: CAMPANIA.fechaFin,
      gastosComercializacionEstimados: '0.12',
      cotizacionVigente: '1200.5',
    });
    expect(aviso.mostrar).toHaveBeenCalledWith('Cotización actualizada');
  });
});
