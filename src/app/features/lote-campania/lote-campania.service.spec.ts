import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../environments/environment';
import { LoteCampaniaService } from './lote-campania.service';
import type {
  AplicacionInsumo,
  AplicacionInsumoRequest,
  CobroRequest,
  Cosecha,
  CosechaRequest,
  DesgloseCostos,
  LiquidacionRequest,
  LiquidacionTramoRequest,
  LoteCampania,
  LoteCampaniaRequest,
  Margen,
  Tarea,
  TareaRequest,
  Venta,
  VentaRequest,
} from '../../models';

const LOTE_CAMPANIA: LoteCampania = {
  id: 1,
  campaniaId: 2,
  loteId: 6,
  loteNombre: 'Lote Norte',
  cultivoId: 8,
  cultivoNombre: 'Cebolla',
  variedad: null,
  ciclo: 1,
  superficieSembradaHa: '3',
  unidadProduccion: 'BOLSA',
  fechaSiembra: null,
  fechaTrasplante: null,
  fechaCosechaEsperada: null,
  comentarios: null,
  createdAt: '2026-08-01T00:00:00Z',
  updatedAt: '2026-08-01T00:00:00Z',
};

describe('LoteCampaniaService', () => {
  let service: LoteCampaniaService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(LoteCampaniaService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('siembra un lote con POST /api/campanias/{id}/lote-campanias', () => {
    const payload: LoteCampaniaRequest = {
      loteId: 6,
      cultivoId: 8,
      variedad: null,
      superficieSembradaHa: '3.0',
      unidadProduccion: 'BOLSA',
      fechaSiembra: null,
      fechaTrasplante: null,
      fechaCosechaEsperada: null,
      comentarios: null,
    };
    service.crear(2, payload).subscribe();

    const solicitud = http.expectOne(`${environment.apiBaseUrl}/campanias/2/lote-campanias`);
    expect(solicitud.request.method).toBe('POST');
    expect(solicitud.request.body).toEqual(payload);
    solicitud.flush(LOTE_CAMPANIA);
  });

  it('pide el desglose de costos con GET /api/lote-campanias/{id}/costos', () => {
    const respuesta: DesgloseCostos = {
      costoInsumosArs: '0',
      costoInsumosUsd: '0',
      costoManoObraArs: '0',
      costoManoObraUsd: '0',
      costoLaborYServiciosArs: '0',
      costoLaborYServiciosUsd: '0',
      costoIndirectosArs: '0',
      costoIndirectosUsd: '0',
      costoTareasArs: '0',
      costoTareasUsd: '0',
      costoTotalArs: '0',
      costoTotalUsd: '0',
      costoPorHaArs: '0',
      costoPorHaUsd: '0',
      superficieSembradaHa: '1.5',
      pctInsumos: '0',
      pctManoObra: '0',
      pctLaborYServicios: '0',
      pctIndirectos: '0',
      costoPorUnidadArs: null,
      costoPorUnidadUsd: null,
      rendimientoPorHa: null,
      tasaDescarte: null,
    };
    service.costos(4).subscribe();

    const solicitud = http.expectOne(`${environment.apiBaseUrl}/lote-campanias/4/costos`);
    expect(solicitud.request.method).toBe('GET');
    solicitud.flush(respuesta);
  });

  it('pide el margen con GET /api/lote-campanias/{id}/margen', () => {
    const respuesta: Margen = {
      ingresoRealizadoUsd: '0',
      ingresoRealizadoArs: '0',
      valorPendienteLiqUsd: '0',
      valorPendienteLiqArs: null,
      valorStockUsd: '0',
      valorStockArs: null,
      costoTotalUsd: '0',
      costoTotalArs: '0',
      margenRealizadoUsd: '0',
      margenRealizadoArs: '0',
      margenEstimadoUsd: null,
      margenEstimadoArs: null,
      tieneEstimaciones: false,
    };
    service.margen(4).subscribe();

    const solicitud = http.expectOne(`${environment.apiBaseUrl}/lote-campanias/4/margen`);
    expect(solicitud.request.method).toBe('GET');
    solicitud.flush(respuesta);
  });

  it('carga una tarea con POST /api/lote-campanias/{id}/tareas', () => {
    const payload: TareaRequest = {
      tipo: 'CARPIDA',
      fecha: '2026-04-01',
      ejecutor: 'CUADRILLA',
      modoCosto: 'TOTAL',
      cantidad: null,
      valorUnitario: { importe: '2800000', moneda: 'ARS', tipoCambio: '1' },
    };
    const respuesta: Tarea = {
      id: 1,
      loteCampaniaId: 4,
      tipo: 'CARPIDA',
      fecha: '2026-04-01',
      ejecutor: 'CUADRILLA',
      modoCosto: 'TOTAL',
      cantidad: null,
      valorUnitario: { importe: '2800000', moneda: 'ARS', tipoCambio: '1' },
      costoTotal: { importe: '2800000', moneda: 'ARS', tipoCambio: '1' },
      createdAt: '2026-08-24T00:00:00Z',
      updatedAt: '2026-08-24T00:00:00Z',
    };
    service.crearTarea(4, payload).subscribe();

    const solicitud = http.expectOne(`${environment.apiBaseUrl}/lote-campanias/4/tareas`);
    expect(solicitud.request.method).toBe('POST');
    expect(solicitud.request.body).toEqual(payload);
    solicitud.flush(respuesta);
  });

  it('carga una aplicación con POST /api/lote-campanias/{id}/aplicaciones', () => {
    const payload: AplicacionInsumoRequest = {
      insumoId: 5,
      fecha: '2026-04-01',
      cantidad: '20',
      unidadMedida: 'KG',
      precioUnitario: { importe: '900.5', moneda: 'ARS', tipoCambio: '1' },
    };
    const respuesta: AplicacionInsumo = {
      id: 1,
      loteCampaniaId: 4,
      insumoId: 5,
      insumoNombre: 'Urea Monto3',
      fecha: '2026-04-01',
      cantidad: '20',
      unidadMedida: 'KG',
      precioUnitario: { importe: '900.5', moneda: 'ARS', tipoCambio: '1' },
      costoTotal: { importe: '18010', moneda: 'ARS', tipoCambio: '1' },
      createdAt: '2026-08-24T00:00:00Z',
      updatedAt: '2026-08-24T00:00:00Z',
    };
    service.crearAplicacion(4, payload).subscribe();

    const solicitud = http.expectOne(`${environment.apiBaseUrl}/lote-campanias/4/aplicaciones`);
    expect(solicitud.request.method).toBe('POST');
    expect(solicitud.request.body).toEqual(payload);
    solicitud.flush(respuesta);
  });

  it('carga una cosecha con POST /api/lote-campanias/{id}/cosechas', () => {
    const payload: CosechaRequest = { fecha: '2026-07-20', numeroCorte: 1, calidad: 'PRIMERA', cantidad: '100' };
    const respuesta: Cosecha = {
      id: 1,
      loteCampaniaId: 4,
      fecha: '2026-07-20',
      numeroCorte: 1,
      calidad: 'PRIMERA',
      cantidad: '100',
      unidad: 'BOLSA',
      kgEquivalente: '2000',
    };
    service.crearCosecha(4, payload).subscribe();

    const solicitud = http.expectOne(`${environment.apiBaseUrl}/lote-campanias/4/cosechas`);
    expect(solicitud.request.method).toBe('POST');
    expect(solicitud.request.body).toEqual(payload);
    solicitud.flush(respuesta);
  });

  it('carga una venta con POST /api/lote-campanias/{id}/ventas', () => {
    const payload: VentaRequest = {
      compradorId: 6,
      fechaEntrega: '2026-07-25',
      calidad: 'PRIMERA',
      cantidad: '50',
      modalidad: 'PRECIO_CERRADO',
      precioUnitario: { importe: '9000', moneda: 'ARS', tipoCambio: '1' },
    };
    const respuesta: Venta = {
      id: 1,
      loteCampaniaId: 4,
      compradorId: 6,
      compradorNombre: 'Clismar',
      calidad: 'PRIMERA',
      modalidad: 'PRECIO_CERRADO',
      cantidad: '50',
      unidad: 'BOLSA',
      precioUnitario: { importe: '9000', moneda: 'ARS', tipoCambio: '1' },
      comision: null,
      flete: null,
      otrosGastos: null,
      importeNeto: { importe: '450000', moneda: 'ARS', tipoCambio: '1' },
      cobradoArs: '0',
      cantidadLiquidada: '0',
      estado: 'LIQUIDADA',
      fechaEntrega: '2026-07-25',
      fechaLiquidacion: '2026-07-25',
    };
    service.crearVenta(4, payload).subscribe();

    const solicitud = http.expectOne(`${environment.apiBaseUrl}/lote-campanias/4/ventas`);
    expect(solicitud.request.method).toBe('POST');
    expect(solicitud.request.body).toEqual(payload);
    solicitud.flush(respuesta);
  });

  it('edita una cosecha con PUT /api/lote-campanias/{id}/cosechas/{cosechaId}', () => {
    const payload: CosechaRequest = { fecha: '2026-07-20', numeroCorte: 1, calidad: 'PRIMERA', cantidad: '150' };
    const respuesta: Cosecha = {
      id: 9,
      loteCampaniaId: 4,
      fecha: '2026-07-20',
      numeroCorte: 1,
      calidad: 'PRIMERA',
      cantidad: '150',
      unidad: 'BOLSA',
      kgEquivalente: '3000',
    };
    service.actualizarCosecha(4, 9, payload).subscribe();

    const solicitud = http.expectOne(`${environment.apiBaseUrl}/lote-campanias/4/cosechas/9`);
    expect(solicitud.request.method).toBe('PUT');
    expect(solicitud.request.body).toEqual(payload);
    solicitud.flush(respuesta);
  });

  it('elimina una cosecha con DELETE /api/lote-campanias/{id}/cosechas/{cosechaId}', () => {
    service.eliminarCosecha(4, 9).subscribe();

    const solicitud = http.expectOne(`${environment.apiBaseUrl}/lote-campanias/4/cosechas/9`);
    expect(solicitud.request.method).toBe('DELETE');
    solicitud.flush(null);
  });

  it('edita una venta con PUT /api/ventas/{id}', () => {
    const payload: VentaRequest = {
      compradorId: 6,
      fechaEntrega: '2026-07-25',
      calidad: 'SEGUNDA',
      cantidad: '15',
      modalidad: 'CONSIGNACION',
    };
    const respuesta: Venta = {
      id: 2,
      loteCampaniaId: 4,
      compradorId: 6,
      compradorNombre: 'Clismar',
      calidad: 'SEGUNDA',
      modalidad: 'CONSIGNACION',
      cantidad: '15',
      unidad: 'BOLSA',
      precioUnitario: null,
      comision: null,
      flete: null,
      otrosGastos: null,
      importeNeto: null,
      cobradoArs: '0',
      cantidadLiquidada: '0',
      estado: 'ENTREGADA',
      fechaEntrega: '2026-07-25',
      fechaLiquidacion: null,
    };
    service.actualizarVenta(2, payload).subscribe();

    const solicitud = http.expectOne(`${environment.apiBaseUrl}/ventas/2`);
    expect(solicitud.request.method).toBe('PUT');
    expect(solicitud.request.body).toEqual(payload);
    solicitud.flush(respuesta);
  });

  it('elimina una venta con DELETE /api/ventas/{id}', () => {
    service.eliminarVenta(2).subscribe();

    const solicitud = http.expectOne(`${environment.apiBaseUrl}/ventas/2`);
    expect(solicitud.request.method).toBe('DELETE');
    solicitud.flush(null);
  });

  it('completa una liquidación con PATCH /api/ventas/{id}/liquidacion', () => {
    const payload: LiquidacionRequest = {
      precioUnitario: { importe: '4500', moneda: 'ARS', tipoCambio: '1' },
      fechaLiquidacion: '2026-08-01',
      comision: { importe: '100', moneda: 'ARS', tipoCambio: '1' },
    };
    const respuesta: Venta = {
      id: 2,
      loteCampaniaId: 4,
      compradorId: 6,
      compradorNombre: 'Clismar',
      calidad: 'SEGUNDA',
      modalidad: 'CONSIGNACION',
      cantidad: '10',
      unidad: 'BOLSA',
      precioUnitario: { importe: '4500', moneda: 'ARS', tipoCambio: '1' },
      comision: { importe: '100', moneda: 'ARS', tipoCambio: '1' },
      flete: null,
      otrosGastos: null,
      importeNeto: { importe: '44900', moneda: 'ARS', tipoCambio: '1' },
      cobradoArs: '0',
      cantidadLiquidada: '0',
      estado: 'LIQUIDADA',
      fechaEntrega: '2026-07-25',
      fechaLiquidacion: '2026-08-01',
    };
    service.liquidarVenta(2, payload).subscribe();

    const solicitud = http.expectOne(`${environment.apiBaseUrl}/ventas/2/liquidacion`);
    expect(solicitud.request.method).toBe('PATCH');
    expect(solicitud.request.body).toEqual(payload);
    solicitud.flush(respuesta);
  });

  describe('cobros y tramos', () => {
    const VENTA_COBRADA_EN_PARTE: Venta = {
      id: 3,
      loteCampaniaId: 4,
      compradorId: 6,
      compradorNombre: 'Clismar',
      calidad: 'PRIMERA',
      modalidad: 'PRECIO_CERRADO',
      cantidad: '50',
      unidad: 'BOLSA',
      precioUnitario: { importe: '9000', moneda: 'ARS', tipoCambio: '1' },
      comision: null,
      flete: null,
      otrosGastos: null,
      importeNeto: { importe: '450000', moneda: 'ARS', tipoCambio: '1' },
      estado: 'LIQUIDADA',
      fechaEntrega: '2026-07-25',
      fechaLiquidacion: '2026-07-25',
      estadoCobro: 'PARCIAL',
      cobradoArs: '200000.00',
      saldoArs: '250000.00',
      cantidadLiquidada: '50',
    };

    it('registra un cobro con POST /api/ventas/{id}/cobros y devuelve la venta actualizada', () => {
      const payload: CobroRequest = {
        fecha: '2026-01-15',
        monto: { importe: '200000.50', moneda: 'ARS', tipoCambio: '1050' },
        comentarios: 'Primera cuota',
      };
      let recibida: Venta | undefined;
      service.registrarCobro(3, payload).subscribe((v) => (recibida = v));

      const solicitud = http.expectOne(`${environment.apiBaseUrl}/ventas/3/cobros`);
      expect(solicitud.request.method).toBe('POST');
      expect(solicitud.request.body).toEqual(payload);
      expect(typeof solicitud.request.body.monto.importe).toBe('string');
      solicitud.flush(VENTA_COBRADA_EN_PARTE);
      expect(recibida).toEqual(VENTA_COBRADA_EN_PARTE);
    });

    it('elimina un cobro con DELETE /api/cobros/{id} y devuelve la venta (200, no 204)', () => {
      let recibida: Venta | undefined;
      service.eliminarCobro(7).subscribe((v) => (recibida = v));

      const solicitud = http.expectOne(`${environment.apiBaseUrl}/cobros/7`);
      expect(solicitud.request.method).toBe('DELETE');
      solicitud.flush(VENTA_COBRADA_EN_PARTE);
      expect(recibida).toEqual(VENTA_COBRADA_EN_PARTE);
    });

    it('registra un tramo con POST /api/ventas/{id}/liquidaciones y devuelve la venta actualizada', () => {
      const payload: LiquidacionTramoRequest = {
        fecha: '2026-02-10',
        cantidad: '30',
        precioUnitario: { importe: '5500', moneda: 'ARS', tipoCambio: '1050' },
        flete: { importe: '1200', moneda: 'ARS', tipoCambio: '1050' },
      };
      const respuesta: Venta = {
        ...VENTA_COBRADA_EN_PARTE,
        modalidad: 'CONSIGNACION',
        estado: 'PARCIAL',
        cantidadLiquidada: '30',
        cantidadPendiente: '20',
        estadoCobro: null,
        saldoArs: null,
        fechaLiquidacion: null,
      };
      let recibida: Venta | undefined;
      service.registrarTramo(3, payload).subscribe((v) => (recibida = v));

      const solicitud = http.expectOne(`${environment.apiBaseUrl}/ventas/3/liquidaciones`);
      expect(solicitud.request.method).toBe('POST');
      expect(solicitud.request.body).toEqual(payload);
      solicitud.flush(respuesta);
      expect(recibida).toEqual(respuesta);
    });

    it('elimina un tramo con DELETE /api/liquidaciones/{id} y devuelve la venta recalculada', () => {
      let recibida: Venta | undefined;
      service.eliminarTramo(5).subscribe((v) => (recibida = v));

      const solicitud = http.expectOne(`${environment.apiBaseUrl}/liquidaciones/5`);
      expect(solicitud.request.method).toBe('DELETE');
      solicitud.flush(VENTA_COBRADA_EN_PARTE);
      expect(recibida).toEqual(VENTA_COBRADA_EN_PARTE);
    });
  });
});
