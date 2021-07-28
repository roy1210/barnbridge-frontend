import { FC, useState } from 'react';
import BigNumber from 'bignumber.js';

import Input from 'components/antd/input';
import Popover, { PopoverProps } from 'components/antd/popover';
import Icon from 'components/custom/icon';
import { Text } from 'components/custom/typography';

type Props = PopoverProps & {
  value: string;
  onSubmit: (value: string) => void;
};

const AddZerosPopup: FC<Props> = props => {
  const { onSubmit, ...popoverProps } = props;

  const [visible, setVisible] = useState<boolean>(false);
  const [zeroCount, setZeroCount] = useState<string>('');

  const nrZeroCount = Number(zeroCount);
  const finalValue = Number.isFinite(nrZeroCount) ? BigNumber.from(props.value)?.scaleBy(nrZeroCount) : undefined;
  const isValidValue = finalValue?.gte(0) && finalValue?.lte(BigNumber.MAX_UINT_256);

  function handleAddZeros() {
    setZeroCount('');
    setVisible(false);

    onSubmit?.(finalValue?.toString() ?? '');
  }

  const content = (
    <div className="flex flow-row row-gap-24">
      <div className="flex flow-row row-gap-8">
        <Text type="small" weight="semibold" color="secondary">
          Number of zeros
        </Text>
        <div className="flex flow-col col-gap-16">
          {[6, 8, 18].map(v => (
            <button key={v} type="button" className="button-ghost ph-16" onClick={() => setZeroCount(String(v))}>
              {v}
            </button>
          ))}
          <Input type="number" value={zeroCount} onChange={ev => setZeroCount(ev.target.value)} />
        </div>
      </div>
      <Text type="p2" weight="semibold" color="secondary">
        Use the options above to add trailing zeros to the input amount.
      </Text>
      <div className="flex flow-col col-gap-16 justify-space-between">
        <button
          type="button"
          className="button-ghost"
          onClick={() => {
            setVisible(false);
            setZeroCount('');
          }}>
          Cancel
        </button>
        <button type="button" className="button-primary" disabled={!isValidValue} onClick={handleAddZeros}>
          Add zeros
        </button>
      </div>
    </div>
  );

  return (
    <Popover
      title="Add zeros"
      placement="bottomLeft"
      overlayStyle={{ width: 376 }}
      content={content}
      visible={visible}
      onVisibleChange={setVisible}
      {...popoverProps}>
      <button type="button" className="button-text">
        <Icon name="plus-square-outlined" width={16} height={16} />
      </button>
    </Popover>
  );
};

export default AddZerosPopup;
