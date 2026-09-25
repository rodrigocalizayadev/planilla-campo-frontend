import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { InsumoForm } from './insumo-form';
import { InsumoService } from './insumo.service';
import { EnumsService } from '../../../core/enums/enums.service';
import type { Insumo, ValorEnum } from '../../../models';

const TIPOS: ValorEnum[] = [{ valor: 'FERTILIZANTE', etiqueta: 'Fertilizante' }];
const UNIDADES: ValorEnum[] = [{ valor: 'KG', etiqueta: 'kg' }];

const enumsStub = {
  opciones: (clave: string) => (clave === 'tipoInsumo' ? TIPOS : clave === 'unidadMedida' ? UNIDADES : []),
  etiqueta: (_clave: string, valor: string) => valor,
};

const INSUMO: Insumo = {
  id: 1,
  nombre: 'Urea granulada',
  tipo: 'FERTILIZANTE',
  unidadMedida: 'KG',
  precioReferencia: { importe: '900', moneda: 'ARS', tipoCambio: '1350' },
  activo: true,
};

describe('InsumoForm', () => {
  let fixture: ComponentFixture<InsumoForm>;
  let insumoService: { crear: ReturnType<typeof vi.fn>; actualizar: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    localStorage.clear();
    insumoService = { crear: vi.fn(), actualizar: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [InsumoForm],
      providers: [
        provideZonelessChangeDetection(),
        { provide: InsumoService, useValue: insumoService },
        { provide: EnumsService, useValue: enumsStub },
      ],
    }).compileComponents();
  });

  // No crea el fixture en el beforeEach: TipoCambioMemoriaService (root, lee
  // localStorage en su constructor) se instancia recién con el primer inject(), al
  // crear el componente. Un test que necesita precargar localStorage tiene que
  // hacerlo antes de llamar a esto.
  function crearFixture(): void {
    fixture = TestBed.createComponent(InsumoForm);
  }

  function enviarFormulario(): void {
    const formulario: HTMLFormElement = fixture.nativeElement.querySelector('form');
    formulario.dispatchEvent(new Event('submit', { cancelable: true }));
  }

  function completarCamposBase(): void {
    const nombre: HTMLInputElement = fixture.nativeElement.querySelector(
      'input[placeholder="Fertilizante foliar importado"]',
    );
    nombre.value = 'Urea granulada';
    nombre.dispatchEvent(new Event('input'));

    const [tipo, unidad]: HTMLSelectElement[] = fixture.nativeElement.querySelectorAll('select');
    tipo.value = 'FERTILIZANTE';
    tipo.dispatchEvent(new Event('input'));
    unidad.value = 'KG';
    unidad.dispatchEvent(new Event('input'));
  }

  it('no crea el insumo con el formulario vacío', async () => {
    crearFixture();
    fixture.autoDetectChanges();
    await fixture.whenStable();

    enviarFormulario();
    await fixture.whenStable();

    expect(insumoService.crear).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelectorAll('.campo__error').length).toBeGreaterThan(0);
  });

  it('no permite un precio de referencia en cero', async () => {
    crearFixture();
    fixture.autoDetectChanges();
    await fixture.whenStable();

    completarCamposBase();
    const precio: HTMLInputElement = fixture.nativeElement.querySelector('.campo-precio__monto');
    precio.value = '0';
    precio.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    enviarFormulario();
    await fixture.whenStable();

    expect(insumoService.crear).not.toHaveBeenCalled();
  });

  it('no permite guardar sin tipo de cambio, aunque el precio sea válido', async () => {
    crearFixture();
    fixture.autoDetectChanges();
    await fixture.whenStable();

    completarCamposBase();
    const precio: HTMLInputElement = fixture.nativeElement.querySelector('.campo-precio__monto');
    precio.value = '900';
    precio.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    enviarFormulario();
    await fixture.whenStable();

    expect(insumoService.crear).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Ingresá el tipo de cambio');
  });

  it('con todos los campos válidos manda el precio como Monto y guarda el tipo de cambio', async () => {
    insumoService.crear.mockReturnValue(of(INSUMO));
    crearFixture();
    fixture.autoDetectChanges();
    await fixture.whenStable();

    completarCamposBase();
    const precio: HTMLInputElement = fixture.nativeElement.querySelector('.campo-precio__monto');
    precio.value = '900';
    precio.dispatchEvent(new Event('input'));
    const tipoCambio: HTMLInputElement = fixture.nativeElement.querySelectorAll(
      'input.campo__input--numerico',
    )[0];
    tipoCambio.value = '1350';
    tipoCambio.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    enviarFormulario();
    await fixture.whenStable();

    expect(insumoService.crear).toHaveBeenCalledWith({
      nombre: 'Urea granulada',
      tipo: 'FERTILIZANTE',
      unidadMedida: 'KG',
      precioReferencia: { importe: '900', moneda: 'ARS', tipoCambio: '1350' },
    });
    expect(localStorage.getItem('planilla-campo:ultimo-tipo-cambio')).toBe('1350');
  });

  it('precarga el tipo de cambio con el último usado', async () => {
    localStorage.setItem('planilla-campo:ultimo-tipo-cambio', '1200');
    crearFixture();
    fixture.autoDetectChanges();
    await fixture.whenStable();

    const tipoCambio: HTMLInputElement = fixture.nativeElement.querySelectorAll(
      'input.campo__input--numerico',
    )[0];
    expect(tipoCambio.value).toBe('1.200,0000');
  });

  it('en edición, precarga los campos con los datos del insumo, incluido el precio', async () => {
    // Regresión: `modelo` se inicializaba leyendo el input `insumo()` en el
    // inicializador de campo, que todavía no tiene el valor pegado en ese momento —
    // el formulario quedaba en blanco al editar (bug real, encontrado usando la app).
    crearFixture();
    fixture.componentRef.setInput('insumo', INSUMO);
    fixture.autoDetectChanges();
    await fixture.whenStable();

    const nombre: HTMLInputElement = fixture.nativeElement.querySelector(
      'input[placeholder="Fertilizante foliar importado"]',
    );
    const precio: HTMLInputElement = fixture.nativeElement.querySelector('.campo-precio__monto');
    const tipoCambio: HTMLInputElement = fixture.nativeElement.querySelectorAll(
      'input.campo__input--numerico',
    )[0];
    expect(nombre.value).toBe('Urea granulada');
    expect(precio.value).toBe('900,00');
    expect(tipoCambio.value).toBe('1.350,0000');
  });

});
