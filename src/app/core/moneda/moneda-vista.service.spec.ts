import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MonedaVistaService } from './moneda-vista.service';

const CLAVE_STORAGE = 'planilla-campo:moneda-vista';

describe('MonedaVistaService', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  });

  it('arranca en USD si no hay nada en localStorage', () => {
    const service = TestBed.inject(MonedaVistaService);
    expect(service.moneda()).toBe('USD');
  });

  it('establecer() guarda en localStorage y actualiza el signal', () => {
    const service = TestBed.inject(MonedaVistaService);
    service.establecer('ARS');

    expect(service.moneda()).toBe('ARS');
    expect(localStorage.getItem(CLAVE_STORAGE)).toBe('ARS');
  });

  it('una nueva instancia lee la moneda persistida en localStorage', () => {
    localStorage.setItem(CLAVE_STORAGE, 'ARS');

    const service = TestBed.inject(MonedaVistaService);

    expect(service.moneda()).toBe('ARS');
  });

  it('ignora un valor corrupto en localStorage y arranca en USD', () => {
    localStorage.setItem(CLAVE_STORAGE, 'yenes');

    const service = TestBed.inject(MonedaVistaService);

    expect(service.moneda()).toBe('USD');
  });
});
