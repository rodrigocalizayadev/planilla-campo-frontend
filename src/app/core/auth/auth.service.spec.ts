import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import { TokenStorageService } from './token-storage.service';
import { UsuarioActualService } from './usuario-actual.service';
import type { Usuario } from '../../models';

const USUARIO: Usuario = {
  id: 1,
  nombre: 'Juan',
  apellido: 'García',
  email: 'juan@example.com',
  rol: 'ADMIN',
};

describe('AuthService', () => {
  let service: AuthService;
  let http: HttpTestingController;
  let tokenStorage: TokenStorageService;
  let usuarioActual: UsuarioActualService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
    tokenStorage = TestBed.inject(TokenStorageService);
    usuarioActual = TestBed.inject(UsuarioActualService);
  });

  afterEach(() => {
    http.verify();
    tokenStorage.limpiar();
  });

  it('guarda el token y carga el usuario tras un login exitoso', () => {
    let usuarioRecibido: Usuario | undefined;
    service.login({ email: 'juan@example.com', password: 'secreto' }).subscribe((u) => {
      usuarioRecibido = u;
    });

    const loginReq = http.expectOne(`${environment.apiBaseUrl}/auth/login`);
    expect(loginReq.request.method).toBe('POST');
    loginReq.flush({ token: 'jwt-de-prueba' });

    const meReq = http.expectOne(`${environment.apiBaseUrl}/auth/me`);
    meReq.flush(USUARIO);

    expect(tokenStorage.token()).toBe('jwt-de-prueba');
    expect(usuarioActual.usuario()).toEqual(USUARIO);
    expect(usuarioRecibido).toEqual(USUARIO);
  });

  it('salir() limpia el token y el usuario', () => {
    tokenStorage.guardar('jwt-de-prueba');
    usuarioActual.establecer(USUARIO);

    service.salir();

    expect(tokenStorage.token()).toBeNull();
    expect(usuarioActual.usuario()).toBeNull();
  });
});
