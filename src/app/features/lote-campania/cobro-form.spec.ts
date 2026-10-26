import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { CobroForm } from './cobro-form';
import { LoteCampaniaService } from './lote-campania.service';
import { AvisoService } from '../../shared/ui/aviso/aviso.service';
import { hoyIso } from '../../shared/utils/fecha-local';
import type { ErrorResponse, Venta } from '../../models';

const VENTA_CON_SALDO: Venta = {
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
  importeNeto: { importe: '450000', moneda: 'ARS', tipoCambio: '1', importeArs: '450000' },
  estado: 'LIQUIDADA',
  fechaEntrega: '2026-07-25',
  fechaLiquidacion: '2026-07-25',
  estadoCobro: 'PARCIAL',
  cobradoArs: '200000.00',
  saldoArs: '250000.00',
  cantidadLiquidada: '0',
};

describe('CobroForm', () => {
  let fixture: ComponentFixture<CobroForm>;
  let loteCampaniaService: { registrarCobro: ReturnType<typeof vi.fn> };
  let aviso: AvisoService;

  beforeEach(async () => {
    localStorage.clear();
    loteCampaniaService = { registrarCobro: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [CobroForm],
      providers: [
        provideZonelessChangeDetection(),
        { provide: LoteCampaniaService, useValue: loteCampaniaService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CobroForm);
    fixture.componentRef.setInput('venta', VENTA_CON_SALDO);
    aviso = TestBed.inject(AvisoService);
    vi.spyOn(aviso, 'mostrar');
  });

  // [0] importe cobrado, [1] tipo de cambio.
  function camposNumericos(): HTMLInputElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('.campo__input--numerico'));
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

  async function renderizar(): Promise<void> {
    fixture.autoDetectChanges();
    await fixture.whenStable();
  }

  it('muestra el saldo pendiente en pesos', async () => {
    await renderizar();

    expect(fixture.nativeElement.textContent).toContain('250.000,00');
  });

  it('no guarda sin importe', async () => {
    await renderizar();
    completar(1, '1050');
    await fixture.whenStable();

    enviarFormulario();
    await fixture.whenStable();

    expect(loteCampaniaService.registrarCobro).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Ingresá un importe mayor que cero');
  });

  it('no guarda sin tipo de cambio', async () => {
    await renderizar();
    completar(0, '1000');
    await fixture.whenStable();

    enviarFormulario();
    await fixture.whenStable();

    expect(loteCampaniaService.registrarCobro).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Ingresá el tipo de cambio');
  });

  it('no deja cobrar más que el saldo pendiente', async () => {
    await renderizar();
    completar(0, '250000,01');
    completar(1, '1050');
    await fixture.whenStable();

    enviarFormulario();
    await fixture.whenStable();

    expect(loteCampaniaService.registrarCobro).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('El cobro supera el saldo pendiente');
  });

  it('permite cobrar exactamente el saldo', async () => {
    loteCampaniaService.registrarCobro.mockReturnValue(of(VENTA_CON_SALDO));
    await renderizar();
    completar(0, '250000');
    completar(1, '1050');
    await fixture.whenStable();

    enviarFormulario();
    await fixture.whenStable();

    expect(loteCampaniaService.registrarCobro).toHaveBeenCalledTimes(1);
  });

  it('arma el payload en pesos con importe y tipo de cambio como string, y sin comentarios si están vacíos', async () => {
    loteCampaniaService.registrarCobro.mockReturnValue(of(VENTA_CON_SALDO));
    await renderizar();
    completar(0, '200000,50');
    completar(1, '1050');
    await fixture.whenStable();

    enviarFormulario();
    await fixture.whenStable();

    expect(loteCampaniaService.registrarCobro).toHaveBeenCalledWith(3, {
      fecha: hoyIso(),
      monto: { importe: '200000.50', moneda: 'ARS', tipoCambio: '1050' },
    });
  });

  it('manda los comentarios recortados cuando se cargan', async () => {
    loteCampaniaService.registrarCobro.mockReturnValue(of(VENTA_CON_SALDO));
    await renderizar();
    completar(0, '1000');
    completar(1, '1050');
    const comentarios: HTMLInputElement = fixture.nativeElement.querySelector(
      'input[type="text"].campo__input:not(.campo__input--numerico)',
    );
    comentarios.value = '  Primera cuota ';
    comentarios.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    enviarFormulario();
    await fixture.whenStable();

    expect(loteCampaniaService.registrarCobro.mock.calls[0][1].comentarios).toBe('Primera cuota');
  });

  it('al guardar emite la venta actualizada que devolvió el backend y recuerda el tipo de cambio', async () => {
    const ventaActualizada: Venta = { ...VENTA_CON_SALDO, cobradoArs: '201000.00', saldoArs: '249000.00' };
    loteCampaniaService.registrarCobro.mockReturnValue(of(ventaActualizada));
    const emitida: Venta[] = [];
    fixture.componentInstance.guardado.subscribe((v) => emitida.push(v));
    await renderizar();
    completar(0, '1000');
    completar(1, '1050');
    await fixture.whenStable();

    enviarFormulario();
    await fixture.whenStable();

    expect(emitida).toEqual([ventaActualizada]);
    expect(aviso.mostrar).toHaveBeenCalledWith('Cobro registrado');
    expect(localStorage.getItem('planilla-campo:ultimo-tipo-cambio')).toBe('1050');
  });

  it('si el saldo cambió por una carrera (COBRO_EXCEDE_SALDO), muestra el mensaje y pide refrescar la venta', async () => {
    const error: ErrorResponse = {
      timestamp: new Date().toISOString(),
      status: 422,
      code: 'COBRO_EXCEDE_SALDO',
      message: 'El cobro supera el saldo de la venta',
      details: [],
    };
    loteCampaniaService.registrarCobro.mockReturnValue(throwError(() => error));
    let pidioRefrescar = false;
    fixture.componentInstance.desactualizada.subscribe(() => (pidioRefrescar = true));
    await renderizar();
    completar(0, '1000');
    completar(1, '1050');
    await fixture.whenStable();

    enviarFormulario();
    await fixture.whenStable();

    expect(aviso.mostrar).toHaveBeenCalledWith('El cobro supera el saldo de la venta', 'error');
    expect(pidioRefrescar).toBe(true);
  });

  it('ante otro error del servidor muestra el mensaje y no pide refrescar', async () => {
    const error: ErrorResponse = {
      timestamp: new Date().toISOString(),
      status: 422,
      code: 'MODALIDAD_INVALIDA',
      message: 'Solo se pueden cobrar ventas a precio cerrado',
      details: [],
    };
    loteCampaniaService.registrarCobro.mockReturnValue(throwError(() => error));
    let pidioRefrescar = false;
    fixture.componentInstance.desactualizada.subscribe(() => (pidioRefrescar = true));
    await renderizar();
    completar(0, '1000');
    completar(1, '1050');
    await fixture.whenStable();

    enviarFormulario();
    await fixture.whenStable();

    expect(aviso.mostrar).toHaveBeenCalledWith('Solo se pueden cobrar ventas a precio cerrado', 'error');
    expect(pidioRefrescar).toBe(false);
  });
});
