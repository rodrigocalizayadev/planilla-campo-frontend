import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CompradorSaldoPanel } from './comprador-saldo';
import { EnumsService } from '../../../core/enums/enums.service';
import { environment } from '../../../../environments/environment';
import type { CompradorSaldo } from '../../../models';

const ETIQUETAS: Record<string, Record<string, string>> = {
  calidad: { PRIMERA: 'Primera' },
  unidadProduccion: { BOLSA: 'bolsas' },
};
const enumsStub = {
  opciones: () => [],
  etiqueta: (clave: string, valor: string) => ETIQUETAS[clave]?.[valor] ?? valor,
};

const SALDO: CompradorSaldo = {
  compradorId: 2,
  compradorNombre: 'Acopiador Central',
  saldoCobrarArs: '700000.00',
  pendientesLiquidar: [
    { cultivoId: 1, cultivoNombre: 'Cebolla', calidad: 'PRIMERA', unidad: 'BOLSA', cantidadPendiente: '50.00' },
  ],
};

describe('CompradorSaldoPanel', () => {
  let fixture: ComponentFixture<CompradorSaldoPanel>;
  let http: HttpTestingController;
  const URL = `${environment.apiBaseUrl}/compradores/2/saldo`;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CompradorSaldoPanel],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: EnumsService, useValue: enumsStub },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CompradorSaldoPanel);
    fixture.componentRef.setInput('compradorId', 2);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('mientras carga, avisa que está cargando el saldo', async () => {
    fixture.autoDetectChanges();
    await Promise.resolve();

    expect(fixture.nativeElement.textContent).toContain('Cargando saldo');
    http.expectOne(URL).flush(SALDO);
  });

  it('muestra "A cobrar (ARS)" y "Unidades sin liquidar" como dos bloques separados', async () => {
    fixture.autoDetectChanges();
    http.expectOne(URL).flush(SALDO);
    await fixture.whenStable();

    const bloques = fixture.nativeElement.querySelectorAll('.saldo-comprador__bloque');
    expect(bloques.length).toBe(2);
    expect(bloques[0].textContent).toContain('A cobrar (ARS)');
    expect(bloques[0].textContent).toContain('700.000,00');
    expect(bloques[1].textContent).toContain('Unidades sin liquidar');
    expect(bloques[1].textContent).toContain('Cebolla · Primera');
    expect(bloques[1].textContent).toContain('50 bolsas');
  });

  it('no suma ni valúa las unidades: el bloque de unidades no muestra ningún importe', async () => {
    fixture.autoDetectChanges();
    http.expectOne(URL).flush(SALDO);
    await fixture.whenStable();

    const bloqueUnidades: HTMLElement = fixture.nativeElement.querySelectorAll('.saldo-comprador__bloque')[1];
    expect(bloqueUnidades.textContent).not.toContain('$');
  });

  it('sin unidades pendientes dice "Nada pendiente"', async () => {
    fixture.autoDetectChanges();
    http.expectOne(URL).flush({ ...SALDO, pendientesLiquidar: [] });
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelectorAll('.saldo-comprador__bloque')[1].textContent).toContain(
      'Nada pendiente',
    );
  });

  it('si el saldo no se pudo cargar, lo avisa', async () => {
    fixture.autoDetectChanges();
    http.expectOne(URL).flush(
      { code: 'COMPRADOR_NO_ENCONTRADO', message: 'No existe el comprador' },
      { status: 422, statusText: 'Unprocessable Entity' },
    );
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('No se pudo cargar el saldo');
  });
});
