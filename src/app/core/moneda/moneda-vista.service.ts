import { Injectable, signal } from '@angular/core';

export type Moneda = 'ARS' | 'USD';

const CLAVE_STORAGE = 'planilla-campo:moneda-vista';

function leerGuardada(): Moneda {
  return localStorage.getItem(CLAVE_STORAGE) === 'ARS' ? 'ARS' : 'USD';
}

/**
 * Selector de moneda $ARS/US$, compartido por toda la app (docs/plan-frontend.md
 * slice 6). Antes de este slice, `Tablero` y `LoteCampaniaDetalle` tenían cada uno su
 * propio signal local (`docs/resumen-slices.md`, slice 3, 4ª vuelta, lo dejó marcado
 * como pendiente): cambiar de moneda en una pantalla no se reflejaba en la otra, y se
 * perdía al recargar. Mismo patrón que `CampaniaActivaService`: signal persistido en
 * localStorage para sobrevivir a un refresh.
 */
@Injectable({ providedIn: 'root' })
export class MonedaVistaService {
  private readonly _moneda = signal<Moneda>(leerGuardada());
  readonly moneda = this._moneda.asReadonly();

  establecer(moneda: Moneda): void {
    localStorage.setItem(CLAVE_STORAGE, moneda);
    this._moneda.set(moneda);
  }
}
