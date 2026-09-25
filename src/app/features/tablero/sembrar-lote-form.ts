import { Component, computed, inject, input, output, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { FormField, form, required, validate } from '@angular/forms/signals';
import { environment } from '../../../environments/environment';
import { Modal } from '../../shared/ui/modal/modal';
import { CampoCantidad } from '../../shared/ui/campo-cantidad/campo-cantidad';
import { AvisoService } from '../../shared/ui/aviso/aviso.service';
import { EnumsService } from '../../core/enums/enums.service';
import { LoteCampaniaService } from '../lote-campania/lote-campania.service';
import type { Cultivo, ErrorResponse, Lote, LoteCampania, LoteCampaniaRequest, PaginaResponse } from '../../models';

interface ModeloSembrarLoteForm {
  loteId: string;
  cultivoId: string;
  superficieSembradaHa: string;
  unidadProduccion: string;
  variedad: string;
  fechaSiembra: string;
  fechaTrasplante: string;
  fechaCosechaEsperada: string;
  comentarios: string;
}

/**
 * "Sembrar un lote" (docs/plan-frontend.md slice 3): crea un `LoteCampania` eligiendo
 * lote y cultivo de los catálogos — no confundir con dar de alta un lote nuevo, que es
 * el catálogo de slice 2. Campos obligatorios y con dependencia (lote y cultivo, que
 * definen superficie máxima y unidad) van arriba, siguiendo la excepción de CLAUDE.md a
 * "obligatorios y vacíos arriba" para formularios con dependencia entre campos.
 *
 * Sin campo de `ciclo`: el backend lo autoincrementa solo cuando se siembra el mismo
 * lote+cultivo dos veces en la campaña (confirmado contra la API real) — pedírselo al
 * usuario sería exigirle pensar en un número que no necesita elegir
 * (docs/design-brief.md §2, "si una pantalla le exige pensar, está mal diseñada").
 */
@Component({
  selector: 'app-sembrar-lote-form',
  imports: [Modal, FormField, CampoCantidad],
  templateUrl: './sembrar-lote-form.html',
  styleUrl: './sembrar-lote-form.scss',
})
export class SembrarLoteForm {
  private readonly loteCampaniaService = inject(LoteCampaniaService);
  private readonly aviso = inject(AvisoService);
  protected readonly enums = inject(EnumsService);

  readonly campaniaId = input.required<number>();
  /** Lote-campaña ya sembrados en la campaña activa, para avisar (docs/design-reference)
   * antes de guardar si el lote+cultivo elegido ya se sembró y esta va a quedar como un
   * ciclo nuevo. Viene de `Tablero`, que ya lo tiene cargado — evita un fetch propio. */
  readonly existentes = input<LoteCampania[]>([]);
  readonly guardado = output<void>();
  readonly cancelado = output<void>();

  private readonly lotesRecurso = httpResource<PaginaResponse<Lote>>(
    () => `${environment.apiBaseUrl}/lotes?activo=true&size=200`,
  );
  protected readonly lotes = computed(() => this.lotesRecurso.value()?.content ?? []);

  private readonly cultivosRecurso = httpResource<PaginaResponse<Cultivo>>(
    () => `${environment.apiBaseUrl}/cultivos?activo=true&size=200`,
  );
  protected readonly cultivos = computed(() => this.cultivosRecurso.value()?.content ?? []);

  protected readonly modelo = signal<ModeloSembrarLoteForm>({
    loteId: '',
    cultivoId: '',
    superficieSembradaHa: '',
    unidadProduccion: '',
    variedad: '',
    fechaSiembra: '',
    fechaTrasplante: '',
    fechaCosechaEsperada: '',
    comentarios: '',
  });

  private readonly loteSeleccionado = computed(() =>
    this.lotes().find((lote) => lote.id === Number(this.modelo().loteId)),
  );

  /** Cuántas veces ya se sembró este lote+cultivo en la campaña activa — el próximo
   * envío va a quedar como `ciclo` = este número + 1 (el backend lo asigna solo). */
  protected readonly siembrasPrevias = computed(() => {
    const loteId = Number(this.modelo().loteId);
    const cultivoId = Number(this.modelo().cultivoId);
    if (!loteId || !cultivoId) {
      return 0;
    }
    return this.existentes().filter((lc) => lc.loteId === loteId && lc.cultivoId === cultivoId).length;
  });

  protected readonly sembrarForm = form(this.modelo, (path) => {
    required(path.loteId, { message: 'Elegí un lote' });
    required(path.cultivoId, { message: 'Elegí un cultivo' });
    required(path.unidadProduccion, { message: 'Elegí la unidad de producción' });
    validate(path.superficieSembradaHa, ({ value }) => {
      const numero = Number(value());
      if (!Number.isFinite(numero) || numero <= 0) {
        return { kind: 'superficieInvalida', message: 'La superficie tiene que ser mayor que cero' };
      }
      const maximo = this.loteSeleccionado() ? Number(this.loteSeleccionado()!.superficieHa) : null;
      if (maximo !== null && numero > maximo) {
        return {
          kind: 'superficieExcedeLote',
          message: `No puede superar la superficie del lote (${maximo} ha)`,
        };
      }
      return undefined;
    });
  });

  protected readonly enviando = signal(false);

  onCambioCultivo(evento: Event): void {
    const cultivoId = (evento.target as HTMLSelectElement).value;
    const cultivo = this.cultivos().find((c) => c.id === Number(cultivoId));
    this.modelo.update((actual) => ({
      ...actual,
      cultivoId,
      unidadProduccion: cultivo?.unidadProduccionDefault ?? actual.unidadProduccion,
    }));
  }

  guardar(evento: Event): void {
    evento.preventDefault();

    const raiz = this.sembrarForm();
    if (!raiz.valid()) {
      raiz.markAsTouched();
      return;
    }

    const valores = this.modelo();
    const payload: LoteCampaniaRequest = {
      loteId: Number(valores.loteId),
      cultivoId: Number(valores.cultivoId),
      variedad: valores.variedad.trim() || null,
      superficieSembradaHa: valores.superficieSembradaHa,
      unidadProduccion: valores.unidadProduccion,
      fechaSiembra: valores.fechaSiembra || null,
      fechaTrasplante: valores.fechaTrasplante || null,
      fechaCosechaEsperada: valores.fechaCosechaEsperada || null,
      comentarios: valores.comentarios.trim() || null,
    };

    this.enviando.set(true);
    this.loteCampaniaService.crear(this.campaniaId(), payload).subscribe({
      next: (loteCampania) => {
        const cicloTexto = loteCampania.ciclo > 1 ? ` (ciclo ${loteCampania.ciclo})` : '';
        this.aviso.mostrar(`${loteCampania.loteNombre} sembrado con ${loteCampania.cultivoNombre}${cicloTexto}`);
        this.guardado.emit();
      },
      error: (error: ErrorResponse) => {
        this.enviando.set(false);
        this.aviso.mostrar(error.message || 'No se pudo sembrar el lote. Probá de nuevo.', 'error');
      },
    });
  }
}
