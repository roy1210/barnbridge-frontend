import React from 'react';
import cn from 'classnames';

import s from './s.module.scss';

type Props = React.DetailedHTMLProps<React.InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>;

export const Slider: React.FC<Props> = ({ className, value, disabled, ...rest }) => {
  const max = Number(rest.max) || 0;
  const slicedMax = Math.floor(max * 1e6) / 1e6;
  const slicedValue = Math.floor(Number(value) * 1e6) / 1e6;
  const percent = (slicedValue / slicedMax) * 100 || 0;
  const isDisabled = disabled === true || slicedMax === 0;

  return (
    <input
      {...rest}
      type="range"
      className={cn(s.input, className)}
      style={{ '--track-fill': `${!isDisabled ? percent : 0}%` } as React.CSSProperties}
      max={isDisabled ? 1 : slicedMax}
      disabled={isDisabled}
      value={!isDisabled ? value || '0' : '0'}
    />
  );
};
