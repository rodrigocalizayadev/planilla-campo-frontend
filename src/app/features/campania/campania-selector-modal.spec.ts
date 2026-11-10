import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { environment } from '../../../environments/environment';
import { CampaniaSelectorModal } from './campania-selector-modal';
import { CampaniaService } from './campania.service';
import { CampaniaActivaService } from '../../core/campania/campania-activa.service';
import { EnumsService } from '../../core/enums/enums.service';
import type { Campania, PaginaResponse, ValorEnum } from '../../models';

const ESTADOS: ValorEnum[] = [
  { valor: 'PLANIFICADA', etiqueta: 'Planificada' },
  { valor: 'EN_CURSO', etiqueta: 'En curso' },
  { valor: 'CERRADA', etiqueta: 'Cerrada' },
];

const enumsStub = {
  opciones: () => [],
  etiqueta: (_clave: string, valor: string) => ESTADOS.find((e) => e.valor === valor)?.etiqueta ?? valor,
};

const CAMPANIA_1: Campania = {
  id: 1,
  nombre: '2025/26',
  fechaInicio: '2025-08-01',
  fechaFin: '2026-07-31',
  estado: 'EN_CURSO',
  gastosComercializacionEstimados: '0.12',
  createdAt: '2026-08-01T00:00:00Z',
  updatedAt: '2026-08-01T00:00:00Z',
};

const CAMPANIA_NUEVA: Campania = {
  id: 2,
  nombre: '2026/27',
  fechaInicio: '2026-08-01',
  fechaFin: '2027-07-31',
  estado: 'PLANIFICADA',
  gastosComercializacionEstimados: '0.12',
  createdAt: '2026-08-20T00:00:00Z',
  updatedAt: '2026-08-20T00:00:00Z',
};

function paginaDe(campanias: Campania[]): PaginaResponse<Campania> {
  return {
    content: campanias,
    page: { size: 200, number: 0, totalElements: campanias.length, totalPages: 1 },
  };
}

describe('CampaniaSelectorModal', () => {
  let fixture: ComponentFixture<CampaniaSelectorModal>;
  let http: HttpTestingController;
  let campaniaService: { crear: ReturnType<typeof vi.fn> };
  let campaniaActiva: CampaniaActivaService;

  beforeEach(async () => {
    localStorage.clear();
    campaniaService = { crear: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [CampaniaSelectorModal],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: CampaniaService, useValue: campaniaService },
        { provide: EnumsService, useValue: enumsStub },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CampaniaSelectorModal);
    http = TestBed.inject(HttpTestingController);
    campaniaActiva = TestBed.inject(CampaniaActivaService);
  });

  afterEach(() => http.verify());

  function flushListado(campanias: Campania[] = [CAMPANIA_1]): void {
    http.expectOne(`${environment.apiBaseUrl}/campanias?size=200&sort=id,desc`).flush(paginaDe(campanias));
  }

  it('lista las campañas existentes con su estado', async () => {
    fixture.autoDetectChanges();
    flushListado();
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('2025/26');
    expect(fixture.nativeElement.textContent).toContain('En curso');
  });

  it('muestra el período de cada campaña en formato dd/MM/yyyy', async () => {
    fixture.autoDetectChanges();
    flushListado();
    await fixture.whenStable();

    const periodo = fixture.nativeElement.querySelector('.fila-campania__periodo');
    expect(periodo.textContent.trim()).toBe('01/08/2025 – 31/07/2026');
  });

  it('elegir una campaña la marca como activa y emite cerrado', async () => {
    let cerrado = false;
    fixture.componentInstance.cerrado.subscribe(() => (cerrado = true));
    fixture.autoDetectChanges();
    flushListado();
    await fixture.whenStable();

    const fila: HTMLButtonElement = fixture.nativeElement.querySelector('.fila-campania');
    fila.click();
    await fixture.whenStable();

    expect(campaniaActiva.campania()).toEqual({ id: 1, nombre: '2025/26', estado: 'EN_CURSO' });
    expect(cerrado).toBe(true);
  });

  it('"+ Nueva campaña" cambia a la vista de alta', async () => {
    fixture.autoDetectChanges();
    flushListado();
    await fixture.whenStable();

    const boton: HTMLButtonElement = fixture.nativeElement.querySelector('.selector-modal__nueva');
    boton.click();
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('.modal-caja__titulo')?.textContent).toContain('Nueva campaña');
  });

  it('crea la campaña con el porcentaje convertido a fracción y la marca como activa', async () => {
    campaniaService.crear.mockReturnValue(of(CAMPANIA_NUEVA));
    fixture.autoDetectChanges();
    flushListado();
    await fixture.whenStable();

    (fixture.nativeElement.querySelector('.selector-modal__nueva') as HTMLButtonElement).click();
    await fixture.whenStable();

    const nombre: HTMLInputElement = fixture.nativeElement.querySelector('input[placeholder="2025/26"]');
    nombre.value = '2026/27';
    nombre.dispatchEvent(new Event('input'));
    const [fechaInicio, fechaFin]: HTMLInputElement[] = fixture.nativeElement.querySelectorAll(
      'input[type="date"]',
    );
    fechaInicio.value = '2026-08-01';
    fechaInicio.dispatchEvent(new Event('input'));
    fechaFin.value = '2027-07-31';
    fechaFin.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    const formulario: HTMLFormElement = fixture.nativeElement.querySelector('form');
    formulario.dispatchEvent(new Event('submit', { cancelable: true }));
    // guardar() exitoso dispara recurso.reload() en el mismo tick (docs/resumen-slices.md,
    // slice 2: hay que flushear esa request — y con TestBed.flushEffects() antes de que
    // aparezca en HttpTestingController— antes de esperar whenStable(), o el test cuelga.
    TestBed.flushEffects();
    http.expectOne(`${environment.apiBaseUrl}/campanias?size=200&sort=id,desc`).flush(paginaDe([CAMPANIA_NUEVA]));
    await fixture.whenStable();

    expect(campaniaService.crear).toHaveBeenCalledWith({
      nombre: '2026/27',
      fechaInicio: '2026-08-01',
      fechaFin: '2027-07-31',
      gastosComercializacionEstimados: '0.12',
      cotizacionVigente: null,
    });
    expect(campaniaActiva.campania()).toEqual({ id: 2, nombre: '2026/27', estado: 'PLANIFICADA' });
  });

  it('si se carga la cotización vigente, la manda y la guarda para la próxima', async () => {
    campaniaService.crear.mockReturnValue(of(CAMPANIA_NUEVA));
    fixture.autoDetectChanges();
    flushListado();
    await fixture.whenStable();

    (fixture.nativeElement.querySelector('.selector-modal__nueva') as HTMLButtonElement).click();
    await fixture.whenStable();

    const nombre: HTMLInputElement = fixture.nativeElement.querySelector('input[placeholder="2025/26"]');
    nombre.value = '2026/27';
    nombre.dispatchEvent(new Event('input'));
    const [fechaInicio, fechaFin]: HTMLInputElement[] = fixture.nativeElement.querySelectorAll(
      'input[type="date"]',
    );
    fechaInicio.value = '2026-08-01';
    fechaInicio.dispatchEvent(new Event('input'));
    fechaFin.value = '2027-07-31';
    fechaFin.dispatchEvent(new Event('input'));
    const cotizacion: HTMLInputElement = fixture.nativeElement.querySelectorAll(
      'input.campo__input--numerico',
    )[1];
    cotizacion.value = '1200,5';
    cotizacion.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    const formulario: HTMLFormElement = fixture.nativeElement.querySelector('form');
    formulario.dispatchEvent(new Event('submit', { cancelable: true }));
    TestBed.flushEffects();
    http.expectOne(`${environment.apiBaseUrl}/campanias?size=200&sort=id,desc`).flush(paginaDe([CAMPANIA_NUEVA]));
    await fixture.whenStable();

    expect(campaniaService.crear).toHaveBeenCalledWith(
      expect.objectContaining({ cotizacionVigente: '1200.5' }),
    );
    expect(localStorage.getItem('planilla-campo:ultimo-tipo-cambio')).toBe('1200.5');
  });

  it('no crea la campaña si faltan campos obligatorios', async () => {
    fixture.autoDetectChanges();
    flushListado();
    await fixture.whenStable();

    (fixture.nativeElement.querySelector('.selector-modal__nueva') as HTMLButtonElement).click();
    await fixture.whenStable();

    const formulario: HTMLFormElement = fixture.nativeElement.querySelector('form');
    formulario.dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();

    expect(campaniaService.crear).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelectorAll('.campo__error').length).toBeGreaterThan(0);
  });
});
