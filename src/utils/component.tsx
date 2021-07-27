import { FC } from 'react';

type Props = Record<string, any>;

export function WrapComponent<C extends Props, W extends Props>(
  Component: FC<C>,
  Wrapper: FC<W>,
  wrapperProps?: (cProps: C) => W,
): FC<C> {
  return function WrappedComponent(props: C) {
    return (
      <Wrapper {...wrapperProps?.(props)!}>
        <Component {...props} />
      </Wrapper>
    );
  };
}

export const injectProvider = WrapComponent;
