import { normalizeFavorite, type SaveFavoriteInput } from '../favorites';

const input: SaveFavoriteInput = {
  name: '  Pasaje  diario ',
  accountId: 'cash',
  categoryId: 'transport',
  amountMode: 'suggested',
  amountCents: 250,
  merchant: null,
  note: null,
  tagIds: ['work', 'work'],
};
describe('favorite input', () => {
  it('normalizes text and deduplicates tags without mutating the caller', () => {
    expect(normalizeFavorite(input)).toMatchObject({
      name: 'Pasaje diario',
      tagIds: ['work'],
      amountCents: 250,
    });
    expect(input.tagIds).toHaveLength(2);
  });
  it('clears amounts for variable templates', () => {
    expect(normalizeFavorite({ ...input, amountMode: 'variable' }).amountCents).toBeNull();
  });
  it.each(['fixed', 'suggested'] as const)(
    'requires positive safe integer cents for %s',
    (amountMode) => {
      for (const amountCents of [null, 0, -1, 1.5, Infinity])
        expect(() => normalizeFavorite({ ...input, amountMode, amountCents })).toThrow();
    },
  );
  it('rejects empty names and missing references', () => {
    expect(() => normalizeFavorite({ ...input, name: ' ' })).toThrow();
    expect(() => normalizeFavorite({ ...input, accountId: '' })).toThrow();
    expect(() => normalizeFavorite({ ...input, categoryId: '' })).toThrow();
  });
});
