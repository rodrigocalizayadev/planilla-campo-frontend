import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../../environments/environment';
import { LotesListado } from './lotes-listado';
import type { Lote, PaginaResponse } from '../../../models';

// La URL se arma a mano con URLSearchParams (no con el `params:` de HttpClient), así
// que el query string queda en `request.url`, no en `request.params`.
const URL_ACTIVOS = `${environment.apiBaseUrl}/lotes?page=0&size=20&activo=true`;
const URL_TODOS = `${environment.apiBaseUrl}/lotes?page=0&size=20`;

function paginaDe(lotes: Lote[]): PaginaResponse<Lote> {
  return {
    content: lotes,
    page: { size: 200, number: 0, totalElements: lotes.length, totalPages: 1 },
  };
}

const LOTE_ACTIVO: Lote = {
  id: 1,
  nombre: 'Lote 1',
  superficieHa: '8.50',
  tipoSuelo: 'Franco',
  comentarios: null,
  activo: true,
};

const LOTE_BAJA: Lote = {
  id: 2,
  nombre: 'Lote 2',
  superficieHa: '3.50',
  tipoSuelo: 'Franco-arenoso',
  comentarios: null,
  activo: false,
};

describe('LotesListado', () => {
  let fixture: ComponentFixture<LotesListado>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LotesListado],
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(LotesListado);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('pide solo lotes activos por defecto', async () => {
    fixture.autoDetectChanges();

    http.expectOne(URL_ACTIVOS).flush(paginaDe([LOTE_ACTIVO]));
    await fixture.whenStable();

    const filas = fixture.nativeElement.querySelectorAll('.fila-catalogo');
    expect(filas.length).toBe(1);
    expect(filas[0].textContent).toContain('Lote 1');
  });

  it('al activar "ver dados de baja" pide todos y marca los inactivos', async () => {
    fixture.autoDetectChanges();
    http.expectOne(URL_ACTIVOS).flush(paginaDe([LOTE_ACTIVO]));
    await fixture.whenStable();

    const toggle: HTMLButtonElement = fixture.nativeElement.querySelector('.chip-toggle');
    toggle.click();
    TestBed.flushEffects();

    http.expectOne(URL_TODOS).flush(paginaDe([LOTE_ACTIVO, LOTE_BAJA]));
    await fixture.whenStable();

    const chipBaja = fixture.nativeElement.querySelector('.chip-baja');
    expect(chipBaja).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Ocultar dados de baja');
  });

  it('clickear una fila abre el formulario en modo edición', async () => {
    fixture.autoDetectChanges();
    http.expectOne(URL_ACTIVOS).flush(paginaDe([LOTE_ACTIVO]));
    await fixture.whenStable();

    const fila: HTMLButtonElement = fixture.nativeElement.querySelector('.fila-catalogo');
    fila.click();
    await fixture.whenStable();

    const titulo = fixture.nativeElement.querySelector('.modal-caja__titulo');
    expect(titulo?.textContent).toContain('Editar lote');
  });

  it('muestra el estado vacío cuando no hay lotes activos', async () => {
    fixture.autoDetectChanges();
    http.expectOne(URL_ACTIVOS).flush(paginaDe([]));
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('.catalogo__vacio')?.textContent).toContain(
      'Sin lotes activos',
    );
  });

  it('dar de baja pide confirmación antes de llamar a la API', async () => {
    fixture.autoDetectChanges();
    http.expectOne(URL_ACTIVOS).flush(paginaDe([LOTE_ACTIVO]));
    await fixture.whenStable();

    const botonBaja: HTMLButtonElement = fixture.nativeElement.querySelector('.boton-baja');
    botonBaja.click();
    await fixture.whenStable();

    const dialogo = fixture.nativeElement.querySelector('.confirmar-caja');
    expect(dialogo?.textContent).toContain('Lote 1');
    http.expectNone(`${environment.apiBaseUrl}/lotes/1`);

    const confirmar: HTMLButtonElement = dialogo.querySelector('.boton-baja');
    confirmar.click();
    // El DELETE se resuelve síncrono acá (HttpTestingController), y su next() dispara
    // recurso.reload() en el momento: hay que flushear esa request de reload también
    // antes de esperar whenStable(), o el test cuelga (mismo patrón documentado en
    // docs/resumen-slices.md, slice 2, y en costos-indirectos-listado).
    http.expectOne(`${environment.apiBaseUrl}/lotes/1`).flush(null);
    TestBed.flushEffects();
    http.expectOne(URL_ACTIVOS).flush(paginaDe([]));
    await fixture.whenStable();
  });

  it('cancelar la confirmación de baja no llama a la API', async () => {
    fixture.autoDetectChanges();
    http.expectOne(URL_ACTIVOS).flush(paginaDe([LOTE_ACTIVO]));
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
    http.expectNone(`${environment.apiBaseUrl}/lotes/1`);
  });

  it('reactivar un lote dado de baja llama a la API directo, sin confirmación', async () => {
    fixture.autoDetectChanges();
    http.expectOne(URL_ACTIVOS).flush(paginaDe([LOTE_ACTIVO]));
    await fixture.whenStable();

    const toggle: HTMLButtonElement = fixture.nativeElement.querySelector('.chip-toggle');
    toggle.click();
    TestBed.flushEffects();
    http.expectOne(URL_TODOS).flush(paginaDe([LOTE_ACTIVO, LOTE_BAJA]));
    await fixture.whenStable();

    const botonReactivar: HTMLButtonElement = fixture.nativeElement.querySelector('.boton-reactivar');
    botonReactivar.click();

    expect(fixture.nativeElement.querySelector('.confirmar-caja')).toBeFalsy();
    http.expectOne(`${environment.apiBaseUrl}/lotes/2/reactivar`).flush(LOTE_BAJA);
    TestBed.flushEffects();
    http.expectOne(URL_TODOS).flush(paginaDe([LOTE_ACTIVO, { ...LOTE_BAJA, activo: true }]));
    await fixture.whenStable();
  });
});
