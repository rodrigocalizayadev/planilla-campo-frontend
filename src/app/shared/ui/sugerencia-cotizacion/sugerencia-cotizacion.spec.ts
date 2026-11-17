import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { SugerenciaCotizacion } from './sugerencia-cotizacion';
import { sugerirTipoCambio } from '../../data/sugerencia-tipo-cambio';
import { hoyIso } from '../../utils/fecha-local';
import type { CotizacionResponse } from '../../../models';

const URL_COTIZACION = `${environment.apiBaseUrl}/cotizaciones/dolar`;

const COTIZACION_FIN_DE_SEMANA: CotizacionResponse = {
  fechaSolicitada: '2026-11-15',
  fechaCotizacion: '2026-11-13',
  valor: '1543.5000',
  fuente: 'BCRA',
};

/** Host mínimo: un "formulario" con fecha y tipo de cambio en signals. */
@Component({
  imports: [SugerenciaCotizacion],
  template: `<app-sugerencia-cotizacion [sugerencia]="sugerencia" />`,
})
class HostSugerencia {
  readonly fecha = signal<string | null>('2026-11-15');
  readonly tipoCambio = signal('1400.0000');
  readonly habilitada = signal(true);
  autocompletar = true;

  readonly sugerencia = sugerirTipoCambio({
    fecha: () => this.fecha(),
    valorActual: () => this.tipoCambio(),
    asignar: (valor) => this.tipoCambio.set(valor),
    autocompletar: () => this.autocompletar,
    habilitada: () => this.habilitada(),
  });
}

/** Host como los formularios reales: fecha y tipo de cambio en el mismo signal. */
@Component({
  imports: [SugerenciaCotizacion],
  template: `<app-sugerencia-cotizacion [sugerencia]="sugerencia" />`,
})
class HostModeloUnico {
  readonly modelo = signal({ fecha: '2026-11-15', tipoCambio: '1400.0000' });

  readonly sugerencia = sugerirTipoCambio({
    fecha: () => this.modelo().fecha,
    valorActual: () => this.modelo().tipoCambio,
    asignar: (valor) => this.modelo.update((actual) => ({ ...actual, tipoCambio: valor })),
  });
}

describe('sugerirTipoCambio + SugerenciaCotizacion', () => {
  let fixture: ComponentFixture<HostSugerencia>;
  let host: HostSugerencia;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostSugerencia],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HostSugerencia);
    host = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function texto(): string {
    return (fixture.nativeElement as HTMLElement).textContent?.replace(/\s+/g, ' ').trim() ?? '';
  }

  function botonUsar(): HTMLButtonElement | null {
    return fixture.nativeElement.querySelector('button');
  }

  async function responder(
    cotizacion: CotizacionResponse,
    fecha = cotizacion.fechaSolicitada,
  ): Promise<void> {
    TestBed.tick();
    http.expectOne(`${URL_COTIZACION}?fecha=${fecha}`).flush(cotizacion);
    await fixture.whenStable();
  }

  it('pide la cotización con la fecha del movimiento y autocompleta el campo sin tocar', async () => {
    fixture.autoDetectChanges();
    await responder(COTIZACION_FIN_DE_SEMANA);

    expect(host.tipoCambio()).toBe('1543.5000');
    expect(botonUsar()).toBeNull();
  });

  it('muestra la fecha real de la cotización en dd/MM/yyyy con el día correcto (UTC−3)', async () => {
    fixture.autoDetectChanges();
    await responder(COTIZACION_FIN_DE_SEMANA);

    expect(texto()).toContain('BCRA del 13/11/2026');
    expect(texto()).toContain('1.543,5000');
  });

  it('al cambiar la fecha vuelve a consultar y pisa el valor si el campo no se editó a mano', async () => {
    fixture.autoDetectChanges();
    await responder(COTIZACION_FIN_DE_SEMANA);

    host.fecha.set('2026-11-16');
    await responder({
      ...COTIZACION_FIN_DE_SEMANA,
      fechaSolicitada: '2026-11-16',
      fechaCotizacion: '2026-11-16',
      valor: '1551.0000',
    });

    expect(host.tipoCambio()).toBe('1551.0000');
  });

  it('no pisa un tipo de cambio editado a mano: ofrece el botón "Usar" y lo aplica al tocarlo', async () => {
    fixture.autoDetectChanges();
    await responder(COTIZACION_FIN_DE_SEMANA);

    host.tipoCambio.set('1600.0000');
    host.fecha.set('2026-11-16');
    await responder({
      ...COTIZACION_FIN_DE_SEMANA,
      fechaSolicitada: '2026-11-16',
      fechaCotizacion: '2026-11-16',
      valor: '1551.0000',
    });

    expect(host.tipoCambio()).toBe('1600.0000');
    expect(botonUsar()?.textContent).toContain('Usar');

    botonUsar()!.click();
    await fixture.whenStable();

    expect(host.tipoCambio()).toBe('1551.0000');
    expect(botonUsar()).toBeNull();
  });

  it('no muestra el botón cuando el valor editado coincide numéricamente con la sugerencia', async () => {
    fixture.autoDetectChanges();
    await responder(COTIZACION_FIN_DE_SEMANA);

    host.tipoCambio.set('1543.5');
    await fixture.whenStable();

    expect(botonUsar()).toBeNull();
  });

  it('con fecha null pide la cotización de hoy, sin query param', async () => {
    host.fecha.set(null);
    fixture.autoDetectChanges();
    TestBed.tick();

    http
      .expectOne(URL_COTIZACION)
      .flush({ ...COTIZACION_FIN_DE_SEMANA, fechaSolicitada: hoyIso() });
    await fixture.whenStable();

    expect(host.tipoCambio()).toBe('1543.5000');
  });

  it('con una fecha futura no consulta al backend y avisa', async () => {
    host.fecha.set('2999-01-01');
    fixture.autoDetectChanges();
    await fixture.whenStable();

    http.expectNone((req) => req.url.startsWith(URL_COTIZACION));
    expect(texto()).toContain('No hay cotización del BCRA para una fecha futura');
    expect(host.tipoCambio()).toBe('1400.0000');
  });

  it('si el BCRA no está disponible (503) avisa y deja el campo como estaba, editable a mano', async () => {
    fixture.autoDetectChanges();
    TestBed.tick();

    http
      .expectOne(`${URL_COTIZACION}?fecha=2026-11-15`)
      .flush(
        { status: 503, code: 'COTIZACION_NO_DISPONIBLE', message: 'No disponible', details: [] },
        { status: 503, statusText: 'Service Unavailable' },
      );
    await fixture.whenStable();

    expect(texto()).toContain('No se pudo obtener la cotización del BCRA');
    expect(host.tipoCambio()).toBe('1400.0000');
  });

  it('sin autocompletar solo ofrece el botón, sin tocar el valor existente', async () => {
    host.autocompletar = false;
    fixture.autoDetectChanges();
    await responder(COTIZACION_FIN_DE_SEMANA);

    expect(host.tipoCambio()).toBe('1400.0000');
    expect(botonUsar()).not.toBeNull();
  });

  it('deshabilitada no consulta ni muestra nada', async () => {
    host.habilitada.set(false);
    fixture.autoDetectChanges();
    await fixture.whenStable();

    http.expectNone((req) => req.url.startsWith(URL_COTIZACION));
    expect(texto()).toBe('');
  });

  it('con fecha y tipo de cambio en el mismo modelo, autocompletar no vuelve a pedir la cotización', async () => {
    host.habilitada.set(false);
    const fixtureUnico = TestBed.createComponent(HostModeloUnico);
    fixtureUnico.autoDetectChanges();
    TestBed.tick();
    http.expectOne(`${URL_COTIZACION}?fecha=2026-11-15`).flush(COTIZACION_FIN_DE_SEMANA);
    await fixtureUnico.whenStable();
    TestBed.tick();

    http.expectNone((req) => req.url.startsWith(URL_COTIZACION));
    expect(fixtureUnico.componentInstance.modelo().tipoCambio).toBe('1543.5000');
  });
});
