
// Datos mockeados en memoria para el prototipo de Planilla de Campo.
// Todos los totales se derivan de los movimientos: nada de importes escritos a mano.
// Lotes, insumos y compradores son catálogos editables: viven dentro del estado (D.lotes,
// D.insumos, D.compradores) para poder crear, editar y dar de baja sin tocar módulos aparte.

export const EJECUTORES = ['Propio', 'Jornalero', 'Cuadrilla', 'Contratista'];
export const TAREAS_TIPO = ['Laboreo', 'Siembra', 'Carpida', 'Riego', 'Pulverización', 'Arrancado', 'Curado', 'Embolsado', 'Flete', 'Limpieza de canales'];
export const TC_ULTIMO = 1285;

export const SUELO_TIPOS = ['Franco', 'Franco-arenoso', 'Franco-arcilloso', 'Arenoso', 'Arcilloso'];
export const INSUMO_TIPOS = ['Semilla', 'Fertilizante', 'Agroquímico', 'Envase', 'Otro'];
export const UNIDADES_INSUMO = ['kg', 'L', 'u', 'ton', 'm3'];
export const MODALIDADES_COMPRADOR = [
  { valor: false, label: 'Precio cerrado' },
  { valor: true, label: 'Consignación' }
];
export const UNIDADES_PRESET = [
  { id: 'bolsa', label: 'Bolsa (20 kg)', unidad: 'bolsa', unidadPlural: 'bolsas', kgPorUnidad: 20 },
  { id: 'bin', label: 'Bin (400 kg)', unidad: 'bin', unidadPlural: 'bins', kgPorUnidad: 400 },
  { id: 'jaula', label: 'Jaula (18 kg)', unidad: 'jaula', unidadPlural: 'jaulas', kgPorUnidad: 18 },
  { id: 'docena', label: 'Docena (15 kg)', unidad: 'docena', unidadPlural: 'docenas', kgPorUnidad: 15 },
  { id: 'kilo', label: 'Kilo', unidad: 'kg', unidadPlural: 'kg', kgPorUnidad: 1 },
  { id: 'otro', label: 'Otra unidad', unidad: '', unidadPlural: '', kgPorUnidad: 1 }
];

// Mano de obra: lo pagado por jornal o destajo, y lo hecho por jornalero o cuadrilla.
// Labores y servicios: laboreo, siembra mecánica, pulverizaciones y fletes de terceros.
export function esManoDeObra(t) {
  if (t.modalidad === 'jornal' || t.modalidad === 'destajo') return true;
  return t.ejecutor === 'Jornalero' || t.ejecutor === 'Cuadrilla';
}

const LOTES_SEED = [
  { id: 'L1', nombre: 'Lote 1', ha: 8.5, tipoSuelo: 'Franco', comentarios: 'Frente al canal, sector norte', activo: true },
  { id: 'L2', nombre: 'Lote 2', ha: 3.5, tipoSuelo: 'Franco-arenoso', comentarios: 'Detrás del galpón de embolsado', activo: true },
  { id: 'L3', nombre: 'Lote 3', ha: 5.5, tipoSuelo: 'Franco-arcilloso', comentarios: 'Camino vecinal, junto a la casa', activo: true },
  { id: 'L4', nombre: 'Lote 4', ha: 2.5, tipoSuelo: 'Arcilloso', comentarios: 'Bajo, se inunda con lluvia fuerte', activo: true },
  { id: 'L5', nombre: 'Lote 5', ha: 4.5, tipoSuelo: 'Franco', comentarios: 'Sobre la ruta, portón de chapa', activo: true },
  { id: 'L6', nombre: 'Lote 6', ha: 6.0, tipoSuelo: 'Arenoso', comentarios: 'Fondo, junto al monte de eucaliptos', activo: true }
];

const INSUMOS_SEED = [
  { id: 'I01', nombre: 'Semilla de cebolla Valcatorce INTA', tipo: 'Semilla', unidad: 'kg', precio: 180000, moneda: 'ARS', activo: true },
  { id: 'I02', nombre: 'Semilla de zapallo Anco', tipo: 'Semilla', unidad: 'kg', precio: 240000, moneda: 'ARS', activo: true },
  { id: 'I03', nombre: 'Semilla de melón Amarillo Oro', tipo: 'Semilla', unidad: 'kg', precio: 320000, moneda: 'ARS', activo: true },
  { id: 'I04', nombre: 'Semilla de maíz dulce', tipo: 'Semilla', unidad: 'kg', precio: 95000, moneda: 'ARS', activo: true },
  { id: 'I05', nombre: 'Urea granulada', tipo: 'Fertilizante', unidad: 'kg', precio: 900, moneda: 'ARS', activo: true },
  { id: 'I06', nombre: 'Fosfato diamónico', tipo: 'Fertilizante', unidad: 'kg', precio: 1100, moneda: 'ARS', activo: true },
  { id: 'I07', nombre: 'Fertilizante triple 15', tipo: 'Fertilizante', unidad: 'kg', precio: 1400, moneda: 'ARS', activo: true },
  { id: 'I08', nombre: 'Herbicida post-emergente', tipo: 'Agroquímico', unidad: 'L', precio: 28000, moneda: 'ARS', activo: true },
  { id: 'I09', nombre: 'Insecticida para trips', tipo: 'Agroquímico', unidad: 'L', precio: 95000, moneda: 'ARS', activo: true },
  { id: 'I10', nombre: 'Fungicida de contacto', tipo: 'Agroquímico', unidad: 'L', precio: 62000, moneda: 'ARS', activo: true },
  { id: 'I11', nombre: 'Fertilizante foliar importado', tipo: 'Fertilizante', unidad: 'L', precio: 46, moneda: 'USD', activo: true },
  { id: 'I12', nombre: 'Bolsas de arpillera 20 kg', tipo: 'Envase', unidad: 'u', precio: 850, moneda: 'ARS', activo: true },
  { id: 'I13', nombre: 'Jaulas de cosecha', tipo: 'Envase', unidad: 'u', precio: 2300, moneda: 'ARS', activo: true }
];

const CULTIVOS_SEED = [
  { id: 'CU1', nombre: 'Cebolla', unidad: 'bolsa', unidadPlural: 'bolsas', kgPorUnidad: 20, precioPrimera: 9000, precioSegunda: 4500, fechaPrecio: '2026-03-01', activo: true },
  { id: 'CU2', nombre: 'Zapallo', unidad: 'bin', unidadPlural: 'bins', kgPorUnidad: 400, precioPrimera: 26000, precioSegunda: 15000, fechaPrecio: '2026-03-01', activo: true },
  { id: 'CU3', nombre: 'Melón', unidad: 'jaula', unidadPlural: 'jaulas', kgPorUnidad: 18, precioPrimera: 14500, precioSegunda: 8000, fechaPrecio: '2026-03-01', activo: true },
  { id: 'CU4', nombre: 'Maíz', unidad: 'docena', unidadPlural: 'docenas', kgPorUnidad: 15, precioPrimera: 4200, precioSegunda: 2500, fechaPrecio: '2026-03-01', activo: true }
];

const COMPRADORES_SEED = [
  { id: 'CP1', nombre: 'Distribuidora San Jorge', consignacion: false, contacto: 'Hugo Sánchez', cuit: '30-52341180-4', tel: '2622 44-1180', plaza: 'San Rafael', activo: true },
  { id: 'CP2', nombre: 'Verdulería Central de Abasto', consignacion: false, contacto: 'Nora Pérez', cuit: '27-24893402-1', tel: '261 155-3402', plaza: 'Mendoza', activo: true },
  { id: 'CP3', nombre: 'Mercado Cooperativo de Productores', consignacion: true, contacto: 'Mesa de operaciones', cuit: '30-68421990-7', tel: '261 421-9900', plaza: 'Guaymallén', activo: true }
];

function lc3() {
  return {
    id: 'LC3', campaniaId: 'C2526', loteId: 'L3', cultivoId: 'CU1', cultivo: 'Cebolla', variedad: 'Valcatorce INTA', haSembradas: 5, ciclo: 1,
    fechaSiembra: '2025-03-24', unidad: 'bolsa', unidadPlural: 'bolsas', kgPorUnidad: 20,
    preciosRef: { primera: 9000, segunda: 4500 },
    aplicaciones: [
      { id: 'a1', fecha: '2025-03-20', insumoId: 'I01', cantidad: 20, precio: 180000, moneda: 'ARS', tc: null },
      { id: 'a2', fecha: '2025-05-12', insumoId: 'I05', cantidad: 1500, precio: 900, moneda: 'ARS', tc: null },
      { id: 'a3', fecha: '2025-04-08', insumoId: 'I06', cantidad: 750, precio: 1100, moneda: 'ARS', tc: null },
      { id: 'a4', fecha: '2025-06-02', insumoId: 'I08', cantidad: 15, precio: 28000, moneda: 'ARS', tc: null },
      { id: 'a5', fecha: '2025-08-19', insumoId: 'I09', cantidad: 2.5, precio: 95000, moneda: 'ARS', tc: null },
      { id: 'a6', fecha: '2025-11-28', insumoId: 'I12', cantidad: 9000, precio: 850, moneda: 'ARS', tc: null }
    ],
    tareas: [
      { id: 't1', fecha: '2025-03-10', nombre: 'Laboreo', ejecutor: 'Contratista', modalidad: 'hectarea', valor: 120000, cantidad: null, nota: 'Rastra y cincel, contratista Bianchi' },
      { id: 't2', fecha: '2025-03-24', nombre: 'Siembra', ejecutor: 'Contratista', modalidad: 'hectarea', valor: 80000, cantidad: null, nota: '' },
      { id: 't3', fecha: '2025-07-15', nombre: 'Carpida', ejecutor: 'Cuadrilla', modalidad: 'total', valor: 2800000, cantidad: null, nota: 'Cuadrilla Ramírez, tres pasadas' },
      { id: 't4', fecha: '2025-09-30', nombre: 'Riego', ejecutor: 'Jornalero', modalidad: 'jornal', valor: 35000, cantidad: 24, nota: '' },
      { id: 't5', fecha: '2025-10-14', nombre: 'Pulverización', ejecutor: 'Contratista', modalidad: 'hectarea', valor: 45000, cantidad: null, nota: 'Dos aplicaciones' },
      { id: 't6', fecha: '2025-12-12', nombre: 'Arrancado', ejecutor: 'Cuadrilla', modalidad: 'destajo', valor: 1500, cantidad: 9000, nota: '' },
      { id: 't7', fecha: '2026-01-08', nombre: 'Embolsado', ejecutor: 'Cuadrilla', modalidad: 'destajo', valor: 600, cantidad: 9000, nota: '' },
      { id: 't8', fecha: '2026-01-14', nombre: 'Flete', ejecutor: 'Contratista', modalidad: 'total', valor: 950000, cantidad: null, nota: 'Al galpón y al mercado' }
    ],
    cosechas: [
      { id: 'c1', fecha: '2025-12-12', corte: 1, primera: 7500, segunda: 1500, descarteKg: 20000 }
    ],
    ventas: [
      { id: 'v1', fecha: '2026-01-16', compradorId: 'CP1', calidad: 'primera', cantidad: 5000, precio: 9000, gastos: 1500000, estado: 'liquidada', fechaLiquidacion: '2026-01-16' },
      { id: 'v2', fecha: '2026-02-03', compradorId: 'CP3', calidad: 'primera', cantidad: 2500, precio: null, gastos: 0, estado: 'pendiente', fechaLiquidacion: null }
    ]
  };
}

function lc1() {
  return {
    id: 'LC1', campaniaId: 'C2526', loteId: 'L1', cultivoId: 'CU2', cultivo: 'Zapallo', variedad: 'Anco', haSembradas: 8, ciclo: 1,
    fechaSiembra: '2025-09-18', unidad: 'bin', unidadPlural: 'bins', kgPorUnidad: 400,
    preciosRef: { primera: 26000, segunda: 15000 },
    aplicaciones: [
      { id: 'a1', fecha: '2025-09-15', insumoId: 'I02', cantidad: 6, precio: 240000, moneda: 'ARS', tc: null },
      { id: 'a2', fecha: '2025-10-20', insumoId: 'I05', cantidad: 2000, precio: 900, moneda: 'ARS', tc: null },
      { id: 'a3', fecha: '2025-09-16', insumoId: 'I06', cantidad: 600, precio: 1100, moneda: 'ARS', tc: null },
      { id: 'a4', fecha: '2025-11-05', insumoId: 'I08', cantidad: 20, precio: 28000, moneda: 'ARS', tc: null },
      { id: 'a5', fecha: '2025-12-18', insumoId: 'I10', cantidad: 8, precio: 62000, moneda: 'ARS', tc: null }
    ],
    tareas: [
      { id: 't1', fecha: '2025-09-05', nombre: 'Laboreo', ejecutor: 'Contratista', modalidad: 'hectarea', valor: 120000, cantidad: null, nota: '' },
      { id: 't2', fecha: '2025-09-18', nombre: 'Siembra', ejecutor: 'Contratista', modalidad: 'hectarea', valor: 80000, cantidad: null, nota: '' },
      { id: 't3', fecha: '2025-11-12', nombre: 'Carpida', ejecutor: 'Jornalero', modalidad: 'jornal', valor: 35000, cantidad: 18, nota: '' },
      { id: 't4', fecha: '2025-12-22', nombre: 'Riego', ejecutor: 'Jornalero', modalidad: 'jornal', valor: 35000, cantidad: 20, nota: '' },
      { id: 't5', fecha: '2025-12-01', nombre: 'Pulverización', ejecutor: 'Contratista', modalidad: 'hectarea', valor: 45000, cantidad: null, nota: '' },
      { id: 't6', fecha: '2026-02-14', nombre: 'Arrancado', ejecutor: 'Cuadrilla', modalidad: 'total', valor: 3200000, cantidad: null, nota: 'Cuadrilla Ramírez' },
      { id: 't7', fecha: '2026-02-16', nombre: 'Flete', ejecutor: 'Contratista', modalidad: 'total', valor: 780000, cantidad: null, nota: 'Al galpón' }
    ],
    cosechas: [
      { id: 'c1', fecha: '2026-02-14', corte: 1, primera: 1150, segunda: 240, descarteKg: 3500 }
    ],
    ventas: [
      { id: 'v1', fecha: '2026-03-02', compradorId: 'CP2', calidad: 'primera', cantidad: 420, precio: 26000, gastos: 640000, estado: 'liquidada', fechaLiquidacion: '2026-03-02' }
    ]
  };
}

function lc5() {
  return {
    id: 'LC5', campaniaId: 'C2526', loteId: 'L5', cultivoId: 'CU3', cultivo: 'Melón', variedad: 'Amarillo Oro', haSembradas: 4, ciclo: 1,
    fechaSiembra: '2025-10-02', unidad: 'jaula', unidadPlural: 'jaulas', kgPorUnidad: 18,
    preciosRef: { primera: 14500, segunda: 8000 },
    aplicaciones: [
      { id: 'a1', fecha: '2025-09-29', insumoId: 'I03', cantidad: 3, precio: 320000, moneda: 'ARS', tc: null },
      { id: 'a2', fecha: '2025-10-25', insumoId: 'I07', cantidad: 500, precio: 1400, moneda: 'ARS', tc: null },
      { id: 'a3', fecha: '2025-11-18', insumoId: 'I09', cantidad: 3, precio: 95000, moneda: 'ARS', tc: null },
      { id: 'a4', fecha: '2025-12-06', insumoId: 'I10', cantidad: 5, precio: 62000, moneda: 'ARS', tc: null },
      { id: 'a5', fecha: '2025-12-28', insumoId: 'I13', cantidad: 800, precio: 2300, moneda: 'ARS', tc: null }
    ],
    tareas: [
      { id: 't1', fecha: '2025-09-22', nombre: 'Laboreo', ejecutor: 'Contratista', modalidad: 'hectarea', valor: 120000, cantidad: null, nota: '' },
      { id: 't2', fecha: '2025-10-02', nombre: 'Siembra', ejecutor: 'Contratista', modalidad: 'hectarea', valor: 80000, cantidad: null, nota: '' },
      { id: 't3', fecha: '2025-11-20', nombre: 'Carpida', ejecutor: 'Jornalero', modalidad: 'jornal', valor: 35000, cantidad: 12, nota: '' },
      { id: 't4', fecha: '2025-12-15', nombre: 'Riego', ejecutor: 'Jornalero', modalidad: 'jornal', valor: 35000, cantidad: 14, nota: '' },
      { id: 't5', fecha: '2025-12-02', nombre: 'Pulverización', ejecutor: 'Contratista', modalidad: 'hectarea', valor: 45000, cantidad: null, nota: '' },
      { id: 't6', fecha: '2026-01-05', nombre: 'Corte 1', ejecutor: 'Jornalero', modalidad: 'jornal', valor: 35000, cantidad: 8, nota: 'Primer corte' },
      { id: 't7', fecha: '2026-01-14', nombre: 'Corte 2', ejecutor: 'Jornalero', modalidad: 'jornal', valor: 35000, cantidad: 10, nota: 'Segundo corte' },
      { id: 't8', fecha: '2026-01-23', nombre: 'Corte 3', ejecutor: 'Cuadrilla', modalidad: 'destajo', valor: 900, cantidad: 260, nota: 'Tercer corte, por jaula' }
    ],
    cosechas: [
      { id: 'c1', fecha: '2026-01-05', corte: 1, primera: 180, segunda: 60, descarteKg: 400 },
      { id: 'c2', fecha: '2026-01-14', corte: 2, primera: 240, segunda: 75, descarteKg: 520 },
      { id: 'c3', fecha: '2026-01-23', corte: 3, primera: 210, segunda: 50, descarteKg: 300 }
    ],
    ventas: [
      { id: 'v1', fecha: '2026-01-19', compradorId: 'CP1', calidad: 'primera', cantidad: 300, precio: 14500, gastos: 380000, estado: 'liquidada', fechaLiquidacion: '2026-01-19' },
      { id: 'v2', fecha: '2026-01-26', compradorId: 'CP3', calidad: 'primera', cantidad: 150, precio: null, gastos: 0, estado: 'pendiente', fechaLiquidacion: null }
    ]
  };
}

function lc2() {
  return {
    id: 'LC2', campaniaId: 'C2526', loteId: 'L2', cultivoId: 'CU4', cultivo: 'Maíz', variedad: 'Dulce', haSembradas: 3, ciclo: 1,
    fechaSiembra: '2026-02-20', unidad: 'docena', unidadPlural: 'docenas', kgPorUnidad: 15,
    preciosRef: { primera: 4200, segunda: 2500 },
    aplicaciones: [
      { id: 'a1', fecha: '2026-02-18', insumoId: 'I04', cantidad: 8, precio: 95000, moneda: 'ARS', tc: null },
      { id: 'a2', fecha: '2026-02-19', insumoId: 'I07', cantidad: 200, precio: 1400, moneda: 'ARS', tc: null }
    ],
    tareas: [
      { id: 't1', fecha: '2026-02-10', nombre: 'Laboreo', ejecutor: 'Contratista', modalidad: 'hectarea', valor: 120000, cantidad: null, nota: '' },
      { id: 't2', fecha: '2026-02-20', nombre: 'Siembra', ejecutor: 'Contratista', modalidad: 'hectarea', valor: 80000, cantidad: null, nota: '' }
    ],
    cosechas: [],
    ventas: []
  };
}

export function estadoInicial() {
  return {
    campaniaActiva: 'C2526',
    campanias: [
      { id: 'C2526', nombre: '2025/26', estado: 'abierta', inicio: '2025-03-01', fin: '2026-06-30', gastosPct: 12 },
      { id: 'C2425', nombre: '2024/25', estado: 'cerrada', inicio: '2024-03-01', fin: '2025-06-30', gastosPct: 12, cierre: '2025-06-30' }
    ],
    indirectos: [
      { id: 'x1', campaniaId: 'C2526', concepto: 'Canon de riego 2025/26', importe: 3600000, criterio: 'ha' },
      { id: 'x2', campaniaId: 'C2526', concepto: 'Asesoramiento técnico', importe: 1200000, criterio: 'ha' }
    ],
    loteCampanias: [lc3(), lc1(), lc5(), lc2()],
    lotes: JSON.parse(JSON.stringify(LOTES_SEED)),
    insumos: JSON.parse(JSON.stringify(INSUMOS_SEED)),
    compradores: JSON.parse(JSON.stringify(COMPRADORES_SEED)),
    cultivos: JSON.parse(JSON.stringify(CULTIVOS_SEED)),
    secuencia: 100
  };
}

// ---------- catálogos ----------

export function lotesActivos(est) { return est.lotes.filter((l) => l.activo); }
export function insumosActivos(est) { return est.insumos.filter((i) => i.activo); }
export function compradoresActivos(est) { return est.compradores.filter((c) => c.activo); }
export function cultivosActivos(est) { return est.cultivos.filter((c) => c.activo); }
// Precio de referencia vigente de un lote-campaña: sale del cultivo del catálogo (así
// se actualiza para todos los lotes de ese cultivo a la vez); si no tiene cultivo
// vinculado, cae al precio que quedó guardado en el propio lote-campaña.
export function precioRefDe(est, lc) {
  const cu = lc.cultivoId ? est.cultivos.find((c) => c.id === lc.cultivoId) : null;
  if (cu) return { primera: cu.precioPrimera, segunda: cu.precioSegunda, actualizado: cu.fechaPrecio };
  return { primera: lc.preciosRef.primera, segunda: lc.preciosRef.segunda, actualizado: null };
}
// Lotes del catálogo que todavía no están sembrados en la campaña activa: los únicos
// elegibles para "Sembrar un lote".
export function lotesDisponiblesPara(est) {
  const usados = new Set(lotesDe(est).map((lc) => lc.loteId));
  return lotesActivos(est).filter((l) => !usados.has(l.id));
}

// ---------- cálculos ----------

export function campaniaDe(est) {
  return est.campanias.find((c) => c.id === est.campaniaActiva) || est.campanias[0];
}
export function lotesDe(est) {
  return est.loteCampanias.filter((lc) => lc.campaniaId === est.campaniaActiva);
}
export function indirectosDe(est) {
  return est.indirectos.filter((i) => i.campaniaId === est.campaniaActiva);
}
export function factorGastos(est) {
  const c = campaniaDe(est);
  return 1 - (c ? c.gastosPct : 12) / 100;
}

export function totalAplicacion(a) {
  const bruto = a.cantidad * a.precio * (a.moneda === 'USD' ? a.tc : 1);
  return Math.round(bruto);
}

export function totalTarea(t, ha) {
  if (t.modalidad === 'hectarea') return Math.round(t.valor * ha);
  if (t.modalidad === 'total') return Math.round(t.valor);
  return Math.round((t.cantidad || 0) * t.valor);
}

export function detalleTarea(t, ha, u) {
  if (t.modalidad === 'hectarea') return miles(t.valor) + ' × ' + coma(ha) + ' ha';
  if (t.modalidad === 'total') return 'monto acordado';
  if (t.modalidad === 'jornal') return t.cantidad + ' jornales × ' + miles(t.valor);
  return miles(t.cantidad) + ' ' + u + ' × ' + miles(t.valor);
}

export function haTotal(est) {
  return lotesDe(est).reduce((s, lc) => s + lc.haSembradas, 0);
}

// Reparto de indirectos por hectárea sembrada. El resto por redondeo va al lote
// más grande, para que la suma sea exactamente igual al importe cargado.
// La cuota (indirecto × lote) es el átomo: el importe que se muestra de cada concepto
// es la suma de sus cuotas redondeadas, así el concepto y el reparto dan lo mismo.
export function prorrateoDetalle(est, cv) {
  const c1 = cv || ((n) => Math.round(n));
  const lotes = lotesDe(est);
  const ha = haTotal(est);
  const porLote = {};
  const porConcepto = {};
  lotes.forEach((lc) => { porLote[lc.id] = 0; });
  if (!ha || !lotes.length) return { porLote, porConcepto };
  const mayor = lotes.reduce((a, b) => (b.haSembradas > a.haSembradas ? b : a), lotes[0]);
  indirectosDe(est).forEach((ind) => {
    porConcepto[ind.id] = 0;
    let crudoAsignado = 0;
    lotes.forEach((lc) => {
      if (lc.id === mayor.id) return;
      const crudo = ind.importe * (lc.haSembradas / ha);
      crudoAsignado += crudo;
      const cuota = c1(crudo);
      porLote[lc.id] += cuota;
      porConcepto[ind.id] += cuota;
    });
    const resto = c1(ind.importe - crudoAsignado);
    porLote[mayor.id] += resto;
    porConcepto[ind.id] += resto;
  });
  return { porLote, porConcepto };
}

export function prorrateo(est, cv) {
  return prorrateoDetalle(est, cv).porLote;
}

// cv convierte y redondea CADA movimiento (el átomo). Todos los agregados son sumas
// de átomos ya redondeados, así la columna visible suma exactamente el total visible
// en cualquier moneda.
export function calcularLote(est, lc, cv) {
  const c1 = cv || ((n) => Math.round(n));
  const ha = lc.haSembradas;
  const aplicaciones = lc.aplicaciones.map((a) => ({ ...a, total: c1(totalAplicacion(a)) }));
  const tareas = lc.tareas.map((t) => ({ ...t, total: c1(totalTarea(t, ha)), manoDeObra: esManoDeObra(t) }));
  const costoInsumos = aplicaciones.reduce((s, a) => s + a.total, 0);
  const costoManoObra = tareas.filter((t) => t.manoDeObra).reduce((s, t) => s + t.total, 0);
  const costoLabores = tareas.filter((t) => !t.manoDeObra).reduce((s, t) => s + t.total, 0);
  const costoTareas = costoManoObra + costoLabores;
  const costoIndirectos = prorrateo(est, c1)[lc.id] || 0;
  const costoTotal = costoInsumos + costoTareas + costoIndirectos;

  const cosechado = { primera: 0, segunda: 0 };
  let descarteKg = 0;
  lc.cosechas.forEach((c) => {
    cosechado.primera += c.primera;
    cosechado.segunda += c.segunda;
    descarteKg += c.descarteKg;
  });
  const vendibles = cosechado.primera + cosechado.segunda;
  const hayCosecha = lc.cosechas.length > 0 && vendibles > 0;

  // Rendimiento y descarte se miden en kilos e incluyen el descarte:
  // miden productividad, no rentabilidad.
  const kgVendibles = vendibles * lc.kgPorUnidad;
  const kgTotales = kgVendibles + descarteKg;
  const rendimientoKgHa = hayCosecha && ha ? kgTotales / ha : null;
  const tasaDescarte = kgTotales > 0 ? descarteKg / kgTotales : null;

  const vendido = { primera: 0, segunda: 0 };
  let netoLiquidado = 0;
  let liquidadas = 0;
  const pendientes = { primera: 0, segunda: 0 };
  let cantPendiente = 0;
  lc.ventas.forEach((v) => {
    vendido[v.calidad] += v.cantidad;
    if (v.estado === 'liquidada') {
      netoLiquidado += c1(v.cantidad * v.precio - v.gastos);
      liquidadas += v.cantidad;
    } else {
      pendientes[v.calidad] += v.cantidad;
      cantPendiente += v.cantidad;
    }
  });
  const stock = {
    primera: Math.max(0, cosechado.primera - vendido.primera),
    segunda: Math.max(0, cosechado.segunda - vendido.segunda)
  };
  const cantStock = stock.primera + stock.segunda;

  const ref = precioRefDe(est, lc);
  const factor = factorGastos(est);
  const valorPendiente = c1((pendientes.primera * ref.primera + pendientes.segunda * ref.segunda) * factor);
  const valorStock = c1((stock.primera * ref.primera + stock.segunda * ref.segunda) * factor);

  const hayMargen = hayCosecha || lc.ventas.length > 0;
  const margenRealizado = hayMargen ? netoLiquidado - costoTotal : null;
  const margenEstimado = hayMargen ? netoLiquidado + valorPendiente + valorStock - costoTotal : null;

  const movimientos = []
    .concat(aplicaciones.map((a) => {
      const ins = est.insumos.find((i) => i.id === a.insumoId) || { nombre: 'Insumo', unidad: '' };
      return {
        id: 'a-' + a.id, fecha: a.fecha, rubro: 'Insumo', pendiente: !!a.pendiente,
        titulo: ins.nombre, cantidadTxt: coma(a.cantidad) + ' ' + ins.unidad,
        moneda: a.moneda, precio: a.precio, tc: a.tc, total: a.total
      };
    }))
    .concat(tareas.map((t) => ({
      id: 't-' + t.id, fecha: t.fecha, rubro: t.manoDeObra ? 'Mano de obra' : 'Labor', pendiente: !!t.pendiente,
      titulo: t.nombre, ejecutor: t.ejecutor, modalidad: t.modalidad,
      valor: t.valor, cantidad: t.cantidad, moneda: 'ARS', total: t.total
    })))
    .sort((x, y) => (x.fecha < y.fecha ? 1 : x.fecha > y.fecha ? -1 : 0));

  return {
    lc, ha, aplicaciones, tareas, movimientos,
    costoInsumos, costoManoObra, costoLabores, costoTareas, costoIndirectos, costoTotal,
    costoPorHa: ha ? costoTotal / ha : 0,
    cosechado, descarteKg, vendibles, hayCosecha,
    kgVendibles, kgTotales, rendimientoKgHa, tasaDescarte,
    costoPorUnidad: hayCosecha ? costoTotal / vendibles : null,
    liquidadas, netoLiquidado, pendientes, cantPendiente, valorPendiente,
    stock, cantStock, valorStock,
    hayMargen, margenRealizado, margenEstimado,
    ingresoEstimado: netoLiquidado + valorPendiente + valorStock
  };
}

export function calcularCampania(est, cv) {
  const c1 = cv || ((n) => Math.round(n));
  const lotes = lotesDe(est).map((lc) => calcularLote(est, lc, c1));
  const costoTotal = lotes.reduce((s, l) => s + l.costoTotal, 0);
  const netoLiquidado = lotes.reduce((s, l) => s + l.netoLiquidado, 0);
  const valorNoLiquidado = lotes.reduce((s, l) => s + l.valorPendiente + l.valorStock, 0);
  const ha = haTotal(est);
  return {
    lotes, costoTotal, ha, netoLiquidado, valorNoLiquidado,
    costoPorHa: ha ? costoTotal / ha : 0,
    margenRealizado: netoLiquidado - costoTotal,
    margenEstimado: netoLiquidado + valorNoLiquidado - costoTotal,
    costoManoObra: lotes.reduce((s, l) => s + l.costoManoObra, 0),
    indirectos: lotes.reduce((s, l) => s + l.costoIndirectos, 0),
    indirectosPorConcepto: prorrateoDetalle(est, c1).porConcepto,
    cantPendiente: lotes.reduce((s, l) => s + l.cantPendiente, 0)
  };
}

// ---------- formato ----------

export function miles(n) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return Math.round(n).toLocaleString('es-AR');
}

export function dec2(n) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function coma(n) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return n.toLocaleString('es-AR', { maximumFractionDigits: 2 });
}

export function pct(n, d) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return (n * 100).toLocaleString('es-AR', { maximumFractionDigits: d === undefined ? 1 : d }) + ' %';
}

export function fecha(iso) {
  if (!iso) return '';
  const p = iso.split('-');
  return p[2] + '/' + p[1] + '/' + p[0].slice(2);
}

export function diasEntre(desdeISO, hastaISO) {
  const a = new Date(desdeISO + 'T00:00:00');
  const b = new Date(hastaISO + 'T00:00:00');
  return Math.max(0, Math.round((b - a) / 86400000));
}

export function hoyISO() {
  return '2026-03-15';
}
