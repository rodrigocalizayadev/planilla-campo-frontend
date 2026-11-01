import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { VentaDetalle } from './venta-detalle';
import { LoteCampaniaService } from './lote-campania.service';
import { EnumsService } from '../../core/enums/enums.service';
import { AvisoService } from '../../shared/ui/aviso/aviso.service';
import { environment } from '../../../environments/environment';
import type { Cobro, ErrorResponse, LiquidacionTramo, PaginaResponse, Venta } from '../../models';

const ETIQUETAS: Record<string, Record<string, string>> = {
  estadoVenta: { ENTREGADA: 'Entregada', PARCIAL: 'Parcial', LIQUIDADA: 'Liquidada' },
  estadoCobro: { PENDIENTE: 'Pendiente', PARCIAL: 'Cobro parcial', COBRADA: 'Cobrada' },
};
const enumsStub = {
  opciones: () => [],
  etiqueta: (clave: string, valor: string) => ETIQUETAS[clave]?.[valor] ?? valor,
};

const VENTA_PRECIO_CERRADO: Venta = {
  id: 3,
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
  importeNeto: { importe: '450000', moneda: 'ARS', tipoCambio: '1', importeArs: '450000', importeUsd: '450000' },
  estado: 'LIQUIDADA',
  fechaEntrega: '2026-07-25',
  fechaLiquidacion: '2026-07-25',
  estadoCobro: 'PARCIAL',
  cobradoArs: '200000.00',
  saldoArs: '250000.00',
  cantidadLiquidada: '0',
};

const VENTA_CONSIGNACION: Venta = {
  ...VENTA_PRECIO_CERRADO,
  id: 8,
  modalidad: 'CONSIGNACION',
  precioUnitario: null,
  importeNeto: { importe: '27000', moneda: 'ARS', tipoCambio: '1', importeArs: '27000', importeUsd: '27000' },
  estado: 'PARCIAL',
  fechaLiquidacion: null,
  estadoCobro: null,
  cobradoArs: '0',
  saldoArs: null,
  cantidad: '10',
  cantidadLiquidada: '6',
  cantidadPendiente: '4',
};

const COBRO: Cobro = {
  id: 11,
  ventaId: 3,
  fecha: '2026-03-15',
  monto: { importe: '200000', moneda: 'ARS', tipoCambio: '1050', importeArs: '200000', importeUsd: '190.48' },
  comentarios: 'Primera cuota',
};

const TRAMO: LiquidacionTramo = {
  id: 21,
  ventaId: 8,
  fecha: '2026-02-10',
  cantidad: '6',
  precioUnitario: { importe: '5000', moneda: 'ARS', tipoCambio: '1', importeArs: '5000', importeUsd: '5000' },
  comision: null,
  flete: null,
  otrosGastos: null,
  importeNeto: { importe: '30000', moneda: 'ARS', tipoCambio: '1', importeArs: '30000', importeUsd: '30000' },
};

function pagina<T>(items: T[]): PaginaResponse<T> {
  return { content: items, page: { size: 200, number: 0, totalElements: items.length, totalPages: 1 } };
}

describe('VentaDetalle', () => {
  let fixture: ComponentFixture<VentaDetalle>;
  let http: HttpTestingController;
  let loteCampaniaService: {
    eliminarCobro: ReturnType<typeof vi.fn>;
    eliminarTramo: ReturnType<typeof vi.fn>;
  };
  let aviso: AvisoService;
  const URL_COBROS = `${environment.apiBaseUrl}/ventas/3/cobros?size=200`;
  const URL_TRAMOS = `${environment.apiBaseUrl}/ventas/8/liquidaciones?size=200`;

  beforeEach(async () => {
    localStorage.clear();
    loteCampaniaService = { eliminarCobro: vi.fn(), eliminarTramo: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [VentaDetalle],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: EnumsService, useValue: enumsStub },
        { provide: LoteCampaniaService, useValue: loteCampaniaService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(VentaDetalle);
    http = TestBed.inject(HttpTestingController);
    aviso = TestBed.inject(AvisoService);
    vi.spyOn(aviso, 'mostrar');
  });

  afterEach(() => http.verify());

  async function abrir(venta: Venta, items: Cobro[] | LiquidacionTramo[] = []): Promise<void> {
    fixture.componentRef.setInput('venta', venta);
    fixture.autoDetectChanges();
    http
      .expectOne(venta.modalidad === 'PRECIO_CERRADO' ? URL_COBROS : URL_TRAMOS)
      .flush(pagina(items as (Cobro | LiquidacionTramo)[]));
    await fixture.whenStable();
  }

  function boton(texto: string): HTMLButtonElement {
    const botones: HTMLButtonElement[] = Array.from(fixture.nativeElement.querySelectorAll('button'));
    return botones.find((b) => b.textContent?.trim() === texto)!;
  }

  describe('precio cerrado (cobros)', () => {
    it('muestra estado de cobro, importe, cobrado y saldo en pesos, y pide solo la lista de cobros', async () => {
      await abrir(VENTA_PRECIO_CERRADO, [COBRO]);

      const texto: string = fixture.nativeElement.textContent;
      expect(texto).toContain('Cobro parcial');
      expect(texto).toContain('450.000,00');
      expect(texto).toContain('200.000,00');
      expect(texto).toContain('250.000,00');
      expect(texto).toContain('Primera cuota');
    });

    it('muestra la fecha del cobro con el día correcto, sin corrimiento por zona horaria', async () => {
      await abrir(VENTA_PRECIO_CERRADO, [COBRO]);

      expect(fixture.nativeElement.querySelector('.fila-pago__fecha').textContent).toContain('15/03/2026');
    });

    it('sin cobros, avisa que todavía no hay ninguno', async () => {
      await abrir({ ...VENTA_PRECIO_CERRADO, estadoCobro: 'PENDIENTE', cobradoArs: '0', saldoArs: '450000.00' });

      expect(fixture.nativeElement.textContent).toContain('Todavía no se registró ningún cobro');
      expect(fixture.nativeElement.textContent).not.toContain('primero quitá');
    });

    it('"Registrar cobro" abre el formulario de cobro', async () => {
      await abrir(VENTA_PRECIO_CERRADO, [COBRO]);

      boton('Registrar cobro').click();
      await fixture.whenStable();

      expect(fixture.nativeElement.querySelector('app-cobro-form')).toBeTruthy();
    });

    it('con la venta COBRADA, "Registrar cobro" está deshabilitado', async () => {
      await abrir({ ...VENTA_PRECIO_CERRADO, estadoCobro: 'COBRADA', cobradoArs: '450000.00', saldoArs: '0.00' }, [COBRO]);

      expect(boton('Registrar cobro').disabled).toBe(true);
    });

    it('con cobros, explica que hay que quitarlos antes de editar o eliminar la venta', async () => {
      await abrir(VENTA_PRECIO_CERRADO, [COBRO]);

      expect(fixture.nativeElement.textContent).toContain('primero quitá sus cobros');
    });

    it('al guardar un cobro cierra el formulario, recarga la lista y re-emite la venta actualizada', async () => {
      const ventaActualizada: Venta = { ...VENTA_PRECIO_CERRADO, cobradoArs: '210000.00', saldoArs: '240000.00' };
      const emitidas: Venta[] = [];
      fixture.componentInstance.ventaActualizada.subscribe((v) => emitidas.push(v));
      await abrir(VENTA_PRECIO_CERRADO, [COBRO]);
      boton('Registrar cobro').click();
      await fixture.whenStable();

      const formulario = fixture.debugElement.query((d) => d.name === 'app-cobro-form').componentInstance;
      formulario.guardado.emit(ventaActualizada);
      TestBed.flushEffects();
      http.expectOne(URL_COBROS).flush(pagina([COBRO]));
      await fixture.whenStable();

      expect(emitidas).toEqual([ventaActualizada]);
      expect(fixture.nativeElement.querySelector('app-cobro-form')).toBeNull();
    });

    it('si el formulario avisa que el saldo quedó desactualizado, pide refrescar la venta', async () => {
      let pidioRefrescar = false;
      fixture.componentInstance.refrescar.subscribe(() => (pidioRefrescar = true));
      await abrir(VENTA_PRECIO_CERRADO, [COBRO]);
      boton('Registrar cobro').click();
      await fixture.whenStable();

      fixture.debugElement.query((d) => d.name === 'app-cobro-form').componentInstance.desactualizada.emit();
      TestBed.flushEffects();
      http.expectOne(URL_COBROS).flush(pagina([COBRO]));
      await fixture.whenStable();

      expect(pidioRefrescar).toBe(true);
    });

    it('pide confirmación y quita un cobro con DELETE; la respuesta es la venta actualizada', async () => {
      const ventaActualizada: Venta = { ...VENTA_PRECIO_CERRADO, estadoCobro: 'PENDIENTE', cobradoArs: '0', saldoArs: '450000.00' };
      loteCampaniaService.eliminarCobro.mockReturnValue(of(ventaActualizada));
      const emitidas: Venta[] = [];
      fixture.componentInstance.ventaActualizada.subscribe((v) => emitidas.push(v));
      await abrir(VENTA_PRECIO_CERRADO, [COBRO]);

      boton('Quitar').click();
      await fixture.whenStable();
      expect(fixture.nativeElement.textContent).toContain('¿Quitar este cobro?');
      expect(loteCampaniaService.eliminarCobro).not.toHaveBeenCalled();

      (fixture.nativeElement.querySelector('app-confirmar-accion .boton-baja') as HTMLButtonElement).click();
      TestBed.flushEffects();
      http.expectOne(URL_COBROS).flush(pagina([]));
      await fixture.whenStable();

      expect(loteCampaniaService.eliminarCobro).toHaveBeenCalledWith(11);
      expect(emitidas).toEqual([ventaActualizada]);
      expect(aviso.mostrar).toHaveBeenCalledWith('Cobro eliminado');
      expect(fixture.nativeElement.querySelector('app-confirmar-accion')).toBeNull();
    });

    it('si el cobro ya no existe (otro usuario lo borró), muestra el error y pide refrescar', async () => {
      const error: ErrorResponse = {
        timestamp: new Date().toISOString(),
        status: 422,
        code: 'COBRO_NO_ENCONTRADO',
        message: 'No se encontró el cobro',
        details: [],
      };
      loteCampaniaService.eliminarCobro.mockReturnValue(throwError(() => error));
      let pidioRefrescar = false;
      fixture.componentInstance.refrescar.subscribe(() => (pidioRefrescar = true));
      await abrir(VENTA_PRECIO_CERRADO, [COBRO]);

      boton('Quitar').click();
      await fixture.whenStable();
      (fixture.nativeElement.querySelector('app-confirmar-accion .boton-baja') as HTMLButtonElement).click();
      TestBed.flushEffects();
      http.expectOne(URL_COBROS).flush(pagina([COBRO]));
      await fixture.whenStable();

      expect(aviso.mostrar).toHaveBeenCalledWith('No se encontró el cobro', 'error');
      expect(pidioRefrescar).toBe(true);
    });
  });

  describe('consignación (tramos)', () => {
    it('muestra estado, entregado, liquidado y pendiente, y pide solo la lista de tramos', async () => {
      await abrir(VENTA_CONSIGNACION, [TRAMO]);

      const texto: string = fixture.nativeElement.textContent;
      expect(texto).toContain('Parcial');
      expect(texto).toContain('10 BOLSA');
      expect(texto).toContain('6 BOLSA');
      expect(texto).toContain('4 BOLSA');
      expect(texto).toContain('liquidados hasta ahora');
      expect(fixture.nativeElement.querySelectorAll('.fila-pago').length).toBe(1);
    });

    it('"Registrar liquidación" abre el formulario en modo tramo y "Liquidar todo lo pendiente" en modo todo', async () => {
      await abrir(VENTA_CONSIGNACION, [TRAMO]);

      boton('Registrar liquidación').click();
      await fixture.whenStable();
      let formulario = fixture.debugElement.query((d) => d.name === 'app-liquidar-venta-form');
      expect(formulario.componentInstance.modo()).toBe('tramo');

      formulario.componentInstance.cancelado.emit();
      await fixture.whenStable();
      boton('Liquidar todo lo pendiente').click();
      await fixture.whenStable();
      formulario = fixture.debugElement.query((d) => d.name === 'app-liquidar-venta-form');
      expect(formulario.componentInstance.modo()).toBe('todo');
    });

    it('con la venta LIQUIDADA no deja registrar más liquidaciones', async () => {
      await abrir(
        { ...VENTA_CONSIGNACION, estado: 'LIQUIDADA', cantidadLiquidada: '10', cantidadPendiente: '0' },
        [TRAMO],
      );

      expect(boton('Registrar liquidación').disabled).toBe(true);
      expect(boton('Liquidar todo lo pendiente').disabled).toBe(true);
      expect(fixture.nativeElement.textContent).toContain('liquidados en total');
    });

    it('quita un tramo con DELETE y re-emite la venta recalculada', async () => {
      const ventaActualizada: Venta = { ...VENTA_CONSIGNACION, estado: 'ENTREGADA', cantidadLiquidada: '0', cantidadPendiente: '10' };
      loteCampaniaService.eliminarTramo.mockReturnValue(of(ventaActualizada));
      const emitidas: Venta[] = [];
      fixture.componentInstance.ventaActualizada.subscribe((v) => emitidas.push(v));
      await abrir(VENTA_CONSIGNACION, [TRAMO]);

      boton('Quitar').click();
      await fixture.whenStable();
      expect(fixture.nativeElement.textContent).toContain('¿Quitar esta liquidación?');
      (fixture.nativeElement.querySelector('app-confirmar-accion .boton-baja') as HTMLButtonElement).click();
      TestBed.flushEffects();
      http.expectOne(URL_TRAMOS).flush(pagina([]));
      await fixture.whenStable();

      expect(loteCampaniaService.eliminarTramo).toHaveBeenCalledWith(21);
      expect(emitidas).toEqual([ventaActualizada]);
      expect(aviso.mostrar).toHaveBeenCalledWith('Liquidación eliminada');
    });
  });
});
