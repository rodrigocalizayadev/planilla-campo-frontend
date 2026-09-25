import { Component, input, model } from '@angular/core';

/**
 * Input de búsqueda de texto para listados que filtran en el cliente (catálogos
 * acotados, ver CLAUDE.md/docs/resumen-slices.md). No dispara requests, así que no
 * necesita debounce ni RxJS (CLAUDE.md reserva eso para búsquedas contra la red).
 */
@Component({
  selector: 'app-buscador',
  templateUrl: './buscador.html',
  styleUrl: './buscador.scss',
})
export class Buscador {
  readonly texto = model<string>('');
  readonly placeholder = input<string>('Buscar…');

  protected onInput(evento: Event): void {
    this.texto.set((evento.target as HTMLInputElement).value);
  }
}
