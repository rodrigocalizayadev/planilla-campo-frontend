import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../environments/environment';
import { CampaniaService } from './campania.service';
import type { Campania, CampaniaRequest } from '../../models';

const CAMPANIA: Campania = {
  id: 1,
  nombre: '2025/26',
  fechaInicio: '2025-08-01',
  fechaFin: '2026-07-31',
  estado: 'PLANIFICADA',
  gastosComercializacionEstimados: '0.12',
  createdAt: '2026-08-01T00:00:00Z',
  updatedAt: '2026-08-01T00:00:00Z',
};

describe('CampaniaService', () => {
  let service: CampaniaService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CampaniaService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('crea una campaña con POST /api/campanias', () => {
    const payload: CampaniaRequest = {
      nombre: '2025/26',
      fechaInicio: '2025-08-01',
      fechaFin: '2026-07-31',
      gastosComercializacionEstimados: '0.12',
      cotizacionVigente: null,
    };
    service.crear(payload).subscribe();

    const solicitud = http.expectOne(`${environment.apiBaseUrl}/campanias`);
    expect(solicitud.request.method).toBe('POST');
    expect(solicitud.request.body).toEqual(payload);
    solicitud.flush(CAMPANIA);
  });

  it('cambia el estado con PATCH /api/campanias/{id}/estado', () => {
    service.cambiarEstado(1, 'EN_CURSO').subscribe();

    const solicitud = http.expectOne(`${environment.apiBaseUrl}/campanias/1/estado`);
    expect(solicitud.request.method).toBe('PATCH');
    expect(solicitud.request.body).toEqual({ estado: 'EN_CURSO' });
    solicitud.flush({ ...CAMPANIA, estado: 'EN_CURSO' });
  });

  it('cierra la campaña con PATCH /api/campanias/{id}/cerrar', () => {
    service.cerrar(1).subscribe();

    const solicitud = http.expectOne(`${environment.apiBaseUrl}/campanias/1/cerrar`);
    expect(solicitud.request.method).toBe('PATCH');
    expect(solicitud.request.body).toBeNull();
    solicitud.flush({ ...CAMPANIA, estado: 'CERRADA' });
  });
});
