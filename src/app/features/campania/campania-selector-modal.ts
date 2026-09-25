import { Component, computed, inject, output, signal, untracked } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { FormField, form, required, validate } from '@angular/forms/signals';
import { environment } from '../../../environments/environment';
import { Modal } from '../../shared/ui/modal/modal';
import { CampoCantidad } from '../../shared/ui/campo-cantidad/campo-cantidad';
import { CampoImporte } from '../../shared/ui/campo-importe/campo-importe';
import { AvisoService } from '../../shared/ui/aviso/aviso.service';
import { EnumsService } from '../../core/enums/enums.service';
import { CampaniaActivaService } from '../../core/campania/campania-activa.service';
import { TipoCambioMemoriaService } from '../../shared/data/tipo-cambio-memoria.service';
import { CampaniaService } from './campania.service';
import type { Campania, CampaniaRequest, ErrorResponse, PaginaResponse } from '../../models';

interface ModeloCampaniaForm {
  nombre: string;
  fechaInicio: string;
  fechaFin: string;
  gastosComercializacionPct: string;
  cotizacionVigente: string;
}

const GASTOS_COMERCIALIZACION_DEFAULT_PCT = '12';

/**
 * Modal de contexto global: elegir la campaña activa o crear una nueva
 * (docs/design-brief.md §10, docs/plan-frontend.md slice 3). Un solo componente con
 * dos vistas ("lista" / "nueva") dentro del mismo `<app-modal>`, en vez de un
 * `CampaniaForm` aparte apilado encima: acá no hay un listado de catálogo del que
 * "salir" para editar, es un único flujo de selección que a veces necesita crear antes
 * de poder elegir.
 *
 * Se abre desde `CampaniaActivaService.selectorAbierto` (ver ese servicio) — lo monta
 * `Shell`, y en el futuro cualquier estado vacío que necesite pedir campaña activa
 * (hoy ya lo hace el tablero) puede abrirlo llamando `campaniaActiva.abrirSelector()`
 * directo, sin pasar el estado por `@Input`/`@Output`.
 */
@Component({
  selector: 'app-campania-selector-modal',
  imports: [Modal, FormField, CampoCantidad, CampoImporte],
  templateUrl: './campania-selector-modal.html',
  styleUrl: './campania-selector-modal.scss',
})
export class CampaniaSelectorModal {
  private readonly campaniaService = inject(CampaniaService);
  private readonly campaniaActiva = inject(CampaniaActivaService);
  private readonly aviso = inject(AvisoService);
  private readonly tipoCambioMemoria = inject(TipoCambioMemoriaService);
  protected readonly enums = inject(EnumsService);

  readonly cerrado = output<void>();

  protected readonly modo = signal<'lista' | 'nueva'>('lista');

  private readonly recurso = httpResource<PaginaResponse<Campania>>(
    () => `${environment.apiBaseUrl}/campanias?size=200&sort=id,desc`,
  );
  protected readonly campanias = computed(() => this.recurso.value()?.content ?? []);
  protected readonly cargando = this.recurso.isLoading;
  protected readonly idActiva = computed(() => this.campaniaActiva.campania()?.id ?? null);

  // untracked: cotizacionVigente se precarga con el último tipo de cambio cargado en
  // cualquier otro formulario de la app (mismo TipoCambioMemoriaService que insumo y
  // cultivo), solo como punto de partida — no debe resetear el formulario si cambia
  // mientras el usuario está completando la campaña.
  protected readonly modelo = signal<ModeloCampaniaForm>({
    nombre: '',
    fechaInicio: '',
    fechaFin: '',
    gastosComercializacionPct: GASTOS_COMERCIALIZACION_DEFAULT_PCT,
    cotizacionVigente: untracked(this.tipoCambioMemoria.ultimo),
  });

  protected readonly campaniaForm = form(this.modelo, (path) => {
    required(path.nombre, { message: 'Ingresá el nombre de la campaña (ej: 2025/26)' });
    required(path.fechaInicio, { message: 'Elegí la fecha de inicio' });
    required(path.fechaFin, { message: 'Elegí la fecha de fin' });
    validate(path.gastosComercializacionPct, ({ value }) => {
      const numero = Number(value());
      return Number.isFinite(numero) && numero >= 0 && numero <= 100
        ? undefined
        : { kind: 'gastosInvalidos', message: 'Ingresá un porcentaje entre 0 y 100' };
    });
    validate(path.cotizacionVigente, ({ value }) => {
      const texto = value();
      if (!texto) {
        return undefined;
      }
      const numero = Number(texto);
      return Number.isFinite(numero) && numero > 0
        ? undefined
        : { kind: 'cotizacionInvalida', message: 'Ingresá una cotización mayor que cero' };
    });
  });

  protected readonly enviando = signal(false);

  etiquetaEstado(estado: string): string {
    return this.enums.etiqueta('estadoCampania', estado);
  }

  elegir(campania: Campania): void {
    this.campaniaActiva.establecer({ id: campania.id, nombre: campania.nombre, estado: campania.estado });
    this.cerrado.emit();
  }

  abrirNueva(): void {
    this.modo.set('nueva');
  }

  volverALista(): void {
    this.modo.set('lista');
  }

  guardar(evento: Event): void {
    evento.preventDefault();

    const raiz = this.campaniaForm();
    if (!raiz.valid()) {
      raiz.markAsTouched();
      return;
    }

    const valores = this.modelo();
    const payload: CampaniaRequest = {
      nombre: valores.nombre.trim(),
      fechaInicio: valores.fechaInicio,
      fechaFin: valores.fechaFin,
      gastosComercializacionEstimados: (Number(valores.gastosComercializacionPct) / 100).toString(),
      cotizacionVigente: valores.cotizacionVigente || null,
    };

    this.enviando.set(true);
    this.campaniaService.crear(payload).subscribe({
      next: (campania) => {
        if (payload.cotizacionVigente) {
          this.tipoCambioMemoria.guardar(payload.cotizacionVigente);
        }
        this.aviso.mostrar(`Campaña ${campania.nombre} creada`);
        this.campaniaActiva.establecer({ id: campania.id, nombre: campania.nombre, estado: campania.estado });
        this.recurso.reload();
        this.cerrado.emit();
      },
      error: (error: ErrorResponse) => {
        this.enviando.set(false);
        this.aviso.mostrar(error.message || 'No se pudo crear la campaña. Probá de nuevo.', 'error');
      },
    });
  }
}
