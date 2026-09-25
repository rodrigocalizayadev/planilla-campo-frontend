import { Pipe, PipeTransform } from '@angular/core';

type Moneda = 'ARS' | 'USD';

const SIMBOLOS: Record<Moneda, string> = { ARS: '$', USD: 'US$' };

/**
 * Importe a formato argentino con separador de miles: "150000.00" → "$ 150.000,00".
 * Se parsea solo para formatear, nunca para recalcular. Todo importe llega como
 * `string` (CLAUDE.md regla 1: todo `BigDecimal` viaja como string, sin excepciones).
 * Acepta `number` igual, por si algún día hace falta formatear un valor puramente
 * local (nunca uno que venga de la API).
 */
@Pipe({ name: 'importe' })
export class ImportePipe implements PipeTransform {
  private readonly formateador = new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  transform(valor: string | number | null | undefined, moneda: Moneda = 'ARS'): string {
    if (valor == null || valor === '') {
      return '—';
    }
    const numero = Number(valor);
    if (Number.isNaN(numero)) {
      return '—';
    }
    // String concatenado en vez de template literal: no-irregular-whitespace (con su
    // skipStrings default) no marca el NBSP dentro de un string literal, pero si lo
    // marca dentro de un template literal. Mismo espacio irrompible en ambos casos:
    // evita que el simbolo quede en una linea separada del numero.
    return SIMBOLOS[moneda] + '\u00A0' + this.formateador.format(numero);
  }
}
