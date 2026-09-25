import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { TareaForm } from './tarea-form';
import { LoteCampaniaService } from './lote-campania.service';
import { EnumsService } from '../../core/enums/enums.service';
import { AvisoService } from '../../shared/ui/aviso/aviso.service';
import type { ErrorResponse, Tarea, ValorEnum } from '../../models';

const TIPOS_TAREA: ValorEnum[] = [
  { valor: 'CARPIDA', etiqueta: 'Carpida' },
  { valor: 'RIEGO', etiqueta: 'Riego' },
];
const EJECUTORES: ValorEnum[] = [
  { valor: 'CUADRILLA', etiqueta: 'Cuadrilla' },
  { valor: 'JORNALERO', etiqueta: 'Jornalero' },
];

const enumsStub = {
  opciones: (clave: string) => (clave === 'tipoTarea' ? TIPOS_TAREA : clave === 'ejecutor' ? EJECUTORES : []),
  etiqueta: (clave: string, valor: string) =>
    (clave === 'tipoTarea' ? TIPOS_TAREA : EJECUTORES).find((o) => o.valor === valor)?.etiqueta ?? valor,
};

const TAREA: Tarea = {
  id: 1,
  loteCampaniaId: 4,
  tipo: 'CARPIDA',
  fecha: '2026-04-01',
  ejecutor: 'CUADRILLA',
  modoCosto: 'TOTAL',
  cantidad: null,
  valorUnitario: { importe: '2800000', moneda: 'ARS', tipoCambio: '1' },
  costoTotal: { importe: '2800000', moneda: 'ARS', tipoCambio: '1' },
  createdAt: '2026-08-24T00:00:00Z',
  updatedAt: '2026-08-24T00:00:00Z',
};

describe('TareaForm', () => {
  let fixture: ComponentFixture<TareaForm>;
  let loteCampaniaService: { crearTarea: ReturnType<typeof vi.fn> };
  let aviso: AvisoService;

  beforeEach(async () => {
    localStorage.clear();
    loteCampaniaService = { crearTarea: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [TareaForm],
      providers: [
        provideZonelessChangeDetection(),
        { provide: LoteCampaniaService, useValue: loteCampaniaService },
        { provide: EnumsService, useValue: enumsStub },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TareaForm);
    fixture.componentRef.setInput('loteCampaniaId', 4);
    fixture.componentRef.setInput('superficieSembradaHa', 1.5);
    aviso = TestBed.inject(AvisoService);
    vi.spyOn(aviso, 'mostrar');
  });

  function completarInput(selector: string, valor: string): void {
    const input: HTMLInputElement = fixture.nativeElement.querySelector(selector);
    input.value = valor;
    input.dispatchEvent(new Event('input'));
  }

  // Cantidad y tipo de cambio comparten la clase `campo__input--numerico`; solo el de
  // tipo de cambio usa inputmode="decimal" (cantidad usa "numeric"), así que ese par
  // de atributos es lo único que los distingue de forma inequívoca.
  function completarTipoCambio(valor: string): void {
    completarInput('input[inputmode="decimal"].campo__input--numerico', valor);
  }

  // Orden real en el DOM (las cuatro modalidades): [0] moneda del valor, [1] tarea
  // (tipo), [2] quién la hizo (ejecutor) — el selector de moneda vive dentro de
  // `.campo-precio`, que se renderiza antes que el bloque Tarea/Fecha/Ejecutor.
  function selects(): { moneda: HTMLSelectElement; tipo: HTMLSelectElement; ejecutor: HTMLSelectElement } {
    const [moneda, tipo, ejecutor]: HTMLSelectElement[] = fixture.nativeElement.querySelectorAll('select');
    return { moneda, tipo, ejecutor };
  }

  function elegir(select: HTMLSelectElement, valor: string): void {
    select.value = valor;
    select.dispatchEvent(new Event('input'));
  }

  function elegirModo(etiqueta: string): void {
    const botones: HTMLButtonElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('.selector-modo__opcion'),
    );
    const boton = botones.find((b) => b.textContent?.trim() === etiqueta);
    boton!.click();
  }

  function enviarFormulario(): void {
    const formulario: HTMLFormElement = fixture.nativeElement.querySelector('form');
    formulario.dispatchEvent(new Event('submit', { cancelable: true }));
  }

  it('arranca en modo Jornal, pidiendo cantidad y valor del jornal', async () => {
    fixture.autoDetectChanges();
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('Cantidad de jornales');
    expect(fixture.nativeElement.textContent).toContain('Valor del jornal');
  });

  it('al elegir Monto total, oculta el campo de cantidad', async () => {
    fixture.autoDetectChanges();
    await fixture.whenStable();

    elegirModo('Monto total');
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).not.toContain('Cantidad de');
    expect(fixture.nativeElement.textContent).toContain('Monto total');
  });

  it('al elegir Por hectárea, avisa que se multiplica por la superficie sembrada', async () => {
    fixture.autoDetectChanges();
    await fixture.whenStable();

    elegirModo('Por hectárea');
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('1.5 ha sembradas');
  });

  it('calcula el total en vivo multiplicando cantidad por valor en modo Jornal', async () => {
    fixture.autoDetectChanges();
    await fixture.whenStable();

    completarInput('input[inputmode="numeric"]', '24');
    completarInput('.campo-precio__monto', '35000');
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('.total-en-vivo__valor').textContent).toContain('840.000');
  });

  it('en modo Por hectárea, el total en vivo multiplica el valor por la superficie', async () => {
    fixture.autoDetectChanges();
    await fixture.whenStable();

    elegirModo('Por hectárea');
    completarInput('.campo-precio__monto', '120000');
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('.total-en-vivo__valor').textContent).toContain('180.000');
  });

  it('no permite guardar sin tipo de cambio', async () => {
    fixture.autoDetectChanges();
    await fixture.whenStable();

    elegirModo('Monto total');
    completarInput('.campo-precio__monto', '2800000');
    elegir(selects().tipo, 'CARPIDA');
    await fixture.whenStable();

    enviarFormulario();
    await fixture.whenStable();

    expect(loteCampaniaService.crearTarea).not.toHaveBeenCalled();
  });

  it('con datos válidos arma el payload con valorUnitario como Monto y cantidad null en modo total', async () => {
    loteCampaniaService.crearTarea.mockReturnValue(of(TAREA));
    fixture.autoDetectChanges();
    await fixture.whenStable();

    elegirModo('Monto total');
    completarInput('.campo-precio__monto', '2800000');
    completarTipoCambio('1');
    elegir(selects().tipo, 'CARPIDA');
    elegir(selects().ejecutor, 'CUADRILLA');
    await fixture.whenStable();

    enviarFormulario();
    await fixture.whenStable();

    expect(loteCampaniaService.crearTarea).toHaveBeenCalledWith(4, {
      tipo: 'CARPIDA',
      fecha: expect.any(String),
      ejecutor: 'CUADRILLA',
      modoCosto: 'TOTAL',
      cantidad: null,
      valorUnitario: { importe: '2800000', moneda: 'ARS', tipoCambio: '1' },
    });
    expect(aviso.mostrar).toHaveBeenCalledWith('Carpida cargada');
  });

  it('en modo Jornal manda la cantidad cargada', async () => {
    loteCampaniaService.crearTarea.mockReturnValue(of(TAREA));
    fixture.autoDetectChanges();
    await fixture.whenStable();

    completarInput('input[inputmode="numeric"]', '24');
    completarInput('.campo-precio__monto', '35000');
    completarTipoCambio('1');
    elegir(selects().tipo, 'RIEGO');
    elegir(selects().ejecutor, 'JORNALERO');
    await fixture.whenStable();

    enviarFormulario();
    await fixture.whenStable();

    expect(loteCampaniaService.crearTarea).toHaveBeenCalledWith(
      4,
      expect.objectContaining({
        modoCosto: 'JORNAL',
        cantidad: '24',
        valorUnitario: { importe: '35000', moneda: 'ARS', tipoCambio: '1' },
      }),
    );
  });

  it('muestra el error del servidor en el toast rojo si falla', async () => {
    const error: ErrorResponse = {
      timestamp: new Date().toISOString(),
      status: 422,
      code: 'CAMPANIA_CERRADA',
      message: 'La campaña está cerrada',
      details: [],
    };
    loteCampaniaService.crearTarea.mockReturnValue(throwError(() => error));
    fixture.autoDetectChanges();
    await fixture.whenStable();

    elegirModo('Monto total');
    completarInput('.campo-precio__monto', '2800000');
    completarTipoCambio('1');
    elegir(selects().tipo, 'CARPIDA');
    elegir(selects().ejecutor, 'CUADRILLA');
    await fixture.whenStable();

    enviarFormulario();
    await fixture.whenStable();

    expect(aviso.mostrar).toHaveBeenCalledWith('La campaña está cerrada', 'error');
  });
});
