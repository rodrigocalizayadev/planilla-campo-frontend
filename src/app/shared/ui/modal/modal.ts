import { Component, input, output } from '@angular/core';

/**
 * Caja modal genérica: overlay + header (título, subtítulo, cerrar) + cuerpo proyectado.
 * La usan los cuatro formularios de catálogo (docs/plan-frontend.md slice 2) y, en
 * slices futuros, cualquier formulario que se abra "encima" de una pantalla (tarea,
 * aplicación, cosecha, venta — docs/design-brief.md §7). El click en el overlay NO
 * cierra el modal: un click errado a mitad de carga de datos no debe tirar el
 * formulario. Solo cierra la X del header, Escape, "Cancelar" del formulario, o
 * ejecutar la operación.
 */
@Component({
  selector: 'app-modal',
  templateUrl: './modal.html',
  styleUrl: './modal.scss',
})
export class Modal {
  readonly titulo = input.required<string>();
  readonly subtitulo = input<string>('');
  readonly cerrar = output<void>();
}
