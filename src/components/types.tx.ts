import { CSSProperties, FC, ReactNode } from 'react';

export type SCP<P = {}> = P & {
  className?: string;
  style?: CSSProperties;
};

export type CP<P = {}> = SCP<P> & {
  children?: ReactNode;
};

export type FCx<P = {}> = FC<CP<P>>;
