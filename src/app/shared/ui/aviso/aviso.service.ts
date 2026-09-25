import { Injectable, signal } from '@angular/core';

const DURACION_MS = 3000;

export type TipoAviso = 'exito' | 'error';

interface EstadoAviso {
  mensaje: string;
  tipo: TipoAviso;
}

/**
 * Toast de una línea para confirmar (verde) o avisar del fallo (rojo) de una acción de
 * modal que impacta la base de datos: crear/editar/dar de baja/reactivar un registro,
 * cargar un movimiento, liquidar una venta (patrón confirmado en
 * docs/design-reference/project/Prototipo Planilla de Campo.dc.html — el click ejecuta
 * la acción directo y el toast es la única señal de que ocurrió). Los mensajes de
 * validación de campo (obligatorio, formato) no pasan por acá: siguen mostrándose
 * inline, debajo del input que falló. `Aviso` (montado una vez en `Shell`) lo renderiza.
 */
@Injectable({ providedIn: 'root' })
export class AvisoService {
  private readonly _aviso = signal<EstadoAviso | null>(null);
  readonly aviso = this._aviso.asReadonly();
  private temporizador: ReturnType<typeof setTimeout> | undefined;

  mostrar(mensaje: string, tipo: TipoAviso = 'exito'): void {
    clearTimeout(this.temporizador);
    this._aviso.set({ mensaje, tipo });
    this.temporizador = setTimeout(() => this._aviso.set(null), DURACION_MS);
  }
}
