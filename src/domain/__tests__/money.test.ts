import { formatPEN, parseAmountToCents, signedEffect } from '../money';

describe('money', () => {
  it('convierte texto decimal a céntimos sin flotantes persistidos', () => {
    expect(parseAmountToCents('1')).toBe(100);
    expect(parseAmountToCents('0,50')).toBe(50);
    expect(parseAmountToCents('12.34')).toBe(1234);
    expect(parseAmountToCents('1.234')).toBeNull();
    expect(parseAmountToCents('0')).toBeNull();
  });

  it('aplica el signo financiero según el tipo', () => {
    expect(signedEffect('expense', 500)).toBe(-500);
    expect(signedEffect('income', 500)).toBe(500);
    expect(signedEffect('transfer', 500)).toBe(0);
  });

  it('formatea PEN', () => expect(formatPEN(150)).toContain('1.50'));
});
