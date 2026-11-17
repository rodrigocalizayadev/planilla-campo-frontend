import { computed, effect, signal, untracked, type Signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { hoyIso } from '../utils/fecha-local';
import type { CotizacionResponse } from '../../models';

export interface OpcionesSugerenciaTipoCambio {
  /**
   * Fecha ISO del movimiento: el tipo de cambio se congela a esa fecha
   * (docs/api-endpoints-v2.md §16). `null` pide la cotización de hoy (sin query param),
   * para `cotizacionVigente` de la campaña. Vacía → no consulta.
   */
  fecha: () => string | null;
  /** Valor actual del campo de tipo de cambio en el formulario. */
  valorActual: () => string;
  /** Escribe un valor en el campo de tipo de cambio del formulario. */
  asignar: (valor: string) => void;
  /** Si es `false`, nunca escribe sola: solo ofrece el botón "Usar". Default `true`. */
  autocompletar?: () => boolean;
  /** Si es `false`, no consulta (p. ej. el campo no está visible). Default `true`. */
  habilitada?: () => boolean;
}

export interface SugerenciaTipoCambio {
  readonly cotizacion: Signal<CotizacionResponse | undefined>;
  readonly cargando: Signal<boolean>;
  readonly mensajeError: Signal<string | null>;
  /** La sugerencia existe y no coincide con lo que tiene el campo. */
  readonly difiere: Signal<boolean>;
  /** Copia la sugerencia al campo y vuelve a habilitar el autocompletado. */
  usar(): void;
}

/**
 * Sugerencia de tipo de cambio desde la cotización BCRA (`GET /api/cotizaciones/dolar`)
 * para un formulario. Debe llamarse en contexto de inyección (inicializador de campo de
 * un componente).
 *
 * Regla de autocompletado (decisión de producto, odd/tasks/cotizacion-bcra.md S5): la
 * sugerencia se escribe sola en el campo **mientras el usuario no lo haya editado a
 * mano** — "editado" es cualquier valor distinto del último que escribió esta
 * sugerencia (o del valor inicial), lo que incluye el que trae un insumo al elegirlo.
 * Si fue editado, no se pisa: el componente `SugerenciaCotizacion` ofrece "Usar".
 *
 * El `valor` del backend es un string con 4 decimales y se copia tal cual (sin `Number`),
 * con la misma escala que acepta `tipoCambio`.
 */
export function sugerirTipoCambio(opciones: OpcionesSugerenciaTipoCambio): SugerenciaTipoCambio {
  const habilitada = opciones.habilitada ?? (() => true);
  const autocompletar = opciones.autocompletar ?? (() => true);

  const fechaFutura = computed(() => {
    const fecha = opciones.fecha();
    return habilitada() && !!fecha && fecha > hoyIso();
  });

  const recurso = httpResource<CotizacionResponse>(() => {
    const fecha = opciones.fecha();
    if (!habilitada() || fecha === '' || fechaFutura()) {
      return undefined;
    }
    const url = `${environment.apiBaseUrl}/cotizaciones/dolar`;
    return fecha === null ? { url } : { url, params: { fecha } };
  });

  const cotizacion = computed(() => (recurso.hasValue() ? recurso.value() : undefined));

  const mensajeError = computed(() => {
    if (fechaFutura()) {
      return 'No hay cotización del BCRA para una fecha futura.';
    }
    return recurso.status() === 'error'
      ? 'No se pudo obtener la cotización del BCRA. Cargá el tipo de cambio a mano.'
      : null;
  });

  // Último valor escrito por la sugerencia (o el inicial del formulario): si el campo
  // tiene otra cosa, lo editó el usuario (o lo trajo un insumo).
  const ultimoAutomatico = signal(untracked(opciones.valorActual));

  function aplicar(valor: string): void {
    ultimoAutomatico.set(valor);
    opciones.asignar(valor);
  }

  effect(() => {
    const sugerida = cotizacion();
    if (!sugerida) {
      return;
    }
    untracked(() => {
      if (autocompletar() && opciones.valorActual() === ultimoAutomatico()) {
        aplicar(sugerida.valor);
      }
    });
  });

  // Comparación numérica solo para decidir si mostrar el botón ("1543.5" y "1543.5000"
  // son el mismo tipo de cambio); nunca se usa para el valor que se envía.
  const difiere = computed(() => {
    const sugerida = cotizacion();
    return !!sugerida && Number(sugerida.valor) !== Number(opciones.valorActual());
  });

  return {
    cotizacion,
    cargando: computed(() => recurso.isLoading()),
    mensajeError,
    difiere,
    usar: () => {
      const sugerida = cotizacion();
      if (sugerida) {
        aplicar(sugerida.valor);
      }
    },
  };
}
