import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { mantenerUltimoValor } from './mantener-ultimo-valor';

describe('mantenerUltimoValor', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  });

  it('empieza en undefined si la fuente todavía no resolvió nada', () => {
    const fuente = signal<number | undefined>(undefined);
    const retenido = TestBed.runInInjectionContext(() => mantenerUltimoValor(fuente));
    TestBed.flushEffects();
    expect(retenido()).toBeUndefined();
  });

  it('se actualiza cuando la fuente resuelve un valor', () => {
    const fuente = signal<number | undefined>(undefined);
    const retenido = TestBed.runInInjectionContext(() => mantenerUltimoValor(fuente));
    fuente.set(1);
    TestBed.flushEffects();
    expect(retenido()).toBe(1);
  });

  it('retiene el último valor mientras la fuente vuelve a undefined (recarga en curso)', () => {
    const fuente = signal<number | undefined>(undefined);
    const retenido = TestBed.runInInjectionContext(() => mantenerUltimoValor(fuente));
    fuente.set(1);
    TestBed.flushEffects();
    expect(retenido()).toBe(1);

    fuente.set(undefined);
    TestBed.flushEffects();
    expect(retenido()).toBe(1);

    fuente.set(2);
    TestBed.flushEffects();
    expect(retenido()).toBe(2);
  });
});
