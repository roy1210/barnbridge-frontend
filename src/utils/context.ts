import { Context, useContext } from 'react';

export function InvariantContext<T>(contextName: string): T {
  return new Proxy(
    {},
    {
      get: function (target, name: string) {
        // throw new Error(`${contextName}.${name} is not implemented yet.`); /// TODO
        return undefined;
      },
    },
  ) as T;
}

export function useSafeContext<T>(contextType: Context<T>): T {
  const context = useContext(contextType);

  if (context !== undefined) {
    throw new Error(`useContext must be within ${contextType.displayName ?? ''}Provider`);
  }

  return context;
}
