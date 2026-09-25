import { ImportePipe } from './importe.pipe';

describe('ImportePipe', () => {
  const pipe = new ImportePipe();

  // El espacio entre el simbolo y el importe es un espacio irrompible (U+00A0), no un
  // espacio comun: evita que el simbolo quede en una linea separada del numero cuando
  // el importe es muy ancho para su columna (ver `_indicadores.scss`). El literal
  // esperado usa \u00A0 explicito porque un espacio normal no compara igual con `toBe`.
  it('formatea en pesos con separador de miles argentino por defecto', () => {
    expect(pipe.transform('150000.00')).toBe('$\u00A0150.000,00');
  });

  it('formatea en dólares cuando se pasa la moneda', () => {
    expect(pipe.transform('1234.5', 'USD')).toBe('US$\u00A01.234,50');
  });

  it('conserva el signo negativo', () => {
    expect(pipe.transform('-2500.5')).toBe('$\u00A0-2.500,50');
  });

  it('devuelve — para valores vacíos o inválidos, nunca 0', () => {
    expect(pipe.transform(null)).toBe('—');
    expect(pipe.transform(undefined)).toBe('—');
    expect(pipe.transform('')).toBe('—');
    expect(pipe.transform('abc')).toBe('—');
  });
});
