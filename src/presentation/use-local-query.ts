import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';

/** Screen-scoped query. Dependencies belong to a memoized load; stale/blurred reads cannot commit. */
export function useLocalQuery<T>(load: () => Promise<T>, revision: number) {
  const [state, setState] = useState<{
    data: T | null;
    loading: boolean;
    error: string | null;
    source: typeof load | null;
    revision: number;
    attempt: number;
  }>({ data: null, loading: true, error: null, source: null, revision: -1, attempt: -1 });
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt((value) => value + 1), []);
  useFocusEffect(
    useCallback(() => {
      let active = true;
      setState({ data: null, loading: true, error: null, source: load, revision, attempt });
      void load()
        .then((data) => {
          if (active)
            setState({ data, loading: false, error: null, source: load, revision, attempt });
        })
        .catch((cause) => {
          if (active)
            setState({
              data: null,
              loading: false,
              error: cause instanceof Error ? cause.message : 'No se pudieron cargar los datos.',
              source: load,
              revision,
              attempt,
            });
        });
      return () => {
        active = false;
      };
    }, [load, revision, attempt]),
  );
  return {
    ...(state.source === load && state.revision === revision && state.attempt === attempt
      ? state
      : { data: null, loading: true, error: null }),
    retry,
  };
}
