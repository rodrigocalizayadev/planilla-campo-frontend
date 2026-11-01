import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { environment } from '../../../environments/environment';
import { CostosIndirectosListado } from './costos-indirectos-listado';
import { CostosIndirectosService } from './costos-indirectos.service';
import { CampaniaActivaService } from '../../core/campania/campania-activa.service';
import { MonedaVistaService } from '../../core/moneda/moneda-vista.service';
import { EnumsService } from '../../core/enums/enums.service';
import { AvisoService } from '../../shared/ui/aviso/aviso.service';
import type { CostoIndirecto, LoteCampania, PaginaResponse, ValorEnum } from '../../models';

const CRITERIOS: ValorEnum[] = [
  { valor: 'POR_HA', etiqueta: 'Por hectárea' },
  { valor: 'MANUAL', etiqueta: 'Manual' },
];

const enumsStub = {
  opciones: () => [],
  etiqueta: (_clave: string, valor: string) => CRITERIOS.find((c) => c.valor === valor)?.etiqueta ?? valor,
};

const LOTES: LoteCampania[] = [
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
    id: 5,
    campaniaId: 1,
    loteId: 7,
    loteNombre: 'Lote Sur',
    cultivoId: 1,
    cultivoNombre: 'Cebolla',
    variedad: null,
    ciclo: 1,
    superficieSembradaHa: '0.5',
    unidadProduccion: 'BOLSA',
    fechaSiembra: null,
    fechaTrasplante: null,
    fechaCosechaEsperada: null,
    comentarios: null,
    createdAt: '2026-08-01T00:00:00Z',
    updatedAt: '2026-08-01T00:00:00Z',
  },
];

const COSTOS: CostoIndirecto[] = [
  {
    id: 1,
    campaniaId: 1,
    concepto: 'Canon de riego',
    fecha: '2026-03-15',
    criterioProrrateo: 'POR_HA',
    importe: { importe: '100000', moneda: 'ARS', tipoCambio: '1350', importeArs: '100000', importeUsd: '74.07' },
    partes: [
      {
        id: 1,
        loteCampaniaId: 4,
        importe: { importe: '75000', moneda: 'ARS', tipoCambio: '1350', importeArs: '75000', importeUsd: '55.56' },
      },
      {
        id: 2,
        loteCampaniaId: 5,
        importe: { importe: '25000', moneda: 'ARS', tipoCambio: '1350', importeArs: '25000', importeUsd: '18.52' },
      },
    ],
  },
  {
    id: 2,
    campaniaId: 1,
    loteCampaniaId: 4,
    concepto: 'Limpieza de canales',
    fecha: '2026-03-20',
    criterioProrrateo: 'POR_HA',
    importe: { importe: '10000', moneda: 'ARS', tipoCambio: '1350', importeArs: '10000', importeUsd: '7.41' },
    partes: [],
  },
];

function paginaDe<T>(items: T[]): PaginaResponse<T> {
  return {
    content: items,
    page: { size: 200, number: 0, totalElements: items.length, totalPages: 1 },
  };
}

describe('CostosIndirectosListado', () => {
  let fixture: ComponentFixture<CostosIndirectosListado>;
  let http: HttpTestingController;
  let campaniaActiva: CampaniaActivaService;
  let service: { eliminar: ReturnType<typeof vi.fn> };
  let aviso: AvisoService;

  beforeEach(async () => {
    localStorage.clear();
    service = { eliminar: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [CostosIndirectosListado],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: CostosIndirectosService, useValue: service },
        { provide: EnumsService, useValue: enumsStub },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CostosIndirectosListado);
    http = TestBed.inject(HttpTestingController);
    campaniaActiva = TestBed.inject(CampaniaActivaService);
    aviso = TestBed.inject(AvisoService);
    vi.spyOn(aviso, 'mostrar');
  });

  afterEach(() => http.verify());

  function flushDatos(): void {
    http.expectOne(`${environment.apiBaseUrl}/campanias/1/costos-indirectos?size=200`).flush(paginaDe(COSTOS));
    http.expectOne(`${environment.apiBaseUrl}/campanias/1/lote-campanias?size=200`).flush(paginaDe(LOTES));
  }

  it('sin campaña activa, muestra el estado vacío', async () => {
    fixture.autoDetectChanges();
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('.costos-indirectos-vacio')).toBeTruthy();
  });

  it('lista los costos con su etiqueta de imputación y el reparto por lote', async () => {
    campaniaActiva.establecer({ id: 1, nombre: '2025/26', estado: 'EN_CURSO' });
    fixture.autoDetectChanges();
    flushDatos();
    await fixture.whenStable();

    const monedaVista = TestBed.inject(MonedaVistaService);
    monedaVista.establecer('ARS');
    await fixture.whenStable();

    const texto = fixture.nativeElement.textContent;
    expect(texto).toContain('Canon de riego');
    expect(texto).toContain('A prorratear · Por hectárea');
    expect(texto).toContain('Limpieza de canales');
    expect(texto).toContain('Directo a Lote Norte');

    // Reparto: lote 4 recibe 75.000 (parte de Canon) + 10.000 (directo) = 85.000; lote 5 recibe 25.000.
    const filasReparto = fixture.nativeElement.querySelectorAll('.fila-reparto:not(.fila-reparto--header)');
    expect(filasReparto[0].textContent).toContain('85.000');
    expect(filasReparto[1].textContent).toContain('25.000');
  });

  it('eliminar pide confirmación antes de llamar al servicio', async () => {
    campaniaActiva.establecer({ id: 1, nombre: '2025/26', estado: 'EN_CURSO' });
    service.eliminar.mockReturnValue(of(undefined));
    fixture.autoDetectChanges();
    flushDatos();
    await fixture.whenStable();

    const botones: HTMLButtonElement[] = fixture.nativeElement.querySelectorAll('.fila-catalogo__accion');
    botones[0].click();
    await fixture.whenStable();

    const dialogo = fixture.nativeElement.querySelector('.confirmar-caja');
    expect(dialogo?.textContent).toContain('Canon de riego');
    expect(service.eliminar).not.toHaveBeenCalled();

    const confirmar: HTMLButtonElement = dialogo.querySelector('.boton-baja');
    confirmar.click();
    // eliminar() exitoso dispara costosRecurso.reload() en el mismo tick — hay que
    // flushear esa request antes de esperar whenStable(), o el test cuelga (mismo
    // patrón documentado en docs/resumen-slices.md, slice 2).
    TestBed.flushEffects();
    http.expectOne(`${environment.apiBaseUrl}/campanias/1/costos-indirectos?size=200`).flush(paginaDe([COSTOS[1]]));
    await fixture.whenStable();

    expect(service.eliminar).toHaveBeenCalledWith(1, 1);
    expect(aviso.mostrar).toHaveBeenCalledWith('Canon de riego eliminado');
  });

  it('cancelar la confirmación de eliminar no llama al servicio', async () => {
    campaniaActiva.establecer({ id: 1, nombre: '2025/26', estado: 'EN_CURSO' });
    fixture.autoDetectChanges();
    flushDatos();
    await fixture.whenStable();

    const botones: HTMLButtonElement[] = fixture.nativeElement.querySelectorAll('.fila-catalogo__accion');
    botones[0].click();
    await fixture.whenStable();

    const cancelar: HTMLButtonElement = fixture.nativeElement.querySelector(
      '.confirmar-caja .boton-secundario',
    );
    cancelar.click();
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('.confirmar-caja')).toBeFalsy();
    expect(service.eliminar).not.toHaveBeenCalled();
  });

  it('con la campaña cerrada, oculta "+ Nuevo costo indirecto" y las acciones de eliminar', async () => {
    campaniaActiva.establecer({ id: 1, nombre: '2025/26', estado: 'CERRADA' });
    fixture.autoDetectChanges();
    flushDatos();
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).not.toContain('+ Nuevo costo indirecto');
    expect(fixture.nativeElement.querySelector('.boton-baja')).toBeNull();
  });
});
