import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../../environments/environment';
import { InsumosListado } from './insumos-listado';
import { EnumsService } from '../../../core/enums/enums.service';
import type { Insumo, PaginaResponse } from '../../../models';

const URL_ACTIVOS = `${environment.apiBaseUrl}/insumos?page=0&size=20&activo=true`;

const TIPOS = [
  { valor: 'FERTILIZANTE', etiqueta: 'Fertilizante' },
  { valor: 'SEMILLA', etiqueta: 'Semilla' },
];
const enumsStub = {
  opciones: (clave: string) => (clave === 'tipoInsumo' ? TIPOS : []),
  etiqueta: (_clave: string, valor: string) => TIPOS.find((t) => t.valor === valor)?.etiqueta ?? valor,
};

function paginaDe(insumos: Insumo[]): PaginaResponse<Insumo> {
  return {
    content: insumos,
    page: { size: 200, number: 0, totalElements: insumos.length, totalPages: 1 },
  };
}

const UREA: Insumo = {
  id: 1,
  nombre: 'Urea granulada',
  tipo: 'FERTILIZANTE',
  unidadMedida: 'KG',
  precioReferencia: { importe: '900', moneda: 'ARS', tipoCambio: '1350' },
  activo: true,
};

describe('InsumosListado', () => {
  let fixture: ComponentFixture<InsumosListado>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InsumosListado],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: EnumsService, useValue: enumsStub },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(InsumosListado);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('el filtro por tipo agrega el parámetro tipo a la solicitud', async () => {
    fixture.autoDetectChanges();
    http.expectOne(URL_ACTIVOS).flush(paginaDe([UREA]));
    await fixture.whenStable();

    const select: HTMLSelectElement = fixture.nativeElement.querySelector('.catalogo__filtro');
    select.value = 'FERTILIZANTE';
    select.dispatchEvent(new Event('change'));
    TestBed.flushEffects();

    http
      .expectOne(`${environment.apiBaseUrl}/insumos?page=0&size=20&activo=true&tipo=FERTILIZANTE`)
      .flush(paginaDe([UREA]));
    await fixture.whenStable();

    const filas = fixture.nativeElement.querySelectorAll('button.fila-catalogo');
    expect(filas.length).toBe(1);
  });

  it('sin resultados por el filtro de tipo muestra el mensaje específico', async () => {
    fixture.autoDetectChanges();
    http.expectOne(URL_ACTIVOS).flush(paginaDe([UREA]));
    await fixture.whenStable();

    const select: HTMLSelectElement = fixture.nativeElement.querySelector('.catalogo__filtro');
    select.value = 'SEMILLA';
    select.dispatchEvent(new Event('change'));
    TestBed.flushEffects();

    http
      .expectOne(`${environment.apiBaseUrl}/insumos?page=0&size=20&activo=true&tipo=SEMILLA`)
      .flush(paginaDe([]));
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('.catalogo__vacio')?.textContent).toContain(
      'No hay insumos de tipo Semilla.',
    );
  });

  it('dar de baja pide confirmación antes de llamar a la API', async () => {
    fixture.autoDetectChanges();
    http.expectOne(URL_ACTIVOS).flush(paginaDe([UREA]));
    await fixture.whenStable();

    const botonBaja: HTMLButtonElement = fixture.nativeElement.querySelector('.boton-baja');
    botonBaja.click();
    await fixture.whenStable();

    const dialogo = fixture.nativeElement.querySelector('.confirmar-caja');
    expect(dialogo?.textContent).toContain('Urea granulada');
    http.expectNone(`${environment.apiBaseUrl}/insumos/1`);

    const confirmar: HTMLButtonElement = dialogo.querySelector('.boton-baja');
    confirmar.click();
    // El DELETE se resuelve síncrono acá (HttpTestingController), y su next() dispara
    // recurso.reload() en el momento: hay que flushear esa request de reload también
    // antes de esperar whenStable(), o el test cuelga (mismo patrón documentado en
    // docs/resumen-slices.md, slice 2, y en costos-indirectos-listado).
    http.expectOne(`${environment.apiBaseUrl}/insumos/1`).flush(null);
    TestBed.flushEffects();
    http.expectOne(URL_ACTIVOS).flush(paginaDe([]));
    await fixture.whenStable();
  });

  it('cancelar la confirmación de baja no llama a la API', async () => {
    fixture.autoDetectChanges();
    http.expectOne(URL_ACTIVOS).flush(paginaDe([UREA]));
    await fixture.whenStable();

    const botonBaja: HTMLButtonElement = fixture.nativeElement.querySelector('.boton-baja');
    botonBaja.click();
    await fixture.whenStable();

    const cancelar: HTMLButtonElement = fixture.nativeElement.querySelector(
      '.confirmar-caja .boton-secundario',
    );
    cancelar.click();
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('.confirmar-caja')).toBeFalsy();
    http.expectNone(`${environment.apiBaseUrl}/insumos/1`);
  });
});
