import { FC } from 'react';

export function injectProvider<T extends Record<string, any>>(
  Component: FC<T>,
  Provider: FC,
  providerProps?: Record<string, any>,
): FC<T> {
  return (props: T) => (
    <Provider {...providerProps}>
      <Component {...props} />
    </Provider>
  );
}
