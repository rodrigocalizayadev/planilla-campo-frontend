import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { Login } from './login';
import { AuthService } from '../../../core/auth/auth.service';
import type { ErrorResponse, Usuario } from '../../../models';

const USUARIO: Usuario = {
  id: 1,
  nombre: 'Juan',
  apellido: 'García',
  email: 'juan@example.com',
  rol: 'ADMIN',
};

describe('Login', () => {
  let fixture: ComponentFixture<Login>;
  let login: ReturnType<typeof vi.fn>;
  let router: Router;

  beforeEach(async () => {
    login = vi.fn();

    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: AuthService, useValue: { login } as unknown as AuthService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Login);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    fixture.autoDetectChanges();
    await fixture.whenStable();
  });

  function enviarFormulario(): void {
    const formulario: HTMLFormElement = fixture.nativeElement.querySelector('form');
    formulario.dispatchEvent(new Event('submit', { cancelable: true }));
  }

  function completarCampo(selector: string, valor: string): void {
    const input: HTMLInputElement = fixture.nativeElement.querySelector(selector);
    input.value = valor;
    input.dispatchEvent(new Event('input'));
  }

  it('no llama a login y muestra los errores si el formulario está vacío', async () => {
    enviarFormulario();
    await fixture.whenStable();

    expect(login).not.toHaveBeenCalled();
    const errores = fixture.nativeElement.querySelectorAll('.campo__error');
    expect(errores.length).toBeGreaterThan(0);
  });

  it('con credenciales válidas llama a login y navega al éxito', async () => {
    login.mockReturnValue(of(USUARIO));

    completarCampo('input[type="email"]', 'juan@example.com');
    completarCampo('input[type="password"]', 'secreto');
    await fixture.whenStable();

    enviarFormulario();
    await fixture.whenStable();

    expect(login).toHaveBeenCalledWith({ email: 'juan@example.com', password: 'secreto' });
    expect(router.navigateByUrl).toHaveBeenCalledWith('/');
  });

  it('muestra el mensaje del servidor cuando el login falla', async () => {
    const error: ErrorResponse = {
      timestamp: new Date().toISOString(),
      status: 401,
      code: 'CREDENCIALES_INVALIDAS',
      message: 'Email o contraseña incorrectos',
      details: [],
    };
    login.mockReturnValue(throwError(() => error));

    completarCampo('input[type="email"]', 'juan@example.com');
    completarCampo('input[type="password"]', 'incorrecta');
    await fixture.whenStable();

    enviarFormulario();
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('.login__error')?.textContent).toContain(
      'Email o contraseña incorrectos',
    );
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });
});
