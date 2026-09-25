import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../../environments/environment';
import { CompradorService } from './comprador.service';
import type { Comprador, CompradorRequest } from '../../../models';

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

describe('CompradorService', () => {
  let service: CompradorService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CompradorService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('crea un comprador con POST /api/compradores', () => {
    const payload: CompradorRequest = {
      nombre: 'Distribuidora San Jorge',
      cuit: '30-52341180-4',
      contacto: 'Hugo Sánchez',
      telefono: '2622 44-1180',
      localidad: 'San Rafael',
      modalidadHabitual: 'PRECIO_CERRADO',
    };
    service.crear(payload).subscribe();

    const solicitud = http.expectOne(`${environment.apiBaseUrl}/compradores`);
    expect(solicitud.request.method).toBe('POST');
    expect(solicitud.request.body).toEqual(payload);
    solicitud.flush(COMPRADOR);
  });

  it('actualiza un comprador con PUT /api/compradores/{id}', () => {
    service
      .actualizar(1, {
        nombre: 'Distribuidora San Jorge',
        cuit: null,
        contacto: null,
        telefono: null,
        localidad: null,
        modalidadHabitual: 'CONSIGNACION',
      })
      .subscribe();

    const solicitud = http.expectOne(`${environment.apiBaseUrl}/compradores/1`);
    expect(solicitud.request.method).toBe('PUT');
    solicitud.flush(COMPRADOR);
  });

  it('da de baja un comprador con DELETE /api/compradores/{id}', () => {
    service.darDeBaja(1).subscribe();

    const solicitud = http.expectOne(`${environment.apiBaseUrl}/compradores/1`);
    expect(solicitud.request.method).toBe('DELETE');
    solicitud.flush(null);
  });

  it('reactiva un comprador con PATCH /api/compradores/{id}/reactivar', () => {
    service.reactivar(1).subscribe();

    const solicitud = http.expectOne(`${environment.apiBaseUrl}/compradores/1/reactivar`);
    expect(solicitud.request.method).toBe('PATCH');
    solicitud.flush(COMPRADOR);
  });
});
