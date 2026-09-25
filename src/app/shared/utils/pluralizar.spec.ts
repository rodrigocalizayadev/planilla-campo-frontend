import { pluralizar } from './pluralizar';

describe('pluralizar', () => {
  it('agrega "s" a una palabra que termina en vocal', () => {
    expect(pluralizar('Bolsa')).toBe('Bolsas');
    expect(pluralizar('Jaula')).toBe('Jaulas');
  });

  it('agrega "es" a una palabra que termina en consonante', () => {
    expect(pluralizar('Bin')).toBe('Bines');
    expect(pluralizar('Unidad')).toBe('Unidades');
  });

  it('no toca una palabra que ya termina en "s" (el backend real ya la manda en plural)', () => {
    expect(pluralizar('Kilogramos')).toBe('Kilogramos');
  });

  it('no toca abreviaturas cortas', () => {
    expect(pluralizar('kg')).toBe('kg');
    expect(pluralizar('tn')).toBe('tn');
  });

  it('cambia la "z" final por "ces"', () => {
    expect(pluralizar('Raíz')).toBe('Raíces');
  });
});
