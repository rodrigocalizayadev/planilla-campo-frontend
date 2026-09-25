import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { LoteForm } from './lote-form';
import { LoteService } from './lote.service';
import { AvisoService } from '../../../shared/ui/aviso/aviso.service';
import type { ErrorResponse, Lote } from '../../../models';

const LOTE_ACTIVO: Lote = {
  id: 1,
  nombre: 'Lote 1',
  superficieHa: '8.50',
  tipoSuelo: 'Franco',
  comentarios: null,
  activo: true,
};

describe('LoteForm', () => {
  let fixture: ComponentFixture<LoteForm>;
  let loteService: { crear: ReturnType<typeof vi.fn>; actualizar: ReturnType<typeof vi.fn> };
  let aviso: AvisoService;

  beforeEach(async () => {
    loteService = {
      crear: vi.fn(),
      actualizar: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [LoteForm],
      providers: [
        provideZonelessChangeDetection(),
        { provide: LoteService, useValue: loteService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoteForm);
    aviso = TestBed.inject(AvisoService);
    vi.spyOn(aviso, 'mostrar');
  });

  function enviarFormulario(): void {
    const formulario: HTMLFormElement = fixture.nativeElement.querySelector('form');
    formulario.dispatchEvent(new Event('submit', { cancelable: true }));
  }

  function completarCampo(selector: string, valor: string): void {
    const input: HTMLInputElement = fixture.nativeElement.querySelector(selector);
    input.value = valor;
    input.dispatchEvent(new Event('input'));
  }

  it('no llama a crear y muestra los errores si el formulario está vacío', async () => {
    fixture.autoDetectChanges();
    await fixture.whenStable();

    enviarFormulario();
    await fixture.whenStable();

    expect(loteService.crear).not.toHaveBeenCalled();
    const errores = fixture.nativeElement.querySelectorAll('.campo__error');
    expect(errores.length).toBeGreaterThan(0);
  });

  it('con nombre y superficie válidos arma el payload y crea el lote', async () => {
    loteService.crear.mockReturnValue(of(LOTE_ACTIVO));
    fixture.autoDetectChanges();
    await fixture.whenStable();

    completarCampo('input[placeholder="Lote 7"]', 'Lote 9');
    completarCampo('input[inputmode="decimal"]', '4.5');
    await fixture.whenStable();

    enviarFormulario();
    await fixture.whenStable();

    expect(loteService.crear).toHaveBeenCalledWith({
      nombre: 'Lote 9',
      superficieHa: '4.5',
      tipoSuelo: '',
      comentarios: null,
    });
    expect(aviso.mostrar).toHaveBeenCalledWith('Lote creado: ya se puede sembrar');
  });

  it('no habilita crear con una superficie en cero', async () => {
    fixture.autoDetectChanges();
    await fixture.whenStable();

    completarCampo('input[placeholder="Lote 7"]', 'Lote 9');
    completarCampo('input[inputmode="decimal"]', '0');
    await fixture.whenStable();

    enviarFormulario();
    await fixture.whenStable();

    expect(loteService.crear).not.toHaveBeenCalled();
  });

  it('en edición, precarga los campos con los datos del lote', async () => {
    // Regresión: `modelo` se inicializaba leyendo el input `lote()` en el
    // inicializador de campo, que todavía no tiene el valor pegado en ese momento —
    // el formulario quedaba en blanco al editar (bug real, encontrado usando la app).
    fixture.componentRef.setInput('lote', LOTE_ACTIVO);
    fixture.autoDetectChanges();
    await fixture.whenStable();

    const nombre: HTMLInputElement = fixture.nativeElement.querySelector('input[placeholder="Lote 7"]');
    const superficie: HTMLInputElement = fixture.nativeElement.querySelector('input[inputmode="decimal"]');
    const tipoSuelo: HTMLInputElement = fixture.nativeElement.querySelector(
      'input[placeholder="Franco arenoso"]',
    );
    expect(nombre.value).toBe('Lote 1');
    expect(superficie.value).toBe('8.50');
    expect(tipoSuelo.value).toBe('Franco');
  });

  it('muestra el error del servidor en el toast rojo si guardar falla', async () => {
    const error: ErrorResponse = {
      timestamp: new Date().toISOString(),
      status: 400,
      code: 'VALIDACION',
      message: 'nombre: no debe estar vacío',
      details: [],
    };
    loteService.crear.mockReturnValue(throwError(() => error));
    fixture.autoDetectChanges();
    await fixture.whenStable();

    completarCampo('input[placeholder="Lote 7"]', 'Lote 9');
    completarCampo('input[inputmode="decimal"]', '4.5');
    await fixture.whenStable();

    enviarFormulario();
    await fixture.whenStable();

    expect(aviso.mostrar).toHaveBeenCalledWith('nombre: no debe estar vacío', 'error');
  });
});
