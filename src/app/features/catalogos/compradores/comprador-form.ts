import { Component, computed, inject, input, linkedSignal, output, signal } from '@angular/core';
import { FormField, form, required } from '@angular/forms/signals';
import { Modal } from '../../../shared/ui/modal/modal';
import { AvisoService } from '../../../shared/ui/aviso/aviso.service';
import { EnumsService } from '../../../core/enums/enums.service';
import { CompradorService } from './comprador.service';
import type { Comprador, CompradorRequest, ErrorResponse } from '../../../models';

interface ModeloCompradorForm {
  nombre: string;
  cuit: string;
  contacto: string;
  telefono: string;
  localidad: string;
  modalidadHabitual: string;
}

/** Alta/edición de comprador (docs/plan-frontend.md slice 2). Solo el nombre es obligatorio. */
@Component({
  selector: 'app-comprador-form',
  imports: [Modal, FormField],
  templateUrl: './comprador-form.html',
  styleUrl: './comprador-form.scss',
})
export class CompradorForm {
  private readonly compradorService = inject(CompradorService);
  private readonly aviso = inject(AvisoService);
  protected readonly enums = inject(EnumsService);

  readonly comprador = input<Comprador | null>(null);
  readonly guardado = output<void>();
  readonly cancelado = output<void>();

  protected readonly esEdicion = computed(() => this.comprador() !== null);

  // linkedSignal, no signal: `comprador` (input) todavía no está disponible en el
  // inicializador de campo cuando el modal recién se abre para editar — con un signal
  // común, el formulario queda con los campos en blanco (bug real, encontrado probando
  // la app). linkedSignal recalcula reactivamente en cuanto `comprador()` llega, y
  // sigue siendo editable por el usuario después.
  private readonly modelo = linkedSignal<ModeloCompradorForm>(() => ({
    nombre: this.comprador()?.nombre ?? '',
    cuit: this.comprador()?.cuit ?? '',
    contacto: this.comprador()?.contacto ?? '',
    telefono: this.comprador()?.telefono ?? '',
    localidad: this.comprador()?.localidad ?? '',
    modalidadHabitual: this.comprador()?.modalidadHabitual ?? '',
  }));

  protected readonly compradorForm = form(this.modelo, (path) => {
    required(path.nombre, { message: 'Ingresá el nombre del comprador' });
  });

  protected readonly enviando = signal(false);

  guardar(evento: Event): void {
    evento.preventDefault();

    const raiz = this.compradorForm();
    if (!raiz.valid()) {
      raiz.markAsTouched();
      return;
    }

    const valores = this.modelo();
    const payload: CompradorRequest = {
      nombre: valores.nombre.trim(),
      cuit: valores.cuit.trim() || null,
      contacto: valores.contacto.trim() || null,
      telefono: valores.telefono.trim() || null,
      localidad: valores.localidad.trim() || null,
      // Nunca "": el backend intenta deserializarlo como el enum ModalidadVenta y una
      // cadena vacía dispara un 401 con cuerpo vacío en vez de un 400 normal.
      modalidadHabitual: valores.modalidadHabitual || null,
    };

    const compradorActual = this.comprador();
    this.enviando.set(true);
    const solicitud = compradorActual
      ? this.compradorService.actualizar(compradorActual.id, payload)
      : this.compradorService.crear(payload);

    solicitud.subscribe({
      next: () => {
        this.aviso.mostrar(compradorActual ? 'Comprador actualizado' : 'Comprador creado');
        this.guardado.emit();
      },
      error: (error: ErrorResponse) => {
        this.enviando.set(false);
        this.aviso.mostrar(error.message || 'No se pudo guardar el comprador. Probá de nuevo.', 'error');
      },
    });
  }
}
