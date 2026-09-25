import { Injectable, signal } from '@angular/core';

const CLAVE_STORAGE = 'planilla-campo:ultimo-tipo-cambio';

/**
 * Recuerda el último tipo de cambio cargado a mano, para precargarlo en el próximo
 * campo de tipo de cambio y que cargar un importe en dólares "no moleste"
 * (docs/design-brief.md §6.4). El backend exige `tipoCambio` en todo `Monto`, incluso
 * en pesos (docs/dominio.md §11, confirmado contra el backend real) — sin esta memoria,
 * cada formulario con precio arrancaría con el campo vacío.
 */
@Injectable({ providedIn: 'root' })
export class TipoCambioMemoriaService {
  private readonly _ultimo = signal<string>(localStorage.getItem(CLAVE_STORAGE) ?? '');
  readonly ultimo = this._ultimo.asReadonly();

  guardar(valor: string): void {
    if (!valor) {
      return;
    }
    localStorage.setItem(CLAVE_STORAGE, valor);
    this._ultimo.set(valor);
  }
}
