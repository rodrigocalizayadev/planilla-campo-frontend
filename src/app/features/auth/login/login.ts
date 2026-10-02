import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormField, email, form, required } from '@angular/forms/signals';
import { AuthService } from '../../../core/auth/auth.service';
import type { ErrorResponse } from '../../../models';

interface ModeloLogin {
  email: string;
  password: string;
}

/** Pantalla de login. Sin registro público (docs/design-brief.md §9). */
@Component({
  selector: 'app-login',
  imports: [FormField],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  private readonly modelo = signal<ModeloLogin>({ email: '', password: '' });
  protected readonly loginForm = form(this.modelo, (path) => {
    required(path.email, { message: 'Ingresá tu email' });
    email(path.email, { message: 'El email no es válido' });
    required(path.password, { message: 'Ingresá tu contraseña' });
  });

  protected readonly enviando = signal(false);
  protected readonly errorServidor = signal<string | null>(null);
  protected readonly mostrarPassword = signal(false);

  alternarMostrarPassword(): void {
    this.mostrarPassword.update((valor) => !valor);
  }

  enviar(evento: Event): void {
    evento.preventDefault();
    this.errorServidor.set(null);

    const raiz = this.loginForm();
    if (!raiz.valid()) {
      raiz.markAsTouched();
      return;
    }

    this.enviando.set(true);
    this.authService.login(this.modelo()).subscribe({
      next: () => {
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/';
        this.router.navigateByUrl(returnUrl);
      },
      error: (error: ErrorResponse) => {
        this.enviando.set(false);
        this.errorServidor.set(error.message || 'No se pudo iniciar sesión. Probá de nuevo.');
      },
    });
  }
}
