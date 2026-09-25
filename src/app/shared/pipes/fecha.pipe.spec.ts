import { FechaPipe } from './fecha.pipe';

describe('FechaPipe', () => {
  const pipe = new FechaPipe();

  it('formatea una fecha ISO a dd/MM/yyyy', () => {
    expect(pipe.transform('2026-03-15')).toBe('15/03/2026');
  });

  it('muestra el mismo día que llegó de la API, sin corrimiento por UTC−3', () => {
    // Si el pipe pasara por `new Date('2026-03-15')`, en America/Argentina/Buenos_Aires
    // (UTC−3) se mostraría 14/03/2026. Es el bug más probable de todo el front (CLAUDE.md).
    expect(pipe.transform('2026-03-15')).not.toBe('14/03/2026');
  });

  it('formatea el primer día del año sin errores de padding', () => {
    expect(pipe.transform('2026-01-01')).toBe('01/01/2026');
  });

  it('devuelve — para valores vacíos o inválidos', () => {
    expect(pipe.transform(null)).toBe('—');
    expect(pipe.transform(undefined)).toBe('—');
    expect(pipe.transform('')).toBe('—');
    expect(pipe.transform('no-es-una-fecha')).toBe('—');
  });
});
