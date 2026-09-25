import { Pipe, PipeTransform } from '@angular/core';

const ZONA_ARGENTINA = 'America/Argentina/Buenos_Aires';

/**
 * `Instant` de auditoría (UTC, con `Z`) a `dd/MM/yyyy HH:mm` en hora argentina.
 * A diferencia de `FechaPipe`, acá `new Date()` es correcto: un `Instant` sí es un
 * momento real, no una fecha de negocio sin zona (CLAUDE.md, regla 2).
 */
@Pipe({ name: 'instante' })
export class InstantePipe implements PipeTransform {
  private readonly formateador = new Intl.DateTimeFormat('es-AR', {
    timeZone: ZONA_ARGENTINA,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });

  transform(valor: string | null | undefined): string {
    if (!valor) {
      return '—';
    }
    const fecha = new Date(valor);
    if (Number.isNaN(fecha.getTime())) {
      return '—';
    }
    return this.formateador.format(fecha).replace(',', '');
  }
}
