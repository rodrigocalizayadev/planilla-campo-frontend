import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { CultivoForm } from './cultivo-form';
import { CultivoService } from './cultivo.service';
import { EnumsService } from '../../../core/enums/enums.service';
import type { Cultivo, ValorEnum } from '../../../models';

const OPCIONES_UNIDAD: ValorEnum[] = [
  { valor: 'BOLSA', etiqueta: 'bolsa' },
  { valor: 'BIN', etiqueta: 'bin' },
];

const enumsStub = {
  opciones: (clave: string) => (clave === 'unidadProduccion' ? OPCIONES_UNIDAD : []),
  etiqueta: (clave: string, valor: string) =>
    (clave === 'unidadProduccion' ? OPCIONES_UNIDAD : []).find((o) => o.valor === valor)?.etiqueta ?? valor,
};

const CULTIVO: Cultivo = {
  id: 1,
  nombre: 'Cebolla',
  unidadProduccionDefault: 'BOLSA',
  nombreSingular: 'bolsa',
  nombrePlural: 'bolsas',
  kgPorUnidad: '20',
  precioReferenciaPrimera: { importe: '9000', moneda: 'ARS' },
  precioReferenciaSegunda: { importe: '4500', moneda: 'ARS' },
  activo: true,
};

describe('CultivoForm', () => {
  let fixture: ComponentFixture<CultivoForm>;
  let cultivoService: { crear: ReturnType<typeof vi.fn>; actualizar: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    localStorage.clear();
    cultivoService = {
      crear: vi.fn(),
      actualizar: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [CultivoForm],
      providers: [
        provideZonelessChangeDetection(),
        { provide: CultivoService, useValue: cultivoService },
        { provide: EnumsService, useValue: enumsStub },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CultivoForm);
  });

  function seleccionarUnidad(valor: string): void {
    const select: HTMLSelectElement = fixture.nativeElement.querySelector('select');
    select.value = valor;
    select.dispatchEvent(new Event('change'));
  }

  function enviarFormulario(): void {
    const formulario: HTMLFormElement = fixture.nativeElement.querySelector('form');
    formulario.dispatchEvent(new Event('submit', { cancelable: true }));
  }

  it('al elegir una unidad de producción autocompleta singular y plural desde la etiqueta del enum', async () => {
    fixture.autoDetectChanges();
    await fixture.whenStable();

    seleccionarUnidad('BIN');
    await fixture.whenStable();

    const singular: HTMLInputElement = fixture.nativeElement.querySelector('input[placeholder="bolsa"]');
    const plural: HTMLInputElement = fixture.nativeElement.querySelector('input[placeholder="bolsas"]');
    expect(singular.value).toBe('bin');
    expect(plural.value).toBe('bines');
  });

  it('los campos autocompletados quedan editables', async () => {
    fixture.autoDetectChanges();
    await fixture.whenStable();

    seleccionarUnidad('BOLSA');
    await fixture.whenStable();

    const plural: HTMLInputElement = fixture.nativeElement.querySelector('input[placeholder="bolsas"]');
    plural.value = 'bolsas de 20kg';
    plural.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    expect(plural.value).toBe('bolsas de 20kg');
  });

  it('no crea el cultivo si falta nombre o unidad', async () => {
    fixture.autoDetectChanges();
    await fixture.whenStable();

    enviarFormulario();
    await fixture.whenStable();

    expect(cultivoService.crear).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelectorAll('.campo__error').length).toBeGreaterThan(0);
  });

  it('con nombre y unidad completos, sin precio, crea el cultivo', async () => {
    cultivoService.crear.mockReturnValue(of(CULTIVO));
    fixture.autoDetectChanges();
    await fixture.whenStable();

    const nombre: HTMLInputElement = fixture.nativeElement.querySelector('input[placeholder="Cebolla"]');
    nombre.value = 'Cebolla';
    nombre.dispatchEvent(new Event('input'));
    seleccionarUnidad('BOLSA');
    await fixture.whenStable();

    enviarFormulario();
    await fixture.whenStable();

    expect(cultivoService.crear).toHaveBeenCalledWith(
      expect.objectContaining({
        nombre: 'Cebolla',
        unidadProduccionDefault: 'BOLSA',
        nombreSingular: 'bolsa',
        nombrePlural: 'bolsas',
        precioReferenciaPrimera: null,
        precioReferenciaSegunda: null,
      }),
    );
  });

  it('con un precio de referencia cargado, manda el precio en pesos sin tipo de cambio', async () => {
    cultivoService.crear.mockReturnValue(of(CULTIVO));
    fixture.autoDetectChanges();
    await fixture.whenStable();

    const nombre: HTMLInputElement = fixture.nativeElement.querySelector('input[placeholder="Cebolla"]');
    nombre.value = 'Cebolla';
    nombre.dispatchEvent(new Event('input'));
    seleccionarUnidad('BOLSA');
    const [, precioPrimera]: HTMLInputElement[] = fixture.nativeElement.querySelectorAll(
      'input.campo__input--numerico',
    );
    precioPrimera.value = '9000';
    precioPrimera.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    enviarFormulario();
    await fixture.whenStable();

    expect(cultivoService.crear).toHaveBeenCalledWith(
      expect.objectContaining({
        precioReferenciaPrimera: { importe: '9000', moneda: 'ARS' },
        precioReferenciaSegunda: null,
      }),
    );
  });

  it('en edición, precarga los campos con los datos del cultivo, incluidos los precios', async () => {
    // Regresión: `modelo` se inicializaba leyendo el input `cultivo()` en el
    // inicializador de campo, que todavía no tiene el valor pegado en ese momento —
    // el formulario quedaba en blanco al editar (bug real, encontrado usando la app).
    fixture.componentRef.setInput('cultivo', CULTIVO);
    fixture.autoDetectChanges();
    await fixture.whenStable();

    const nombre: HTMLInputElement = fixture.nativeElement.querySelector('input[placeholder="Cebolla"]');
    const [, precioPrimera, precioSegunda]: HTMLInputElement[] =
      fixture.nativeElement.querySelectorAll('input.campo__input--numerico');
    expect(nombre.value).toBe('Cebolla');
    expect(precioPrimera.value).toBe('9.000,00');
    expect(precioSegunda.value).toBe('4.500,00');
  });
});
