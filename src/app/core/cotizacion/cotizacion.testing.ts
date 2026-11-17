import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { vi, type Mock } from 'vitest';
import { CotizacionService } from './cotizacion.service';
import type { CotizacionResponse, ErrorResponse } from '../../models';

type ObtenerDolar = Mock<(fecha: string | null) => ReturnType<CotizacionService['obtenerDolar']>>;

function cotizacionPara(fecha: string | null, valor: string): CotizacionResponse {
  const fechaSolicitada = fecha ?? '2026-11-17';
  return { fechaSolicitada, fechaCotizacion: fechaSolicitada, valor, fuente: 'BCRA' };
}

/**
 * Provider de `CotizacionService` para specs de formularios. Sin `valor`, responde 503
 * (`COTIZACION_NO_DISPONIBLE`): el formulario queda con el tipo de cambio que ya tenía,
 * como antes de esta feature. Con `valor`, responde esa cotización para cualquier fecha.
 *
 * Responde de forma síncrona: no deja requests pendientes que cuelguen `whenStable()`
 * ni que `HttpTestingController.verify()` encuentre abiertos.
 */
export function provideCotizacionStub(valor?: string) {
  const obtenerDolar: ObtenerDolar = vi.fn((fecha: string | null) => {
    if (valor === undefined) {
      const error: ErrorResponse = {
        timestamp: '2026-11-17T12:00:00Z',
        status: 503,
        code: 'COTIZACION_NO_DISPONIBLE',
        message: 'No hay cotización disponible',
        details: [],
      };
      return throwError(() => error);
    }
    return of(cotizacionPara(fecha, valor));
  });
  return { provide: CotizacionService, useValue: { obtenerDolar } };
}

/**
 * Con `provideCotizacionStub()` ya registrado, hace que responda `valor` para cualquier
 * fecha. Llamarlo antes del primer change detection del formulario. Devuelve el mock para
 * verificar con qué fecha se pidió.
 */
export function responderCotizacion(valor: string): ObtenerDolar {
  const obtenerDolar = (
    TestBed.inject(CotizacionService) as unknown as { obtenerDolar: ObtenerDolar }
  ).obtenerDolar;
  obtenerDolar.mockImplementation((fecha) => of(cotizacionPara(fecha, valor)));
  return obtenerDolar;
}
