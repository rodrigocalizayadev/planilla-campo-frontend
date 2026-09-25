import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { CostoIndirectoForm } from './costo-indirecto-form';
import { CostosIndirectosService } from './costos-indirectos.service';
import { AvisoService } from '../../shared/ui/aviso/aviso.service';
import type { CostoIndirecto, ErrorResponse, LoteCampania } from '../../models';

function lote(parcial: Partial<LoteCampania>): LoteCampania {
  return {
    id: 1,
    campaniaId: 1,
    loteId: 1,
    loteNombre: 'Lote A',
    cultivoId: 1,
    cultivoNombre: 'Cebolla',
    variedad: null,
    ciclo: 1,
    superficieSembradaHa: '1',
    unidadProduccion: 'BOLSA',
    fechaSiembra: null,
    fechaTrasplante: null,
    fechaCosechaEsperada: null,
    comentarios: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...parcial,
  };
}

const LOTES: LoteCampania[] = [
  lote({ id: 4, loteNombre: 'Lote Norte', cultivoNombre: 'Cebolla', superficieSembradaHa: '1.5' }),
  lote({ id: 5, loteNombre: 'Lote Sur', cultivoNombre: 'Cebolla', superficieSembradaHa: '0.5' }),
];

const COSTO_CREADO: CostoIndirecto = {
  id: 1,
  campaniaId: 1,
  concepto: 'Canon de riego',
  fecha: '2026-03-15',
  criterioProrrateo: 'POR_HA',
  importe: { importe: '100000', moneda: 'ARS', tipoCambio: '1350' },
  partes: [],
};

describe('CostoIndirectoForm', () => {
  let fixture: ComponentFixture<CostoIndirectoForm>;
  let service: { crear: ReturnType<typeof vi.fn> };
  let aviso: AvisoService;

  beforeEach(async () => {
    localStorage.clear();
    service = { crear: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [CostoIndirectoForm],
      providers: [
        provideZonelessChangeDetection(),
        { provide: CostosIndirectosService, useValue: service },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CostoIndirectoForm);
    fixture.componentRef.setInput('campaniaId', 1);
    fixture.componentRef.setInput('lotes', LOTES);
    aviso = TestBed.inject(AvisoService);
    vi.spyOn(aviso, 'mostrar');
  });

  function completarInput(selector: string, valor: string): void {
    const input: HTMLInputElement = fixture.nativeElement.querySelector(selector);
    input.value = valor;
    input.dispatchEvent(new Event('input'));
  }

  function elegirModo(etiqueta: string): void {
    const botones: HTMLButtonElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('.selector-modo__opcion'),
    );
    const boton = botones.find((b) => b.textContent?.trim() === etiqueta);
    boton!.click();
  }

  function elegir(select: HTMLSelectElement, valor: string): void {
    select.value = valor;
    select.dispatchEvent(new Event('input'));
  }

  function enviarFormulario(): void {
    const formulario: HTMLFormElement = fixture.nativeElement.querySelector('form');
    formulario.dispatchEvent(new Event('submit', { cancelable: true }));
  }

  it('arranca a prorratear por hectárea y muestra la vista previa del reparto', async () => {
    fixture.autoDetectChanges();
    await fixture.whenStable();

    completarInput('.campo-precio__monto', '100000');
    await fixture.whenStable();

    const filas = fixture.nativeElement.textContent;
    expect(filas).toContain('Lote Norte');
    expect(filas).toContain('Lote Sur');
    // 100000 repartido 1.5/0.5 ha -> 75.000 y 25.000, suma exacta.
    expect(fixture.nativeElement.querySelector('.reparto-preview__fila--total').textContent).toContain('100.000');
  });

  it('al elegir Manual, muestra un input por lote en vez de la vista previa automática', async () => {
    fixture.autoDetectChanges();
    await fixture.whenStable();

    elegirModo('Manual');
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('Cargá el importe que le corresponde a cada lote');
    expect(fixture.nativeElement.querySelectorAll('.reparto-preview__fila--input input').length).toBe(2);
  });

  it('al elegir "A un lote específico", muestra el selector de lote y oculta el criterio', async () => {
    fixture.autoDetectChanges();
    await fixture.whenStable();

    elegirModo('A un lote específico');
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).not.toContain('Criterio de prorrateo');
    const selects: HTMLSelectElement[] = fixture.nativeElement.querySelectorAll('select');
    // El segundo select (el primero es la moneda del importe) pasa a ser el de lote.
    expect(selects.length).toBe(2);
  });

  it('no permite guardar si las partes manuales no suman el importe total', async () => {
    fixture.autoDetectChanges();
    await fixture.whenStable();

    completarInput('.campo-precio__monto', '100000');
    completarInput('input[inputmode="decimal"].campo__input--numerico', '1350');
    elegirModo('Manual');
    await fixture.whenStable();

    const inputsPartes: HTMLInputElement[] = fixture.nativeElement.querySelectorAll(
      '.reparto-preview__fila--input input',
    );
    inputsPartes[0].value = '50000';
    inputsPartes[0].dispatchEvent(new Event('input'));
    await fixture.whenStable();

    completarInput('input[type="text"][placeholder="Canon de riego"]', 'Asesoramiento');
    enviarFormulario();
    await fixture.whenStable();

    expect(service.crear).not.toHaveBeenCalled();
  });

  it('con reparto manual completo, manda las partes cargadas por lote', async () => {
    service.crear.mockReturnValue(of(COSTO_CREADO));
    fixture.autoDetectChanges();
    await fixture.whenStable();

    completarInput('input[type="text"][placeholder="Canon de riego"]', 'Asesoramiento');
    completarInput('.campo-precio__monto', '100000');
    completarInput('input[inputmode="decimal"].campo__input--numerico', '1350');
    elegirModo('Manual');
    await fixture.whenStable();

    const inputsPartes: HTMLInputElement[] = fixture.nativeElement.querySelectorAll(
      '.reparto-preview__fila--input input',
    );
    inputsPartes[0].value = '75000';
    inputsPartes[0].dispatchEvent(new Event('input'));
    inputsPartes[1].value = '25000';
    inputsPartes[1].dispatchEvent(new Event('input'));
    await fixture.whenStable();

    enviarFormulario();
    await fixture.whenStable();

    expect(service.crear).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        criterioProrrateo: 'MANUAL',
        partes: [
          { loteCampaniaId: 4, importe: { importe: '75000', moneda: 'ARS', tipoCambio: '1350' } },
          { loteCampaniaId: 5, importe: { importe: '25000', moneda: 'ARS', tipoCambio: '1350' } },
        ],
      }),
    );
    expect(aviso.mostrar).toHaveBeenCalledWith('Asesoramiento cargado');
  });

  it('con imputación directa, manda loteCampaniaId y criterioProrrateo POR_HA sin partes', async () => {
    service.crear.mockReturnValue(of(COSTO_CREADO));
    fixture.autoDetectChanges();
    await fixture.whenStable();

    completarInput('input[type="text"][placeholder="Canon de riego"]', 'Limpieza de canales');
    completarInput('.campo-precio__monto', '50000');
    completarInput('input[inputmode="decimal"].campo__input--numerico', '1350');
    elegirModo('A un lote específico');
    await fixture.whenStable();

    const selects: HTMLSelectElement[] = fixture.nativeElement.querySelectorAll('select');
    elegir(selects[1], '5');
    await fixture.whenStable();

    enviarFormulario();
    await fixture.whenStable();

    expect(service.crear).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        loteCampaniaId: 5,
        criterioProrrateo: 'POR_HA',
      }),
    );
    expect(service.crear.mock.calls[0][1].partes).toBeUndefined();
  });

  it('muestra el error del servidor en el toast rojo si falla', async () => {
    const error: ErrorResponse = {
      timestamp: new Date().toISOString(),
      status: 422,
      code: 'CAMPANIA_CERRADA',
      message: 'La campaña está cerrada',
      details: [],
    };
    service.crear.mockReturnValue(throwError(() => error));
    fixture.autoDetectChanges();
    await fixture.whenStable();

    completarInput('input[type="text"][placeholder="Canon de riego"]', 'Canon');
    completarInput('.campo-precio__monto', '50000');
    completarInput('input[inputmode="decimal"].campo__input--numerico', '1350');
    await fixture.whenStable();

    enviarFormulario();
    await fixture.whenStable();

    expect(aviso.mostrar).toHaveBeenCalledWith('La campaña está cerrada', 'error');
  });
});
