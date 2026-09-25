import { agruparPorCultivo } from './comparativa';
import type { ResumenCampania, ResumenCampaniaLote } from '../../models';

function lote(parcial: Partial<ResumenCampaniaLote>): ResumenCampaniaLote {
  return {
    loteCampaniaId: 1,
    nombreLote: 'Lote',
    nombreCultivo: 'Cebolla',
    superficieSembradaHa: '1',
    costoInsumosArs: '0',
    costoInsumosUsd: '0',
    costoTareasArs: '0',
    costoTareasUsd: '0',
    costoIndirectosArs: '0',
    costoIndirectosUsd: '0',
    costoTotalArs: '0',
    costoTotalUsd: '0',
    costoPorHaArs: '0',
    costoPorHaUsd: '0',
    ingresoRealizadoArs: '0',
    ingresoRealizadoUsd: '0',
    margenRealizadoArs: '0',
    margenRealizadoUsd: '0',
    ...parcial,
  };
}

function resumen(lotes: ResumenCampaniaLote[]): ResumenCampania {
  return {
    campaniaId: 1,
    nombreCampania: 'x',
    lotes,
    costoTotalCampaniaArs: '0',
    costoTotalCampaniaUsd: '0',
    superficieTotalHa: '0',
    costoPorHaCampaniaArs: '0',
    costoPorHaCampaniaUsd: '0',
    ingresoRealizadoCampaniaArs: '0',
    ingresoRealizadoCampaniaUsd: '0',
    margenRealizadoCampaniaArs: '0',
    margenRealizadoCampaniaUsd: '0',
  };
}

describe('agruparPorCultivo', () => {
  it('suma dos lotes del mismo cultivo dentro de una campaña, sin promediar', () => {
    const filas = agruparPorCultivo([
      {
        campaniaId: 1,
        nombreCampania: '2025/26',
        resumen: resumen([
          lote({
            loteCampaniaId: 4,
            nombreCultivo: 'Cebolla',
            superficieSembradaHa: '1.5',
            costoTotalArs: '150000',
            costoTotalUsd: '111',
            margenRealizadoArs: '20000',
            margenRealizadoUsd: '15',
          }),
          lote({
            loteCampaniaId: 5,
            nombreCultivo: 'Cebolla',
            superficieSembradaHa: '0.5',
            costoTotalArs: '50000',
            costoTotalUsd: '37',
            margenRealizadoArs: '5000',
            margenRealizadoUsd: '4',
          }),
        ]),
      },
    ]);

    expect(filas).toHaveLength(1);
    expect(filas[0].cultivo).toBe('Cebolla');
    expect(filas[0].superficieSembradaHa).toBe(2);
    expect(filas[0].costoTotalArs).toBe(200000);
    expect(filas[0].margenRealizadoArs).toBe(25000);
    // costo/ha del grupo = total / ha total, no el promedio de costoPorHa por lote.
    expect(filas[0].costoPorHaArs).toBe(100000);
  });

  it('separa cultivos distintos en la misma campaña y campañas distintas del mismo cultivo', () => {
    const filas = agruparPorCultivo([
      {
        campaniaId: 1,
        nombreCampania: '2025/26',
        resumen: resumen([
          lote({ nombreCultivo: 'Cebolla', costoTotalArs: '100' }),
          lote({ nombreCultivo: 'Zapallo', costoTotalArs: '200' }),
        ]),
      },
      {
        campaniaId: 2,
        nombreCampania: '2024/25',
        resumen: resumen([lote({ nombreCultivo: 'Cebolla', costoTotalArs: '300' })]),
      },
    ]);

    expect(filas).toHaveLength(3);
    expect(filas.filter((f) => f.cultivo === 'Cebolla')).toHaveLength(2);
    expect(filas.find((f) => f.campaniaId === 2 && f.cultivo === 'Cebolla')?.costoTotalArs).toBe(300);
  });

  it('sin lotes devuelve sin filas', () => {
    const filas = agruparPorCultivo([{ campaniaId: 1, nombreCampania: 'x', resumen: resumen([]) }]);
    expect(filas).toEqual([]);
  });
});
