import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../../environments/environment';
import { LoteService } from './lote.service';
import type { Lote, LoteRequest } from '../../../models';

const LOTE: Lote = {
  id: 1,
  nombre: 'Lote 1',
  superficieHa: '8.50',
  tipoSuelo: 'Franco',
  comentarios: null,
  activo: true,
};

describe('LoteService', () => {
  let service: LoteService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(LoteService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('crea un lote con POST /api/lotes', () => {
    const payload: LoteRequest = { nombre: 'Lote 7', superficieHa: '4.00', tipoSuelo: '', comentarios: null };
    service.crear(payload).subscribe();

    const solicitud = http.expectOne(`${environment.apiBaseUrl}/lotes`);
    expect(solicitud.request.method).toBe('POST');
    expect(solicitud.request.body).toEqual(payload);
    solicitud.flush(LOTE);
  });

  it('actualiza un lote con PUT /api/lotes/{id}', () => {
    const payload: LoteRequest = { nombre: 'Lote 1', superficieHa: '9.00', tipoSuelo: 'Franco', comentarios: null };
    service.actualizar(1, payload).subscribe();

    const solicitud = http.expectOne(`${environment.apiBaseUrl}/lotes/1`);
    expect(solicitud.request.method).toBe('PUT');
    solicitud.flush(LOTE);
  });

  it('da de baja un lote con DELETE /api/lotes/{id}', () => {
    service.darDeBaja(1).subscribe();

    const solicitud = http.expectOne(`${environment.apiBaseUrl}/lotes/1`);
    expect(solicitud.request.method).toBe('DELETE');
    solicitud.flush(null);
  });

  it('reactiva un lote con PATCH /api/lotes/{id}/reactivar', () => {
    service.reactivar(1).subscribe();

    const solicitud = http.expectOne(`${environment.apiBaseUrl}/lotes/1/reactivar`);
    expect(solicitud.request.method).toBe('PATCH');
    solicitud.flush(LOTE);
  });
});
