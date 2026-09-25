import { Injectable, signal } from '@angular/core';

export interface CampaniaActivaResumen {
  id: number;
  nombre: string;
  estado: string;
}

const CLAVE_STORAGE = 'planilla-campo:campania-activa';

function leerGuardada(): CampaniaActivaResumen | null {
  const crudo = localStorage.getItem(CLAVE_STORAGE);
  if (!crudo) {
    return null;
  }
  try {
    return JSON.parse(crudo) as CampaniaActivaResumen;
  } catch {
    return null;
  }
}

/**
 * Campaña activa: contexto global de toda la app, siempre visible
 * (docs/design-brief.md §10 — "cargar un gasto en la campaña equivocada es el error
 * más costoso posible"). Se persiste en localStorage (mismo patrón que
 * `TokenStorageService`/`TipoCambioMemoriaService`) para sobrevivir a un refresh de
 * página sin perder el contexto.
 *
 * También gobierna si `CampaniaSelectorModal` está abierto: se decidió acá (en vez de
 * con un `output()` que `Shell` reenvía) para que cualquier pantalla —no solo el botón
 * del layout— pueda abrir el selector, por ejemplo el estado vacío del tablero cuando
 * todavía no hay campaña elegida.
 *
 * No valida que la campaña elegida siga existiendo: es un caso borde de baja
 * probabilidad (dos sesiones editando la misma campaña) y el backend igual rechaza
 * cualquier movimiento con un error claro si el contexto quedó desactualizado.
 */
@Injectable({ providedIn: 'root' })
export class CampaniaActivaService {
  private readonly _campania = signal<CampaniaActivaResumen | null>(leerGuardada());
  readonly campania = this._campania.asReadonly();

  private readonly _selectorAbierto = signal(false);
  readonly selectorAbierto = this._selectorAbierto.asReadonly();

  establecer(campania: CampaniaActivaResumen): void {
    localStorage.setItem(CLAVE_STORAGE, JSON.stringify(campania));
    this._campania.set(campania);
  }

  limpiar(): void {
    localStorage.removeItem(CLAVE_STORAGE);
    this._campania.set(null);
  }

  abrirSelector(): void {
    this._selectorAbierto.set(true);
  }

  cerrarSelector(): void {
    this._selectorAbierto.set(false);
  }
}
