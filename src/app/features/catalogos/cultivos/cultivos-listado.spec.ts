import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../../environments/environment';
import { CultivosListado } from './cultivos-listado';
import { EnumsService } from '../../../core/enums/enums.service';
import type { Cultivo, PaginaResponse } from '../../../models';

const URL_ACTIVOS = `${environment.apiBaseUrl}/cultivos?page=0&size=20&activo=true`;

const enumsStub = { opciones: () => [], etiqueta: (_c: string, v: string) => v };

function paginaDe(cultivos: Cultivo[]): PaginaResponse<Cultivo> {
  return {
    content: cultivos,
    page: { size: 200, number: 0, totalElements: cultivos.length, totalPages: 1 },
  };
}

const CULTIVO: Cultivo = {
  id: 1,
  nombre: 'Cebolla',
  unidadProduccionDefault: 'BOLSA',
  nombreSingular: 'bolsa',
  nombrePlural: 'bolsas',
  kgPorUnidad: '20',
  precioReferenciaPrimera: { importe: '9000', moneda: 'ARS' },
  precioReferenciaSegunda: { importe: '4500', moneda: 'ARS' },
  activo: true,
};

describe('CultivosListado', () => {
  let fixture: ComponentFixture<CultivosListado>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CultivosListado],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: EnumsService, useValue: enumsStub },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CultivosListado);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lista los cultivos activos con su precio de referencia', async () => {
    fixture.autoDetectChanges();
    http.expectOne(URL_ACTIVOS).flush(paginaDe([CULTIVO]));
    await fixture.whenStable();

    const fila = fixture.nativeElement.querySelector('.fila-catalogo');
    expect(fila.textContent).toContain('Cebolla');
    expect(fila.textContent).toContain('Se mide en bolsas');
  });

  it('clickear una fila abre el formulario en modo edición', async () => {
    fixture.autoDetectChanges();
    http.expectOne(URL_ACTIVOS).flush(paginaDe([CULTIVO]));
    await fixture.whenStable();

    const fila: HTMLButtonElement = fixture.nativeElement.querySelector('.fila-catalogo');
    fila.click();
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('.modal-caja__titulo')?.textContent).toContain(
      'Editar cultivo',
    );
  });

  it('dar de baja pide confirmación antes de llamar a la API', async () => {
    fixture.autoDetectChanges();
    http.expectOne(URL_ACTIVOS).flush(paginaDe([CULTIVO]));
    await fixture.whenStable();

    const botonBaja: HTMLButtonElement = fixture.nativeElement.querySelector('.boton-baja');
    botonBaja.click();
    await fixture.whenStable();

    const dialogo = fixture.nativeElement.querySelector('.confirmar-caja');
    expect(dialogo?.textContent).toContain('Cebolla');
    http.expectNone(`${environment.apiBaseUrl}/cultivos/1`);

    const confirmar: HTMLButtonElement = dialogo.querySelector('.boton-baja');
    confirmar.click();
    // El DELETE se resuelve síncrono acá (HttpTestingController), y su next() dispara
    // recurso.reload() en el momento: hay que flushear esa request de reload también
    // antes de esperar whenStable(), o el test cuelga (mismo patrón documentado en
    // docs/resumen-slices.md, slice 2, y en costos-indirectos-listado).
    http.expectOne(`${environment.apiBaseUrl}/cultivos/1`).flush(null);
    TestBed.flushEffects();
    http.expectOne(URL_ACTIVOS).flush(paginaDe([]));
    await fixture.whenStable();
  });

  it('cancelar la confirmación de baja no llama a la API', async () => {
    fixture.autoDetectChanges();
    http.expectOne(URL_ACTIVOS).flush(paginaDe([CULTIVO]));
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
    http.expectNone(`${environment.apiBaseUrl}/cultivos/1`);
  });
});
