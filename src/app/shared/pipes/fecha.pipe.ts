import { Pipe, PipeTransform } from '@angular/core';

const FORMATO_ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * `LocalDate` ISO ("2026-03-15") a `dd/MM/yyyy`. Puro manejo de string, sin pasar
 * por `Date`: un `LocalDate` no tiene zona horaria, y `new Date("2026-03-15")` lo
 * interpreta como medianoche UTC, mostrando el día anterior en Argentina
 * (CLAUDE.md, regla 2 — es el bug más probable de todo el front).
 */
@Pipe({ name: 'fecha' })
export class FechaPipe implements PipeTransform {
  transform(valor: string | null | undefined): string {
    if (!valor) {
      return '—';
    }
    const coincidencia = FORMATO_ISO.exec(valor);
    if (!coincidencia) {
      return '—';
    }
    const [, anio, mes, dia] = coincidencia;
    return `${dia}/${mes}/${anio}`;
  }
}
