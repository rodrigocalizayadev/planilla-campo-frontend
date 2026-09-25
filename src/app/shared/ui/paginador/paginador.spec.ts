import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Paginador } from './paginador';

describe('Paginador', () => {
  let fixture: ComponentFixture<Paginador>;

  async function crear(pagina: number, totalPaginas: number) {
    await TestBed.configureTestingModule({
      imports: [Paginador],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();
    fixture = TestBed.createComponent(Paginador);
    fixture.componentRef.setInput('pagina', pagina);
    fixture.componentRef.setInput('totalPaginas', totalPaginas);
    fixture.autoDetectChanges();
    await fixture.whenStable();
  }

  it('no renderiza nada si todo entra en una sola página', async () => {
    await crear(0, 1);
    expect(fixture.nativeElement.querySelector('.paginador')).toBeFalsy();
  });

  it('deshabilita "Anterior" en la primera página y "Siguiente" en la última', async () => {
    await crear(0, 3);
    const [anterior, siguiente]: HTMLButtonElement[] = fixture.nativeElement.querySelectorAll(
      '.paginador__boton',
    );
    expect(anterior.disabled).toBe(true);
    expect(siguiente.disabled).toBe(false);

    fixture.componentRef.setInput('pagina', 2);
    await fixture.whenStable();
    expect(anterior.disabled).toBe(false);
    expect(siguiente.disabled).toBe(true);
  });

  it('clickear "Siguiente" emite la página siguiente', async () => {
    await crear(0, 3);
    let emitido: number | undefined;
    fixture.componentInstance.cambiarPagina.subscribe((p) => (emitido = p));

    const [, siguiente]: HTMLButtonElement[] = fixture.nativeElement.querySelectorAll('.paginador__boton');
    siguiente.click();
    expect(emitido).toBe(1);
  });

  it('muestra "Página X de Y"', async () => {
    await crear(1, 3);
    expect(fixture.nativeElement.querySelector('.paginador__info').textContent).toContain('2');
    expect(fixture.nativeElement.querySelector('.paginador__info').textContent).toContain('3');
  });

  it('con totalElementos muestra el total aunque entre todo en una sola página', async () => {
    await crear(0, 1);
    fixture.componentRef.setInput('totalElementos', 7);
    fixture.componentRef.setInput('etiqueta', 'insumos');
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('.paginador__total')?.textContent).toContain('7');
    expect(fixture.nativeElement.querySelector('.paginador__total')?.textContent).toContain('insumos');
    // Con una sola página no hay botones de navegación, solo el total.
    expect(fixture.nativeElement.querySelector('.paginador__nav')).toBeFalsy();
  });

  it('con totalElementos y varias páginas muestra el total junto a la navegación', async () => {
    await crear(0, 3);
    fixture.componentRef.setInput('totalElementos', 55);
    fixture.componentRef.setInput('etiqueta', 'lotes');
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('.paginador__total')?.textContent).toContain('55');
    expect(fixture.nativeElement.querySelector('.paginador__nav')).toBeTruthy();
  });
});
