import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { environment } from '../../../environments/environment';
import { AplicacionForm } from './aplicacion-form';
import { LoteCampaniaService } from './lote-campania.service';
import { EnumsService } from '../../core/enums/enums.service';
import { AvisoService } from '../../shared/ui/aviso/aviso.service';
import type { AplicacionInsumo, ErrorResponse, Insumo, PaginaResponse, ValorEnum } from '../../models';

const UNIDADES: ValorEnum[] = [
  { valor: 'KG', etiqueta: 'kg' },
  { valor: 'L', etiqueta: 'L' },
];

const enumsStub = {
  opciones: (clave: string) => (clave === 'unidadMedida' ? UNIDADES : []),
  etiqueta: (_clave: string, valor: string) => valor,
};

const INSUMO_CON_PRECIO: Insumo = {
  id: 5,
  nombre: 'Urea Monto3',
  tipo: 'FERTILIZANTE',
  unidadMedida: 'KG',
  precioReferencia: { importe: '900.5', moneda: 'ARS', tipoCambio: '1' },
  activo: true,
};

const INSUMO_SIN_PRECIO: Insumo = {
  id: 1,
  nombre: 'Urea Min3',
  tipo: 'FERTILIZANTE',
  unidadMedida: 'KG',
  precioReferencia: null,
  activo: true,
};

const APLICACION: AplicacionInsumo = {
  id: 1,
  loteCampaniaId: 4,
  insumoId: 5,
  insumoNombre: 'Urea Monto3',
  fecha: '2026-04-01',
  cantidad: '20',
  unidadMedida: 'KG',
  precioUnitario: { importe: '900.5', moneda: 'ARS', tipoCambio: '1' },
  costoTotal: { importe: '18010', moneda: 'ARS', tipoCambio: '1' },
  createdAt: '2026-08-24T00:00:00Z',
  updatedAt: '2026-08-24T00:00:00Z',
};

function paginaDe<T>(items: T[]): PaginaResponse<T> {
  return {
    content: items,
    page: { size: 200, number: 0, totalElements: items.length, totalPages: 1 },
  };
}

describe('AplicacionForm', () => {
  let fixture: ComponentFixture<AplicacionForm>;
  let http: HttpTestingController;
  let loteCampaniaService: { crearAplicacion: ReturnType<typeof vi.fn> };
  let aviso: AvisoService;

  beforeEach(async () => {
    localStorage.clear();
    loteCampaniaService = { crearAplicacion: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [AplicacionForm],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: LoteCampaniaService, useValue: loteCampaniaService },
        { provide: EnumsService, useValue: enumsStub },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AplicacionForm);
    fixture.componentRef.setInput('loteCampaniaId', 4);
    http = TestBed.inject(HttpTestingController);
    aviso = TestBed.inject(AvisoService);
    vi.spyOn(aviso, 'mostrar');
  });

  afterEach(() => http.verify());

  function cargarInsumos(insumos: Insumo[] = [INSUMO_CON_PRECIO, INSUMO_SIN_PRECIO]): void {
    fixture.autoDetectChanges();
    http.expectOne(`${environment.apiBaseUrl}/insumos?activo=true&size=200`).flush(paginaDe(insumos));
  }

  // [0] insumo, [1] unidad de medida, [2] moneda del precio.
  function selects(): { insumo: HTMLSelectElement; unidad: HTMLSelectElement; moneda: HTMLSelectElement } {
    const [insumo, unidad, moneda]: HTMLSelectElement[] = fixture.nativeElement.querySelectorAll('select');
    return { insumo, unidad, moneda };
  }

  function elegir(select: HTMLSelectElement, valor: string, disparaChange = false): void {
    select.value = valor;
    select.dispatchEvent(new Event('input'));
    if (disparaChange) {
      select.dispatchEvent(new Event('change'));
    }
  }

  function completarInput(selector: string, valor: string): void {
    const input: HTMLInputElement = fixture.nativeElement.querySelector(selector);
    input.value = valor;
    input.dispatchEvent(new Event('input'));
  }

  function enviarFormulario(): void {
    const formulario: HTMLFormElement = fixture.nativeElement.querySelector('form');
    formulario.dispatchEvent(new Event('submit', { cancelable: true }));
  }

  it('lista los insumos activos para elegir', async () => {
    cargarInsumos();
    await fixture.whenStable();

    expect(selects().insumo.textContent).toContain('Urea Monto3');
    expect(selects().insumo.textContent).toContain('Urea Min3');
  });

  it('al elegir un insumo con precio de referencia, autocompleta unidad, precio y moneda', async () => {
    cargarInsumos();
    await fixture.whenStable();

    elegir(selects().insumo, '5', true);
    await fixture.whenStable();

    expect(selects().unidad.value).toBe('KG');
    const precio: HTMLInputElement = fixture.nativeElement.querySelector('.campo-precio__monto');
    expect(precio.value).toBe('900,50');
  });

  it('al elegir un insumo sin precio de referencia, no pisa lo que ya estaba cargado', async () => {
    cargarInsumos();
    await fixture.whenStable();

    elegir(selects().insumo, '5', true);
    await fixture.whenStable();
    elegir(selects().insumo, '1', true);
    await fixture.whenStable();

    const precio: HTMLInputElement = fixture.nativeElement.querySelector('.campo-precio__monto');
    expect(precio.value).toBe('900,50');
  });

  it('calcula el total en vivo multiplicando cantidad por precio', async () => {
    cargarInsumos();
    await fixture.whenStable();

    elegir(selects().insumo, '5', true);
    completarInput('input[inputmode="decimal"].campo__input--numerico', '20');
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('.total-en-vivo__valor').textContent).toContain('18.010');
  });

  it('no guarda sin cantidad ni unidad', async () => {
    cargarInsumos();
    await fixture.whenStable();

    enviarFormulario();
    await fixture.whenStable();

    expect(loteCampaniaService.crearAplicacion).not.toHaveBeenCalled();
  });

  it('con datos válidos arma el payload con precioUnitario como Monto', async () => {
    loteCampaniaService.crearAplicacion.mockReturnValue(of(APLICACION));
    cargarInsumos();
    await fixture.whenStable();

    elegir(selects().insumo, '5', true);
    completarInput('input[inputmode="decimal"].campo__input--numerico', '20');
    await fixture.whenStable();

    enviarFormulario();
    await fixture.whenStable();

    expect(loteCampaniaService.crearAplicacion).toHaveBeenCalledWith(4, {
      insumoId: 5,
      fecha: expect.any(String),
      cantidad: '20',
      unidadMedida: 'KG',
      precioUnitario: { importe: '900.5', moneda: 'ARS', tipoCambio: '1' },
    });
    expect(aviso.mostrar).toHaveBeenCalledWith('Aplicación cargada');
    expect(localStorage.getItem('planilla-campo:ultimo-tipo-cambio')).toBe('1');
  });

  it('muestra el error del servidor en el toast rojo si falla', async () => {
    const error: ErrorResponse = {
      timestamp: new Date().toISOString(),
      status: 422,
      code: 'CAMPANIA_CERRADA',
      message: 'La campaña está cerrada',
      details: [],
    };
    loteCampaniaService.crearAplicacion.mockReturnValue(throwError(() => error));
    cargarInsumos();
    await fixture.whenStable();

    elegir(selects().insumo, '5', true);
    completarInput('input[inputmode="decimal"].campo__input--numerico', '20');
    await fixture.whenStable();

    enviarFormulario();
    await fixture.whenStable();

    expect(aviso.mostrar).toHaveBeenCalledWith('La campaña está cerrada', 'error');
  });
});
