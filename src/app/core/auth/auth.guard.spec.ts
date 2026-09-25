import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  UrlTree,
  provideRouter,
} from '@angular/router';
import { Observable, firstValueFrom, isObservable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { authGuard } from './auth.guard';
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

function ejecutarGuard(url: string) {
  return TestBed.runInInjectionContext(() =>
    authGuard({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot),
  );
}

function ejecutarGuardAsync(url: string): Promise<boolean | UrlTree> {
  const resultado = ejecutarGuard(url);
  expect(isObservable(resultado)).toBe(true);
  return firstValueFrom(resultado as Observable<boolean | UrlTree>);
}

describe('authGuard', () => {
  let http: HttpTestingController;
  let tokenStorage: TokenStorageService;
  let usuarioActual: UsuarioActualService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    tokenStorage = TestBed.inject(TokenStorageService);
    usuarioActual = TestBed.inject(UsuarioActualService);
  });

  afterEach(() => {
    http.verify();
    tokenStorage.limpiar();
  });

  it('redirige a login cuando no hay token', () => {
    const resultado = ejecutarGuard('/tablero');

    expect(resultado).toBeInstanceOf(UrlTree);
    expect((resultado as UrlTree).toString()).toContain('/login');
  });

  it('deja pasar cuando ya hay un usuario cargado', () => {
    tokenStorage.guardar('jwt-de-prueba');
    usuarioActual.establecer(USUARIO);

    expect(ejecutarGuard('/tablero')).toBe(true);
  });

  it('con token pero sin usuario, pide /auth/me y deja pasar si responde bien', async () => {
    tokenStorage.guardar('jwt-de-prueba');

    const promesa = ejecutarGuardAsync('/tablero');
    http.expectOne(`${environment.apiBaseUrl}/auth/me`).flush(USUARIO);

    await expect(promesa).resolves.toBe(true);
  });

  it('token vencido: si /auth/me devuelve error, redirige a login sin romper la app', async () => {
    tokenStorage.guardar('jwt-vencido');
    const router = TestBed.inject(Router);

    const promesa = ejecutarGuardAsync('/tablero');
    http
      .expectOne(`${environment.apiBaseUrl}/auth/me`)
      .flush({ message: 'Token expirado' }, { status: 401, statusText: 'Unauthorized' });

    const valor = await promesa;
    expect(valor).toBeInstanceOf(UrlTree);
    expect(router.serializeUrl(valor as UrlTree)).toContain('/login');
  });
});
