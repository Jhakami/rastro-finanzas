import { ledgerDateRange } from '../ledger';
import { ledgerParameters } from '@/infrastructure/ledger-query';

it('validates actual calendar dates and inclusive end converted to exclusive', () => {
  const range = ledgerDateRange('2024-02-29', '2024-02-29');
  expect(new Date(range.from!).getDate()).toBe(29);
  expect(new Date(range.until!).getMonth()).toBe(2);
  expect(new Date(range.until!).getDate()).toBe(1);
  expect(() => ledgerDateRange('2025-02-29', '')).toThrow();
  expect(() => ledgerDateRange('2026-02-02', '2026-01-01')).toThrow();
  expect(ledgerDateRange('', '')).toEqual({ from: undefined, until: undefined });
});
it('binds literal search, deduplicated tags and validated cursor dates', () => {
  expect(ledgerParameters({ text: " %' ", tagIds: ['a', 'a'] })).toMatchObject({
    $text: "%'",
    $tags: '["a"]',
  });
  expect(() => ledgerParameters({ cursor: { id: 'a', occurredAt: 'bad' } })).toThrow();
  expect(() => ledgerParameters({ from: '2026-02-02', until: '2026-02-01' })).toThrow();
});
