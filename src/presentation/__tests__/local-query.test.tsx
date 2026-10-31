import { act, renderHook } from '@testing-library/react-native';
import { useLocalQuery } from '../use-local-query';
jest.mock('expo-router', () => ({
  useFocusEffect: (callback: () => void) => {
    const { useEffect } = jest.requireActual('react');
    useEffect(callback, [callback]);
  },
}));
it('discards a late read after the query changes', async () => {
  let resolve!: (value: string) => void;
  const first = () =>
    new Promise<string>((r) => {
      resolve = r;
    });
  const second = async () => 'new';
  const { result, rerender } = await renderHook(
    ({ load }: { load: () => Promise<string> }) => useLocalQuery(load, 1),
    {
      initialProps: { load: first },
    },
  );
  await rerender({ load: second });
  await act(async () => {});
  await act(async () => {
    resolve('old');
  });
  expect(result.current.data).toBe('new');
});
it('refreshes on revision and retries an error without showing false empty data', async () => {
  const load = jest
    .fn()
    .mockRejectedValueOnce(new Error('db busy'))
    .mockResolvedValueOnce('ok')
    .mockResolvedValueOnce('updated');
  const { result, rerender } = await renderHook(
    ({ revision }: { revision: number }) => useLocalQuery(load, revision),
    {
      initialProps: { revision: 1 },
    },
  );
  await act(async () => {});
  expect(result.current.error).toBe('db busy');
  expect(result.current.data).toBeNull();
  await act(async () => {
    result.current.retry();
  });
  expect(result.current.data).toBe('ok');
  await rerender({ revision: 2 });
  await act(async () => {});
  expect(result.current.data).toBe('updated');
});
