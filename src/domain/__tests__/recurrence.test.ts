import { occurrenceDate } from '../recurrence';
it('conserva el ancla 31 después de febrero sin desplazar marzo', () => {
  expect(occurrenceDate('2026-01-31', 'monthly', 1)).toBe('2026-02-28');
  expect(occurrenceDate('2026-01-31', 'monthly', 2)).toBe('2026-03-31');
});
it('recupera 29 de febrero en el siguiente año bisiesto', () => {
  expect(occurrenceDate('2024-02-29', 'yearly', 1)).toBe('2025-02-28');
  expect(occurrenceDate('2024-02-29', 'yearly', 4)).toBe('2028-02-29');
});
it('calcula semanas y el índice cero como fechas sin hora', () => {
  expect(occurrenceDate('2026-12-28', 'weekly', 1)).toBe('2027-01-04');
  expect(occurrenceDate('2026-12-28', 'weekly', 0)).toBe('2026-12-28');
});
it.each(['2026-02-30', '2026-13-01', 'ayer', '2026-01-01T00:00:00Z'])(
  'rechaza fecha %s',
  (date) => {
    expect(() => occurrenceDate(date, 'monthly', 1)).toThrow();
  },
);
it('rechaza índices negativos, fraccionarios o fuera de rango', () => {
  for (const index of [-1, 0.5, Infinity, Number.MAX_SAFE_INTEGER]) {
    expect(() => occurrenceDate('2026-01-01', 'monthly', index)).toThrow();
  }
});
