import { describeAudit } from '../audit-description';
const event = {
  id: 'a',
  entityType: 'account',
  entityId: 'c',
  action: 'reconciled',
  occurredAt: '2026-01-01',
  payload: null as string | null,
};
it('explica la conciliación con importes conservados y motivo', () => {
  const result = describeAudit({
    ...event,
    payload: JSON.stringify({
      reason: 'Conteo',
      beforeCents: 1000,
      differenceCents: -100,
      afterCents: 900,
    }),
  });
  expect(result.title).toBe('Cuenta · Conciliación');
  expect(result.details).toHaveLength(4);
  expect(result.details[0]).toBe('Motivo: Conteo');
});
it.each([null, 'invalid', '[]', 'true'])('no inventa valores para payload %s', (payload) => {
  expect(describeAudit({ ...event, payload }).details).toEqual([
    'Este evento no conserva detalles adicionales.',
  ]);
});
