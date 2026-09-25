import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../../environments/environment';
import { CultivoService } from './cultivo.service';
import type { Cultivo, CultivoRequest } from '../../../models';

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

describe('CultivoService', () => {
  let service: CultivoService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CultivoService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('crea un cultivo con POST /api/cultivos', () => {
    const payload: CultivoRequest = {
      nombre: 'Zapallo',
      unidadProduccionDefault: 'BIN',
      nombreSingular: 'bin',
      nombrePlural: 'bines',
      kgPorUnidad: null,
      precioReferenciaPrimera: null,
      precioReferenciaSegunda: null,
    };
    service.crear(payload).subscribe();

    const solicitud = http.expectOne(`${environment.apiBaseUrl}/cultivos`);
    expect(solicitud.request.method).toBe('POST');
    expect(solicitud.request.body).toEqual(payload);
    solicitud.flush(CULTIVO);
  });

  it('actualiza un cultivo con PUT /api/cultivos/{id}', () => {
    service
      .actualizar(1, {
        nombre: 'Cebolla',
        unidadProduccionDefault: 'BOLSA',
        nombreSingular: 'bolsa',
        nombrePlural: 'bolsas',
        kgPorUnidad: '20',
        precioReferenciaPrimera: { importe: '9500', moneda: 'ARS' },
        precioReferenciaSegunda: { importe: '4800', moneda: 'ARS' },
      })
      .subscribe();

    const solicitud = http.expectOne(`${environment.apiBaseUrl}/cultivos/1`);
    expect(solicitud.request.method).toBe('PUT');
    solicitud.flush(CULTIVO);
  });

  it('da de baja un cultivo con DELETE /api/cultivos/{id}', () => {
    service.darDeBaja(1).subscribe();

    const solicitud = http.expectOne(`${environment.apiBaseUrl}/cultivos/1`);
    expect(solicitud.request.method).toBe('DELETE');
    solicitud.flush(null);
  });

  it('reactiva un cultivo con PATCH /api/cultivos/{id}/reactivar', () => {
    service.reactivar(1).subscribe();

    const solicitud = http.expectOne(`${environment.apiBaseUrl}/cultivos/1/reactivar`);
    expect(solicitud.request.method).toBe('PATCH');
    solicitud.flush(CULTIVO);
  });
});
