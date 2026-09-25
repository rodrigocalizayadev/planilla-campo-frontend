import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../../environments/environment';
import { InsumoService } from './insumo.service';
import type { Insumo, InsumoRequest } from '../../../models';

const INSUMO: Insumo = {
  id: 1,
  nombre: 'Urea granulada',
  tipo: 'FERTILIZANTE',
  unidadMedida: 'KG',
  precioReferencia: { importe: '900', moneda: 'ARS', tipoCambio: '1350', importeUsd: '0.6667' },
  activo: true,
};

describe('InsumoService', () => {
  let service: InsumoService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(InsumoService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('crea un insumo con POST /api/insumos', () => {
    const payload: InsumoRequest = {
      nombre: 'Urea granulada',
      tipo: 'FERTILIZANTE',
      unidadMedida: 'KG',
      precioReferencia: { importe: '900', moneda: 'ARS', tipoCambio: '1350' },
    };
    service.crear(payload).subscribe();

    const solicitud = http.expectOne(`${environment.apiBaseUrl}/insumos`);
    expect(solicitud.request.method).toBe('POST');
    expect(solicitud.request.body).toEqual(payload);
    solicitud.flush(INSUMO);
  });

  it('actualiza un insumo con PUT /api/insumos/{id}', () => {
    service
      .actualizar(1, {
        nombre: 'Urea granulada',
        tipo: 'FERTILIZANTE',
        unidadMedida: 'KG',
        precioReferencia: { importe: '950', moneda: 'ARS', tipoCambio: '1350' },
      })
      .subscribe();

    const solicitud = http.expectOne(`${environment.apiBaseUrl}/insumos/1`);
    expect(solicitud.request.method).toBe('PUT');
    solicitud.flush(INSUMO);
  });

  it('da de baja un insumo con DELETE /api/insumos/{id}', () => {
    service.darDeBaja(1).subscribe();

    const solicitud = http.expectOne(`${environment.apiBaseUrl}/insumos/1`);
    expect(solicitud.request.method).toBe('DELETE');
    solicitud.flush(null);
  });

  it('reactiva un insumo con PATCH /api/insumos/{id}/reactivar', () => {
    service.reactivar(1).subscribe();

    const solicitud = http.expectOne(`${environment.apiBaseUrl}/insumos/1/reactivar`);
    expect(solicitud.request.method).toBe('PATCH');
    solicitud.flush(INSUMO);
  });
});
