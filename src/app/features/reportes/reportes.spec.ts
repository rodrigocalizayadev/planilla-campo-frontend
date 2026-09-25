import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Reportes } from './reportes';
import { CampaniaActivaService } from '../../core/campania/campania-activa.service';
import { environment } from '../../../environments/environment';
import type { Campania, CostosPorRubro, PaginaResponse, ResumenCampania } from '../../models';

const COSTOS_POR_RUBRO: CostosPorRubro = {
  campaniaId: 1,
  nombreCampania: '2025/26',
  lotes: [
    {
      loteCampaniaId: 4,
      nombreLote: 'Lote Norte',
      nombreCultivo: 'Cebolla',
      superficieSembradaHa: '1.5',
      insumosArs: '40000',
      insumosUsd: '30',
      manoObraArs: '30000',
      manoObraUsd: '22',
      laborMecanicaArs: '20000',
      laborMecanicaUsd: '15',
      indirectosArs: '10000',
      indirectosUsd: '7',
      totalArs: '100000',
      totalUsd: '74',
    },
  ],
  totalInsumosArs: '40000',
  totalInsumosUsd: '30',
  totalManoObraArs: '30000',
  totalManoObraUsd: '22',
  totalLaborMecanicaArs: '20000',
  totalLaborMecanicaUsd: '15',
  totalIndirectosArs: '10000',
  totalIndirectosUsd: '7',
  totalGeneralArs: '100000',
  totalGeneralUsd: '74',
};

const CAMPANIAS: Campania[] = [
  {
    id: 1,
    nombre: '2025/26',
    fechaInicio: '2025-08-01',
    fechaFin: '2026-07-31',
    estado: 'EN_CURSO',
    gastosComercializacionEstimados: '0.12',
    createdAt: '2026-08-01T00:00:00Z',
    updatedAt: '2026-08-01T00:00:00Z',
  },
  {
    id: 2,
    nombre: '2024/25',
    fechaInicio: '2024-08-01',
    fechaFin: '2025-07-31',
    estado: 'CERRADA',
    gastosComercializacionEstimados: '0.12',
    createdAt: '2025-08-01T00:00:00Z',
    updatedAt: '2025-08-01T00:00:00Z',
  },
];

function resumenLote(nombreCultivo: string, costoTotalArs: number): ResumenCampania['lotes'][number] {
  return {
    loteCampaniaId: 1,
    nombreLote: 'Lote',
    nombreCultivo,
    superficieSembradaHa: '1',
    costoInsumosArs: '0',
    costoInsumosUsd: '0',
    costoTareasArs: '0',
    costoTareasUsd: '0',
    costoIndirectosArs: '0',
    costoIndirectosUsd: '0',
    costoTotalArs: String(costoTotalArs),
    costoTotalUsd: String(costoTotalArs / 1350),
    costoPorHaArs: String(costoTotalArs),
    costoPorHaUsd: String(costoTotalArs / 1350),
    ingresoRealizadoArs: '0',
    ingresoRealizadoUsd: '0',
    margenRealizadoArs: String(-costoTotalArs),
    margenRealizadoUsd: String(-costoTotalArs / 1350),
  };
}

function resumenDe(campaniaId: number, nombreCampania: string, lotes: ResumenCampania['lotes']): ResumenCampania {
  return {
    campaniaId,
    nombreCampania,
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

function paginaDe<T>(items: T[]): PaginaResponse<T> {
  return {
    content: items,
    page: { size: 200, number: 0, totalElements: items.length, totalPages: 1 },
  };
}

describe('Reportes', () => {
  let fixture: ComponentFixture<Reportes>;
  let http: HttpTestingController;
  let campaniaActiva: CampaniaActivaService;

  beforeEach(async () => {
    localStorage.clear();

    await TestBed.configureTestingModule({
      imports: [Reportes],
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(Reportes);
    http = TestBed.inject(HttpTestingController);
    campaniaActiva = TestBed.inject(CampaniaActivaService);
    campaniaActiva.establecer({ id: 1, nombre: '2025/26', estado: 'EN_CURSO' });
  });

  afterEach(() => http.verify());

  it('vista Resumen: muestra el desglose por rubro con porcentaje y la tabla por lote', async () => {
    fixture.autoDetectChanges();
    http.expectOne(`${environment.apiBaseUrl}/campanias/1/costos-por-rubro`).flush(COSTOS_POR_RUBRO);
    http.expectOne(`${environment.apiBaseUrl}/campanias?size=200&sort=id,desc`).flush(paginaDe(CAMPANIAS));
    await fixture.whenStable();

    const texto = fixture.nativeElement.textContent;
    expect(texto).toContain('Insumos');
    // En USD (default): 30 de 74 = 40.5%.
    expect(fixture.nativeElement.querySelector('.fila-rubro__pct')?.textContent).toContain('40.5');
    expect(texto).toContain('Lote Norte');
  });

  it('vista Comparativa: agrupa por cultivo las campañas seleccionadas', async () => {
    fixture.autoDetectChanges();
    http.expectOne(`${environment.apiBaseUrl}/campanias/1/costos-por-rubro`).flush(COSTOS_POR_RUBRO);
    http.expectOne(`${environment.apiBaseUrl}/campanias?size=200&sort=id,desc`).flush(paginaDe(CAMPANIAS));
    await fixture.whenStable();

    const botones: HTMLButtonElement[] = Array.from(fixture.nativeElement.querySelectorAll('.selector-modo__opcion'));
    botones.find((b) => b.textContent?.includes('Comparativa'))!.click();
    await fixture.whenStable();

    const checkboxes: HTMLInputElement[] = fixture.nativeElement.querySelectorAll('input[type="checkbox"]');
    expect(checkboxes.length).toBe(2);

    const compararBoton: HTMLButtonElement = fixture.nativeElement.querySelector('.panel__pie button');
    expect(compararBoton.disabled).toBe(true);

    checkboxes[0].checked = true;
    checkboxes[0].dispatchEvent(new Event('change'));
    checkboxes[1].checked = true;
    checkboxes[1].dispatchEvent(new Event('change'));
    await fixture.whenStable();

    expect(compararBoton.disabled).toBe(false);
    compararBoton.click();
    await fixture.whenStable();

    http.expectOne(`${environment.apiBaseUrl}/campanias/1/resumen`).flush(
      resumenDe(1, '2025/26', [resumenLote('Cebolla', 100000), resumenLote('Zapallo', 50000)]),
    );
    http.expectOne(`${environment.apiBaseUrl}/campanias/2/resumen`).flush(
      resumenDe(2, '2024/25', [resumenLote('Cebolla', 60000)]),
    );
    await fixture.whenStable();

    const texto = fixture.nativeElement.textContent;
    expect(texto).toContain('Cebolla');
    expect(texto).toContain('Zapallo');
    // Zapallo solo existe en 2025/26: la celda de 2024/25 queda vacía.
    const celdasVacias = fixture.nativeElement.querySelectorAll('.tabla-comparativa__celda--vacia');
    expect(celdasVacias.length).toBe(1);
  });
});
