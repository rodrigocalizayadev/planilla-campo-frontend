import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { environment } from '../../../environments/environment';
import { SembrarLoteForm } from './sembrar-lote-form';
import { LoteCampaniaService } from '../lote-campania/lote-campania.service';
import { EnumsService } from '../../core/enums/enums.service';
import { AvisoService } from '../../shared/ui/aviso/aviso.service';
import type { Cultivo, ErrorResponse, Lote, LoteCampania, PaginaResponse, ValorEnum } from '../../models';

const OPCIONES_UNIDAD: ValorEnum[] = [
  { valor: 'BOLSA', etiqueta: 'bolsa' },
  { valor: 'BIN', etiqueta: 'bin' },
];

const enumsStub = {
  opciones: (clave: string) => (clave === 'unidadProduccion' ? OPCIONES_UNIDAD : []),
  etiqueta: (_clave: string, valor: string) => valor,
};

const LOTE: Lote = {
  id: 6,
  nombre: 'Lote Norte',
  superficieHa: '3.30',
  tipoSuelo: '',
  comentarios: null,
  activo: true,
};

const CULTIVO: Cultivo = {
  id: 8,
  nombre: 'Cebolla Monto',
  unidadProduccionDefault: 'BOLSA',
  nombreSingular: 'bolsa',
  nombrePlural: 'bolsas',
  kgPorUnidad: null,
  precioReferenciaPrimera: null,
  precioReferenciaSegunda: null,
  activo: true,
};

const LOTE_CAMPANIA: LoteCampania = {
  id: 4,
  campaniaId: 1,
  loteId: 6,
  loteNombre: 'Lote Norte',
  cultivoId: 8,
  cultivoNombre: 'Cebolla Monto',
  variedad: null,
  ciclo: 1,
  superficieSembradaHa: '2',
  unidadProduccion: 'BOLSA',
  fechaSiembra: null,
  fechaTrasplante: null,
  fechaCosechaEsperada: null,
  comentarios: null,
  createdAt: '2026-08-01T00:00:00Z',
  updatedAt: '2026-08-01T00:00:00Z',
};

function paginaDe<T>(items: T[]): PaginaResponse<T> {
  return {
    content: items,
    page: { size: 200, number: 0, totalElements: items.length, totalPages: 1 },
  };
}

describe('SembrarLoteForm', () => {
  let fixture: ComponentFixture<SembrarLoteForm>;
  let http: HttpTestingController;
  let loteCampaniaService: { crear: ReturnType<typeof vi.fn> };
  let aviso: AvisoService;

  beforeEach(async () => {
    loteCampaniaService = { crear: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [SembrarLoteForm],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: LoteCampaniaService, useValue: loteCampaniaService },
        { provide: EnumsService, useValue: enumsStub },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SembrarLoteForm);
    fixture.componentRef.setInput('campaniaId', 1);
    http = TestBed.inject(HttpTestingController);
    aviso = TestBed.inject(AvisoService);
    vi.spyOn(aviso, 'mostrar');
  });

  afterEach(() => http.verify());

  function cargarOpciones(lotes: Lote[] = [LOTE], cultivos: Cultivo[] = [CULTIVO]): void {
    fixture.autoDetectChanges();
    http.expectOne(`${environment.apiBaseUrl}/lotes?activo=true&size=200`).flush(paginaDe(lotes));
    http.expectOne(`${environment.apiBaseUrl}/cultivos?activo=true&size=200`).flush(paginaDe(cultivos));
  }

  function seleccionar(select: HTMLSelectElement, valor: string): void {
    // [formField] sincroniza con el evento 'input' (confirmado en insumo-form.spec.ts),
    // pero onCambioCultivo() está enganchado a (change) — un navegador real dispara los
    // dos al elegir una opción, así que el test también dispara los dos.
    select.value = valor;
    select.dispatchEvent(new Event('input'));
    select.dispatchEvent(new Event('change'));
  }

  function completarCampo(selector: string, valor: string): void {
    const input: HTMLInputElement = fixture.nativeElement.querySelector(selector);
    input.value = valor;
    input.dispatchEvent(new Event('input'));
  }

  function enviarFormulario(): void {
    const formulario: HTMLFormElement = fixture.nativeElement.querySelector('form');
    formulario.dispatchEvent(new Event('submit', { cancelable: true }));
  }

  it('carga los lotes y cultivos activos para elegir', async () => {
    cargarOpciones();
    await fixture.whenStable();

    const [selectLote, selectCultivo]: HTMLSelectElement[] = fixture.nativeElement.querySelectorAll('select');
    expect(selectLote.textContent).toContain('Lote Norte');
    expect(selectCultivo.textContent).toContain('Cebolla Monto');
  });

  it('al elegir un cultivo autocompleta la unidad de producción', async () => {
    cargarOpciones();
    await fixture.whenStable();

    const [, selectCultivo, selectUnidad]: HTMLSelectElement[] = fixture.nativeElement.querySelectorAll('select');
    seleccionar(selectCultivo, '8');
    await fixture.whenStable();

    expect(selectUnidad.value).toBe('BOLSA');
  });

  it('si el lote y cultivo elegidos ya se sembraron antes, avisa qué ciclo va a quedar', async () => {
    fixture.componentRef.setInput('existentes', [{ ...LOTE_CAMPANIA, loteId: 6, cultivoId: 8, ciclo: 1 }]);
    cargarOpciones();
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('.aviso-ciclo')).toBeNull();

    const [selectLote, selectCultivo]: HTMLSelectElement[] = fixture.nativeElement.querySelectorAll('select');
    seleccionar(selectLote, '6');
    seleccionar(selectCultivo, '8');
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('.aviso-ciclo')?.textContent).toContain(
      'esta va a quedar como ciclo 2',
    );
  });

  it('no deja sembrar con una superficie mayor a la del lote elegido', async () => {
    cargarOpciones();
    await fixture.whenStable();

    const [selectLote]: HTMLSelectElement[] = fixture.nativeElement.querySelectorAll('select');
    seleccionar(selectLote, '6');
    completarCampo('input[inputmode="decimal"]', '10');
    await fixture.whenStable();

    enviarFormulario();
    await fixture.whenStable();

    expect(loteCampaniaService.crear).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('No puede superar la superficie del lote');
  });

  it('con datos válidos arma el payload y siembra el lote, sin mencionar ciclo cuando es el primero', async () => {
    loteCampaniaService.crear.mockReturnValue(of(LOTE_CAMPANIA));
    cargarOpciones();
    await fixture.whenStable();

    const [selectLote, selectCultivo]: HTMLSelectElement[] = fixture.nativeElement.querySelectorAll('select');
    seleccionar(selectLote, '6');
    seleccionar(selectCultivo, '8');
    completarCampo('input[inputmode="decimal"]', '2');
    await fixture.whenStable();

    enviarFormulario();
    await fixture.whenStable();

    expect(loteCampaniaService.crear).toHaveBeenCalledWith(1, {
      loteId: 6,
      cultivoId: 8,
      variedad: null,
      superficieSembradaHa: '2',
      unidadProduccion: 'BOLSA',
      fechaSiembra: null,
      fechaTrasplante: null,
      fechaCosechaEsperada: null,
      comentarios: null,
    });
    expect(aviso.mostrar).toHaveBeenCalledWith('Lote Norte sembrado con Cebolla Monto');
  });

  it('si es una segunda siembra del mismo lote, el aviso menciona el ciclo', async () => {
    loteCampaniaService.crear.mockReturnValue(of({ ...LOTE_CAMPANIA, ciclo: 2 }));
    cargarOpciones();
    await fixture.whenStable();

    const [selectLote, selectCultivo]: HTMLSelectElement[] = fixture.nativeElement.querySelectorAll('select');
    seleccionar(selectLote, '6');
    seleccionar(selectCultivo, '8');
    completarCampo('input[inputmode="decimal"]', '2');
    await fixture.whenStable();

    enviarFormulario();
    await fixture.whenStable();

    expect(aviso.mostrar).toHaveBeenCalledWith('Lote Norte sembrado con Cebolla Monto (ciclo 2)');
  });

  it('muestra el error del servidor en el toast rojo si sembrar falla', async () => {
    const error: ErrorResponse = {
      timestamp: new Date().toISOString(),
      status: 422,
      code: 'SUPERFICIE_EXCEDIDA',
      message: 'La superficie sembrada (2 ha) no puede superar la superficie del lote (1.5 ha)',
      details: [],
    };
    loteCampaniaService.crear.mockReturnValue(throwError(() => error));
    cargarOpciones();
    await fixture.whenStable();

    const [selectLote, selectCultivo]: HTMLSelectElement[] = fixture.nativeElement.querySelectorAll('select');
    seleccionar(selectLote, '6');
    seleccionar(selectCultivo, '8');
    completarCampo('input[inputmode="decimal"]', '2');
    await fixture.whenStable();

    enviarFormulario();
    await fixture.whenStable();

    expect(aviso.mostrar).toHaveBeenCalledWith(
      'La superficie sembrada (2 ha) no puede superar la superficie del lote (1.5 ha)',
      'error',
    );
  });
});
