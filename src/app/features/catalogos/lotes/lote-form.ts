import { Component, computed, inject, input, linkedSignal, output, signal } from '@angular/core';
import { FormField, form, required, validate } from '@angular/forms/signals';
import { Modal } from '../../../shared/ui/modal/modal';
import { CampoCantidad } from '../../../shared/ui/campo-cantidad/campo-cantidad';
import { AvisoService } from '../../../shared/ui/aviso/aviso.service';
import { LoteService } from './lote.service';
import type { ErrorResponse, Lote, LoteRequest } from '../../../models';

interface ModeloLoteForm {
  nombre: string;
  superficieHa: string;
  tipoSuelo: string;
  comentarios: string;
}

/**
 * Alta/edición de lote, dentro del modal compartido. Mismo patrón que repiten cultivo,
 * insumo y comprador (docs/plan-frontend.md slice 2): Signal Forms, campos numéricos
 * como string (CLAUDE.md regla 1). La baja/reactivación no vive acá: es una acción del
 * listado (`LotesListado`), con confirmación aparte.
 */
@Component({
  selector: 'app-lote-form',
  imports: [Modal, FormField, CampoCantidad],
  templateUrl: './lote-form.html',
  styleUrl: './lote-form.scss',
})
export class LoteForm {
  private readonly loteService = inject(LoteService);
  private readonly aviso = inject(AvisoService);

  readonly lote = input<Lote | null>(null);
  readonly guardado = output<void>();
  readonly cancelado = output<void>();

  protected readonly esEdicion = computed(() => this.lote() !== null);

  // linkedSignal, no signal: el valor de `lote` (input) todavía no está disponible en
  // el inicializador de campo cuando el modal recién se abre para editar — con un
  // signal común, el formulario queda con los campos en blanco (bug real, encontrado
  // probando la app). linkedSignal recalcula reactivamente en cuanto `lote()` llega,
  // y sigue siendo editable por el usuario después.
  private readonly modelo = linkedSignal<ModeloLoteForm>(() => ({
    nombre: this.lote()?.nombre ?? '',
    superficieHa: this.lote()?.superficieHa ?? '',
    tipoSuelo: this.lote()?.tipoSuelo ?? '',
    comentarios: this.lote()?.comentarios ?? '',
  }));

  protected readonly loteForm = form(this.modelo, (path) => {
    required(path.nombre, { message: 'Ingresá el nombre del lote' });
    validate(path.superficieHa, ({ value }) => {
      const numero = Number(value());
      return Number.isFinite(numero) && numero > 0
        ? undefined
        : { kind: 'superficieInvalida', message: 'La superficie tiene que ser mayor que cero' };
    });
  });

  protected readonly enviando = signal(false);

  guardar(evento: Event): void {
    evento.preventDefault();

    const raiz = this.loteForm();
    if (!raiz.valid()) {
      raiz.markAsTouched();
      return;
    }

    const payload: LoteRequest = {
      nombre: this.modelo().nombre.trim(),
      superficieHa: this.modelo().superficieHa,
      tipoSuelo: this.modelo().tipoSuelo.trim(),
      comentarios: this.modelo().comentarios.trim() || null,
    };

    const loteActual = this.lote();
    this.enviando.set(true);
    const solicitud = loteActual
      ? this.loteService.actualizar(loteActual.id, payload)
      : this.loteService.crear(payload);

    solicitud.subscribe({
      next: () => {
        this.aviso.mostrar(loteActual ? 'Lote actualizado' : 'Lote creado: ya se puede sembrar');
        this.guardado.emit();
      },
      error: (error: ErrorResponse) => {
        this.enviando.set(false);
        this.aviso.mostrar(error.message || 'No se pudo guardar el lote. Probá de nuevo.', 'error');
      },
    });
  }
}
