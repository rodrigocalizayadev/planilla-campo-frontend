import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CampaniaActivaService, type CampaniaActivaResumen } from './campania-activa.service';

const CLAVE_STORAGE = 'planilla-campo:campania-activa';

const CAMPANIA: CampaniaActivaResumen = { id: 1, nombre: '2025/26', estado: 'EN_CURSO' };

describe('CampaniaActivaService', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  });

  it('arranca sin campaña activa si no hay nada en localStorage', () => {
    const service = TestBed.inject(CampaniaActivaService);
    expect(service.campania()).toBeNull();
  });

  it('establecer() guarda en localStorage y actualiza el signal', () => {
    const service = TestBed.inject(CampaniaActivaService);
    service.establecer(CAMPANIA);

    expect(service.campania()).toEqual(CAMPANIA);
    expect(JSON.parse(localStorage.getItem(CLAVE_STORAGE)!)).toEqual(CAMPANIA);
  });

  it('una nueva instancia lee la campaña persistida en localStorage', () => {
    localStorage.setItem(CLAVE_STORAGE, JSON.stringify(CAMPANIA));

    const service = TestBed.inject(CampaniaActivaService);

    expect(service.campania()).toEqual(CAMPANIA);
  });

  it('ignora un valor corrupto en localStorage sin romper', () => {
    localStorage.setItem(CLAVE_STORAGE, '{no es json');

    const service = TestBed.inject(CampaniaActivaService);

    expect(service.campania()).toBeNull();
  });

  it('limpiar() borra el signal y el localStorage', () => {
    const service = TestBed.inject(CampaniaActivaService);
    service.establecer(CAMPANIA);

    service.limpiar();

    expect(service.campania()).toBeNull();
    expect(localStorage.getItem(CLAVE_STORAGE)).toBeNull();
  });

  it('abrirSelector()/cerrarSelector() gobiernan el signal selectorAbierto', () => {
    const service = TestBed.inject(CampaniaActivaService);
    expect(service.selectorAbierto()).toBe(false);

    service.abrirSelector();
    expect(service.selectorAbierto()).toBe(true);

    service.cerrarSelector();
    expect(service.selectorAbierto()).toBe(false);
  });
});
