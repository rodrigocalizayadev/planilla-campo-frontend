import { Component, computed, inject, input, linkedSignal, output, signal } from '@angular/core';
import { FormField, form, validate } from '@angular/forms/signals';
import { Observable, forkJoin } from 'rxjs';
import { Modal } from '../../shared/ui/modal/modal';
import { CampoCantidad } from '../../shared/ui/campo-cantidad/campo-cantidad';
import { AvisoService } from '../../shared/ui/aviso/aviso.service';
import { LoteCampaniaService } from './lote-campania.service';
import type { Cosecha, CosechaRequest, ErrorResponse } from '../../models';

interface ModeloCosechaForm {
  fecha: string;
  numeroCorte: string;
  primera: string;
  segunda: string;
  descarte: string;
}

interface FilaCalidad {
  calidad: string;
  cantidad: string;
}

/**
 * Carga de cosecha (docs/design-brief.md §7 pantalla 5, docs/dominio.md §9): un
 * `LoteCampania` tiene varias filas de `Cosecha` porque cruza corte × calidad, pero el
 * productor piensa en "lo que cosechó hoy" como una sola operación — este formulario
 * carga las tres calidades de un mismo corte sin repetir el formulario entero, uno de
 * los requisitos explícitos del slice.
 *
 * Cada calidad con cantidad cargada dispara su propio `POST
 * /lote-campanias/{id}/cosechas` (docs/plan-frontend.md slice 5, `numeroCorte` — no
 * `corte` — confirmado por bisección): el backend modela una fila por corte+calidad,
 * no hay un endpoint de alta múltiple. `forkJoin` los manda en paralelo y solo emite
 * `guardado` si los tres (o los que se hayan cargado) resuelven bien.
 *
 * `kgEquivalente` no se pide acá: lo calcula el backend con `Cultivo.kgPorUnidad`. Si
 * el cultivo no lo tiene configurado, el alta falla con `422
 * KG_POR_UNIDAD_NO_CONFIGURADO` — se muestra tal cual como error de servidor, no hay
 * nada que el frontend pueda corregir por su cuenta.
 *
 * **Edición** (sumada cuando el backend agregó `PUT .../cosechas/{id}`,
 * `docs/resumen-slices.md` slice 5 segunda vuelta): `cosechasExistentes` trae las
 * `Cosecha` ya cargadas de un corte (hasta 3, una por calidad) y precarga el mismo
 * formulario de alta — mismo patrón mental que ya usa el productor para cargar. Al
 * guardar, cada calidad se resuelve por separado contra lo que había antes: una
 * calidad con fila previa y cantidad nueva dispara `PUT`; una calidad con fila previa
 * y el campo vaciado dispara `DELETE` (se saca esa calidad del corte); una calidad sin
 * fila previa y cantidad cargada dispara `POST` (se agrega una calidad nueva a un
 * corte existente).
 */
@Component({
  selector: 'app-cosecha-form',
  imports: [Modal, FormField, CampoCantidad],
  templateUrl: './cosecha-form.html',
  styleUrl: './cosecha-form.scss',
})
export class CosechaForm {
  private readonly loteCampaniaService = inject(LoteCampaniaService);
  private readonly aviso = inject(AvisoService);

  readonly loteCampaniaId = input.required<number>();
  readonly loteCampaniaTitulo = input<string>('');
  readonly etiquetaUnidadPlural = input<string>('unidades');
  /** Próximo número de corte sugerido (máximo cargado + 1, o 1 si no hay ninguno). */
  readonly proximoCorte = input<number>(1);
  /** Filas ya cargadas del corte que se está editando (una por calidad). Vacío = alta. */
  readonly cosechasExistentes = input<Cosecha[]>([]);
  readonly guardado = output<void>();
  readonly cancelado = output<void>();

  protected readonly editando = computed(() => this.cosechasExistentes().length > 0);

  private cosechaExistente(calidad: string): Cosecha | undefined {
    return this.cosechasExistentes().find((c) => c.calidad === calidad);
  }

  protected readonly modelo = linkedSignal<ModeloCosechaForm>(() => {
    const existentes = this.cosechasExistentes();
    if (existentes.length === 0) {
      return {
        fecha: new Date().toISOString().slice(0, 10),
        numeroCorte: String(this.proximoCorte()),
        primera: '',
        segunda: '',
        descarte: '',
      };
    }
    const cantidadDe = (calidad: string) => {
      const cosecha = existentes.find((c) => c.calidad === calidad);
      return cosecha ? cosecha.cantidad : '';
    };
    return {
      fecha: existentes[0].fecha,
      numeroCorte: String(existentes[0].numeroCorte),
      primera: cantidadDe('PRIMERA'),
      segunda: cantidadDe('SEGUNDA'),
      descarte: cantidadDe('DESCARTE'),
    };
  });

  private static validarCantidadOpcional(valor: string): boolean {
    if (valor.trim() === '') {
      return true;
    }
    const numero = Number(valor);
    return Number.isFinite(numero) && numero > 0;
  }

  protected readonly cosechaForm = form(this.modelo, (path) => {
    validate(path.numeroCorte, ({ value }) => {
      const numero = Number(value());
      return Number.isInteger(numero) && numero > 0
        ? undefined
        : { kind: 'numeroCorteInvalido', message: 'Ingresá un número de corte válido' };
    });
    validate(path.primera, ({ value }) =>
      CosechaForm.validarCantidadOpcional(value())
        ? undefined
        : { kind: 'cantidadInvalida', message: 'Ingresá un número mayor que cero' },
    );
    validate(path.segunda, ({ value }) =>
      CosechaForm.validarCantidadOpcional(value())
        ? undefined
        : { kind: 'cantidadInvalida', message: 'Ingresá un número mayor que cero' },
    );
    validate(path.descarte, ({ value }) =>
      CosechaForm.validarCantidadOpcional(value())
        ? undefined
        : { kind: 'cantidadInvalida', message: 'Ingresá un número mayor que cero' },
    );
  });

  protected readonly enviando = signal(false);
  protected readonly errorCalidades = signal<string | null>(null);

  protected readonly totalCortesCargados = computed(() => {
    const m = this.modelo();
    return [m.primera, m.segunda, m.descarte].filter((v) => Number(v) > 0).length;
  });

  guardar(evento: Event): void {
    evento.preventDefault();
    this.errorCalidades.set(null);

    const raiz = this.cosechaForm();
    if (!raiz.valid()) {
      raiz.markAsTouched();
      return;
    }

    const valores = this.modelo();
    const numeroCorte = Number(valores.numeroCorte);
    const filas: FilaCalidad[] = [
      { calidad: 'PRIMERA', cantidad: valores.primera },
      { calidad: 'SEGUNDA', cantidad: valores.segunda },
      { calidad: 'DESCARTE', cantidad: valores.descarte },
    ];
    const conCantidad = filas.filter((fila) => Number(fila.cantidad) > 0);

    if (conCantidad.length === 0) {
      this.errorCalidades.set(
        this.editando()
          ? 'Para eliminar el corte completo, usá "Eliminar corte" en vez de guardar todo en blanco.'
          : 'Cargá la cantidad de al menos una calidad.',
      );
      return;
    }

    // Cada calidad se resuelve contra lo que había antes: fila previa + cantidad nueva
    // → PUT; fila previa + campo vaciado → DELETE (se saca esa calidad del corte); sin
    // fila previa + cantidad cargada → POST (calidad nueva en un corte existente). En
    // alta (sin `cosechasExistentes`) nunca hay `existente`, así que se comporta igual
    // que antes: un POST por cada calidad cargada.
    const solicitudes: Observable<Cosecha | void>[] = [];
    for (const fila of filas) {
      const existente = this.cosechaExistente(fila.calidad);
      const tieneCantidad = Number(fila.cantidad) > 0;
      const payload: CosechaRequest = {
        fecha: valores.fecha,
        numeroCorte,
        calidad: fila.calidad,
        cantidad: fila.cantidad,
      };
      if (existente && tieneCantidad) {
        solicitudes.push(this.loteCampaniaService.actualizarCosecha(this.loteCampaniaId(), existente.id, payload));
      } else if (existente && !tieneCantidad) {
        solicitudes.push(this.loteCampaniaService.eliminarCosecha(this.loteCampaniaId(), existente.id));
      } else if (!existente && tieneCantidad) {
        solicitudes.push(this.loteCampaniaService.crearCosecha(this.loteCampaniaId(), payload));
      }
    }

    this.enviando.set(true);
    forkJoin(solicitudes).subscribe({
      next: () => {
        this.aviso.mostrar(this.editando() ? `Corte ${numeroCorte} actualizado` : `Cosecha del corte ${numeroCorte} cargada`);
        this.guardado.emit();
      },
      error: (error: ErrorResponse) => {
        this.enviando.set(false);
        this.aviso.mostrar(error.message || 'No se pudo guardar la cosecha. Probá de nuevo.', 'error');
      },
    });
  }
}
