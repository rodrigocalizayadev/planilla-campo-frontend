import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { LiquidarVentaForm } from './liquidar-venta-form';
import { LoteCampaniaService } from './lote-campania.service';
import { AvisoService } from '../../shared/ui/aviso/aviso.service';
import type { ErrorResponse, Venta } from '../../models';

const VENTA_PENDIENTE: Venta = {
  id: 2,
  loteCampaniaId: 4,
  compradorId: 6,
  compradorNombre: 'Clismar',
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
  fechaEntrega: '2026-07-27',
  fechaLiquidacion: null,
};

const VENTA_LIQUIDADA: Venta = {
  ...VENTA_PENDIENTE,
  estado: 'LIQUIDADA',
  precioUnitario: { importe: '4500', moneda: 'ARS', tipoCambio: '1' },
  importeNeto: { importe: '44900', moneda: 'ARS', tipoCambio: '1' },
  fechaLiquidacion: '2026-08-01',
};

describe('LiquidarVentaForm', () => {
  let fixture: ComponentFixture<LiquidarVentaForm>;
  let loteCampaniaService: { liquidarVenta: ReturnType<typeof vi.fn> };
  let aviso: AvisoService;

  beforeEach(async () => {
    localStorage.clear();
    loteCampaniaService = { liquidarVenta: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [LiquidarVentaForm],
      providers: [
        provideZonelessChangeDetection(),
        { provide: LoteCampaniaService, useValue: loteCampaniaService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LiquidarVentaForm);
    fixture.componentRef.setInput('venta', VENTA_PENDIENTE);
    aviso = TestBed.inject(AvisoService);
    vi.spyOn(aviso, 'mostrar');
  });

  // [0] precio unitario, [1] tipo de cambio, [2] comisión, [3] flete, [4] otros gastos.
  function camposNumericos(): HTMLInputElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('.campo__input--numerico, .campo-precio__monto'));
  }

  function completar(indice: number, valor: string): void {
    const input = camposNumericos()[indice];
    input.value = valor;
    input.dispatchEvent(new Event('input'));
  }

  function enviarFormulario(): void {
    const formulario: HTMLFormElement = fixture.nativeElement.querySelector('form');
    formulario.dispatchEvent(new Event('submit', { cancelable: true }));
  }

  it('muestra el comprador y la cantidad entregada pendiente de liquidar', async () => {
    fixture.autoDetectChanges();
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('Clismar');
    expect(fixture.nativeElement.textContent).toContain('10 BOLSA entregadas');
  });

  it('no guarda sin precio ni tipo de cambio', async () => {
    fixture.autoDetectChanges();
    await fixture.whenStable();

    enviarFormulario();
    await fixture.whenStable();

    expect(loteCampaniaService.liquidarVenta).not.toHaveBeenCalled();
  });

  it('calcula el neto en vivo descontando comisión, flete y otros gastos', async () => {
    fixture.autoDetectChanges();
    await fixture.whenStable();

    completar(0, '4500');
    completar(2, '100');
    completar(3, '50');
    completar(4, '10');
    await fixture.whenStable();

    // Bruto 4500 × 10 = 45000; neto = 45000 − 160 = 44840.
    expect(fixture.nativeElement.querySelector('.total-en-vivo__valor').textContent).toContain('44.840');
  });

  it('con datos válidos, arma el payload con los gastos como Monto en la misma moneda/TC', async () => {
    loteCampaniaService.liquidarVenta.mockReturnValue(of(VENTA_LIQUIDADA));
    fixture.autoDetectChanges();
    await fixture.whenStable();

    completar(0, '4500');
    completar(1, '1');
    completar(2, '100');
    await fixture.whenStable();

    enviarFormulario();
    await fixture.whenStable();

    expect(loteCampaniaService.liquidarVenta).toHaveBeenCalledWith(2, {
      precioUnitario: { importe: '4500', moneda: 'ARS', tipoCambio: '1' },
      fechaLiquidacion: expect.any(String),
      comision: { importe: '100', moneda: 'ARS', tipoCambio: '1' },
      flete: undefined,
      otrosGastos: undefined,
    });
    expect(aviso.mostrar).toHaveBeenCalledWith('Liquidación cargada');
  });

  it('muestra el error del servidor en el toast rojo si falla', async () => {
    const error: ErrorResponse = {
      timestamp: new Date().toISOString(),
      status: 422,
      code: 'MODALIDAD_INVALIDA',
      message: 'Solo se pueden liquidar ventas en consignación',
      details: [],
    };
    loteCampaniaService.liquidarVenta.mockReturnValue(throwError(() => error));
    fixture.autoDetectChanges();
    await fixture.whenStable();

    completar(0, '4500');
    completar(1, '1');
    await fixture.whenStable();

    enviarFormulario();
    await fixture.whenStable();

    expect(aviso.mostrar).toHaveBeenCalledWith('Solo se pueden liquidar ventas en consignación', 'error');
  });
});
