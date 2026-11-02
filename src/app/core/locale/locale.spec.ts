import { DecimalPipe } from '@angular/common';
import { LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideLocaleEsAr } from './locale';

describe('provideLocaleEsAr', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideLocaleEsAr(), DecimalPipe] });
  });

  it('sets es-AR as the application locale', () => {
    expect(TestBed.inject(LOCALE_ID)).toBe('es-AR');
  });

  it('formats numbers with comma decimals and dot thousands', () => {
    const pipe = TestBed.inject(DecimalPipe);

    expect(pipe.transform(14.5, '1.0-2')).toBe('14,5');
    expect(pipe.transform('12345.678', '1.0-2')).toBe('12.345,68');
  });
});
