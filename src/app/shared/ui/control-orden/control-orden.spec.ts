import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ControlOrden } from './control-orden';

describe('ControlOrden', () => {
  let fixture: ComponentFixture<ControlOrden>;

  async function crear(opciones: { valor: string; etiqueta: string }[]) {
    await TestBed.configureTestingModule({
      imports: [ControlOrden],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();
    fixture = TestBed.createComponent(ControlOrden);
    fixture.componentRef.setInput('opciones', opciones);
    fixture.autoDetectChanges();
    await fixture.whenStable();
  }

  it('con una sola opción no muestra el <select>, solo el botón de dirección', async () => {
    await crear([{ valor: 'fecha', etiqueta: 'Fecha' }]);
    expect(fixture.nativeElement.querySelector('select')).toBeFalsy();
    const boton: HTMLButtonElement = fixture.nativeElement.querySelector('.control-orden__boton');
    expect(boton.textContent).toContain('Fecha');
    expect(boton.textContent).toContain('↑');
  });

  it('con más de una opción muestra el <select> con las opciones dadas', async () => {
    await crear([
      { valor: 'nombre', etiqueta: 'Nombre' },
      { valor: 'superficieHa', etiqueta: 'Superficie' },
    ]);
    const select: HTMLSelectElement = fixture.nativeElement.querySelector('select');
    expect(select).toBeTruthy();
    expect(select.options.length).toBe(2);
  });

  it('clickear el botón alterna la dirección y emite el modelo', async () => {
    await crear([{ valor: 'fecha', etiqueta: 'Fecha' }]);
    const boton: HTMLButtonElement = fixture.nativeElement.querySelector('.control-orden__boton');

    boton.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.direccion()).toBe('desc');
    expect(boton.textContent).toContain('↓');

    boton.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.direccion()).toBe('asc');
  });

  it('elegir un campo en el <select> actualiza el modelo `campo`', async () => {
    await crear([
      { valor: 'nombre', etiqueta: 'Nombre' },
      { valor: 'superficieHa', etiqueta: 'Superficie' },
    ]);
    const select: HTMLSelectElement = fixture.nativeElement.querySelector('select');
    select.value = 'superficieHa';
    select.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    expect(fixture.componentInstance.campo()).toBe('superficieHa');
  });
});
