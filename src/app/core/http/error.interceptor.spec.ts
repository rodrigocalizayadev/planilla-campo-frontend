import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { errorInterceptor } from './error.interceptor';
import { TokenStorageService } from '../auth/token-storage.service';
import type { ErrorResponse } from '../../models';

describe('errorInterceptor', () => {
  let http: HttpClient;
  let httpTesting: HttpTestingController;
  let tokenStorage: TokenStorageService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    httpTesting = TestBed.inject(HttpTestingController);
    tokenStorage = TestBed.inject(TokenStorageService);
  });

  afterEach(() => {
    httpTesting.verify();
    tokenStorage.limpiar();
  });

  it('propaga el mensaje del backend cuando la respuesta trae el cuerpo de error', async () => {
    let recibido: ErrorResponse | undefined;
    http.get('/api/lo-que-sea').subscribe({ error: (e: ErrorResponse) => (recibido = e) });

    httpTesting
      .expectOne('/api/lo-que-sea')
      .flush(
        { timestamp: '2026-01-01T00:00:00Z', status: 404, code: 'NO_ENCONTRADO', message: 'No existe', details: [] },
        { status: 404, statusText: 'Not Found' },
      );

    expect(recibido?.message).toBe('No existe');
    expect(recibido?.code).toBe('NO_ENCONTRADO');
  });

  it('en una falla de red (backend caído) no filtra el mensaje crudo del navegador', async () => {
    let recibido: ErrorResponse | undefined;
    http.get('/api/lo-que-sea').subscribe({ error: (e: ErrorResponse) => (recibido = e) });

    httpTesting
      .expectOne('/api/lo-que-sea')
      .error(new ErrorEvent('error', { message: 'Failed to fetch' }), {
        status: 0,
        statusText: 'Unknown Error',
      });

    expect(recibido?.message).toBe('No se pudo completar la operación. Probá de nuevo.');
    expect(recibido?.message).not.toContain('Failed to fetch');
  });

  it('un 401 limpia la sesión', () => {
    tokenStorage.guardar('jwt-vencido');
    http.get('/api/lo-que-sea').subscribe({ error: () => undefined });

    httpTesting
      .expectOne('/api/lo-que-sea')
      .flush(
        { timestamp: '2026-01-01T00:00:00Z', status: 401, code: 'NO_AUTORIZADO', message: 'Token vencido', details: [] },
        { status: 401, statusText: 'Unauthorized' },
      );

    expect(tokenStorage.token()).toBeNull();
  });
});
