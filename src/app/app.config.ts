import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { jwtInterceptor } from './core/http/jwt.interceptor';
import { errorInterceptor } from './core/http/error.interceptor';
import { EnumsService } from './core/enums/enums.service';
import { provideLocaleEsAr } from './core/locale/locale';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideLocaleEsAr(),
    // withComponentInputBinding: la ruta de detalle de lote-campaña (docs/plan-frontend.md
    // slice 4) lee su :id como input() de componente en vez de inyectar ActivatedRoute a mano.
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withFetch(), withInterceptors([jwtInterceptor, errorInterceptor])),
    // Arranca la carga de GET /api/metadata/enums al iniciar la app, para que ya
    // esté cacheada cuando el primer formulario la necesite (CLAUDE.md, regla 3).
    provideAppInitializer(() => {
      inject(EnumsService);
    }),
  ],
};
