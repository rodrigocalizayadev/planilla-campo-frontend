import { Component, computed, inject, input, linkedSignal, output, signal } from '@angular/core';
import { FormField, form, required } from '@angular/forms/signals';
import { Modal } from '../../../shared/ui/modal/modal';
import { CampoCantidad } from '../../../shared/ui/campo-cantidad/campo-cantidad';
import { CampoImporte } from '../../../shared/ui/campo-importe/campo-importe';
import { AvisoService } from '../../../shared/ui/aviso/aviso.service';
import { EnumsService } from '../../../core/enums/enums.service';
import { CultivoService } from './cultivo.service';
import { pluralizar } from '../../../shared/utils/pluralizar';
import type { Cultivo, CultivoRequest, ErrorResponse, PrecioReferencia } from '../../../models';

interface ModeloCultivoForm {
  nombre: string;
  unidadProduccionDefault: string;
  nombreSingular: string;
  nombrePlural: string;
  kgPorUnidad: string;
  precioReferenciaPrimera: string;
  precioReferenciaSegunda: string;
}

/**
 * Alta/edición de cultivo — el formulario más complejo de los cuatro catálogos
 * (docs/plan-frontend.md slice 2). Al elegir la unidad de producción (enum real, no una
 * tabla local de presets) se autocompleta el nombre singular con la etiqueta del enum y
 * se sugiere un plural; ambos quedan editables. `kgPorUnidad` no se autocompleta: varía
 * demasiado por cultivo para adivinarlo.
 *
 * Los precios de referencia viajan como `PrecioReferencia` (`monto.model.ts`), siempre
 * en pesos (sin selector de moneda — el prototipo nunca mostró moneda para estos
 * precios). **Sin campo de tipo de cambio** (corregido en
 * docs/plan-frontend.md slice 3, segunda vuelta): a diferencia del precio de insumo,
 * el precio de referencia de cultivo no se congela con un TC propio — el backend lo
 * convierte a dólares en el momento de calcular el margen estimado, usando la
 * cotización vigente de la campaña (`Campania.cotizacionVigente`). El campo de tipo de
 * cambio que tenía este formulario dejó de tener sentido y de ser aceptado por la API.
 */
@Component({
  selector: 'app-cultivo-form',
  imports: [Modal, FormField, CampoCantidad, CampoImporte],
  templateUrl: './cultivo-form.html',
  styleUrl: './cultivo-form.scss',
})
export class CultivoForm {
  private readonly cultivoService = inject(CultivoService);
  private readonly aviso = inject(AvisoService);
  protected readonly enums = inject(EnumsService);

  readonly cultivo = input<Cultivo | null>(null);
  readonly guardado = output<void>();
  readonly cancelado = output<void>();

  protected readonly esEdicion = computed(() => this.cultivo() !== null);
  protected readonly unidadesProduccion = computed(() => this.enums.opciones('unidadProduccion'));

  // linkedSignal, no signal: `cultivo` (input) todavía no está disponible en el
  // inicializador de campo cuando el modal recién se abre para editar — con un signal
  // común, el formulario queda con los campos en blanco (bug real, encontrado probando
  // la app). linkedSignal recalcula reactivamente en cuanto `cultivo()` llega, y sigue
  // siendo editable por el usuario después.
  protected readonly modelo = linkedSignal<ModeloCultivoForm>(() => ({
    nombre: this.cultivo()?.nombre ?? '',
    unidadProduccionDefault: this.cultivo()?.unidadProduccionDefault ?? '',
    nombreSingular: this.cultivo()?.nombreSingular ?? '',
    nombrePlural: this.cultivo()?.nombrePlural ?? '',
    kgPorUnidad: this.cultivo()?.kgPorUnidad ?? '',
    precioReferenciaPrimera: this.cultivo()?.precioReferenciaPrimera?.importe ?? '',
    precioReferenciaSegunda: this.cultivo()?.precioReferenciaSegunda?.importe ?? '',
  }));

  protected readonly cultivoForm = form(this.modelo, (path) => {
    required(path.nombre, { message: 'Ingresá el nombre del cultivo' });
    required(path.unidadProduccionDefault, { message: 'Elegí la unidad de producción' });
    required(path.nombreSingular, { message: 'Ingresá el nombre singular de la unidad' });
    required(path.nombrePlural, { message: 'Ingresá el nombre plural de la unidad' });
  });

  protected readonly enviando = signal(false);

  onCambioUnidadProduccion(evento: Event): void {
    const valor = (evento.target as HTMLSelectElement).value;
    const etiqueta = this.enums.etiqueta('unidadProduccion', valor);
    this.modelo.update((actual) => ({
      ...actual,
      unidadProduccionDefault: valor,
      nombreSingular: etiqueta,
      nombrePlural: pluralizar(etiqueta),
    }));
  }

  private precioDe(importe: string): PrecioReferencia | null {
    const numero = Number(importe);
    if (!Number.isFinite(numero) || numero <= 0) {
      return null;
    }
    return { importe, moneda: 'ARS' };
  }

  guardar(evento: Event): void {
    evento.preventDefault();

    const raiz = this.cultivoForm();
    if (!raiz.valid()) {
      raiz.markAsTouched();
      return;
    }

    const valores = this.modelo();
    const payload: CultivoRequest = {
      nombre: valores.nombre.trim(),
      unidadProduccionDefault: valores.unidadProduccionDefault,
      nombreSingular: valores.nombreSingular.trim(),
      nombrePlural: valores.nombrePlural.trim(),
      kgPorUnidad: valores.kgPorUnidad.trim() || null,
      precioReferenciaPrimera: this.precioDe(valores.precioReferenciaPrimera),
      precioReferenciaSegunda: this.precioDe(valores.precioReferenciaSegunda),
    };

    const cultivoActual = this.cultivo();
    this.enviando.set(true);
    const solicitud = cultivoActual
      ? this.cultivoService.actualizar(cultivoActual.id, payload)
      : this.cultivoService.crear(payload);

    solicitud.subscribe({
      next: () => {
        this.aviso.mostrar(cultivoActual ? 'Cultivo actualizado' : 'Cultivo creado');
        this.guardado.emit();
      },
      error: (error: ErrorResponse) => {
        this.enviando.set(false);
        this.aviso.mostrar(error.message || 'No se pudo guardar el cultivo. Probá de nuevo.', 'error');
      },
    });
  }
}
