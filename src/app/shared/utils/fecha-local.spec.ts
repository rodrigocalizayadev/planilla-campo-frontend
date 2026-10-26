import { afterEach, describe, expect, it, vi } from 'vitest';
import { hoyIso } from './fecha-local';

describe('hoyIso', () => {
  afterEach(() => vi.useRealTimers());

  it('devuelve el día local aunque en UTC ya sea el día siguiente (23:30 en UTC−3)', () => {
    vi.useFakeTimers();
    // 23:30 hora local del 15/03: en UTC−3 son las 02:30 del 16/03 en UTC, y
    // `toISOString()` daría "2026-03-16".
    vi.setSystemTime(new Date(2026, 2, 15, 23, 30));

    expect(hoyIso()).toBe('2026-03-15');
  });

  it('rellena mes y día con cero', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 5, 9, 0));

    expect(hoyIso()).toBe('2026-01-05');
  });
});
