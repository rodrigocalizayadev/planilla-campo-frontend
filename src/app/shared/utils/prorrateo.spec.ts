import { calcularRepartoPorHa } from './prorrateo';

describe('calcularRepartoPorHa', () => {
  it('reparte proporcional a la superficie sembrada cuando divide exacto', () => {
    const partes = calcularRepartoPorHa(3600000, [
      { loteCampaniaId: 1, superficieSembradaHa: 3 },
      { loteCampaniaId: 2, superficieSembradaHa: 3 },
      { loteCampaniaId: 4, superficieSembradaHa: 1.5 },
      { loteCampaniaId: 5, superficieSembradaHa: 0.5 },
      { loteCampaniaId: 6, superficieSembradaHa: 1 },
    ]);

    expect(partes.find((p) => p.loteCampaniaId === 1)?.importe).toBe(1200000);
    expect(partes.find((p) => p.loteCampaniaId === 2)?.importe).toBe(1200000);
    expect(partes.find((p) => p.loteCampaniaId === 4)?.importe).toBe(600000);
    expect(partes.find((p) => p.loteCampaniaId === 5)?.importe).toBe(200000);
    expect(partes.find((p) => p.loteCampaniaId === 6)?.importe).toBe(400000);
    expect(partes.reduce((s, p) => s + p.importe, 0)).toBe(3600000);
  });

  it('repartir 100 entre 3 lotes iguales suma exactamente el importe original (docs/reglas-calculo.md §4.2)', () => {
    const partes = calcularRepartoPorHa(100, [
      { loteCampaniaId: 1, superficieSembradaHa: 1 },
      { loteCampaniaId: 2, superficieSembradaHa: 1 },
      { loteCampaniaId: 3, superficieSembradaHa: 1 },
    ]);

    const suma = partes.reduce((s, p) => s + p.importe, 0);
    expect(suma).toBeCloseTo(100, 10);
    // Dos lotes se llevan la cuota redondeada exacta (33.33) y uno absorbe el residuo.
    expect(partes.filter((p) => p.importe === 33.33)).toHaveLength(2);
    expect(partes.some((p) => p.importe === 33.34)).toBe(true);
  });

  it('sin lotes o sin importe devuelve partes en cero sin romper', () => {
    expect(calcularRepartoPorHa(0, [{ loteCampaniaId: 1, superficieSembradaHa: 5 }])).toEqual([
      { loteCampaniaId: 1, importe: 0 },
    ]);
    expect(calcularRepartoPorHa(100, [])).toEqual([]);
  });
});
