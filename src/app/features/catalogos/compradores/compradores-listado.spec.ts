import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../../environments/environment';
import { CompradoresListado } from './compradores-listado';
import { EnumsService } from '../../../core/enums/enums.service';
import type { Comprador, PaginaResponse } from '../../../models';

const URL_ACTIVOS = `${environment.apiBaseUrl}/compradores?page=0&size=20&activo=true`;
const enumsStub = { opciones: () => [], etiqueta: (_c: string, v: string) => v };

function paginaDe(compradores: Comprador[]): PaginaResponse<Comprador> {
  return {
    content: compradores,
    page: { size: 200, number: 0, totalElements: compradores.length, totalPages: 1 },
  };
}

const COMPRADOR: Comprador = {
  id: 1,
  nombre: 'Distribuidora San Jorge',
  cuit: '30-52341180-4',
  contacto: 'Hugo Sánchez',
  telefono: '2622 44-1180',
  localidad: 'San Rafael',
  modalidadHabitual: 'PRECIO_CERRADO',
  activo: true,
};

describe('CompradoresListado', () => {
  let fixture: ComponentFixture<CompradoresListado>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CompradoresListado],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: EnumsService, useValue: enumsStub },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CompradoresListado);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lista los compradores activos', async () => {
    fixture.autoDetectChanges();
    http.expectOne(URL_ACTIVOS).flush(paginaDe([COMPRADOR]));
    await fixture.whenStable();

    const fila = fixture.nativeElement.querySelector('.fila-catalogo');
    expect(fila.textContent).toContain('Distribuidora San Jorge');
    expect(fila.textContent).toContain('CUIT 30-52341180-4');
  });

  it('clickear una fila abre el formulario en modo edición', async () => {
    fixture.autoDetectChanges();
    http.expectOne(URL_ACTIVOS).flush(paginaDe([COMPRADOR]));
    await fixture.whenStable();

    const fila: HTMLButtonElement = fixture.nativeElement.querySelector('.fila-catalogo');
    fila.click();
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('.modal-caja__titulo')?.textContent).toContain(
      'Editar comprador',
    );
  });

  it('dar de baja pide confirmación antes de llamar a la API', async () => {
    fixture.autoDetectChanges();
    http.expectOne(URL_ACTIVOS).flush(paginaDe([COMPRADOR]));
    await fixture.whenStable();

    const botonBaja: HTMLButtonElement = fixture.nativeElement.querySelector('.boton-baja');
    botonBaja.click();
    await fixture.whenStable();

    const dialogo = fixture.nativeElement.querySelector('.confirmar-caja');
    expect(dialogo?.textContent).toContain('Distribuidora San Jorge');
    http.expectNone(`${environment.apiBaseUrl}/compradores/1`);

    const confirmar: HTMLButtonElement = dialogo.querySelector('.boton-baja');
    confirmar.click();
    // El DELETE se resuelve síncrono acá (HttpTestingController), y su next() dispara
    // recurso.reload() en el momento: hay que flushear esa request de reload también
    // antes de esperar whenStable(), o el test cuelga (mismo patrón documentado en
    // docs/resumen-slices.md, slice 2, y en costos-indirectos-listado).
    http.expectOne(`${environment.apiBaseUrl}/compradores/1`).flush(null);
    TestBed.flushEffects();
    http.expectOne(URL_ACTIVOS).flush(paginaDe([]));
    await fixture.whenStable();
  });

  it('cancelar la confirmación de baja no llama a la API', async () => {
    fixture.autoDetectChanges();
    http.expectOne(URL_ACTIVOS).flush(paginaDe([COMPRADOR]));
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
    http.expectNone(`${environment.apiBaseUrl}/compradores/1`);
  });
});
