import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { CompradorForm } from './comprador-form';
import { CompradorService } from './comprador.service';
import { EnumsService } from '../../../core/enums/enums.service';
import type { Comprador, ValorEnum } from '../../../models';

const MODALIDADES: ValorEnum[] = [
  { valor: 'PRECIO_CERRADO', etiqueta: 'Precio cerrado' },
  { valor: 'CONSIGNACION', etiqueta: 'Consignación' },
];

const enumsStub = {
  opciones: (clave: string) => (clave === 'modalidadVenta' ? MODALIDADES : []),
  etiqueta: (_clave: string, valor: string) => valor,
};

const COMPRADOR: Comprador = {
  id: 1,
  nombre: 'Distribuidora San Jorge',
  cuit: '30-52341180-4',
  contacto: 'Hugo Sánchez',
  telefono: '2622 44-1180',
  localidad: 'San Rafael',
  modalidadHabitual: 'PRECIO_CERRADO',
  activo: true,
};

describe('CompradorForm', () => {
  let fixture: ComponentFixture<CompradorForm>;
  let compradorService: { crear: ReturnType<typeof vi.fn>; actualizar: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    compradorService = { crear: vi.fn(), actualizar: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [CompradorForm],
      providers: [
        provideZonelessChangeDetection(),
        { provide: CompradorService, useValue: compradorService },
        { provide: EnumsService, useValue: enumsStub },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CompradorForm);
  });

  function enviarFormulario(): void {
    const formulario: HTMLFormElement = fixture.nativeElement.querySelector('form');
    formulario.dispatchEvent(new Event('submit', { cancelable: true }));
  }

  it('no crea el comprador sin nombre', async () => {
    fixture.autoDetectChanges();
    await fixture.whenStable();

    enviarFormulario();
    await fixture.whenStable();

    expect(compradorService.crear).not.toHaveBeenCalled();
  });

  it('con solo el nombre alcanza para crear, y manda null (no "") en modalidadHabitual', async () => {
    // Regresión: el backend real deserializa modalidadHabitual como el enum
    // ModalidadVenta y una cadena vacía dispara un 401 con cuerpo vacío en vez de un
    // 400 normal (docs/resumen-slices.md, slice 2).
    compradorService.crear.mockReturnValue(of(COMPRADOR));
    fixture.autoDetectChanges();
    await fixture.whenStable();

    const nombre: HTMLInputElement = fixture.nativeElement.querySelector(
      'input[placeholder="Distribuidora San Jorge"]',
    );
    nombre.value = 'Distribuidora San Jorge';
    nombre.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    enviarFormulario();
    await fixture.whenStable();

    expect(compradorService.crear).toHaveBeenCalledWith({
      nombre: 'Distribuidora San Jorge',
      cuit: null,
      contacto: null,
      telefono: null,
      localidad: null,
      modalidadHabitual: null,
    });
  });

  it('en edición, precarga los campos con los datos del comprador', async () => {
    // Regresión: `modelo` se inicializaba leyendo el input `comprador()` en el
    // inicializador de campo, que todavía no tiene el valor pegado en ese momento —
    // el formulario quedaba en blanco al editar (bug real, encontrado usando la app).
    fixture.componentRef.setInput('comprador', COMPRADOR);
    fixture.autoDetectChanges();
    await fixture.whenStable();

    const nombre: HTMLInputElement = fixture.nativeElement.querySelector(
      'input[placeholder="Distribuidora San Jorge"]',
    );
    const cuit: HTMLInputElement = fixture.nativeElement.querySelector(
      'input[placeholder="30-12345678-9"]',
    );
    expect(nombre.value).toBe('Distribuidora San Jorge');
    expect(cuit.value).toBe('30-52341180-4');
  });

});
