import { describe, expect, it } from 'vitest';
import {
  MAX_DIGITOS_DECIMALES_TIPO_CAMBIO,
  MAX_DIGITOS_ENTEROS_TIPO_CAMBIO,
  agruparMiles,
  filtrarCantidad,
  filtrarImporte,
  formatearImporteDesdeCrudo,
  importeMostradoACrudo,
  ubicarCursorImporte,
} from './entrada-numerica';

describe('filtrarCantidad', () => {
  it('deja pasar dígitos y descarta letras', () => {
    expect(filtrarCantidad('12a3', 4).texto).toBe('123');
  });

  it('acepta un único punto decimal', () => {
    expect(filtrarCantidad('4.5', 3).texto).toBe('4.5');
  });

  it('descarta un segundo punto decimal', () => {
    expect(filtrarCantidad('4.5.6', 5).texto).toBe('4.56');
  });

  it('con enteros=false no deja pasar el punto', () => {
    expect(filtrarCantidad('1.5', 3, false).texto).toBe('15');
  });

  it('reubica el cursor descontando los caracteres inválidos que había antes', () => {
    // "12x3" con cursor tras la "x" (posición 3): sobreviven "1" y "2" antes del
    // cursor → el cursor nuevo debe quedar en la posición 2, no en el final.
    const resultado = filtrarCantidad('12x3', 3);
    expect(resultado.texto).toBe('123');
    expect(resultado.cursor).toBe(2);
  });

  it('corta la parte entera en el tope por defecto (10 dígitos, DECIMAL(12,2))', () => {
    expect(filtrarCantidad('123456789012', 12).texto).toBe('1234567890');
  });

  it('corta los decimales en el tope por defecto (2 dígitos, DECIMAL(12,2))', () => {
    expect(filtrarCantidad('1.23456', 7).texto).toBe('1.23');
  });

  it('no corta los decimales antes de llegar a su propio tope', () => {
    expect(filtrarCantidad('12345678901.55', 14).texto).toBe('1234567890.55');
  });

  it('acepta un tope de enteros custom', () => {
    expect(filtrarCantidad('123456', 6, true, 4).texto).toBe('1234');
  });

  it('con los topes de tipo de cambio (8 enteros, 4 decimales, DECIMAL(12,4))', () => {
    const resultado = filtrarCantidad(
      '123456789.123456',
      16,
      true,
      MAX_DIGITOS_ENTEROS_TIPO_CAMBIO,
      MAX_DIGITOS_DECIMALES_TIPO_CAMBIO,
    );
    expect(resultado.texto).toBe('12345678.1234');
  });
});

describe('filtrarImporte', () => {
  it('agrupa miles con punto', () => {
    expect(filtrarImporte('1234567', 7).texto).toBe('1.234.567');
  });

  it('separa decimales con coma', () => {
    expect(filtrarImporte('1234567,89', 10).texto).toBe('1.234.567,89');
  });

  it('descarta una segunda coma', () => {
    expect(filtrarImporte('12,3,4', 6).texto).toBe('12,34');
  });

  it('trunca a dos decimales', () => {
    expect(filtrarImporte('12,3456', 7).texto).toBe('12,34');
  });

  it('descarta letras', () => {
    expect(filtrarImporte('12a34', 5).texto).toBe('1.234');
  });

  it('corta la parte entera en el tope por defecto (18 dígitos)', () => {
    const diecinueveDigitos = '1234567890123456789';
    const dieciochoDigitos = '123456789012345678';
    expect(filtrarImporte(diecinueveDigitos, diecinueveDigitos.length).texto).toBe(agruparMiles(dieciochoDigitos));
  });

  it('acepta un tope de enteros custom', () => {
    expect(filtrarImporte('123456', 6, 4).texto).toBe('1.234');
  });

  it('acepta un tope de decimales custom (tipo de cambio, 4 decimales)', () => {
    expect(filtrarImporte('1234,56789', 10, MAX_DIGITOS_ENTEROS_TIPO_CAMBIO, MAX_DIGITOS_DECIMALES_TIPO_CAMBIO).texto).toBe(
      '1.234,5678',
    );
  });
});

describe('ubicarCursorImporte', () => {
  it('salta los puntos de agrupación al contar posiciones', () => {
    // 4 caracteres significativos ("1234") en "123.456" caen justo después del "4".
    expect(ubicarCursorImporte('123.456', 4)).toBe(5);
  });

  it('devuelve 0 si no hay caracteres significativos antes del cursor', () => {
    expect(ubicarCursorImporte('123.456', 0)).toBe(0);
  });
});

describe('importeMostradoACrudo', () => {
  it('convierte formato argentino a crudo con punto decimal', () => {
    expect(importeMostradoACrudo('1.234.567,89')).toBe('1234567.89');
  });

  it('un importe sin decimales queda sin punto', () => {
    expect(importeMostradoACrudo('150.000')).toBe('150000');
  });

  it('string vacío da string vacío', () => {
    expect(importeMostradoACrudo('')).toBe('');
  });
});

describe('formatearImporteDesdeCrudo', () => {
  it('formatea un crudo con separador de miles y dos decimales', () => {
    expect(formatearImporteDesdeCrudo('1234567.5')).toBe('1.234.567,50');
  });

  it('siempre muestra dos decimales aunque el crudo sea entero', () => {
    expect(formatearImporteDesdeCrudo('9000')).toBe('9.000,00');
  });

  it('string vacío da string vacío', () => {
    expect(formatearImporteDesdeCrudo('')).toBe('');
  });

  it('acepta un tope de decimales custom (tipo de cambio, 4 decimales)', () => {
    expect(formatearImporteDesdeCrudo('1350', MAX_DIGITOS_DECIMALES_TIPO_CAMBIO)).toBe('1.350,0000');
    expect(formatearImporteDesdeCrudo('1350.5', MAX_DIGITOS_DECIMALES_TIPO_CAMBIO)).toBe('1.350,5000');
  });
});
