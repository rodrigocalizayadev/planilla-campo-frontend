import { type Signal, effect, signal } from '@angular/core';

/**
 * Retiene el último valor no-`undefined` de un signal (típicamente `httpResource().value`)
 * mientras una recarga está en curso. Sin esto, un `httpResource` cuya URL cambia
 * reactivamente (ej. el toggle "ver dados de baja", el filtro de tipo, o cambiar de
 * página/orden) vacía `.value()` un instante apenas se dispara el nuevo pedido: la lista
 * que lee de ahí desaparece y vuelve a aparecer en cuanto llega la respuesta — un
 * parpadeo visible incluso con requests rápidas.
 */
export function mantenerUltimoValor<T>(fuente: Signal<T | undefined>): Signal<T | undefined> {
  const ultimo = signal<T | undefined>(undefined);
  effect(() => {
    const valor = fuente();
    if (valor !== undefined) {
      ultimo.set(valor);
    }
  });
  return ultimo.asReadonly();
}
