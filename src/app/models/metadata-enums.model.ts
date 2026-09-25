export interface ValorEnum {
  valor: string;
  etiqueta: string;
}

/**
 * GET /api/metadata/enums. Fuente única de los trece enums del sistema: nunca
 * hardcodear listas de valores ni sus etiquetas en el frontend (CLAUDE.md,
 * regla 3) — se desincronizan cuando el backend agrega un valor.
 */
export interface MetadataEnums {
  tipoInsumo: ValorEnum[];
  tipoTarea: ValorEnum[];
  ejecutor: ValorEnum[];
  modoCosto: ValorEnum[];
  calidad: ValorEnum[];
  unidadMedida: ValorEnum[];
  unidadProduccion: ValorEnum[];
  modalidadVenta: ValorEnum[];
  estadoVenta: ValorEnum[];
  estadoCampania: ValorEnum[];
  criterioProrrateo: ValorEnum[];
  moneda: ValorEnum[];
  rol: ValorEnum[];
}
