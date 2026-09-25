export interface LoteParaProrratear {
  loteCampaniaId: number;
  superficieSembradaHa: number;
}

export interface ParteProrrateo {
  loteCampaniaId: number;
  importe: number;
}

/**
 * Vista previa del reparto `POR_HA` (docs/reglas-calculo.md §4.2) antes de guardar un
 * costo indirecto: `parte(LC) = importe × ha_LC / ha_total`. Regla de cierre: todas las
 * partes se redondean a 2 decimales y el residuo contra el importe original se suma a
 * la parte del lote de mayor superficie, para que `Σ partes === importe` exacto (mismo
 * requisito que pide la doc con el ejemplo "repartir 100 entre 3 lotes iguales").
 *
 * Es la excepción de CLAUDE.md regla 1 para "total en vivo de un formulario antes de
 * guardar": el reparto que se persiste lo calcula y devuelve el backend en la respuesta
 * real del alta (`CostoIndirecto.partes`), esto es solo la previsualización.
 */
export function calcularRepartoPorHa(importe: number, lotes: LoteParaProrratear[]): ParteProrrateo[] {
  const haTotal = lotes.reduce((suma, lote) => suma + lote.superficieSembradaHa, 0);
  if (!(importe > 0) || haTotal <= 0 || lotes.length === 0) {
    return lotes.map((lote) => ({ loteCampaniaId: lote.loteCampaniaId, importe: 0 }));
  }

  const mayor = lotes.reduce((a, b) => (b.superficieSembradaHa > a.superficieSembradaHa ? b : a));
  let asignado = 0;
  const partes = lotes.map((lote) => {
    if (lote.loteCampaniaId === mayor.loteCampaniaId) {
      return null;
    }
    const cuota = Math.round(importe * (lote.superficieSembradaHa / haTotal) * 100) / 100;
    asignado += cuota;
    return { loteCampaniaId: lote.loteCampaniaId, importe: cuota };
  });

  const resto = Math.round((importe - asignado) * 100) / 100;
  return partes.map((parte, i) => parte ?? { loteCampaniaId: lotes[i].loteCampaniaId, importe: resto });
}
