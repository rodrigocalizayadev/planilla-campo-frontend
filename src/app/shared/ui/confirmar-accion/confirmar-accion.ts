import { Component, input, output } from '@angular/core';

/**
 * Diálogo de confirmación genérico para acciones destructivas o difíciles de deshacer
 * (eliminar un costo indirecto, dar de baja un ítem de catálogo). Overlay + caja
 * centrada, más chico que `Modal` porque no hay formulario adentro, solo un mensaje y
 * dos botones. El click en el overlay NO cierra el diálogo (mismo criterio que
 * `Modal`): solo Escape o los botones "Cancelar"/confirmar.
 */
@Component({
  selector: 'app-confirmar-accion',
  templateUrl: './confirmar-accion.html',
  styleUrl: './confirmar-accion.scss',
})
export class ConfirmarAccion {
  readonly titulo = input.required<string>();
  readonly mensaje = input<string>('');
  readonly textoConfirmar = input<string>('Confirmar');
  readonly confirmado = output<void>();
  readonly cancelado = output<void>();
}
