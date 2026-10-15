"use client";

import { useEffect, useState } from "react";

/**
 * Hook to safely read from a persisted Zustand store in Next.js App Router client components
 * avoiding SSR/client hydration mismatch warnings.
 */
export function useHydratedStore<T, F>(
  store: (callback: (state: T) => unknown) => unknown,
  callback: (state: T) => F
): F | undefined {
  const result = store(callback) as F;
  const [data, setData] = useState<F>();

  useEffect(() => {
    setData(result);
  }, [result]);

  return data;
}
