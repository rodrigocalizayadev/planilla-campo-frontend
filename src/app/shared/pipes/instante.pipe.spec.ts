import { InstantePipe } from './instante.pipe';

describe('InstantePipe', () => {
  const pipe = new InstantePipe();

  it('convierte un Instant UTC a hora argentina (UTC−3)', () => {
    expect(pipe.transform('2026-03-01T14:22:00Z')).toBe('01/03/2026 11:22');
  });

  it('cruza al día anterior en Argentina cuando corresponde', () => {
    expect(pipe.transform('2026-03-15T02:30:00Z')).toBe('14/03/2026 23:30');
  });

  it('devuelve — para valores vacíos o inválidos', () => {
    expect(pipe.transform(null)).toBe('—');
    expect(pipe.transform(undefined)).toBe('—');
    expect(pipe.transform('no-es-una-fecha')).toBe('—');
  });
});
