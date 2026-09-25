import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { CosechaForm } from './cosecha-form';
import { LoteCampaniaService } from './lote-campania.service';
import { AvisoService } from '../../shared/ui/aviso/aviso.service';
import type { Cosecha, ErrorResponse } from '../../models';

const COSECHA: Cosecha = {
  id: 1,
  loteCampaniaId: 4,
  fecha: '2026-07-20',
  numeroCorte: 1,
  calidad: 'PRIMERA',
  cantidad: '100',
  unidad: 'BOLSA',
  kgEquivalente: '2000',
};

const CORTE_PRIMERA: Cosecha = COSECHA;
const CORTE_SEGUNDA: Cosecha = {
  id: 2,
  loteCampaniaId: 4,
  fecha: '2026-07-20',
  numeroCorte: 1,
  calidad: 'SEGUNDA',
  cantidad: '20',
  unidad: 'BOLSA',
  kgEquivalente: '400',
};

describe('CosechaForm', () => {
  let fixture: ComponentFixture<CosechaForm>;
  let loteCampaniaService: {
    crearCosecha: ReturnType<typeof vi.fn>;
    actualizarCosecha: ReturnType<typeof vi.fn>;
    eliminarCosecha: ReturnType<typeof vi.fn>;
  };
  let aviso: AvisoService;

  beforeEach(async () => {
    localStorage.clear();
    loteCampaniaService = {
      crearCosecha: vi.fn(),
      actualizarCosecha: vi.fn(),
      eliminarCosecha: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [CosechaForm],
      providers: [
        provideZonelessChangeDetection(),
        { provide: LoteCampaniaService, useValue: loteCampaniaService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CosechaForm);
    fixture.componentRef.setInput('loteCampaniaId', 4);
    fixture.componentRef.setInput('proximoCorte', 3);
    aviso = TestBed.inject(AvisoService);
    vi.spyOn(aviso, 'mostrar');
  });

  function inputsCalidad(): { primera: HTMLInputElement; segunda: HTMLInputElement; descarte: HTMLInputElement } {
    const [, primera, segunda, descarte]: HTMLInputElement[] = fixture.nativeElement.querySelectorAll(
      'input[inputmode="decimal"], input[inputmode="numeric"]',
    );
    return { primera, segunda, descarte };
  }

  function enviarFormulario(): void {
    const formulario: HTMLFormElement = fixture.nativeElement.querySelector('form');
    formulario.dispatchEvent(new Event('submit', { cancelable: true }));
  }

  it('precarga el número de corte con el próximo sugerido', async () => {
    fixture.autoDetectChanges();
    await fixture.whenStable();

    const numeroCorte: HTMLInputElement = fixture.nativeElement.querySelector('input[inputmode="numeric"]');
    expect(numeroCorte.value).toBe('3');
  });

  it('no guarda si no se cargó ninguna calidad', async () => {
    fixture.autoDetectChanges();
    await fixture.whenStable();

    enviarFormulario();
    await fixture.whenStable();

    expect(loteCampaniaService.crearCosecha).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Cargá la cantidad de al menos una calidad');
  });

  it('carga solo las calidades con cantidad, con numeroCorte como número', async () => {
    loteCampaniaService.crearCosecha.mockReturnValue(of(COSECHA));
    fixture.autoDetectChanges();
    await fixture.whenStable();

    const { primera, descarte } = inputsCalidad();
    primera.value = '100';
    primera.dispatchEvent(new Event('input'));
    descarte.value = '5';
    descarte.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    enviarFormulario();
    await fixture.whenStable();

    expect(loteCampaniaService.crearCosecha).toHaveBeenCalledTimes(2);
    expect(loteCampaniaService.crearCosecha).toHaveBeenCalledWith(4, {
      fecha: expect.any(String),
      numeroCorte: 3,
      calidad: 'PRIMERA',
      cantidad: '100',
    });
    expect(loteCampaniaService.crearCosecha).toHaveBeenCalledWith(4, {
      fecha: expect.any(String),
      numeroCorte: 3,
      calidad: 'DESCARTE',
      cantidad: '5',
    });
    expect(aviso.mostrar).toHaveBeenCalledWith('Cosecha del corte 3 cargada');
  });

  it('muestra el error del servidor en el toast rojo si falla (ej. cultivo sin kgPorUnidad configurado)', async () => {
    const error: ErrorResponse = {
      timestamp: new Date().toISOString(),
      status: 422,
      code: 'KG_POR_UNIDAD_NO_CONFIGURADO',
      message: 'El cultivo no tiene configurado el factor kg_por_unidad',
      details: [],
    };
    loteCampaniaService.crearCosecha.mockReturnValue(throwError(() => error));
    fixture.autoDetectChanges();
    await fixture.whenStable();

    const { primera } = inputsCalidad();
    primera.value = '100';
    primera.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    enviarFormulario();
    await fixture.whenStable();

    expect(aviso.mostrar).toHaveBeenCalledWith('El cultivo no tiene configurado el factor kg_por_unidad', 'error');
  });

  describe('edición de un corte existente', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('cosechasExistentes', [CORTE_PRIMERA, CORTE_SEGUNDA]);
    });

    it('precarga fecha, número de corte y las cantidades por calidad', async () => {
      fixture.autoDetectChanges();
      await fixture.whenStable();

      const numeroCorte: HTMLInputElement = fixture.nativeElement.querySelector('input[inputmode="numeric"]');
      const { primera, segunda, descarte } = inputsCalidad();
      expect(numeroCorte.value).toBe('1');
      expect(primera.value).toBe('100');
      expect(segunda.value).toBe('20');
      expect(descarte.value).toBe('');
      expect(fixture.nativeElement.textContent).toContain('Editar corte 1');
    });

    it('una calidad con fila previa y cantidad nueva dispara PUT', async () => {
      loteCampaniaService.actualizarCosecha.mockReturnValue(of(COSECHA));
      fixture.autoDetectChanges();
      await fixture.whenStable();

      const { primera } = inputsCalidad();
      primera.value = '150';
      primera.dispatchEvent(new Event('input'));
      await fixture.whenStable();

      enviarFormulario();
      await fixture.whenStable();

      expect(loteCampaniaService.actualizarCosecha).toHaveBeenCalledWith(4, 1, {
        fecha: '2026-07-20',
        numeroCorte: 1,
        calidad: 'PRIMERA',
        cantidad: '150',
      });
      expect(loteCampaniaService.crearCosecha).not.toHaveBeenCalled();
      expect(aviso.mostrar).toHaveBeenCalledWith('Corte 1 actualizado');
    });

    it('una calidad con fila previa y el campo vaciado dispara DELETE', async () => {
      loteCampaniaService.actualizarCosecha.mockReturnValue(of(COSECHA));
      loteCampaniaService.eliminarCosecha.mockReturnValue(of(undefined));
      fixture.autoDetectChanges();
      await fixture.whenStable();

      const { segunda } = inputsCalidad();
      segunda.value = '';
      segunda.dispatchEvent(new Event('input'));
      await fixture.whenStable();

      enviarFormulario();
      await fixture.whenStable();

      expect(loteCampaniaService.eliminarCosecha).toHaveBeenCalledWith(4, 2);
      expect(loteCampaniaService.actualizarCosecha).toHaveBeenCalledWith(4, 1, expect.objectContaining({ calidad: 'PRIMERA' }));
    });

    it('una calidad sin fila previa y cantidad cargada dispara POST', async () => {
      loteCampaniaService.actualizarCosecha.mockReturnValue(of(COSECHA));
      loteCampaniaService.crearCosecha.mockReturnValue(of(COSECHA));
      fixture.autoDetectChanges();
      await fixture.whenStable();

      const { descarte } = inputsCalidad();
      descarte.value = '5';
      descarte.dispatchEvent(new Event('input'));
      await fixture.whenStable();

      enviarFormulario();
      await fixture.whenStable();

      expect(loteCampaniaService.crearCosecha).toHaveBeenCalledWith(4, {
        fecha: '2026-07-20',
        numeroCorte: 1,
        calidad: 'DESCARTE',
        cantidad: '5',
      });
    });

    it('vaciar todas las calidades no manda nada: pide usar "Eliminar corte"', async () => {
      fixture.autoDetectChanges();
      await fixture.whenStable();

      const { primera, segunda } = inputsCalidad();
      primera.value = '';
      primera.dispatchEvent(new Event('input'));
      segunda.value = '';
      segunda.dispatchEvent(new Event('input'));
      await fixture.whenStable();

      enviarFormulario();
      await fixture.whenStable();

      expect(loteCampaniaService.actualizarCosecha).not.toHaveBeenCalled();
      expect(loteCampaniaService.eliminarCosecha).not.toHaveBeenCalled();
      expect(fixture.nativeElement.textContent).toContain('Eliminar corte');
    });
  });
});
