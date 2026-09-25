import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../environments/environment';
import { EnumsService } from './enums.service';
import { TokenStorageService } from '../auth/token-storage.service';
import type { MetadataEnums } from '../../models';

const ENUMS: MetadataEnums = {
  tipoInsumo: [{ valor: 'SEMILLA', etiqueta: 'Semilla' }],
  tipoTarea: [],
  ejecutor: [],
  modoCosto: [],
  calidad: [],
  unidadMedida: [],
  unidadProduccion: [],
  modalidadVenta: [],
  estadoVenta: [],
  estadoCampania: [],
  criterioProrrateo: [],
  moneda: [],
  rol: [],
};

describe('EnumsService', () => {
  let http: HttpTestingController;
  let tokenStorage: TokenStorageService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    tokenStorage = TestBed.inject(TokenStorageService);
  });

  afterEach(() => {
    http.verify();
    tokenStorage.limpiar();
  });

  it('no pide los enums si todavía no hay token (evita el 401 antes de loguearse)', () => {
    TestBed.inject(EnumsService);
    TestBed.flushEffects();

    http.expectNone(`${environment.apiBaseUrl}/metadata/enums`);
  });

  it('pide los enums en cuanto aparece un token, aunque el servicio ya estuviera inyectado', async () => {
    const enumsService = TestBed.inject(EnumsService);
    TestBed.flushEffects();
    http.expectNone(`${environment.apiBaseUrl}/metadata/enums`);

    tokenStorage.guardar('jwt-de-prueba');
    TestBed.flushEffects();

    http.expectOne(`${environment.apiBaseUrl}/metadata/enums`).flush(ENUMS);
    await Promise.resolve();
    TestBed.flushEffects();

    expect(enumsService.opciones('tipoInsumo')).toEqual(ENUMS.tipoInsumo);
  });
});
