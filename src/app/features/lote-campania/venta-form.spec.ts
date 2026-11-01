import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { environment } from '../../../environments/environment';
import { VentaForm } from './venta-form';
import { LoteCampaniaService } from './lote-campania.service';
import { EnumsService } from '../../core/enums/enums.service';
import { AvisoService } from '../../shared/ui/aviso/aviso.service';
import type { Comprador, ErrorResponse, PaginaResponse, ValorEnum, Venta } from '../../models';

const CALIDADES: ValorEnum[] = [
  { valor: 'PRIMERA', etiqueta: 'Primera' },
  { valor: 'SEGUNDA', etiqueta: 'Segunda' },
  { valor: 'DESCARTE', etiqueta: 'Descarte' },
];

const enumsStub = {
  opciones: (clave: string) => (clave === 'calidad' ? CALIDADES : []),
  etiqueta: (_clave: string, valor: string) => valor,
};

const COMPRADOR: Comprador = {
  id: 6,
  nombre: 'Clismar',
  cuit: null,
  contacto: null,
  telefono: null,
  localidad: null,
  modalidadHabitual: null,
  activo: true,
};

const VENTA: Venta = {
  id: 1,
  loteCampaniaId: 4,
  compradorId: 6,
  compradorNombre: 'Clismar',
  calidad: 'PRIMERA',
  modalidad: 'PRECIO_CERRADO',
  cantidad: '50',
  unidad: 'BOLSA',
  precioUnitario: { importe: '9000', moneda: 'ARS', tipoCambio: '1' },
  comision: null,
  flete: null,
  otrosGastos: null,
  importeNeto: { importe: '450000', moneda: 'ARS', tipoCambio: '1' },
  cobradoArs: '0',
  cantidadLiquidada: '0',
  estado: 'LIQUIDADA',
  fechaEntrega: '2026-07-25',
  fechaLiquidacion: '2026-07-25',
};

function paginaDe<T>(items: T[]): PaginaResponse<T> {
  return {
    content: items,
    page: { size: 200, number: 0, totalElements: items.length, totalPages: 1 },
  };
}

describe('VentaForm', () => {
  let fixture: ComponentFixture<VentaForm>;
  let http: HttpTestingController;
  let loteCampaniaService: { crearVenta: ReturnType<typeof vi.fn>; actualizarVenta: ReturnType<typeof vi.fn> };
  let aviso: AvisoService;

  beforeEach(async () => {
    localStorage.clear();
    loteCampaniaService = { crearVenta: vi.fn(), actualizarVenta: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [VentaForm],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: LoteCampaniaService, useValue: loteCampaniaService },
        { provide: EnumsService, useValue: enumsStub },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(VentaForm);
    fixture.componentRef.setInput('loteCampaniaId', 4);
    fixture.componentRef.setInput('disponiblePorCalidad', { PRIMERA: 50, SEGUNDA: 20 });
    http = TestBed.inject(HttpTestingController);
    aviso = TestBed.inject(AvisoService);
    vi.spyOn(aviso, 'mostrar');
  });

  afterEach(() => http.verify());

  function cargarCompradores(compradores: Comprador[] = [COMPRADOR]): void {
    fixture.autoDetectChanges();
    http.expectOne(`${environment.apiBaseUrl}/compradores?activo=true&size=200`).flush(paginaDe(compradores));
  }

  // [0] comprador, [1] calidad, [2] moneda del precio (solo si PRECIO_CERRADO está activo).
  function selects(): { comprador: HTMLSelectElement; calidad: HTMLSelectElement; moneda?: HTMLSelectElement } {
    const [comprador, calidad, moneda]: HTMLSelectElement[] = fixture.nativeElement.querySelectorAll('select');
    return { comprador, calidad, moneda };
  }

  function elegir(select: HTMLSelectElement, valor: string): void {
    select.value = valor;
    select.dispatchEvent(new Event('input'));
  }

  function completarInput(selector: string, valor: string): void {
    const input: HTMLInputElement = fixture.nativeElement.querySelector(selector);
    input.value = valor;
    input.dispatchEvent(new Event('input'));
  }

  // Cantidad y tipo de cambio comparten `input[inputmode="decimal"].campo__input--numerico`
  // (el segundo solo existe en modalidad Precio cerrado) — mismo patrón que
  // tarea-form.spec.ts para distinguirlos sin ambigüedad.
  function camposNumericos(): HTMLInputElement[] {
    return Array.from(
      fixture.nativeElement.querySelectorAll('input[inputmode="decimal"].campo__input--numerico'),
    );
  }

  function elegirModalidad(etiqueta: string): void {
    const botones: HTMLButtonElement[] = Array.from(fixture.nativeElement.querySelectorAll('.selector-modo__opcion'));
    botones.find((b) => b.textContent?.trim() === etiqueta)!.click();
  }

  function enviarFormulario(): void {
    const formulario: HTMLFormElement = fixture.nativeElement.querySelector('form');
    formulario.dispatchEvent(new Event('submit', { cancelable: true }));
  }

  it('lista los compradores activos, sin ofrecer la calidad Descarte', async () => {
    cargarCompradores();
    await fixture.whenStable();

    expect(selects().comprador.textContent).toContain('Clismar');
    expect(selects().calidad.textContent).toContain('Primera');
    expect(selects().calidad.textContent).not.toContain('Descarte');
  });

  it('arranca en Precio cerrado, pidiendo el precio; Consignación lo oculta', async () => {
    cargarCompradores();
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('Precio unitario');

    elegirModalidad('Consignación');
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).not.toContain('Precio unitario');
    expect(fixture.nativeElement.textContent).toContain('liquidación');
  });

  it('no deja vender más que el stock disponible de la calidad elegida', async () => {
    cargarCompradores();
    await fixture.whenStable();

    elegir(selects().comprador, '6');
    elegir(selects().calidad, 'SEGUNDA');
    camposNumericos()[0].value = '999';
    camposNumericos()[0].dispatchEvent(new Event('input'));
    await fixture.whenStable();

    enviarFormulario();
    await fixture.whenStable();

    expect(loteCampaniaService.crearVenta).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('No hay tanto stock');
  });

  it('a precio cerrado, arma el payload con precioUnitario como Monto', async () => {
    loteCampaniaService.crearVenta.mockReturnValue(of(VENTA));
    cargarCompradores();
    await fixture.whenStable();

    elegir(selects().comprador, '6');
    elegir(selects().calidad, 'PRIMERA');
    camposNumericos()[0].value = '50';
    camposNumericos()[0].dispatchEvent(new Event('input'));
    completarInput('.campo-precio__monto', '9000');
    camposNumericos()[1].value = '1';
    camposNumericos()[1].dispatchEvent(new Event('input'));
    await fixture.whenStable();

    enviarFormulario();
    await fixture.whenStable();

    expect(loteCampaniaService.crearVenta).toHaveBeenCalledWith(
      4,
      expect.objectContaining({
        compradorId: 6,
        calidad: 'PRIMERA',
        cantidad: '50',
        modalidad: 'PRECIO_CERRADO',
        precioUnitario: { importe: '9000', moneda: 'ARS', tipoCambio: '1' },
      }),
    );
    expect(aviso.mostrar).toHaveBeenCalledWith('Venta cargada');
  });

  it('en consignación, arma el payload sin precioUnitario', async () => {
    loteCampaniaService.crearVenta.mockReturnValue(of(VENTA));
    cargarCompradores();
    await fixture.whenStable();

    elegirModalidad('Consignación');
    elegir(selects().comprador, '6');
    elegir(selects().calidad, 'SEGUNDA');
    completarInput('input[inputmode="decimal"].campo__input--numerico', '10');
    await fixture.whenStable();

    enviarFormulario();
    await fixture.whenStable();

    expect(loteCampaniaService.crearVenta).toHaveBeenCalledWith(4, {
      compradorId: 6,
      fechaEntrega: expect.any(String),
      calidad: 'SEGUNDA',
      cantidad: '10',
      modalidad: 'CONSIGNACION',
    });
    expect(aviso.mostrar).toHaveBeenCalledWith('Entrega registrada');
  });

  it('muestra el error del servidor en el toast rojo si falla (ej. stock insuficiente en el backend)', async () => {
    const error: ErrorResponse = {
      timestamp: new Date().toISOString(),
      status: 422,
      code: 'STOCK_INSUFICIENTE',
      message: 'La cantidad a vender supera el stock disponible',
      details: [],
    };
    loteCampaniaService.crearVenta.mockReturnValue(throwError(() => error));
    cargarCompradores();
    await fixture.whenStable();

    elegirModalidad('Consignación');
    elegir(selects().comprador, '6');
    elegir(selects().calidad, 'SEGUNDA');
    completarInput('input[inputmode="decimal"].campo__input--numerico', '10');
    await fixture.whenStable();

    enviarFormulario();
    await fixture.whenStable();

    expect(aviso.mostrar).toHaveBeenCalledWith('La cantidad a vender supera el stock disponible', 'error');
  });

  describe('edición de una venta ENTREGADA', () => {
    const VENTA_ENTREGADA: Venta = {
      id: 3,
      loteCampaniaId: 4,
      compradorId: 6,
      compradorNombre: 'Clismar',
      calidad: 'SEGUNDA',
      modalidad: 'CONSIGNACION',
      cantidad: '15',
      unidad: 'BOLSA',
      precioUnitario: null,
      comision: null,
      flete: null,
      otrosGastos: null,
      importeNeto: null,
      cobradoArs: '0',
      cantidadLiquidada: '0',
      estado: 'ENTREGADA',
      fechaEntrega: '2026-07-25',
      fechaLiquidacion: null,
    };

    beforeEach(() => {
      fixture.componentRef.setInput('venta', VENTA_ENTREGADA);
    });

    it('precarga comprador, calidad, fecha y cantidad; oculta el selector de modalidad', async () => {
      cargarCompradores();
      await fixture.whenStable();

      expect(selects().comprador.value).toBe('6');
      expect(selects().calidad.value).toBe('SEGUNDA');
      expect(fixture.nativeElement.textContent).not.toContain('Precio cerrado');
      expect(fixture.nativeElement.querySelectorAll('.selector-modo').length).toBe(0);
      const [cantidad]: HTMLInputElement[] = camposNumericos();
      expect(cantidad.value).toBe('15');
    });

    it('suma de vuelta la cantidad propia al stock disponible de su calidad', async () => {
      cargarCompradores();
      await fixture.whenStable();

      // disponiblePorCalidad.SEGUNDA = 20 (fixture del describe exterior) + 15 propias = 35.
      expect(fixture.nativeElement.textContent).toContain('Disponible: 35');
    });

    it('al guardar, llama actualizarVenta con el id de la venta, sin precioUnitario', async () => {
      loteCampaniaService.actualizarVenta.mockReturnValue(of(VENTA_ENTREGADA));
      cargarCompradores();
      await fixture.whenStable();

      enviarFormulario();
      await fixture.whenStable();

      expect(loteCampaniaService.actualizarVenta).toHaveBeenCalledWith(3, {
        compradorId: 6,
        fechaEntrega: '2026-07-25',
        calidad: 'SEGUNDA',
        cantidad: '15',
        modalidad: 'CONSIGNACION',
      });
      expect(loteCampaniaService.crearVenta).not.toHaveBeenCalled();
      expect(aviso.mostrar).toHaveBeenCalledWith('Venta actualizada');
    });
  });
});
